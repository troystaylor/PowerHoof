/**
 * Channel Adapter Types
 *
 * Modeled after OpenClaw's channel system, focused on Microsoft channels.
 * Channels provide a unified interface for inbound/outbound messaging.
 */

/**
 * Incoming message from any channel
 */
export interface InboundMessage {
  /** Unique message ID from the source platform */
  id: string;
  /** Channel type (teams, slack, discord, etc.) */
  channel: ChannelType;
  /** Channel-specific conversation/thread ID */
  conversationId: string;
  /** Sender identifier */
  sender: {
    id: string;
    name?: string;
    email?: string;
  };
  /** Message content */
  content: string;
  /** Attachments (images, files) */
  attachments?: Attachment[];
  /** Whether this is a group message */
  isGroup: boolean;
  /** Group/channel name if applicable */
  groupName?: string;
  /** Whether the bot was mentioned (for group activation) */
  mentioned: boolean;
  /** Original timestamp */
  timestamp: Date;
  /** Raw platform-specific payload for advanced use */
  raw?: unknown;
}

/**
 * Outbound message to send via channel
 */
export interface OutboundMessage {
  /** Target conversation ID */
  conversationId: string;
  /** Text content */
  content: string;
  /** Reply to specific message ID */
  replyTo?: string;
  /** Attachments to send */
  attachments?: Attachment[];
  /** Message formatting hints */
  format?: "plain" | "markdown" | "adaptive-card";
}

/**
 * Attachment (file, image, etc.)
 */
export interface Attachment {
  type: "image" | "file" | "audio" | "video";
  name: string;
  url?: string;
  data?: Buffer;
  mimeType?: string;
  size?: number;
}

/**
 * Supported channel types
 */
export type ChannelType =
  | "graph"      // Microsoft Graph (Teams, Outlook, etc.)
  | "dataverse"  // Power Platform Dataverse
  | "webchat"
  | "rest";      // REST API is also a "channel"

/**
 * Channel adapter interface
 */
export interface ChannelAdapter {
  /** Channel type identifier */
  readonly type: ChannelType;

  /** Initialize the channel (connect, authenticate, etc.) */
  initialize(): Promise<void>;

  /** Send a message through this channel */
  send(message: OutboundMessage): Promise<void>;

  /** Shutdown cleanly */
  shutdown(): Promise<void>;

  /** Register handler for incoming messages */
  onMessage(handler: MessageHandler): void;

  /** Register handler for typing indicators */
  onTyping?(handler: TypingHandler): void;

  /** Health check */
  healthCheck(): Promise<ChannelHealth>;
}

/**
 * Message handler function
 */
export type MessageHandler = (message: InboundMessage) => Promise<void>;

/**
 * Typing indicator handler
 */
export type TypingHandler = (conversationId: string, userId: string) => void;

/**
 * Channel health status
 */
export interface ChannelHealth {
  status: "healthy" | "degraded" | "unhealthy";
  latencyMs?: number;
  lastMessage?: Date;
  error?: string;
}

/**
 * Channel configuration base
 */
export interface ChannelConfigBase {
  enabled: boolean;
  /** DM policy: pairing requires approval, open allows all, closed blocks */
  dmPolicy: "pairing" | "open" | "closed";
  /** Allow list for senders (email, ID, or "*" for all) */
  allowFrom?: string[];
  /** Group policy */
  groupPolicy?: "mention" | "always" | "closed";
  /** Groups allowlist */
  groups?: string[];
}

/**
 * Microsoft Graph channel configuration
 * Supports Teams, Outlook mail, SharePoint notifications
 */
export interface GraphChannelConfig extends ChannelConfigBase {
  /** Microsoft Entra App ID */
  clientId: string;
  /** Secret name in Key Vault for client secret */
  clientSecretSecret?: string;
  /** Use managed identity instead of client secret */
  useManagedIdentity?: boolean;
  /** Tenant ID */
  tenantId: string;
  /** Graph scopes to request */
  scopes?: string[];
  /** Subscription types to listen for */
  subscriptions?: GraphSubscriptionType[];
  /** Webhook endpoint for change notifications */
  webhookEndpoint?: string;
}

/**
 * Graph subscription types
 */
export type GraphSubscriptionType =
  | "teams-messages"      // Teams channel/chat messages
  | "outlook-mail"        // Outlook inbox
  | "sharepoint-items"    // SharePoint list items
  | "presence";           // User presence changes

/**
 * Dataverse channel configuration
 * Enables Power Platform integration
 */
export interface DataverseChannelConfig extends ChannelConfigBase {
  /** Dataverse environment URL */
  environmentUrl: string;
  /** Microsoft Entra App ID */
  clientId: string;
  /** Secret name in Key Vault for client secret */
  clientSecretSecret?: string;
  /** Use managed identity instead */
  useManagedIdentity?: boolean;
  /** Tenant ID */
  tenantId: string;
  /** Table to watch for messages/requests */
  messageTable?: string;
  /** Response table for agent replies */
  responseTable?: string;
  /** Webhook registration for real-time */
  webhookEndpoint?: string;
}

/**
 * Channel router for multi-channel support
 */
export interface ChannelRouter {
  /** Register a channel adapter */
  register(adapter: ChannelAdapter): void;

  /** Get adapter by type */
  getAdapter(type: ChannelType): ChannelAdapter | undefined;

  /** Route outbound message to correct channel */
  route(type: ChannelType, message: OutboundMessage): Promise<void>;

  /** Get all registered channels */
  getChannels(): ChannelAdapter[];

  /** Shutdown all channels */
  shutdown(): Promise<void>;
}
