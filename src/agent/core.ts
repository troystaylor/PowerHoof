/**
 * PowerHoof Agent Core
 *
 * Orchestrates LLM interactions and Nushell execution.
 */

import { PowerHoofConfig } from "../config/index.js";
import { logger } from "../utils/logger.js";

export interface AgentCore {
  /**
   * Process a user message and return the agent's response.
   */
  processMessage(sessionId: string, message: string): Promise<AgentResponse>;

  /**
   * Get conversation history for a session.
   */
  getHistory(sessionId: string): Promise<ConversationMessage[]>;

  /**
   * Clear a session's conversation history.
   */
  clearSession(sessionId: string): Promise<void>;
}

export interface AgentResponse {
  content: string;
  nushellExecuted?: NushellExecution[];
  tokensUsed: TokenUsage;
  model: string;
}

export interface NushellExecution {
  script: string;
  output: string;
  success: boolean;
  durationMs: number;
}

export interface TokenUsage {
  input: number;
  output: number;
  total: number;
  estimatedCost?: number;
}

export interface ConversationMessage {
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: Date;
  nushellExecutions?: NushellExecution[];
}

/**
 * Create the agent core with the provided configuration.
 */
export async function createAgentCore(config: PowerHoofConfig): Promise<AgentCore> {
  logger.info("Initializing agent core...");

  // TODO: Initialize LLM client
  // TODO: Initialize Nushell executor
  // TODO: Initialize memory store
  // TODO: Load Nushell capability registry

  const sessions = new Map<string, ConversationMessage[]>();

  return {
    async processMessage(sessionId: string, message: string): Promise<AgentResponse> {
      logger.info(`Processing message for session ${sessionId}`);

      // Get or create session history
      if (!sessions.has(sessionId)) {
        sessions.set(sessionId, []);
      }
      const history = sessions.get(sessionId)!;

      // Add user message to history
      history.push({
        role: "user",
        content: message,
        timestamp: new Date(),
      });

      // TODO: Build prompt with Nushell capability registry
      // TODO: Call LLM
      // TODO: Parse response for Nushell scripts
      // TODO: Execute Nushell in sandbox
      // TODO: Return results to LLM if needed
      // TODO: Store final response

      // Placeholder response
      const response: AgentResponse = {
        content: `[PowerHoof] Received: "${message}". Agent core implementation in progress.`,
        tokensUsed: { input: 0, output: 0, total: 0 },
        model: config.agent.primaryModel,
      };

      // Add assistant response to history
      history.push({
        role: "assistant",
        content: response.content,
        timestamp: new Date(),
      });

      return response;
    },

    async getHistory(sessionId: string): Promise<ConversationMessage[]> {
      return sessions.get(sessionId) || [];
    },

    async clearSession(sessionId: string): Promise<void> {
      sessions.delete(sessionId);
      logger.info(`Cleared session ${sessionId}`);
    },
  };
}
