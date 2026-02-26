/**
 * Microsoft Graph Channel Adapter
 *
 * Provides integration with Microsoft 365 services:
 * - Teams messages (channels and chats)
 * - Outlook mail
 * - SharePoint notifications
 *
 * Uses Microsoft Graph API via @azure/identity for authentication.
 */

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

const logger = createLogger("graph-channel");

/**
 * Graph API client interface (minimal for our needs)
 */
interface GraphClient {
  /** Send a message to Teams chat */
  sendTeamsMessage(chatId: string, content: string): Promise<void>;
  /** Send a reply in Teams channel */
  replyToTeamsMessage(
    teamId: string,
    channelId: string,
    messageId: string,
    content: string
  ): Promise<void>;
  /** Send Outlook mail */
  sendMail(to: string, subject: string, body: string): Promise<void>;
  /** Get user info */
  getUser(userId: string): Promise<{ displayName: string; mail: string }>;
  /** Health check */
  healthCheck(): Promise<boolean>;
}

/**
 * Create Microsoft Graph channel adapter
 */
export async function createGraphAdapter(
  config: GraphChannelConfig
): Promise<ChannelAdapter> {
  let messageHandler: MessageHandler | undefined;
  // @ts-expect-error - Retained for future typing indicator support
  let typingHandler: TypingHandler | undefined;
  let client: GraphClient | undefined;
  let subscriptionIds: string[] = [];

  return {
    type: "graph",

    async initialize(): Promise<void> {
      logger.info("Initializing Microsoft Graph adapter...");

      // Dynamic import to avoid bundling @azure/identity if not used
      const { ClientSecretCredential, ManagedIdentityCredential } =
        await import("@azure/identity");
      const { Client } = await import("@microsoft/microsoft-graph-client");
      const { TokenCredentialAuthenticationProvider } = await import(
        "@microsoft/microsoft-graph-client/authProviders/azureTokenCredentials/index.js"
      );

      // Create credential based on config
      const credential = config.useManagedIdentity
        ? new ManagedIdentityCredential()
        : new ClientSecretCredential(
            config.tenantId,
            config.clientId,
            process.env[config.clientSecretSecret ?? "GRAPH_CLIENT_SECRET"] ?? ""
          );

      // Create auth provider
      const authProvider = new TokenCredentialAuthenticationProvider(
        credential,
        {
          scopes: config.scopes ?? [
            "https://graph.microsoft.com/.default",
          ],
        }
      );

      // Create Graph client
      const graphClient = Client.initWithMiddleware({
        authProvider,
      });

      // Wrap in our interface
      client = {
        async sendTeamsMessage(chatId: string, content: string): Promise<void> {
          await graphClient
            .api(`/chats/${chatId}/messages`)
            .post({
              body: {
                content,
                contentType: "html",
              },
            });
        },

        async replyToTeamsMessage(
          teamId: string,
          channelId: string,
          messageId: string,
          content: string
        ): Promise<void> {
          await graphClient
            .api(
              `/teams/${teamId}/channels/${channelId}/messages/${messageId}/replies`
            )
            .post({
              body: {
                content,
                contentType: "html",
              },
            });
        },

        async sendMail(to: string, subject: string, body: string): Promise<void> {
          await graphClient.api("/me/sendMail").post({
            message: {
              subject,
              body: {
                contentType: "HTML",
                content: body,
              },
              toRecipients: [
                {
                  emailAddress: {
                    address: to,
                  },
                },
              ],
            },
          });
        },

        async getUser(
          userId: string
        ): Promise<{ displayName: string; mail: string }> {
          const user = await graphClient.api(`/users/${userId}`).get();
          return {
            displayName: user.displayName,
            mail: user.mail,
          };
        },

        async healthCheck(): Promise<boolean> {
          try {
            await graphClient.api("/me").get();
            return true;
          } catch {
            return false;
          }
        },
      };

      // Set up subscriptions if webhook endpoint configured
      if (config.webhookEndpoint && config.subscriptions) {
        for (const subType of config.subscriptions) {
          try {
            const resource = getSubscriptionResource(subType);
            const subscription = await graphClient
              .api("/subscriptions")
              .post({
                changeType: "created,updated",
                notificationUrl: config.webhookEndpoint,
                resource,
                expirationDateTime: new Date(
                  Date.now() + 3600 * 1000
                ).toISOString(), // 1 hour
                clientState: "powerhoof-" + subType,
              });
            subscriptionIds.push(subscription.id);
            logger.info(`Created subscription for ${subType}: ${subscription.id}`);
          } catch (error) {
            logger.error(`Failed to create subscription for ${subType}:`, error);
          }
        }
      }

      logger.info("Microsoft Graph adapter initialized");
    },

    async send(message: OutboundMessage): Promise<void> {
      if (!client) {
        throw new Error("Graph adapter not initialized");
      }

      // Parse conversation ID to determine target type
      // Format: teams:chat:{chatId} or teams:channel:{teamId}:{channelId}:{messageId}
      const parts = message.conversationId.split(":");

      if (parts[0] === "teams") {
        if (parts[1] === "chat") {
          await client.sendTeamsMessage(parts[2]!, message.content);
        } else if (parts[1] === "channel" && message.replyTo) {
          await client.replyToTeamsMessage(
            parts[2]!,
            parts[3]!,
            message.replyTo,
            message.content
          );
        }
      } else if (parts[0] === "mail") {
        await client.sendMail(
          parts[1]!,
          "PowerHoof Response",
          message.content
        );
      }
    },

    async shutdown(): Promise<void> {
      logger.info("Shutting down Graph adapter...");
      // Clean up subscriptions
      // In production, would delete subscriptions via Graph API
      subscriptionIds = [];
    },

    onMessage(handler: MessageHandler): void {
      messageHandler = handler;
    },

    onTyping(handler: TypingHandler): void {
      typingHandler = handler;
    },

    async healthCheck(): Promise<ChannelHealth> {
      if (!client) {
        return { status: "unhealthy", error: "Not initialized" };
      }

      try {
        const healthy = await client.healthCheck();
        return {
          status: healthy ? "healthy" : "degraded",
        };
      } catch (error) {
        return {
          status: "unhealthy",
          error: error instanceof Error ? error.message : "Unknown error",
        };
      }
    },

    /**
     * Process webhook notification from Graph
     * Called by webhook endpoint handler
     */
    async processWebhook(notification: GraphNotification): Promise<void> {
      if (!messageHandler) {
        logger.warn("No message handler registered, ignoring notification");
        return;
      }

      // Convert Graph notification to InboundMessage
      const inbound = await convertNotificationToMessage(notification, client!);
      if (inbound) {
        await messageHandler(inbound);
      }
    },
  } as ChannelAdapter & {
    processWebhook: (notification: GraphNotification) => Promise<void>;
  };
}

