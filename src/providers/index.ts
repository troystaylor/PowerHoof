/**
 * Provider Registry
 *
 * Manages LLM providers and model routing.
 */

import { PowerHoofConfig, Provider } from "../config/schema.js";
import {
  createAzureOpenAIClient,
  LLMClient,
  ChatCompletionOptions,
  ChatCompletionResult,
} from "./azure-openai.js";
import { logger } from "../utils/logger.js";

export interface ProviderRegistry {
  /**
   * Get an LLM client by provider name.
   */
  getProvider(name: string): LLMClient | undefined;

  /**
   * Get the primary model's client.
   */
  getPrimaryClient(): LLMClient;

  /**
   * Chat using the primary model.
   */
  chat(options: Omit<ChatCompletionOptions, "model">): Promise<ChatCompletionResult>;

  /**
   * Chat using a specific provider/model (format: "provider/model").
   */
  chatWithModel(
    modelPath: string,
    options: Omit<ChatCompletionOptions, "model">
  ): Promise<ChatCompletionResult>;

  /**
   * List all available providers.
   */
  listProviders(): string[];

  /**
   * Health check all providers.
   */
  healthCheck(): Promise<Record<string, boolean>>;
}

/**
 * Create a provider registry from configuration.
 */
export async function createProviderRegistry(
  config: PowerHoofConfig
): Promise<ProviderRegistry> {
  logger.info("Initializing provider registry...");

  const clients = new Map<string, LLMClient>();

  // Initialize each provider
  for (const [name, providerConfig] of Object.entries(config.providers)) {
    try {
      const client = await createProviderClient(name, providerConfig);
      clients.set(name, client);
      logger.info(`Provider ${name} initialized`);
    } catch (error) {
      logger.error(`Failed to initialize provider ${name}:`, error);
    }
  }

  // Parse primary model path (format: "provider/model")
  const [primaryProviderName, primaryModelId] = config.agent.primaryModel.split("/");

  const primaryClient = clients.get(primaryProviderName);
  if (!primaryClient) {
    throw new Error(
      `Primary provider ${primaryProviderName} not found. Available: ${Array.from(clients.keys()).join(", ")}`
    );
  }

  return {
    getProvider(name: string): LLMClient | undefined {
      return clients.get(name);
    },

    getPrimaryClient(): LLMClient {
      return primaryClient;
    },

    async chat(options: Omit<ChatCompletionOptions, "model">): Promise<ChatCompletionResult> {
      return primaryClient.chat({
        ...options,
        model: primaryModelId,
      });
    },

    async chatWithModel(
      modelPath: string,
      options: Omit<ChatCompletionOptions, "model">
    ): Promise<ChatCompletionResult> {
      const [providerName, modelId] = modelPath.split("/");

      const client = clients.get(providerName);
      if (!client) {
        throw new Error(`Provider ${providerName} not found`);
      }

      return client.chat({
        ...options,
        model: modelId,
      });
    },

    listProviders(): string[] {
      return Array.from(clients.keys());
    },

    async healthCheck(): Promise<Record<string, boolean>> {
      const results: Record<string, boolean> = {};

      for (const [name, client] of clients) {
        results[name] = await client.healthCheck();
      }

      return results;
    },
  };
}

/**
 * Create a client for a specific provider type.
 */
async function createProviderClient(name: string, config: Provider): Promise<LLMClient> {
  // Check for mock mode (development without real Azure)
  const useMock = process.env.USE_MOCK_LLM === "true" || 
                  name === "mock" || 
                  config.endpoint.includes("mock");
  
  if (useMock) {
    const { createMockLLMClient } = await import("./azure-openai.js");
    return createMockLLMClient(config.models);
  }

  switch (config.type) {
    case "azure-openai":
      // Get resolved API key if available (set by config loader from Key Vault)
      const resolvedKey = (config as Record<string, unknown>)._resolvedApiKey as
        | string
        | undefined;
      return createAzureOpenAIClient(config, resolvedKey);

    case "foundry-local": {
      // On-device inference using Foundry Local
      const { createFoundryLocalClient } = await import("./foundry-local.js");
      const foundryConfig = config as { modelAlias: string; modelTtl?: number; host?: string };
      return createFoundryLocalClient({
        modelAlias: foundryConfig.modelAlias,
        modelTtl: foundryConfig.modelTtl,
        host: foundryConfig.host,
      });
    }

    default:
      throw new Error(`Unknown provider type: ${(config as { type: string }).type}`);
  }
}

export {
  LLMClient,
  ChatCompletionOptions,
  ChatCompletionResult,
  ChatMessage,
  calculateCost,
  createMockLLMClient,
} from "./azure-openai.js";

export {
  createFoundryLocalClient,
  listFoundryLocalModels,
  FoundryLocalProviderConfig,
} from "./foundry-local.js";
