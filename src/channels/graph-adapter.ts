/**
 * Microsoft Graph Channel Adapter
 *
 * Provides unified access to:
 * - Teams messages (channels and chats)
 * - Outlook mail
 * - SharePoint notifications
 * - Presence updates
 *
 * Uses Azure Identity for authentication (managed identity preferred).
 */

import { DefaultAzureCredential, ClientSecretCredential } from "@azure/identity";
import { Client } from "@microsoft/microsoft-graph-client";
import { TokenCredentialAuthenticationProvider } from "@microsoft/microsoft-graph-client/authProviders/azureTokenCredentials/index.js";
import type {
  ChannelAdapter,
  ChannelHealth,
  GraphChannelConfig,
  InboundMessage,
  MessageHandler,
  OutboundMessage,
  TypingHandler,
} from "./types.js";
import { createLogger } from "../utils/logger.js";

const logger = createLogger("graph-adapter");

/**
 * Microsoft Graph channel adapter
 */
export class GraphAdapter implements ChannelAdapter {
  readonly type = "graph" as const;

  private client: Client | null = null;
  private messageHandler: MessageHandler | null = null;
  // @ts-expect-error - Retained for future typing indicator support
  private typingHandler: TypingHandler | null = null;
  private subscriptions: Map<string, string> = new Map(); // resource -> subscriptionId
  private lastHealthCheck: Date | null = null;

  constructor(private config: GraphChannelConfig) {}

  async initialize(): Promise<void> {
    logger.info("Initializing Microsoft Graph adapter...");

    // Create credential based on config
    const credential = this.config.useManagedIdentity
      ? new DefaultAzureCredential()
      : new ClientSecretCredential(
          this.config.tenantId,
          this.config.clientId,
          this.config.clientSecretSecret || ""
        );

    // Create auth provider
    const authProvider = new TokenCredentialAuthenticationProvider(credential, {
      scopes: this.config.scopes || [
        "https://graph.microsoft.com/.default",
      ],
    });

    // Create Graph client
    this.client = Client.initWithMiddleware({
      authProvider,
    });

    // Test connection
    try {
      const me = await this.client.api("/organization").get();
      logger.info(`Connected to tenant: ${me.value?.[0]?.displayName || "Unknown"}`);
    } catch (error) {
      logger.warn("Could not verify organization - may be app-only auth");
    }

    // Set up subscriptions for real-time notifications
    if (this.config.subscriptions && this.config.webhookEndpoint) {
      await this.setupSubscriptions();
    }

    logger.info("Microsoft Graph adapter initialized");
  }

  /**
   * Set up Graph webhooks for change notifications
   */
  private async setupSubscriptions(): Promise<void> {
    if (!this.client || !this.config.webhookEndpoint) return;

    const subscriptionResources: Record<string, string> = {
      "teams-messages": "/teams/getAllMessages",
      "outlook-mail": "/users/{user-id}/mailFolders/inbox/messages",
      "sharepoint-items": "/sites/{site-id}/lists/{list-id}/items",
      "presence": "/communications/presences",
    };

    for (const subType of this.config.subscriptions || []) {
      const resource = subscriptionResources[subType];
      if (!resource) continue;

      try {
        // Note: Real implementation needs resource templating
        const subscription = await this.client.api("/subscriptions").post({
          changeType: "created,updated",
          notificationUrl: this.config.webhookEndpoint,
          resource,
          expirationDateTime: new Date(Date.now() + 4230 * 60000).toISOString(), // ~3 days
          clientState: `powerhoof-${subType}`,
        });

        this.subscriptions.set(subType, subscription.id);
        logger.info(`Created subscription for ${subType}: ${subscription.id}`);
      } catch (error) {
        logger.error(`Failed to create subscription for ${subType}:`, error);
      }
    }
  }

  async send(message: OutboundMessage): Promise<void> {
    if (!this.client) {
      throw new Error("Graph adapter not initialized");
    }

    // Parse conversation ID to determine target type
    // Format: teams:{teamId}:{channelId} or chat:{chatId} or mail:{userId}
    const [targetType, ...ids] = message.conversationId.split(":");

    switch (targetType) {
      case "teams":
        await this.sendTeamsMessage(ids[0], ids[1], message);
        break;
      case "chat":
        await this.sendChatMessage(ids[0], message);
        break;
      case "mail":
        await this.sendMail(ids[0], message);
        break;
      default:
        throw new Error(`Unknown target type: ${targetType}`);
    }
  }

  /**
   * Send message to Teams channel
   */
  private async sendTeamsMessage(
    teamId: string,
    channelId: string,
    message: OutboundMessage
  ): Promise<void> {
    await this.client!.api(`/teams/${teamId}/channels/${channelId}/messages`).post({
      body: {
        contentType: message.format === "adaptive-card" ? "html" : "text",
        content: message.content,
      },
    });
    logger.debug(`Sent Teams message to ${teamId}/${channelId}`);
  }

