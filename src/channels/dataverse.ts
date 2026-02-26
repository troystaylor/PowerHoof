/**
 * Dataverse Channel Adapter
 *
 * Enables Power Platform integration via Dataverse:
 * - Receive agent requests from Power Apps
 * - Integrate with Power Automate flows
 * - Store conversations in Dataverse tables
 *
 * Uses Dataverse Web API with Azure AD authentication.
 */

import type {
  ChannelAdapter,
  ChannelHealth,
  DataverseChannelConfig,
  InboundMessage,
  MessageHandler,
  OutboundMessage,
} from "./types.js";
import { createLogger } from "../utils/logger.js";

const logger = createLogger("dataverse-channel");

/**
 * Dataverse table schemas
 */
interface AgentRequest {
  /** Row ID */
  cr_agentrequestid: string;
  /** Request message */
  cr_message: string;
  /** Conversation ID */
  cr_conversationid: string;
  /** Requesting user */
  cr_userid: string;
  /** User display name */
  cr_username?: string;
  /** Status: pending, processing, completed, failed */
  cr_status: string;
  /** Created timestamp */
  createdon: string;
}

interface AgentResponse {
  /** Request ID this responds to */
  "cr_AgentRequest@odata.bind": string;
  /** Response content */
  cr_response: string;
  /** Token usage */
  cr_tokensused?: number;
  /** Processing time ms */
  cr_processingtimems?: number;
}

/**
 * Dataverse Web API client
 */
interface DataverseClient {
  /** Query table rows */
  query<T>(table: string, filter?: string, select?: string[]): Promise<T[]>;
  /** Create row */
  create<T>(table: string, data: Partial<T>): Promise<T>;
  /** Update row */
  update(table: string, id: string, data: Record<string, unknown>): Promise<void>;
  /** Delete row */
  delete(table: string, id: string): Promise<void>;
  /** Health check */
  healthCheck(): Promise<boolean>;
}

/**
 * Create Dataverse channel adapter
 */
