/**
 * Azure OpenAI Provider Client
 *
 * Native Azure SDK integration with Managed Identity support.
 * No api-key header hacks needed - uses DefaultAzureCredential.
 */

import { AzureOpenAI } from "openai";
import { DefaultAzureCredential, getBearerTokenProvider } from "@azure/identity";
import { AzureOpenAIProvider, ModelSpec } from "../config/schema.js";
import { logger } from "../utils/logger.js";

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface ChatCompletionOptions {
  model: string;
  messages: ChatMessage[];
  maxTokens?: number;
  temperature?: number;
  topP?: number;
  stop?: string[];
  /** Enable reasoning/thinking mode for supported models */
  reasoning?: boolean;
  reasoningEffort?: "low" | "medium" | "high";
}

export interface ChatCompletionResult {
  content: string;
  finishReason: string;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  model: string;
  /** Reasoning/thinking content if reasoning mode was enabled */
  reasoning?: string;
}

export interface LLMClient {
  /**
   * Send a chat completion request.
   */
  chat(options: ChatCompletionOptions): Promise<ChatCompletionResult>;

  /**
   * Get available models for this provider.
   */
  getModels(): ModelSpec[];

  /**
   * Get a specific model by ID.
   */
  getModel(modelId: string): ModelSpec | undefined;

  /**
   * Check if the provider is healthy/reachable.
   */
  healthCheck(): Promise<boolean>;
}

/**
 * Create an Azure OpenAI client from provider configuration.
 */
export async function createAzureOpenAIClient(
  providerConfig: AzureOpenAIProvider,
  resolvedApiKey?: string
): Promise<LLMClient> {
  logger.info(`Initializing Azure OpenAI client for ${providerConfig.endpoint}`);

  let client: AzureOpenAI;

  if (providerConfig.useManagedIdentity) {
    // Use DefaultAzureCredential for managed identity
    // Falls back through: Environment → Managed Identity → Azure CLI → etc.
    const credential = new DefaultAzureCredential();
    const scope = "https://cognitiveservices.azure.com/.default";
    const azureADTokenProvider = getBearerTokenProvider(credential, scope);

    client = new AzureOpenAI({
      azureADTokenProvider,
      endpoint: providerConfig.endpoint,
      apiVersion: "2024-10-01-preview", // Latest stable API version
    });

    logger.info("Using Managed Identity authentication");
  } else if (resolvedApiKey) {
    // Use API key (resolved from Key Vault)
    client = new AzureOpenAI({
      endpoint: providerConfig.endpoint,
      apiKey: resolvedApiKey,
      apiVersion: "2024-10-01-preview",
    });

    logger.info("Using API key authentication");
  } else {
    throw new Error(
      "Azure OpenAI provider requires either useManagedIdentity=true or a resolved API key"
    );
  }

  const models = providerConfig.models;

  return {
    async chat(options: ChatCompletionOptions): Promise<ChatCompletionResult> {
      const modelSpec = models.find((m) => m.id === options.model);

      if (!modelSpec) {
        throw new Error(`Model ${options.model} not found in provider configuration`);
      }

      logger.debug(`Chat request to model ${options.model}`, {
        messageCount: options.messages.length,
        maxTokens: options.maxTokens,
      });

      try {
        // Build request parameters (explicitly disable streaming for type safety)
        const requestParams = {
          model: options.model,
          messages: options.messages.map((m) => ({
            role: m.role as "system" | "user" | "assistant",
            content: m.content,
          })),
          max_tokens: options.maxTokens ?? modelSpec.maxTokens,
          temperature: options.temperature ?? 0.7,
          top_p: options.topP,
          stop: options.stop,
          stream: false as const,
        };

        // Add reasoning parameters for models that support it
        if (options.reasoning && modelSpec.reasoning) {
          // Azure OpenAI reasoning models use specific parameters
          (requestParams as Record<string, unknown>).reasoning_effort =
            options.reasoningEffort ?? "medium";
        }

        const response = await client.chat.completions.create(requestParams);

        const choice = response.choices[0];

        if (!choice) {
          throw new Error("No completion choice returned from Azure OpenAI");
        }

        const result: ChatCompletionResult = {
          content: choice.message?.content ?? "",
          finishReason: choice.finish_reason ?? "unknown",
          usage: {
            promptTokens: response.usage?.prompt_tokens ?? 0,
            completionTokens: response.usage?.completion_tokens ?? 0,
            totalTokens: response.usage?.total_tokens ?? 0,
          },
          model: response.model,
        };

        // Extract reasoning content if present (for reasoning models)
        const messageWithReasoning = choice.message as unknown as { reasoning?: string };
        if (modelSpec.reasoning && messageWithReasoning?.reasoning) {
          result.reasoning = messageWithReasoning.reasoning;
        }

        logger.debug(`Chat response received`, {
          tokens: result.usage.totalTokens,
          finishReason: result.finishReason,
        });

        return result;
      } catch (error) {
        logger.error(`Azure OpenAI chat error:`, error);
        throw error;
      }
    },

    getModels(): ModelSpec[] {
      return models;
    },

    getModel(modelId: string): ModelSpec | undefined {
      return models.find((m) => m.id === modelId);
    },

    async healthCheck(): Promise<boolean> {
      try {
        // Simple health check - list deployments or make a minimal request
        // For now, we'll try a minimal chat request
        await client.chat.completions.create({
          model: models[0]?.id ?? "gpt-4o",
          messages: [{ role: "user", content: "ping" }],
          max_tokens: 1,
        });
        return true;
      } catch (error) {
        logger.warn("Azure OpenAI health check failed:", error);
        return false;
      }
    },
  };
}