/**
 * Graph change notification structure
 */
interface GraphNotification {
  subscriptionId: string;
  clientState: string;
  changeType: string;
  resource: string;
  resourceData: {
    id: string;
    "@odata.type": string;
    "@odata.id": string;
  };
}

/**
 * Get subscription resource path for a subscription type
 */
function getSubscriptionResource(type: string): string {
  switch (type) {
    case "teams-messages":
      return "/teams/getAllMessages";
    case "outlook-mail":
      return "/me/mailFolders('Inbox')/messages";
    case "sharepoint-items":
      return "/sites/root/lists";
    case "presence":
      return "/communications/presences";
    default:
      throw new Error(`Unknown subscription type: ${type}`);
  }
}

/**
 * Convert Graph notification to InboundMessage
 */
async function convertNotificationToMessage(
  notification: GraphNotification,
  _client: GraphClient
): Promise<InboundMessage | null> {
  // This would fetch the actual message content from Graph
  // For now, return a placeholder
  const resourceType = notification.resourceData["@odata.type"];

  if (resourceType.includes("message")) {
    return {
      id: notification.resourceData.id,
      channel: "graph",
      conversationId: `teams:${notification.resource}`,
      sender: {
        id: "unknown", // Would fetch from message
        name: "Unknown User",
      },
      content: "[Message content would be fetched from Graph]",
      isGroup: notification.resource.includes("channels"),
      mentioned: false,
      timestamp: new Date(),
      raw: notification,
    };
  }

  return null;
}

/**
 * Create mock Graph adapter for testing
 */
export function createMockGraphAdapter(): ChannelAdapter {
  let messageHandler: MessageHandler | undefined;
  const sentMessages: OutboundMessage[] = [];

  return {
    type: "graph",

    async initialize(): Promise<void> {
      logger.info("[Mock] Graph adapter initialized");
    },

    async send(message: OutboundMessage): Promise<void> {
      logger.info(`[Mock] Sending to ${message.conversationId}: ${message.content.substring(0, 50)}...`);
      sentMessages.push(message);
    },

    async shutdown(): Promise<void> {
      logger.info("[Mock] Graph adapter shutdown");
    },

    onMessage(handler: MessageHandler): void {
      messageHandler = handler;
    },

    async healthCheck(): Promise<ChannelHealth> {
      return { status: "healthy" };
    },

    // Test helper to simulate incoming message
    async simulateMessage(message: InboundMessage): Promise<void> {
      if (messageHandler) {
        await messageHandler(message);
      }
    },

    // Test helper to get sent messages
    getSentMessages(): OutboundMessage[] {
      return sentMessages;
    },
  } as ChannelAdapter & {
    simulateMessage: (message: InboundMessage) => Promise<void>;
    getSentMessages: () => OutboundMessage[];
  };
}
