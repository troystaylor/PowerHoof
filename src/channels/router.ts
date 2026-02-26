/**
 * Channel Router
 *
 * Routes messages between channel adapters and the orchestrator.
 */

import type {
  ChannelAdapter,
  ChannelRouter,
  ChannelType,
  InboundMessage,
  OutboundMessage,
} from "./types.js";
import { createLogger } from "../utils/logger.js";

const logger = createLogger("channel-router");

/**
 * Create a channel router instance
 */
export function createChannelRouter(): ChannelRouter {
  const adapters = new Map<ChannelType, ChannelAdapter>();

  return {
    register(adapter: ChannelAdapter): void {
      if (adapters.has(adapter.type)) {
        logger.warn(`Replacing existing adapter for channel: ${adapter.type}`);
      }
      adapters.set(adapter.type, adapter);
      logger.info(`Registered channel adapter: ${adapter.type}`);
    },

    getAdapter(type: ChannelType): ChannelAdapter | undefined {
      return adapters.get(type);
    },

    async route(type: ChannelType, message: OutboundMessage): Promise<void> {
      const adapter = adapters.get(type);
      if (!adapter) {
        throw new Error(`No adapter registered for channel: ${type}`);
      }
      await adapter.send(message);
    },

    getChannels(): ChannelAdapter[] {
      return Array.from(adapters.values());
    },

    async shutdown(): Promise<void> {
      logger.info("Shutting down all channel adapters...");
      const shutdownPromises = Array.from(adapters.values()).map(
        async (adapter) => {
          try {
            await adapter.shutdown();
            logger.info(`Shutdown complete: ${adapter.type}`);
          } catch (error) {
            logger.error(`Error shutting down ${adapter.type}:`, error);
          }
        }
      );
      await Promise.all(shutdownPromises);
    },
  };
}

/**
 * Message dispatcher - connects channels to orchestrator
 */
export interface MessageDispatcher {
  /** Handle inbound message from any channel */
  dispatch(message: InboundMessage): Promise<string>;
}

/**
 * Create dispatcher that routes to orchestrator
 */
export function createMessageDispatcher(
  orchestrator: {
    chat: (
      message: string,
      conversationId?: string,
      metadata?: Record<string, unknown>
    ) => Promise<{ response: string; conversationId: string }>;
  },
  router: ChannelRouter
): MessageDispatcher {
  return {
    async dispatch(message: InboundMessage): Promise<string> {
      logger.info(
        `Dispatching message from ${message.channel}/${message.conversationId}`
      );

      // Call orchestrator
      const result = await orchestrator.chat(
        message.content,
        message.conversationId,
        {
          channel: message.channel,
          sender: message.sender,
          isGroup: message.isGroup,
          mentioned: message.mentioned,
        }
      );

      // Send response back through original channel
      const adapter = router.getAdapter(message.channel);
      if (adapter) {
        await adapter.send({
          conversationId: message.conversationId,
          content: result.response,
          replyTo: message.id,
        });
      }

      return result.response;
    },
  };
}