export async function createDataverseAdapter(
  config: DataverseChannelConfig
): Promise<ChannelAdapter> {
  let messageHandler: MessageHandler | undefined;
  let client: DataverseClient | undefined;
  let pollingInterval: NodeJS.Timeout | undefined;

  const messageTable = config.messageTable ?? "cr_agentrequests";
  const responseTable = config.responseTable ?? "cr_agentresponses";

  return {
    type: "dataverse",

    async initialize(): Promise<void> {
      logger.info("Initializing Dataverse adapter...");

      // Dynamic import for auth
      const { ClientSecretCredential, ManagedIdentityCredential } =
        await import("@azure/identity");

      // Create credential
      const credential = config.useManagedIdentity
        ? new ManagedIdentityCredential()
        : new ClientSecretCredential(
            config.tenantId,
            config.clientId,
            process.env[config.clientSecretSecret ?? "DATAVERSE_CLIENT_SECRET"] ?? ""
          );

      // Get access token for Dataverse
      const getToken = async (): Promise<string> => {
        const token = await credential.getToken(
          `${config.environmentUrl}/.default`
        );
        return token.token;
      };

      // Create Dataverse client
      const baseUrl = `${config.environmentUrl}/api/data/v9.2`;

      client = {
        async query<T>(
          table: string,
          filter?: string,
          select?: string[]
        ): Promise<T[]> {
          const token = await getToken();
          let url = `${baseUrl}/${table}`;
          const params = new URLSearchParams();

          if (filter) params.set("$filter", filter);
          if (select) params.set("$select", select.join(","));

          if (params.toString()) {
            url += "?" + params.toString();
          }

          const response = await fetch(url, {
            headers: {
              Authorization: `Bearer ${token}`,
              "OData-MaxVersion": "4.0",
              "OData-Version": "4.0",
              Accept: "application/json",
            },
          });

          if (!response.ok) {
            throw new Error(`Dataverse query failed: ${response.statusText}`);
          }

          const data = await response.json() as { value: T[] };
          return data.value;
        },

        async create<T>(table: string, data: Partial<T>): Promise<T> {
          const token = await getToken();
          const response = await fetch(`${baseUrl}/${table}`, {
            method: "POST",
            headers: {
              Authorization: `Bearer ${token}`,
              "OData-MaxVersion": "4.0",
              "OData-Version": "4.0",
              Accept: "application/json",
              "Content-Type": "application/json",
              Prefer: "return=representation",
            },
            body: JSON.stringify(data),
          });

          if (!response.ok) {
            throw new Error(`Dataverse create failed: ${response.statusText}`);
          }

          return response.json() as Promise<T>;
        },

        async update(
          table: string,
          id: string,
          data: Record<string, unknown>
        ): Promise<void> {
          const token = await getToken();
          const response = await fetch(`${baseUrl}/${table}(${id})`, {
            method: "PATCH",
            headers: {
              Authorization: `Bearer ${token}`,
              "OData-MaxVersion": "4.0",
              "OData-Version": "4.0",
              "Content-Type": "application/json",
            },
            body: JSON.stringify(data),
          });

          if (!response.ok) {
            throw new Error(`Dataverse update failed: ${response.statusText}`);
          }
        },

        async delete(table: string, id: string): Promise<void> {
          const token = await getToken();
          const response = await fetch(`${baseUrl}/${table}(${id})`, {
            method: "DELETE",
            headers: {
              Authorization: `Bearer ${token}`,
              "OData-MaxVersion": "4.0",
              "OData-Version": "4.0",
            },
          });

          if (!response.ok) {
            throw new Error(`Dataverse delete failed: ${response.statusText}`);
          }
        },

        async healthCheck(): Promise<boolean> {
          try {
            const token = await getToken();
            const response = await fetch(`${baseUrl}/WhoAmI`, {
              headers: {
                Authorization: `Bearer ${token}`,
              },
            });
            return response.ok;
          } catch {
            return false;
          }
        },
      };

      // Start polling for new requests (webhook is better but polling works everywhere)
      if (!config.webhookEndpoint) {
        pollingInterval = setInterval(() => {
          pollForRequests().catch((err) =>
            logger.error("Polling error:", err)
          );
        }, 5000); // Poll every 5 seconds
      }

      logger.info("Dataverse adapter initialized");
    },

    async send(message: OutboundMessage): Promise<void> {
      if (!client) {
        throw new Error("Dataverse adapter not initialized");
      }

      // Create response row in Dataverse
      await client.create<AgentResponse>(responseTable, {
        "cr_AgentRequest@odata.bind": `/${messageTable}(${message.conversationId})`,
        cr_response: message.content,
      });

      // Update request status to completed
      await client.update(messageTable, message.conversationId, {
        cr_status: "completed",
      });

      logger.info(`Response sent to Dataverse for request ${message.conversationId}`);
    },

    async shutdown(): Promise<void> {
      logger.info("Shutting down Dataverse adapter...");
      if (pollingInterval) {
        clearInterval(pollingInterval);
      }
    },

    onMessage(handler: MessageHandler): void {
      messageHandler = handler;
    },

    async healthCheck(): Promise<ChannelHealth> {
      if (!client) {
        return { status: "unhealthy", error: "Not initialized" };
      }

      try {
        const healthy = await client.healthCheck();
        return { status: healthy ? "healthy" : "degraded" };
      } catch (error) {
        return {
          status: "unhealthy",
          error: error instanceof Error ? error.message : "Unknown error",
        };
      }
    },

    /**
     * Process webhook from Dataverse
     * Called when a new request is created
     */
    async processWebhook(request: AgentRequest): Promise<void> {
      if (!messageHandler) {
        logger.warn("No message handler registered");
        return;
      }

      const inbound = convertRequestToMessage(request);
      await messageHandler(inbound);
    },
  } as ChannelAdapter & {
    processWebhook: (request: AgentRequest) => Promise<void>;
  };

  /**
   * Poll for new pending requests
   */
  async function pollForRequests(): Promise<void> {
    if (!client || !messageHandler) return;

    const pendingRequests = await client.query<AgentRequest>(
      messageTable,
      "cr_status eq 'pending'",
      [
        "cr_agentrequestid",
        "cr_message",
        "cr_conversationid",
        "cr_userid",
        "cr_username",
        "createdon",
      ]
    );

    for (const request of pendingRequests) {
      // Mark as processing
      await client.update(messageTable, request.cr_agentrequestid, {
        cr_status: "processing",
      });

      // Convert and dispatch
      const inbound = convertRequestToMessage(request);
      await messageHandler(inbound);
    }
  }
}

/**
 * Convert Dataverse request to InboundMessage
 */
function convertRequestToMessage(request: AgentRequest): InboundMessage {
  return {
    id: request.cr_agentrequestid,
    channel: "dataverse",
    conversationId: request.cr_agentrequestid,
    sender: {
      id: request.cr_userid,
      name: request.cr_username,
    },
    content: request.cr_message,
    isGroup: false,
    mentioned: true, // Always "mentioned" since it's a direct request
    timestamp: new Date(request.createdon),
    raw: request,
  };
}

/**
 * Create mock Dataverse adapter for testing
 */
export function createMockDataverseAdapter(): ChannelAdapter {
  let messageHandler: MessageHandler | undefined;
  const requests: AgentRequest[] = [];
  const responses: AgentResponse[] = [];

  return {
    type: "dataverse",

    async initialize(): Promise<void> {
      logger.info("[Mock] Dataverse adapter initialized");
    },

    async send(message: OutboundMessage): Promise<void> {
      logger.info(
        `[Mock] Creating response for ${message.conversationId}`
      );
      responses.push({
        "cr_AgentRequest@odata.bind": `/${message.conversationId}`,
        cr_response: message.content,
      });
    },

    async shutdown(): Promise<void> {
      logger.info("[Mock] Dataverse adapter shutdown");
    },

    onMessage(handler: MessageHandler): void {
      messageHandler = handler;
    },

    async healthCheck(): Promise<ChannelHealth> {
      return { status: "healthy" };
    },

    // Test helper to simulate request
    async simulateRequest(request: AgentRequest): Promise<void> {
      requests.push(request);
      if (messageHandler) {
        await messageHandler(convertRequestToMessage(request));
      }
    },

    // Test helper to get responses
    getResponses(): AgentResponse[] {
      return responses;
    },
  } as ChannelAdapter & {
    simulateRequest: (request: AgentRequest) => Promise<void>;
    getResponses: () => AgentResponse[];
  };
}
