/**
 * PowerHoof Configuration Schema
 *
 * Defined with Zod for runtime validation.
 * Secrets are resolved from Key Vault at load time.
 */

import { z } from "zod";

// Model specification - mirrors Azure AI Foundry model metadata
export const ModelSpecSchema = z.object({
  id: z.string(), // Deployment name in Azure
  name: z.string(), // Display name
  reasoning: z.boolean().default(false), // Supports thinking/reasoning mode
  contextWindow: z.number(), // Max input tokens
  maxTokens: z.number(), // Max output tokens
  input: z.array(z.enum(["text", "image", "audio"])).default(["text"]),
  cost: z
    .object({
      input: z.number(), // Cost per 1M input tokens
      output: z.number(), // Cost per 1M output tokens
      cacheRead: z.number().optional(),
      cacheWrite: z.number().optional(),
    })
    .optional(),
});

export type ModelSpec = z.infer<typeof ModelSpecSchema>;

// Azure OpenAI provider configuration
export const AzureOpenAIProviderSchema = z.object({
  type: z.literal("azure-openai"),
  endpoint: z.string().url(), // https://<resource>.openai.azure.com
  // API key is resolved from Key Vault - this is the secret name, not the value
  apiKeySecret: z.string().optional(),
  // Or use managed identity (preferred)
  useManagedIdentity: z.boolean().default(true),
  models: z.array(ModelSpecSchema),
});

export type AzureOpenAIProvider = z.infer<typeof AzureOpenAIProviderSchema>;

// Foundry Local provider configuration (on-device inference)
export const FoundryLocalProviderSchema = z.object({
  type: z.literal("foundry-local"),
  // Model alias to load (e.g., "phi-3.5-mini", "qwen2.5-0.5b")
  modelAlias: z.string(),
  // Time-to-live for loaded model in seconds
  modelTtl: z.number().default(600),
  // Custom host if service is already running
  host: z.string().url().optional(),
  // Models are auto-detected, but can be overridden
  models: z.array(ModelSpecSchema).default([]),
  // Required for discriminated union compatibility
  endpoint: z.string().default("http://localhost"),
});

export type FoundryLocalProvider = z.infer<typeof FoundryLocalProviderSchema>;

// Provider union for future extensibility
export const ProviderSchema = z.discriminatedUnion("type", [
  AzureOpenAIProviderSchema,
  FoundryLocalProviderSchema,
]);

export type Provider = z.infer<typeof ProviderSchema>;

// Nushell execution configuration
export const NushellConfigSchema = z.object({
  // Executor type: "mock" (fake), "local" (run nu on host), "session" (ACA Dynamic Sessions)
  executorType: z.enum(["mock", "local", "session"]).default("mock"),
  // Azure Container Apps Dynamic Sessions pool endpoint (required for "session" type)
  sessionPoolEndpoint: z.string().url().optional(),
  // Path to nu binary (for "local" type)
  nuPath: z.string().optional(),
  // Working directory for Nushell commands
  workingDirectory: z.string().optional(),
  // Max execution time per script (ms)
  executionTimeoutMs: z.number().default(30000),
  // Commands allowed in scripts (allowlist)
  allowedCommands: z.array(z.string()).optional(),
  // Patterns to block (blocklist takes precedence)
  blockedPatterns: z.array(z.string()).optional(),
});

export type NushellConfig = z.infer<typeof NushellConfigSchema>;

// Memory/persistence configuration
export const MemoryConfigSchema = z.object({
  // Cosmos DB connection
  cosmosEndpoint: z.string().url(),
  databaseName: z.string().default("powerhoof"),
  // Containers
  conversationsContainer: z.string().default("conversations"),
  memoryContainer: z.string().default("memory"),
});

export type MemoryConfig = z.infer<typeof MemoryConfigSchema>;

// Server configuration
export const ServerConfigSchema = z.object({
  port: z.number().default(3000),
  host: z.string().default("0.0.0.0"),
  corsOrigins: z.array(z.string()).default(["*"]),
});

export type ServerConfig = z.infer<typeof ServerConfigSchema>;

// Key Vault configuration
export const KeyVaultConfigSchema = z.object({
  vaultUrl: z.string().url(), // https://<vault-name>.vault.azure.net
  useManagedIdentity: z.boolean().default(true),
});

export type KeyVaultConfig = z.infer<typeof KeyVaultConfigSchema>;

// Agent behavior configuration
export const AgentConfigSchema = z.object({
  // Primary model for conversations
  primaryModel: z.string(), // e.g., "azure-openai/gpt-4o"
  // System prompt additions
  systemPromptAdditions: z.string().optional(),
  // Concurrency limits
  maxConcurrentTasks: z.number().default(4),
  maxSubagents: z.number().default(8),
  // Context compaction mode
  compactionMode: z.enum(["none", "safeguard", "aggressive"]).default("safeguard"),
});

