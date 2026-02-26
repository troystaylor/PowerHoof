/**
 * Configuration Loader
 *
 * Loads config from environment/file and resolves secrets from Key Vault.
 */

import { readFileSync, existsSync } from "fs";
import { PowerHoofConfig, PowerHoofConfigSchema } from "./schema.js";
import { createSecretResolver } from "../secrets/index.js";
import { logger } from "../utils/logger.js";

// Default configuration for local development
const DEFAULT_CONFIG: Partial<PowerHoofConfig> = {
  server: {
    port: 3000,
    host: "0.0.0.0",
    corsOrigins: ["*"],
  },
  agent: {
    primaryModel: "azure-openai/gpt-4o",
    maxConcurrentTasks: 4,
    maxSubagents: 8,
    compactionMode: "safeguard",
  },
};

/**
 * Load configuration from file if specified.
 */
function loadConfigFile(): Partial<PowerHoofConfig> {
  const configPath = process.env.CONFIG_FILE;
  
  if (configPath && existsSync(configPath)) {
    logger.info(`Loading config from file: ${configPath}`);
    const content = readFileSync(configPath, "utf-8");
    return JSON.parse(content) as Partial<PowerHoofConfig>;
  }
  
  // Check default locations
  const defaultPaths = ["config.json", "config.dev.json"];
  for (const path of defaultPaths) {
    if (existsSync(path)) {
      logger.info(`Loading config from: ${path}`);
      const content = readFileSync(path, "utf-8");
      return JSON.parse(content) as Partial<PowerHoofConfig>;
    }
  }
  
  return {};
}

/**
 * Load configuration from environment variables and config file.
 * Resolves Key Vault secrets automatically.
 */
export async function loadConfig(): Promise<PowerHoofConfig> {
  logger.info("Loading configuration...");

  // Load from config file first
  const fileConfig = loadConfigFile();

  // Build config from environment variables (overrides file)
  const envConfig = buildConfigFromEnv();

  // Merge: defaults <- file <- env
  const mergedConfig = deepMerge(deepMerge(DEFAULT_CONFIG, fileConfig), envConfig);

  // Validate with Zod
  const validatedConfig = PowerHoofConfigSchema.parse(mergedConfig);

  // Resolve secrets from Key Vault if configured
  if (validatedConfig.keyVault) {
    await resolveSecrets(validatedConfig);
  }

  logger.info("Configuration loaded successfully");
  return validatedConfig;
}

/**
 * Build configuration object from environment variables.
 */
function buildConfigFromEnv(): Partial<PowerHoofConfig> {
  const config: Record<string, unknown> = {};

  // Server config
  if (process.env.PORT) {
    config.server = { port: parseInt(process.env.PORT, 10) };
  }

  // Azure OpenAI provider
  if (process.env.AZURE_OPENAI_ENDPOINT) {
    // Get deployment name from env or default to gpt-4o
    const deploymentName = process.env.AZURE_OPENAI_DEPLOYMENT || "gpt-4o";
    
    // Create model spec for the configured deployment
    const deployedModel = {
      id: deploymentName,
      name: deploymentName,
      reasoning: deploymentName.startsWith("o1"),
      contextWindow: deploymentName.includes("o1") ? 200000 : 128000,
      maxTokens: 4096,
      input: ["text"] as ("text" | "image" | "audio")[],
    };

    const providerConfig: Record<string, unknown> = {
      type: "azure-openai",
      endpoint: process.env.AZURE_OPENAI_ENDPOINT,
      useManagedIdentity: process.env.AZURE_OPENAI_USE_MANAGED_IDENTITY === "true",
      models: [deployedModel],
    };
    
    // Support direct API key (for simple deployments)
    if (process.env.AZURE_OPENAI_API_KEY) {
      providerConfig._resolvedApiKey = process.env.AZURE_OPENAI_API_KEY;
      providerConfig.useManagedIdentity = false;
    }
    // Or Key Vault secret reference
    if (process.env.AZURE_OPENAI_API_KEY_SECRET) {
      providerConfig.apiKeySecret = process.env.AZURE_OPENAI_API_KEY_SECRET;
    }
    
    config.providers = { "azure-openai": providerConfig };
  }

  // Nushell config
  const nushellExecutorType = process.env.NUSHELL_EXECUTOR_TYPE as "mock" | "local" | "session" | undefined;
  if (nushellExecutorType || process.env.NUSHELL_SESSION_POOL_ENDPOINT) {
    config.nushell = {
      executorType: nushellExecutorType || (process.env.NUSHELL_SESSION_POOL_ENDPOINT ? "session" : "mock"),
      sessionPoolEndpoint: process.env.NUSHELL_SESSION_POOL_ENDPOINT,
      nuPath: process.env.NUSHELL_PATH,
      workingDirectory: process.env.NUSHELL_WORKING_DIR,
      executionTimeoutMs: parseInt(process.env.NUSHELL_TIMEOUT_MS || "30000", 10),
    };
  }

  // Memory config
  if (process.env.COSMOS_ENDPOINT) {
    config.memory = {
      cosmosEndpoint: process.env.COSMOS_ENDPOINT,
      databaseName: process.env.COSMOS_DATABASE || "powerhoof",
    };
  }

  // Key Vault config
  if (process.env.KEY_VAULT_URL) {
    config.keyVault = {
      vaultUrl: process.env.KEY_VAULT_URL,
      useManagedIdentity: true,
    };
  }

  // Agent config
  if (process.env.PRIMARY_MODEL) {
    config.agent = {
      primaryModel: process.env.PRIMARY_MODEL,
    };
  }

  return config;
}

/**
 * Resolve secrets from Azure Key Vault.
 * Replaces secret name references with actual values.
 */
async function resolveSecrets(config: PowerHoofConfig): Promise<void> {
  if (!config.keyVault) return;

  logger.info("Resolving secrets from Key Vault...");

  const resolver = createSecretResolver(config.keyVault.vaultUrl);

  // Resolve API key secrets for providers
  for (const [providerName, provider] of Object.entries(config.providers)) {
    if (provider.type === "azure-openai" && provider.apiKeySecret) {
      const secretValue = await resolver.getSecret(provider.apiKeySecret);
      if (secretValue) {
        // Store resolved key in a runtime-only property (not serialized)
        (provider as Record<string, unknown>)._resolvedApiKey = secretValue;
        logger.info(`Resolved API key for provider: ${providerName}`);
      } else {
        logger.warn(`Secret ${provider.apiKeySecret} not found for provider ${providerName}`);
      }
    }
  }
}

/**
 * Deep merge two objects.
 */
function deepMerge<T extends Record<string, unknown>>(target: T, source: Partial<T>): T {
  const result = { ...target };

  for (const key in source) {
    const sourceValue = source[key];
    const targetValue = result[key];

    if (
      sourceValue &&
      typeof sourceValue === "object" &&
      !Array.isArray(sourceValue) &&
      targetValue &&
      typeof targetValue === "object" &&
      !Array.isArray(targetValue)
    ) {
      result[key] = deepMerge(
        targetValue as Record<string, unknown>,
        sourceValue as Record<string, unknown>
      ) as T[Extract<keyof T, string>];
    } else if (sourceValue !== undefined) {
      result[key] = sourceValue as T[Extract<keyof T, string>];
    }
  }

  return result;
}

export { PowerHoofConfig };
