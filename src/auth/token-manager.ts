/**
 * Token Manager
 * 
 * Centralized token management for Microsoft Graph API and Dataverse.
 * Handles token acquisition, caching, refresh, and expiry.
 */

import { DefaultAzureCredential, ClientSecretCredential, InteractiveBrowserCredential } from "@azure/identity";
import { createLogger } from "../utils/logger.js";

const logger = createLogger("token-manager");

export interface TokenConfig {
  // Azure AD App Registration
  tenantId?: string;
  clientId?: string;
  clientSecret?: string;
  
  // Resource URLs
  graphApiUrl?: string;
  dataverseUrl?: string;
  
  // Auth method
  authMethod?: "default" | "client-secret" | "interactive";
}

interface CachedToken {
  token: string;
  expiresAt: Date;
  resource: string;
}

/**
 * Manages OAuth tokens for Microsoft services
 */
export class TokenManager {
  private tokens: Map<string, CachedToken> = new Map();
  private credential: DefaultAzureCredential | ClientSecretCredential | InteractiveBrowserCredential;
  private config: TokenConfig;
  
  // Standard Microsoft scopes
  static readonly SCOPES = {
    GRAPH: "https://graph.microsoft.com/.default",
    DATAVERSE: (url: string) => `${url}/.default`,
    POWER_PLATFORM: "https://service.powerapps.com/.default",
  };

  constructor(config: TokenConfig = {}) {
    this.config = {
      graphApiUrl: "https://graph.microsoft.com",
      authMethod: "default",
      ...config
    };
    
    this.credential = this.createCredential();
    logger.info("TokenManager initialized", { method: this.config.authMethod });
  }

  private createCredential() {
    switch (this.config.authMethod) {
      case "client-secret":
        if (!this.config.tenantId || !this.config.clientId || !this.config.clientSecret) {
          throw new Error("Client secret auth requires tenantId, clientId, and clientSecret");
        }
        return new ClientSecretCredential(
          this.config.tenantId,
          this.config.clientId,
          this.config.clientSecret
        );
      
      case "interactive":
        return new InteractiveBrowserCredential({
          tenantId: this.config.tenantId,
          clientId: this.config.clientId,
        });
      
      case "default":
      default:
        return new DefaultAzureCredential();
    }
  }

  /**
   * Get a valid token for a resource
   */
  async getToken(scope: string): Promise<string> {
    // Check cache first
    const cached = this.tokens.get(scope);
    if (cached && this.isTokenValid(cached)) {
      logger.debug("Using cached token", { scope });
      return cached.token;
    }

    // Acquire new token
    logger.info("Acquiring new token", { scope });
    
    try {
      const response = await this.credential.getToken(scope);
      
      if (!response) {
        throw new Error(`Failed to acquire token for scope: ${scope}`);
      }

      const token: CachedToken = {
        token: response.token,
        expiresAt: response.expiresOnTimestamp 
          ? new Date(response.expiresOnTimestamp)
          : new Date(Date.now() + 3600000), // Default 1 hour
        resource: scope,
      };

      this.tokens.set(scope, token);
      logger.info("Token acquired", { scope, expiresAt: token.expiresAt });
      
      return token.token;
    } catch (error) {
      logger.error("Token acquisition failed", { scope, error });
      throw error;
    }
  }

  /**
   * Get Microsoft Graph API token
   */
  async getGraphToken(): Promise<string> {
    return this.getToken(TokenManager.SCOPES.GRAPH);
  }

  /**
   * Get Dataverse token
   */
  async getDataverseToken(environmentUrl?: string): Promise<string> {
    const url = environmentUrl || this.config.dataverseUrl;
    if (!url) {
      throw new Error("Dataverse URL required - set DATAVERSE_ENV_URL or pass environmentUrl");
    }
    return this.getToken(TokenManager.SCOPES.DATAVERSE(url));
  }

  /**
   * Get Power Platform token
   */
  async getPowerPlatformToken(): Promise<string> {
    return this.getToken(TokenManager.SCOPES.POWER_PLATFORM);
  }

  /**
   * Check if token is still valid (with 5 min buffer)
   */
  private isTokenValid(token: CachedToken): boolean {
    const bufferMs = 5 * 60 * 1000; // 5 minutes
    return token.expiresAt.getTime() > Date.now() + bufferMs;
  }

  /**
   * Clear all cached tokens
   */
  clearCache(): void {
    this.tokens.clear();
    logger.info("Token cache cleared");
  }

  /**
   * Clear specific token
   */
  clearToken(scope: string): void {
    this.tokens.delete(scope);
    logger.debug("Token cleared", { scope });
  }

  /**
   * Get token status for monitoring
   */
  getStatus(): { scope: string; expiresAt: Date; valid: boolean }[] {
    return Array.from(this.tokens.entries()).map(([scope, token]) => ({
      scope,
      expiresAt: token.expiresAt,
      valid: this.isTokenValid(token),
    }));
  }
}

/**
 * Create token manager from environment variables
 */
export function createTokenManagerFromEnv(): TokenManager {
  return new TokenManager({
    tenantId: process.env.AZURE_TENANT_ID,
    clientId: process.env.AZURE_CLIENT_ID,
    clientSecret: process.env.AZURE_CLIENT_SECRET,
    dataverseUrl: process.env.DATAVERSE_ENV_URL,
    authMethod: process.env.AUTH_METHOD as TokenConfig["authMethod"] || "default",
  });
}

// Singleton instance
let tokenManagerInstance: TokenManager | null = null;

export function getTokenManager(): TokenManager {
  if (!tokenManagerInstance) {
    tokenManagerInstance = createTokenManagerFromEnv();
  }
  return tokenManagerInstance;
}
