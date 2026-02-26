/**
 * Azure Key Vault Secret Resolver
 *
 * Resolves secrets from Key Vault using Managed Identity.
 * Caches secrets to minimize API calls.
 */

import { SecretClient } from "@azure/keyvault-secrets";
import { DefaultAzureCredential } from "@azure/identity";
import { logger } from "../utils/logger.js";

export interface SecretResolver {
  /**
   * Get a secret value by name.
   * Returns undefined if the secret doesn't exist.
   */
  getSecret(name: string): Promise<string | undefined>;

  /**
   * Get multiple secrets at once.
   * Returns a map of name -> value.
   */
  getSecrets(names: string[]): Promise<Map<string, string>>;

  /**
   * Check if Key Vault is reachable.
   */
  healthCheck(): Promise<boolean>;

  /**
   * Clear the secret cache.
   */
  clearCache(): void;
}

interface CachedSecret {
  value: string;
  expiresAt: number;
}

/**
 * Create a Key Vault secret resolver.
 */
export function createSecretResolver(vaultUrl: string): SecretResolver {
  logger.info(`Initializing Key Vault resolver for ${vaultUrl}`);

  const credential = new DefaultAzureCredential();
  const client = new SecretClient(vaultUrl, credential);

  // Cache secrets for 5 minutes by default
  const CACHE_TTL_MS = 5 * 60 * 1000;
  const cache = new Map<string, CachedSecret>();

  return {
    async getSecret(name: string): Promise<string | undefined> {
      // Check cache first
      const cached = cache.get(name);
      if (cached && cached.expiresAt > Date.now()) {
        logger.debug(`Secret ${name} retrieved from cache`);
        return cached.value;
      }

      try {
        const secret = await client.getSecret(name);

        if (secret.value) {
          // Cache the secret
          cache.set(name, {
            value: secret.value,
            expiresAt: Date.now() + CACHE_TTL_MS,
          });

          logger.debug(`Secret ${name} retrieved from Key Vault`);
          return secret.value;
        }

        return undefined;
      } catch (error) {
        if ((error as { code?: string }).code === "SecretNotFound") {
          logger.warn(`Secret ${name} not found in Key Vault`);
          return undefined;
        }
        logger.error(`Failed to get secret ${name}:`, error);
        throw error;
      }
    },

    async getSecrets(names: string[]): Promise<Map<string, string>> {
      const results = new Map<string, string>();

      // Fetch all secrets in parallel
      const promises = names.map(async (name) => {
        const value = await this.getSecret(name);
        if (value) {
          results.set(name, value);
        }
      });

      await Promise.all(promises);

      return results;
    },

    async healthCheck(): Promise<boolean> {
      try {
        // Try to list secrets (just get the first one to verify connectivity)
        const iterator = client.listPropertiesOfSecrets();
        await iterator.next();
        return true;
      } catch (error) {
        logger.warn("Key Vault health check failed:", error);
        return false;
      }
    },

    clearCache(): void {
      cache.clear();
      logger.debug("Secret cache cleared");
    },
  };
}

/**
 * Resolve secrets in a configuration object.
 * Replaces ${secret:name} placeholders with actual values.
 */
export async function resolveSecretsInConfig<T extends Record<string, unknown>>(
  config: T,
  resolver: SecretResolver
): Promise<T> {
  const secretPattern = /\$\{secret:([^}]+)\}/g;

  async function resolveValue(value: unknown): Promise<unknown> {
    if (typeof value === "string") {
      const matches = [...value.matchAll(secretPattern)];

      if (matches.length === 0) {
        return value;
      }

      let resolved = value;
      for (const match of matches) {
        const [placeholder, secretName] = match;
        const secretValue = await resolver.getSecret(secretName);

        if (secretValue) {
          resolved = resolved.replace(placeholder, secretValue);
        } else {
          logger.warn(`Secret ${secretName} not found, leaving placeholder`);
        }
      }

      return resolved;
    }

    if (Array.isArray(value)) {
      return Promise.all(value.map(resolveValue));
    }

    if (value && typeof value === "object") {
      const entries = await Promise.all(
        Object.entries(value).map(async ([k, v]) => [k, await resolveValue(v)])
      );
      return Object.fromEntries(entries);
    }

    return value;
  }

  return (await resolveValue(config)) as T;
}
