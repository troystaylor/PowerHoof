/**
 * Dataverse Channel Adapter
 *
 * Enables Power Platform integration:
 * - Read/write to Dataverse tables
 * - Handle Power Automate webhook triggers
 * - Integrate with Copilot Studio handoff
 * - Support Power Apps canvas apps
 *
 * Uses Azure Identity for authentication.
 */

import { DefaultAzureCredential, ClientSecretCredential } from "@azure/identity";
import type {
  ChannelAdapter,
  ChannelHealth,
  DataverseChannelConfig,
  InboundMessage,
  MessageHandler,
  OutboundMessage,
  TypingHandler,
} from "./types.js";
import { createLogger } from "../utils/logger.js";

const logger = createLogger("dataverse-adapter");

/**
 * Dataverse Web API client wrapper
 */
class DataverseClient {
  private accessToken: string | null = null;
  private tokenExpiry: Date | null = null;

  constructor(
    private environmentUrl: string,
    private credential: DefaultAzureCredential | ClientSecretCredential
  ) {}

  /**
   * Get valid access token
   */
  private async getToken(): Promise<string> {
    // Check if current token is still valid (with 5 min buffer)
    if (this.accessToken && this.tokenExpiry && this.tokenExpiry > new Date(Date.now() + 300000)) {
      return this.accessToken;
    }

    // Get new token
    const tokenResponse = await this.credential.getToken(
      `${this.environmentUrl}/.default`
    );
    
    if (!tokenResponse) {
      throw new Error("Failed to acquire Dataverse token");
    }

    this.accessToken = tokenResponse.token;
    this.tokenExpiry = tokenResponse.expiresOnTimestamp
      ? new Date(tokenResponse.expiresOnTimestamp)
      : new Date(Date.now() + 3600000);

    return this.accessToken;
  }

