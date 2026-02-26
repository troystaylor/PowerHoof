/**
 * Foundry Local Provider Client
 *
 * On-device AI inference using Microsoft Foundry Local.
 * Runs models locally with zero cloud costs.
 *
 * @see https://learn.microsoft.com/azure/ai-foundry/foundry-local/
 */

import OpenAI from "openai";
import { spawn } from "child_process";
import { ModelSpec } from "../config/schema.js";
import { logger } from "../utils/logger.js";
import type { LLMClient, ChatCompletionOptions, ChatCompletionResult } from "./azure-openai.js";

// Default endpoint for Foundry Local service (OpenAI SDK needs /v1 suffix)
const FOUNDRY_LOCAL_ENDPOINT = "http://127.0.0.1:56984/v1";

export interface FoundryLocalProviderConfig {
  /** Model alias to load (e.g., "phi-3.5-mini", "qwen2.5-0.5b") */
  modelAlias: string;
  /** Time-to-live for loaded model in seconds (default: 600) */
  modelTtl?: number;
  /** Custom host if service is already running */
  host?: string;
}

/**
 * Wait for a model to be loaded by polling the models endpoint
 */
async function waitForModel(endpoint: string, modelAlias: string, timeoutMs: number = 120000): Promise<string | null> {
  const client = new OpenAI({
    baseURL: endpoint,
    apiKey: "not-required",
  });

  const startTime = Date.now();
  while (Date.now() - startTime < timeoutMs) {
    try {
      const models = await client.models.list();
      for await (const model of models) {
        // Check if model id or alias matches
        if (model.id.toLowerCase().includes(modelAlias.toLowerCase())) {
          return model.id;
        }
      }
    } catch {
      // Service not ready yet, keep polling
    }
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  return null;
}

/**
 * Load a model using the foundry CLI (avoids SDK crash issues)
 */
async function loadModelViaCLI(modelAlias: string, ttl: number): Promise<void> {
  return new Promise((resolve) => {
    logger.info(`Loading model via CLI: foundry model run ${modelAlias} --ttl ${ttl}`);
    
    const proc = spawn("foundry", ["model", "run", modelAlias, "--ttl", String(ttl)], {
      detached: true,
      stdio: "ignore",
      shell: true,
    });

    proc.unref(); // Don't wait for the subprocess

    // Give the CLI a moment to start
    setTimeout(resolve, 3000);
  });
}

/**
 * Create a Foundry Local client for on-device inference.
 *
 * This provider:
 * - Starts the Foundry Local service if not running
 * - Downloads the model on first use
 * - Uses OpenAI-compatible API for inference
 * 
 * Note: Uses CLI instead of SDK's loadModel due to Node.js crash issues
 */
export async function createFoundryLocalClient(
  config: FoundryLocalProviderConfig
): Promise<LLMClient> {
  logger.info(`Initializing Foundry Local client for model: ${config.modelAlias}`);

  const endpoint = config.host || FOUNDRY_LOCAL_ENDPOINT;
  const ttl = config.modelTtl ?? 600;

  // First check if model is already loaded
  logger.info("Checking for loaded models...");
  let modelId = await waitForModel(endpoint, config.modelAlias, 5000);

  if (!modelId) {
    // Model not loaded - use CLI to load it
    logger.info(`Model ${config.modelAlias} not loaded, starting via CLI...`);
    await loadModelViaCLI(config.modelAlias, ttl);
    
    // Wait for model to finish loading
    logger.info(`Waiting for model ${config.modelAlias} to load...`);
    modelId = await waitForModel(endpoint, config.modelAlias, 120000);
    
    if (!modelId) {
      throw new Error(`Failed to load model ${config.modelAlias} within timeout. Make sure Foundry Local is installed.`);
    }
  }

  logger.info(`Model loaded: ${modelId}`);

  // Create OpenAI-compatible client
  const client = new OpenAI({
    baseURL: endpoint,
    apiKey: "not-required", // Foundry Local doesn't require API key
  });

  // Simple mutex to serialize requests (NPU can only handle one at a time)
  let requestLock: Promise<void> = Promise.resolve();
  const acquireLock = (): Promise<() => void> => {
    let release: () => void;
    const newLock = new Promise<void>((resolve) => {
      release = resolve;
    });
    const previousLock = requestLock;
    requestLock = newLock;
    return previousLock.then(() => release!);
  };

  // Build model specs from loaded model
  const modelSpecs: ModelSpec[] = [
    {
      id: modelId,
      name: config.modelAlias,
      reasoning: false, // Local models typically don't have reasoning mode
      contextWindow: 8192, // Conservative default, varies by model
      maxTokens: 2048,
      input: ["text"],
      // Local inference has no per-token cost
      cost: { input: 0, output: 0 },
    },
  ];

  return {
    async chat(options: ChatCompletionOptions): Promise<ChatCompletionResult> {
      logger.debug("Foundry Local chat request", { model: options.model });

      // Serialize requests to NPU (single-threaded inference)
      const release = await acquireLock();
      try {
        const response = await client.chat.completions.create({
          model: modelId,
          messages: options.messages.map((m) => ({
            role: m.role,
            content: m.content,
          })),
          max_tokens: options.maxTokens,
          temperature: options.temperature,
          top_p: options.topP,
          stop: options.stop,
          stream: false as const,
        });

        const choice = response.choices[0];

        return {
          content: choice?.message?.content || "",
          finishReason: choice?.finish_reason || "stop",
          usage: {
            promptTokens: response.usage?.prompt_tokens || 0,
            completionTokens: response.usage?.completion_tokens || 0,
            totalTokens: response.usage?.total_tokens || 0,
          },
          model: response.model,
        };
      } finally {
        release();
      }
    },

    getModels(): ModelSpec[] {
      return modelSpecs;
    },

    getModel(id: string): ModelSpec | undefined {
      return modelSpecs.find((m) => m.id === id);
    },

    async healthCheck(): Promise<boolean> {
      try {
        const models = await client.models.list();
        for await (const model of models) {
          if (model.id === modelId) {
            return true;
          }
        }
        return false;
      } catch {
        return false;
      }
    },
  };
}

/**
 * List available models in the Foundry Local catalog.
 * Uses foundry CLI since SDK has stability issues.
 */
export async function listFoundryLocalModels(): Promise<string[]> {
  // Return common model aliases - the full catalog can be retrieved via CLI
  return [
    "phi-4-mini",
    "phi-4-mini-reasoning",
    "phi-4",
    "phi-3.5-mini",
    "qwen2.5-0.5b",
    "qwen2.5-1.5b",
    "llama-3.2-1b",
    "llama-3.2-3b",
  ];
}