/**
 * Calculate estimated cost for a completion based on model pricing.
 */
export function calculateCost(
  modelSpec: ModelSpec,
  usage: { promptTokens: number; completionTokens: number }
): number {
  if (!modelSpec.cost) return 0;

  const inputCost = (usage.promptTokens / 1_000_000) * modelSpec.cost.input;
  const outputCost = (usage.completionTokens / 1_000_000) * modelSpec.cost.output;

  return inputCost + outputCost;
}

/**
 * Create a mock LLM client for local development and testing.
 */
export function createMockLLMClient(models: ModelSpec[]): LLMClient {
  logger.info("Using mock LLM client (no real API calls)");

  return {
    async chat(options: ChatCompletionOptions): Promise<ChatCompletionResult> {
      logger.debug("Mock chat request", { model: options.model });

      // Simulate processing delay
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Generate mock response based on user message
      const lastMessage = options.messages[options.messages.length - 1]?.content || "";
      const mockResponse = generateMockResponse(lastMessage);

      return {
        content: mockResponse,
        finishReason: "stop",
        usage: {
          promptTokens: Math.floor(lastMessage.length / 4),
          completionTokens: Math.floor(mockResponse.length / 4),
          totalTokens: Math.floor((lastMessage.length + mockResponse.length) / 4),
        },
        model: options.model,
      };
    },

    getModels(): ModelSpec[] {
      return models;
    },

    getModel(modelId: string): ModelSpec | undefined {
      return models.find((m) => m.id === modelId);
    },

    async healthCheck(): Promise<boolean> {
      return true;
    },
  };
}

/**
 * Generate a mock response for testing.
 */
function generateMockResponse(userMessage: string): string {
  const lower = userMessage.toLowerCase();

  if (lower.includes("list") && lower.includes("file")) {
    return "```nushell\nls | select name size modified\n```";
  }

  if (lower.includes("read") || lower.includes("open")) {
    return "```nushell\nph-file read example.txt\n```";
  }

  if (lower.includes("help")) {
    return "I'm PowerHoof, an AI assistant that uses Nushell for efficient task execution. I can help you manage files, query data, and interact with Azure services. What would you like to do?";
  }

  return `I've received your message: "${userMessage.substring(0, 50)}..."\n\nThis is a mock response for development. Configure real Azure OpenAI credentials to get actual AI responses.`;
}
