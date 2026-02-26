/**
 * Conversation Manager
 *
 * Manages conversation state and history for PowerHoof sessions.
 */

import { ChatMessage } from "../providers/azure-openai.js";
import { logger } from "../utils/logger.js";

export interface ConversationMessage extends ChatMessage {
  id: string;
  timestamp: number;
  /** Token count for this message */
  tokens?: number;
  /** Nushell execution result if this was a tool response */
  nushellResult?: {
    script: string;
    output: string;
    success: boolean;
    durationMs: number;
  };
}

export interface Conversation {
  id: string;
  messages: ConversationMessage[];
  createdAt: number;
  updatedAt: number;
  /** Total tokens used in this conversation */
  totalTokens: number;
  /** Metadata from the user/channel */
  metadata?: Record<string, unknown>;
}

export interface ConversationManager {
  /**
   * Create a new conversation.
   */
  create(metadata?: Record<string, unknown>): Conversation;

  /**
   * Get a conversation by ID.
   */
  get(id: string): Conversation | undefined;

  /**
   * Add a message to a conversation.
   */
  addMessage(
    conversationId: string,
    message: Omit<ConversationMessage, "id" | "timestamp">
  ): ConversationMessage;

  /**
   * Get messages for LLM context (with compaction if needed).
   */
  getMessagesForContext(
    conversationId: string,
    maxTokens: number
  ): ChatMessage[];

  /**
   * Delete a conversation.
   */
  delete(id: string): boolean;

  /**
   * List all active conversations.
   */
  list(): Conversation[];
}

/**
 * Create an in-memory conversation manager.
 * For production, use Cosmos DB persistence.
 */
export function createConversationManager(): ConversationManager {
  const conversations = new Map<string, Conversation>();

  return {
    create(metadata?: Record<string, unknown>): Conversation {
      const id = generateConversationId();
      const now = Date.now();

      const conversation: Conversation = {
        id,
        messages: [],
        createdAt: now,
        updatedAt: now,
        totalTokens: 0,
        metadata,
      };

      conversations.set(id, conversation);
      logger.debug(`Created conversation ${id}`);

      return conversation;
    },

    get(id: string): Conversation | undefined {
      return conversations.get(id);
    },

    addMessage(
      conversationId: string,
      message: Omit<ConversationMessage, "id" | "timestamp">
    ): ConversationMessage {
      const conversation = conversations.get(conversationId);
      if (!conversation) {
        throw new Error(`Conversation ${conversationId} not found`);
      }

      const fullMessage: ConversationMessage = {
        ...message,
        id: generateMessageId(),
        timestamp: Date.now(),
      };

      conversation.messages.push(fullMessage);
      conversation.updatedAt = Date.now();

      if (message.tokens) {
        conversation.totalTokens += message.tokens;
      }

      return fullMessage;
    },

    getMessagesForContext(
      conversationId: string,
      maxTokens: number
    ): ChatMessage[] {
      const conversation = conversations.get(conversationId);
      if (!conversation) {
        return [];
      }

      // Simple approach: take most recent messages that fit within token budget
      // For production, implement smarter compaction (summarization, etc.)
      const result: ChatMessage[] = [];
      let tokenCount = 0;

      // Work backwards from most recent
      for (let i = conversation.messages.length - 1; i >= 0; i--) {
        const msg = conversation.messages[i];
        const msgTokens = msg.tokens || estimateTokens(msg.content);

        if (tokenCount + msgTokens > maxTokens) {
          break;
        }

        result.unshift({
          role: msg.role,
          content: msg.content,
        });
        tokenCount += msgTokens;
      }

      return result;
    },

    delete(id: string): boolean {
      const deleted = conversations.delete(id);
      if (deleted) {
        logger.debug(`Deleted conversation ${id}`);
      }
      return deleted;
    },

    list(): Conversation[] {
      return Array.from(conversations.values());
    },
  };
}

/**
 * Generate a unique conversation ID.
 */
function generateConversationId(): string {
  return `conv-${Date.now()}-${Math.random().toString(36).substr(2, 8)}`;
}

/**
 * Generate a unique message ID.
 */
function generateMessageId(): string {
  return `msg-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
}

/**
 * Simple token estimation (4 chars per token approximation).
 */
function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}