export type AgentConfig = z.infer<typeof AgentConfigSchema>;

// Channel configuration base schema
const ChannelConfigBaseSchema = z.object({
  enabled: z.boolean().default(false),
  dmPolicy: z.enum(["pairing", "open", "closed"]).default("pairing"),
  allowFrom: z.array(z.string()).optional(),
  groupPolicy: z.enum(["mention", "always", "closed"]).optional(),
  groups: z.array(z.string()).optional(),
});

// Microsoft Graph channel configuration
export const GraphChannelConfigSchema = ChannelConfigBaseSchema.extend({
  clientId: z.string(),
  clientSecretSecret: z.string().optional(),
  useManagedIdentity: z.boolean().default(true),
  tenantId: z.string(),
  scopes: z.array(z.string()).optional(),
  subscriptions: z
    .array(z.enum(["teams-messages", "outlook-mail", "sharepoint-items", "presence"]))
    .optional(),
  webhookEndpoint: z.string().url().optional(),
});

export type GraphChannelConfig = z.infer<typeof GraphChannelConfigSchema>;

// Dataverse channel configuration
export const DataverseChannelConfigSchema = ChannelConfigBaseSchema.extend({
  environmentUrl: z.string().url(),
  clientId: z.string(),
  clientSecretSecret: z.string().optional(),
  useManagedIdentity: z.boolean().default(true),
  tenantId: z.string(),
  messageTable: z.string().default("powerhoof_messages"),
  responseTable: z.string().default("powerhoof_responses"),
  webhookEndpoint: z.string().url().optional(),
});

export type DataverseChannelConfig = z.infer<typeof DataverseChannelConfigSchema>;

// Combined channels configuration
export const ChannelsConfigSchema = z.object({
  graph: GraphChannelConfigSchema.optional(),
  dataverse: DataverseChannelConfigSchema.optional(),
});

export type ChannelsConfig = z.infer<typeof ChannelsConfigSchema>;

// Deployment configuration (Azure vs On-Prem)
export const DeploymentConfigSchema = z.object({
  // Deployment mode: azure (public) or on-prem (behind data gateway)
  mode: z.enum(["azure", "on-prem"]).default("azure"),
  
  // Allow Nushell scripts to access local files (on-prem only)
  allowLocalFileAccess: z.boolean().default(false),
  
  // Allowed paths for file access (whitelist)
  allowedPaths: z.array(z.string()).default([]),
  
  // Allow HTTP requests to internal/private networks
  allowInternalHttp: z.boolean().default(false),
  
  // Patterns for internal HTTP (e.g., ["http://10.*", "http://192.168.*"])
  internalHttpPatterns: z.array(z.string()).default([]),
});

export type DeploymentConfig = z.infer<typeof DeploymentConfigSchema>;

// Authentication configuration
export const AuthConfigSchema = z.object({
  // Authentication mode: none, api-key, oauth, or optional (accepts both)
  mode: z.enum(["none", "api-key", "oauth", "optional"]).default("optional"),
  
  // API keys (loaded from Key Vault or env)
  apiKeySecrets: z.array(z.string()).optional(),
  
  // IPs that bypass auth (for on-prem gateway)
  bypassIps: z.array(z.string()).default([]),
  
  // OAuth 2.0 / Azure AD configuration (recommended for Power Platform)
  oauth: z.object({
    // Azure AD tenant ID ("common" for multi-tenant)
    tenantId: z.string(),
    // Application (client) ID from Azure AD app registration
    clientId: z.string(),
    // Expected audience (usually api://{clientId})
    audience: z.string().optional(),
    // Issuer URL (defaults to Azure AD v2.0)
    issuer: z.string().optional(),
    // Allow API key as fallback when OAuth fails
    allowApiKeyFallback: z.boolean().default(false),
  }).optional(),
  
  // Legacy azureAd alias (deprecated, use oauth instead)
  azureAd: z.object({
    tenantId: z.string(),
    clientId: z.string(),
    audience: z.string(),
  }).optional(),
});

export type AuthConfig = z.infer<typeof AuthConfigSchema>;

// Root configuration schema
export const PowerHoofConfigSchema = z.object({
  providers: z.record(z.string(), ProviderSchema),
  nushell: NushellConfigSchema.optional(),
  memory: MemoryConfigSchema.optional(),
  channels: ChannelsConfigSchema.optional(),
  server: ServerConfigSchema,
  keyVault: KeyVaultConfigSchema.optional(),
  agent: AgentConfigSchema,
  deployment: DeploymentConfigSchema.optional(),
  auth: AuthConfigSchema.optional(),
});

export type PowerHoofConfig = z.infer<typeof PowerHoofConfigSchema>;
