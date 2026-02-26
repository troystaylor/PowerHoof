/**
 * OAuth 2.0 / Azure AD Authentication Middleware
 *
 * Validates Azure AD (Microsoft Entra ID) bearer tokens for Power Platform integration.
 * Supports both delegated (user) and application permissions.
 */

import { Request, Response, NextFunction } from "express";
import { createLogger } from "../utils/logger.js";
import * as jose from "jose";

const logger = createLogger("oauth-auth");

export interface OAuthConfig {
  /**
   * Azure AD tenant ID (use "common" for multi-tenant)
   */
  tenantId: string;

  /**
   * Application (client) ID from Azure AD app registration
   */
  clientId: string;

  /**
   * Expected audience (usually api://{clientId} or the app ID URI)
   */
  audience: string;

  /**
   * Issuer URL (defaults to Azure AD v2.0 endpoint)
   */
  issuer?: string;

  /**
   * Paths that don't require authentication
   */
  publicPaths?: string[];

  /**
   * IPs that bypass auth (for on-prem gateway)
   */
  bypassIps?: string[];

  /**
   * Allow fallback to API key if OAuth fails
   */
  allowApiKeyFallback?: boolean;

  /**
   * API keys for fallback (if enabled)
   */
  apiKeys?: string[];
}

interface JWTPayload {
  iss: string;
  sub: string;
  aud: string | string[];
  exp: number;
  iat: number;
  nbf?: number;
  name?: string;
  preferred_username?: string;
  oid?: string; // Object ID (user or service principal)
  tid?: string; // Tenant ID
  azp?: string; // Authorized party (client ID that requested the token)
  scp?: string; // Scopes (delegated permissions)
  roles?: string[]; // App roles (application permissions)
}

// Extend Express Request to include user info
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        name?: string;
        email?: string;
        tenantId?: string;
        scopes?: string[];
        roles?: string[];
        isAppOnly: boolean;
      };
    }
  }
}

const DEFAULT_PUBLIC_PATHS = [
  "/health",
  "/health/live",
  "/health/ready",
  "/openapi.json",
  "/openapi.yaml",
  "/.well-known/oauth-authorization-server",
  "/.well-known/openid-configuration",
];

const DEFAULT_BYPASS_IPS = ["127.0.0.1", "::1", "::ffff:127.0.0.1"];

// Cache for JWKS (JSON Web Key Set)
let jwksCache: jose.JWTVerifyGetKey | null = null;
let jwksCacheTime = 0;
const JWKS_CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Get JWKS for token verification (with caching)
 */
async function getJWKS(tenantId: string): Promise<jose.JWTVerifyGetKey> {
  const now = Date.now();

  if (jwksCache && now - jwksCacheTime < JWKS_CACHE_TTL) {
    return jwksCache;
  }

  const jwksUri =
    tenantId === "common"
      ? "https://login.microsoftonline.com/common/discovery/v2.0/keys"
      : `https://login.microsoftonline.com/${tenantId}/discovery/v2.0/keys`;

  logger.info("Fetching JWKS from Azure AD", { jwksUri });

  jwksCache = jose.createRemoteJWKSet(new URL(jwksUri));
  jwksCacheTime = now;

  return jwksCache;
}

/**
 * Create OAuth 2.0 authentication middleware for Azure AD.
 */