  /**
   * Make authenticated request to Dataverse Web API
   */
  async request<T>(
    method: "GET" | "POST" | "PATCH" | "DELETE",
    path: string,
    body?: unknown
  ): Promise<T> {
    const token = await this.getToken();
    const url = `${this.environmentUrl}/api/data/v9.2${path}`;

    const response = await fetch(url, {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        "OData-MaxVersion": "4.0",
        "OData-Version": "4.0",
        Accept: "application/json",
        Prefer: "return=representation",
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Dataverse API error ${response.status}: ${error}`);
    }

    // Handle 204 No Content
    if (response.status === 204) {
      return {} as T;
    }

    return response.json() as Promise<T>;
  }

  /**
   * Query table with OData filter
   */
  async query<T>(
    table: string,
    options?: {
      select?: string[];
      filter?: string;
      orderby?: string;
      top?: number;
    }
  ): Promise<{ value: T[] }> {
    const params = new URLSearchParams();
    if (options?.select) params.set("$select", options.select.join(","));
    if (options?.filter) params.set("$filter", options.filter);
    if (options?.orderby) params.set("$orderby", options.orderby);
    if (options?.top) params.set("$top", options.top.toString());

    const queryString = params.toString();
    const path = `/${table}${queryString ? `?${queryString}` : ""}`;
    
    return this.request("GET", path);
  }

  /**
   * Create record in table
   */
  async create<T>(table: string, data: Record<string, unknown>): Promise<T> {
    return this.request("POST", `/${table}`, data);
  }

  /**
   * Update record
   */
  async update(table: string, id: string, data: Record<string, unknown>): Promise<void> {
    await this.request("PATCH", `/${table}(${id})`, data);
  }

  /**
   * Delete record
   */
  async delete(table: string, id: string): Promise<void> {
    await this.request("DELETE", `/${table}(${id})`);
  }
}

/**
 * Dataverse channel adapter
 */
export class DataverseAdapter implements ChannelAdapter {
  readonly type = "dataverse" as const;

  private client: DataverseClient | null = null;
  private messageHandler: MessageHandler | null = null;
  // @ts-expect-error - Retained for future typing indicator support
  private typingHandler: TypingHandler | null = null;
  private pollingInterval: NodeJS.Timeout | null = null;
  private lastProcessedTime: Date = new Date();

  constructor(private config: DataverseChannelConfig) {}

  async initialize(): Promise<void> {
    logger.info("Initializing Dataverse adapter...");

    // Create credential based on config
    const credential = this.config.useManagedIdentity
      ? new DefaultAzureCredential()
      : new ClientSecretCredential(
          this.config.tenantId,
          this.config.clientId,
          this.config.clientSecretSecret || ""
        );

    // Create Dataverse client
    this.client = new DataverseClient(this.config.environmentUrl, credential);

    // Test connection
    try {
      const result = await this.client.query("systemusers", {
        select: ["systemuserid"],
        top: 1,
      });
      logger.info(`Connected to Dataverse, found ${result.value.length} users`);
    } catch (error) {
      throw new Error(`Failed to connect to Dataverse: ${error}`);
    }

    // Ensure message table exists or start polling
    if (this.config.messageTable) {
      await this.startPolling();
    }

    logger.info("Dataverse adapter initialized");
  }

  /**
   * Start polling for new messages in Dataverse table
   */
  private async startPolling(): Promise<void> {
    if (!this.config.messageTable) return;

    const pollInterval = 5000; // 5 seconds
    logger.info(`Starting message polling on table: ${this.config.messageTable}`);

    this.pollingInterval = setInterval(async () => {
      try {
        await this.pollForMessages();
      } catch (error) {
        logger.error("Error polling for messages:", error);
      }
    }, pollInterval);
  }

  /**
   * Poll Dataverse table for new messages
   */
  private async pollForMessages(): Promise<void> {
    if (!this.client || !this.config.messageTable || !this.messageHandler) return;

    const result = await this.client.query<DataverseMessage>(this.config.messageTable, {
      filter: `createdon gt ${this.lastProcessedTime.toISOString()} and statecode eq 0`,
      orderby: "createdon asc",
      top: 50,
    });

    for (const record of result.value) {
      const inbound = this.parseDataverseMessage(record);
      if (inbound) {
        await this.messageHandler(inbound);
        this.lastProcessedTime = new Date(record.createdon);
      }
    }
  }

  /**
   * Parse Dataverse record into InboundMessage
   */
  private parseDataverseMessage(record: DataverseMessage): InboundMessage | null {
    return {
      id: record.powerhoof_messageid || record[Object.keys(record).find(k => k.includes("id")) || ""] as string,
      channel: "dataverse",
      conversationId: `dataverse:${record.powerhoof_sessionid || record.powerhoof_messageid}`,
      sender: {
        id: record._ownerid_value || "system",
        name: record.powerhoof_sendername,
        email: record.powerhoof_senderemail,
      },
      content: record.powerhoof_content || "",
      isGroup: false,
      mentioned: true, // Always process Dataverse messages
      timestamp: new Date(record.createdon),
      raw: record,
    };
  }

  async send(message: OutboundMessage): Promise<void> {
    if (!this.client) {
      throw new Error("Dataverse adapter not initialized");
    }

    // Parse conversation ID to get session
    const [, sessionId] = message.conversationId.split(":");

    // Write response to response table
    const responseTable = this.config.responseTable || "powerhoof_responses";
    
    await this.client.create(responseTable, {
      powerhoof_sessionid: sessionId,
      powerhoof_content: message.content,
      powerhoof_format: message.format || "plain",
      powerhoof_replyto: message.replyTo,
      powerhoof_createdon: new Date().toISOString(),
    });

    logger.debug(`Wrote response to ${responseTable} for session ${sessionId}`);
  }

  /**
   * Handle incoming webhook from Power Automate
   */
  async handleWebhook(payload: PowerAutomatePayload): Promise<void> {
    if (!this.messageHandler) return;

    const inbound: InboundMessage = {
      id: payload.messageId || `webhook-${Date.now()}`,
      channel: "dataverse",
      conversationId: `dataverse:${payload.sessionId || payload.messageId}`,
      sender: {
        id: payload.userId || "power-automate",
        name: payload.userName,
        email: payload.userEmail,
      },
      content: payload.message || "",
      isGroup: false,
      mentioned: true,
      timestamp: new Date(),
      raw: payload,
    };

    await this.messageHandler(inbound);
  }

  /**
   * Execute Dataverse action (for Copilot Studio integration)
   */
  async executeAction(actionName: string, parameters: Record<string, unknown>): Promise<unknown> {
    if (!this.client) {
      throw new Error("Dataverse adapter not initialized");
    }

    return this.client.request("POST", `/${actionName}`, parameters);
  }

  /**
   * Query Dataverse table (exposed for skills/tools)
   */
  async queryTable<T>(
    table: string,
    filter?: string,
    select?: string[]
  ): Promise<T[]> {
    if (!this.client) {
      throw new Error("Dataverse adapter not initialized");
    }

    const result = await this.client.query<T>(table, { filter, select });
    return result.value;
  }

  /**
   * Create record in Dataverse (exposed for skills/tools)
   */
  async createRecord<T>(table: string, data: Record<string, unknown>): Promise<T> {
    if (!this.client) {
      throw new Error("Dataverse adapter not initialized");
    }

    return this.client.create<T>(table, data);
  }

  onMessage(handler: MessageHandler): void {
    this.messageHandler = handler;
  }

  onTyping(handler: TypingHandler): void {
    this.typingHandler = handler;
  }

  async healthCheck(): Promise<ChannelHealth> {
    if (!this.client) {
      return { status: "unhealthy", error: "Not initialized" };
    }

    const start = Date.now();
    try {
      await this.client.query("systemusers", { top: 1, select: ["systemuserid"] });
      return {
        status: "healthy",
        latencyMs: Date.now() - start,
      };
    } catch (error) {
      return {
        status: "unhealthy",
        latencyMs: Date.now() - start,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  async shutdown(): Promise<void> {
    logger.info("Shutting down Dataverse adapter...");

    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
    }

    this.client = null;
    logger.info("Dataverse adapter shut down");
  }
}

/**
 * Dataverse message table schema (example)
 */
interface DataverseMessage {
  powerhoof_messageid?: string;
  powerhoof_sessionid?: string;
  powerhoof_content?: string;
  powerhoof_sendername?: string;
  powerhoof_senderemail?: string;
  _ownerid_value?: string;
  createdon: string;
  statecode: number;
  [key: string]: unknown;
}

/**
 * Power Automate webhook payload
 */
interface PowerAutomatePayload {
  messageId?: string;
  sessionId?: string;
  userId?: string;
  userName?: string;
  userEmail?: string;
  message?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Create Dataverse adapter from config
 */
export function createDataverseAdapter(config: DataverseChannelConfig): DataverseAdapter {
  return new DataverseAdapter(config);
}
