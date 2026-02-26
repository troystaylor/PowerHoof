/**
 * API Key Authentication Middleware
 *
 * Provides simple API key authentication for Power Platform connectors.
 * Supports both Azure deployment (required) and on-prem (optional/bypass).
 */

import { Request, Response, NextFunction } from "express";
import { createLogger } from "../utils/logger.js";

const logger = createLogger("api-key-auth");

export interface ApiKeyAuthConfig {
  /**
   * Authentication mode:
   * - "none": No authentication required (local dev)
   * - "api-key": Require X-API-Key header
   * - "optional": Accept API key but don't require it
   */
  mode: "none" | "api-key" | "optional";

  /**
   * Valid API keys (can have multiple for rotation)
   */
  apiKeys?: string[];

  /**
   * Header name for API key (default: X-API-Key)
   */
  headerName?: string;

  /**
   * IPs that bypass auth (e.g., localhost for gateway)
   */
  bypassIps?: string[];

  /**
   * Paths that don't require auth (e.g., /health)
   */
  publicPaths?: string[];
}

const DEFAULT_CONFIG: ApiKeyAuthConfig = {
  mode: "optional",
  headerName: "X-API-Key",
  bypassIps: ["127.0.0.1", "::1", "::ffff:127.0.0.1"],
  publicPaths: ["/health", "/health/live", "/health/ready", "/openapi.json", "/openapi.yaml"],
};

/**
 * Create API key authentication middleware.
 */
export function createApiKeyAuth(config: Partial<ApiKeyAuthConfig> = {}) {
  const resolvedConfig: ApiKeyAuthConfig = {
    ...DEFAULT_CONFIG,
    ...config,
    bypassIps: [...(DEFAULT_CONFIG.bypassIps ?? []), ...(config.bypassIps ?? [])],
    publicPaths: [...(DEFAULT_CONFIG.publicPaths ?? []), ...(config.publicPaths ?? [])],
  };

  const headerName = resolvedConfig.headerName ?? "X-API-Key";
  const validKeys = new Set(resolvedConfig.apiKeys ?? []);
  const bypassIps = new Set(resolvedConfig.bypassIps ?? []);
  const publicPaths = new Set(resolvedConfig.publicPaths ?? []);

  return (req: Request, res: Response, next: NextFunction): void => {
    // Check if path is public
    if (publicPaths.has(req.path)) {
      next();
      return;
    }

    // Check if mode is "none"
    if (resolvedConfig.mode === "none") {
      next();
      return;
    }

    // Check if IP is bypassed (localhost for on-prem gateway)
    const clientIp = req.ip ?? req.socket.remoteAddress ?? "";
    if (bypassIps.has(clientIp)) {
      logger.debug("Auth bypassed for local IP", { ip: clientIp });
      next();
      return;
    }

    // Get API key from header
    const apiKey = req.headers[headerName.toLowerCase()] as string | undefined;

    // Validate API key
    if (apiKey && validKeys.has(apiKey)) {
      // Valid key provided
      logger.debug("API key validated", { ip: clientIp });
      next();
      return;
    }

    // No valid key
    if (resolvedConfig.mode === "optional") {
      // Optional mode - allow through but log
      if (apiKey) {
        logger.warn("Invalid API key provided (optional mode)", { ip: clientIp });
      }
      next();
      return;
    }

    // Required mode - reject
    logger.warn("Authentication failed", {
      ip: clientIp,
      hasKey: !!apiKey,
      path: req.path,
    });

    res.status(401).json({
      error: "Unauthorized",
      message: "Valid API key required in X-API-Key header",
    });
  };
}

/**
 * Load API key auth config from environment.
 */
export function loadApiKeyAuthFromEnv(): ApiKeyAuthConfig {
  const mode =
    (process.env.AUTH_MODE as ApiKeyAuthConfig["mode"]) ??
    (process.env.POWERHOOF_API_KEY ? "api-key" : "optional");

  const apiKeys: string[] = [];

  // Support multiple keys via comma-separated list or numbered env vars
  if (process.env.POWERHOOF_API_KEY) {
    apiKeys.push(process.env.POWERHOOF_API_KEY);
  }
  if (process.env.POWERHOOF_API_KEYS) {
    apiKeys.push(...process.env.POWERHOOF_API_KEYS.split(",").map((k) => k.trim()));
  }

  // Support POWERHOOF_API_KEY_1, POWERHOOF_API_KEY_2, etc.
  for (let i = 1; i <= 10; i++) {
    const key = process.env[`POWERHOOF_API_KEY_${i}`];
    if (key) apiKeys.push(key);
  }

  // Additional bypass IPs from env
  const bypassIps = process.env.AUTH_BYPASS_IPS?.split(",").map((ip) => ip.trim()) ?? [];

  logger.info("API key auth loaded from environment", {
    mode,
    keyCount: apiKeys.length,
    bypassIpCount: bypassIps.length,
  });

  return {
    mode,
    apiKeys: apiKeys.length > 0 ? apiKeys : undefined,
    bypassIps,
  };
}