export function createOAuthAuth(config: OAuthConfig) {
  const {
    tenantId,
    clientId,
    audience,
    issuer,
    publicPaths = [],
    bypassIps = [],
    allowApiKeyFallback = false,
    apiKeys = [],
  } = config;

  const allPublicPaths = new Set([...DEFAULT_PUBLIC_PATHS, ...publicPaths]);
  const allBypassIps = new Set([...DEFAULT_BYPASS_IPS, ...bypassIps]);
  const validApiKeys = new Set(apiKeys);

  logger.info("OAuth middleware configured", {
    tenantId: tenantId === "common" ? "multi-tenant" : tenantId,
    clientId,
    audience,
    publicPaths: allPublicPaths.size,
    bypassIps: allBypassIps.size,
    apiKeyFallback: allowApiKeyFallback,
  });

  // Expected issuer URL
  const expectedIssuer =
    issuer ??
    (tenantId === "common"
      ? "https://login.microsoftonline.com/{tenantid}/v2.0"
      : `https://login.microsoftonline.com/${tenantId}/v2.0`);

  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    // Check if path is public
    if (allPublicPaths.has(req.path)) {
      next();
      return;
    }

    // Check if IP is bypassed (on-prem gateway)
    const clientIp = req.ip ?? req.socket.remoteAddress ?? "";
    if (allBypassIps.has(clientIp)) {
      logger.debug("Auth bypassed for local IP", { ip: clientIp });
      next();
      return;
    }

    // Get Authorization header
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      // Try API key fallback
      if (allowApiKeyFallback) {
        const apiKey = req.headers["x-api-key"] as string;
        if (apiKey && validApiKeys.has(apiKey)) {
          logger.debug("Authenticated via API key fallback");
          next();
          return;
        }
      }

      res.status(401).json({
        error: "Unauthorized",
        message: "Authorization header required",
      });
      return;
    }

    // Extract Bearer token
    const match = authHeader.match(/^Bearer\s+(.+)$/i);
    if (!match) {
      res.status(401).json({
        error: "Unauthorized",
        message: "Invalid authorization header format. Expected: Bearer <token>",
      });
      return;
    }

    const token = match[1];

    try {
      // Get JWKS for verification
      const jwks = await getJWKS(tenantId);

      // Verify the token
      const { payload } = await jose.jwtVerify(token, jwks, {
        audience,
        // For multi-tenant, we need to validate issuer pattern
        issuer: tenantId === "common" ? undefined : expectedIssuer,
      });

      const jwtPayload = payload as unknown as JWTPayload;

      // For multi-tenant apps, validate issuer pattern
      if (tenantId === "common") {
        const issuerPattern = /^https:\/\/login\.microsoftonline\.com\/[a-f0-9-]+\/v2\.0$/;
        if (!issuerPattern.test(jwtPayload.iss)) {
          throw new Error("Invalid token issuer");
        }
      }

      // Determine if this is app-only or delegated
      const isAppOnly = !jwtPayload.scp && !!jwtPayload.roles;

      // Set user info on request
      req.user = {
        id: jwtPayload.oid ?? jwtPayload.sub,
        name: jwtPayload.name,
        email: jwtPayload.preferred_username,
        tenantId: jwtPayload.tid,
        scopes: jwtPayload.scp?.split(" "),
        roles: jwtPayload.roles,
        isAppOnly,
      };

      logger.debug("OAuth token validated", {
        userId: req.user.id,
        isAppOnly,
        tenantId: jwtPayload.tid,
      });

      next();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Token validation failed";
      logger.warn("OAuth authentication failed", { error: message, ip: clientIp });

      // Try API key fallback
      if (allowApiKeyFallback) {
        const apiKey = req.headers["x-api-key"] as string;
        if (apiKey && validApiKeys.has(apiKey)) {
          logger.debug("Authenticated via API key fallback after OAuth failure");
          next();
          return;
        }
      }

      res.status(401).json({
        error: "Unauthorized",
        message: "Invalid or expired token",
        details: process.env.NODE_ENV !== "production" ? message : undefined,
      });
    }
  };
}

/**
 * Load OAuth config from environment variables.
 */
export function loadOAuthConfigFromEnv(): OAuthConfig | null {
  const tenantId = process.env.AZURE_AD_TENANT_ID;
  const clientId = process.env.AZURE_AD_CLIENT_ID;
  const audience = process.env.AZURE_AD_AUDIENCE ?? (clientId ? `api://${clientId}` : "");

  if (!tenantId || !clientId) {
    logger.info("OAuth not configured (AZURE_AD_TENANT_ID and AZURE_AD_CLIENT_ID required)");
    return null;
  }

  const apiKeys: string[] = [];
  if (process.env.POWERHOOF_API_KEY) {
    apiKeys.push(process.env.POWERHOOF_API_KEY);
  }

  logger.info("OAuth config loaded from environment", {
    tenantId: tenantId === "common" ? "common (multi-tenant)" : tenantId,
    clientId,
    audience,
    apiKeyFallback: apiKeys.length > 0,
  });

  return {
    tenantId,
    clientId,
    audience,
    allowApiKeyFallback: apiKeys.length > 0,
    apiKeys,
  };
}