  /**
   * Send message to Teams chat
   */
  private async sendChatMessage(chatId: string, message: OutboundMessage): Promise<void> {
    await this.client!.api(`/chats/${chatId}/messages`).post({
      body: {
        contentType: "text",
        content: message.content,
      },
    });
    logger.debug(`Sent chat message to ${chatId}`);
  }

  /**
   * Send email via Outlook
   */
  private async sendMail(recipientEmail: string, message: OutboundMessage): Promise<void> {
    await this.client!.api("/me/sendMail").post({
      message: {
        subject: "PowerHoof Response",
        body: {
          contentType: message.format === "markdown" ? "HTML" : "Text",
          content: message.content,
        },
        toRecipients: [
          {
            emailAddress: { address: recipientEmail },
          },
        ],
      },
    });
    logger.debug(`Sent mail to ${recipientEmail}`);
  }

  /**
   * Handle incoming Graph webhook notification
   */
  async handleNotification(notification: GraphNotification): Promise<void> {
    if (!this.messageHandler) return;

    // Convert Graph notification to InboundMessage
    const inbound = await this.parseNotification(notification);
    if (inbound) {
      await this.messageHandler(inbound);
    }
  }

  /**
   * Parse Graph notification into InboundMessage
   */
  private async parseNotification(notification: GraphNotification): Promise<InboundMessage | null> {
    // Determine message type from clientState
    const [, messageType] = (notification.clientState || "").split("-");

    switch (messageType) {
      case "teams-messages":
        return this.parseTeamsMessage(notification);
      case "outlook-mail":
        return this.parseMailMessage(notification);
      default:
        logger.warn(`Unknown notification type: ${messageType}`);
        return null;
    }
  }

  private async parseTeamsMessage(notification: GraphNotification): Promise<InboundMessage | null> {
    if (!this.client || !notification.resourceData) return null;

    const messageData = notification.resourceData as unknown as TeamsMessageData;
    
    return {
      id: messageData.id,
      channel: "graph",
      conversationId: `teams:${messageData.teamId || ""}:${messageData.channelId || messageData.chatId || ""}`,
      sender: {
        id: messageData.from?.user?.id || "unknown",
        name: messageData.from?.user?.displayName,
      },
      content: messageData.body?.content || "",
      isGroup: !!messageData.channelId,
      groupName: messageData.channelId ? "Teams Channel" : undefined,
      mentioned: messageData.mentions?.some((m) => m.mentioned?.application) || false,
      timestamp: new Date(messageData.createdDateTime || Date.now()),
      raw: notification,
    };
  }

  private async parseMailMessage(notification: GraphNotification): Promise<InboundMessage | null> {
    // Fetch full message details
    if (!this.client || !notification.resource) return null;

    try {
      const mail = await this.client.api(notification.resource).get();
      
      return {
        id: mail.id,
        channel: "graph",
        conversationId: `mail:${mail.from?.emailAddress?.address || "unknown"}`,
        sender: {
          id: mail.from?.emailAddress?.address || "unknown",
          name: mail.from?.emailAddress?.name,
          email: mail.from?.emailAddress?.address,
        },
        content: mail.body?.content || mail.bodyPreview || "",
        isGroup: false,
        mentioned: false,
        timestamp: new Date(mail.receivedDateTime || Date.now()),
        raw: mail,
      };
    } catch (error) {
      logger.error("Failed to fetch mail message:", error);
      return null;
    }
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
      await this.client.api("/organization").get();
      this.lastHealthCheck = new Date();
      return {
        status: "healthy",
        latencyMs: Date.now() - start,
        lastMessage: this.lastHealthCheck,
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
    logger.info("Shutting down Microsoft Graph adapter...");

    // Delete subscriptions
    if (this.client) {
      for (const [subType, subId] of this.subscriptions) {
        try {
          await this.client.api(`/subscriptions/${subId}`).delete();
          logger.debug(`Deleted subscription ${subType}`);
        } catch (error) {
          logger.warn(`Failed to delete subscription ${subType}:`, error);
        }
      }
    }

    this.client = null;
    this.subscriptions.clear();
    logger.info("Microsoft Graph adapter shut down");
  }
}

/**
 * Graph webhook notification structure
 */
interface GraphNotification {
  subscriptionId: string;
  subscriptionExpirationDateTime: string;
  changeType: "created" | "updated" | "deleted";
  resource: string;
  resourceData?: Record<string, unknown>;
  clientState?: string;
  tenantId?: string;
}

/**
 * Teams message resource data
 */
interface TeamsMessageData {
  id: string;
  teamId?: string;
  channelId?: string;
  chatId?: string;
  createdDateTime?: string;
  from?: {
    user?: {
      id: string;
      displayName?: string;
    };
  };
  body?: {
    content: string;
    contentType: string;
  };
  mentions?: Array<{
    mentioned?: {
      application?: { id: string };
      user?: { id: string };
    };
  }>;
}

/**
 * Create Graph adapter from config
 */
export function createGraphAdapter(config: GraphChannelConfig): GraphAdapter {
  return new GraphAdapter(config);
}
