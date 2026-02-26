/**
 * SFI Security Layer - Secure Future Initiative Compliance
 *
 * Implements Microsoft SFI requirements:
 * - Input validation & sanitization
 * - Rate limiting
 * - Security headers
 * - Request authentication
 * - Audit logging
 */

import { Request, Response, NextFunction, RequestHandler } from "express";
import { logger } from "./logger.js";
import { z } from "zod";

// ============================================================================
// INPUT VALIDATION (SFI: Verify Explicitly)
// ============================================================================

const ChatRequestSchema = z.object({
  sessionId: z.string().uuid().optional(),
  conversationId: z.string().optional(),
  message: z
    .string()
    .min(1, "Message cannot be empty")
    .max(32000, "Message too long"),
  metadata: z.record(z.unknown()).optional(),
});

const SessionIdSchema = z.string().uuid();

export function validateChatRequest(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const result = ChatRequestSchema.safeParse(req.body);

  if (!result.success) {
    logger.warn("Invalid chat request", {
      errors: result.error.flatten(),
      ip: req.ip,
      userAgent: req.get("user-agent"),
    });

    res.status(400).json({
      error: "Invalid request",
      details: result.error.flatten().fieldErrors,
    });
    return;
  }

  req.body = result.data;
  next();
}

export function validateSessionId(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const result = SessionIdSchema.safeParse(req.params.sessionId);

  if (!result.success) {
    res.status(400).json({ error: "Invalid session ID format" });
    return;
  }

  next();
}

// ============================================================================
// RATE LIMITING (SFI: Assume Breach - Mitigate DoS)
// ============================================================================

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const rateLimitStore = new Map<string, RateLimitEntry>();

export interface RateLimitOptions {
  windowMs: number;
  maxRequests: number;
  keyGenerator?: (req: Request) => string;
}

export function rateLimit(options: RateLimitOptions): RequestHandler {
  const {
    windowMs = 60000,
    maxRequests = 60,
    keyGenerator = (req) => req.ip || "unknown",
  } = options;

  // Cleanup old entries periodically
  setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of rateLimitStore) {
      if (entry.resetAt < now) {
        rateLimitStore.delete(key);
      }
    }
  }, windowMs);

  return (req: Request, res: Response, next: NextFunction): void => {
    const key = keyGenerator(req);
    const now = Date.now();

    let entry = rateLimitStore.get(key);

    if (!entry || entry.resetAt < now) {
      entry = { count: 0, resetAt: now + windowMs };
      rateLimitStore.set(key, entry);
    }

    entry.count++;

    // Set rate limit headers
    res.setHeader("X-RateLimit-Limit", maxRequests);
    res.setHeader("X-RateLimit-Remaining", Math.max(0, maxRequests - entry.count));
    res.setHeader("X-RateLimit-Reset", Math.ceil(entry.resetAt / 1000));

    if (entry.count > maxRequests) {
      logger.warn("Rate limit exceeded", {
        key,
        count: entry.count,
        ip: req.ip,
      });

      res.status(429).json({
        error: "Too many requests",
        retryAfter: Math.ceil((entry.resetAt - now) / 1000),
      });
      return;
    }

    next();
  };
}

// ============================================================================
// SECURITY HEADERS (SFI: Defense in Depth)
// ============================================================================

export function securityHeaders(
  _req: Request,
  res: Response,
  next: NextFunction
): void {
  // Prevent clickjacking
  res.setHeader("X-Frame-Options", "DENY");

  // XSS protection
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-XSS-Protection", "1; mode=block");

  // Content Security Policy
  res.setHeader(
    "Content-Security-Policy",
    "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self' wss:"
  );

  // HSTS (only in production)
  if (process.env.NODE_ENV === "production") {
    res.setHeader(
      "Strict-Transport-Security",
      "max-age=31536000; includeSubDomains"
    );
  }

  // Referrer policy
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");

  // Permissions policy
  res.setHeader(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=(), payment=()"
  );

  // Remove server identification
  res.removeHeader("X-Powered-By");

  next();
}

// ============================================================================
// AUDIT LOGGING (SFI: Monitor & Detect)
// ============================================================================

export interface AuditEvent {
  timestamp: string;
  eventType: string;
  action: string;
  actor: {
    ip?: string;
    userAgent?: string;
    sessionId?: string;
  };
  resource?: {
    type: string;
    id?: string;
  };
  result: "success" | "failure" | "denied";
  details?: Record<string, unknown>;
}

const auditLog: AuditEvent[] = [];
const MAX_AUDIT_LOG_SIZE = 10000;

export function logAuditEvent(event: Omit<AuditEvent, "timestamp">): void {
  const fullEvent: AuditEvent = {
    ...event,
    timestamp: new Date().toISOString(),
  };

  // Log to structured logger (for SIEM ingestion)
  logger.info("AUDIT", fullEvent);

  // Keep in-memory buffer for recent events
  auditLog.push(fullEvent);
  if (auditLog.length > MAX_AUDIT_LOG_SIZE) {
    auditLog.shift();
  }
}

export function getRecentAuditEvents(count: number = 100): AuditEvent[] {
  return auditLog.slice(-count);
}

export function auditMiddleware(action: string): RequestHandler {
  return (req: Request, res: Response, next: NextFunction): void => {
    const startTime = Date.now();

    // Capture response
    const originalEnd = res.end.bind(res);
    (res.end as typeof res.end) = function (
      ...args: Parameters<typeof originalEnd>
    ): ReturnType<typeof originalEnd> {
      const duration = Date.now() - startTime;

      logAuditEvent({
        eventType: "api_request",
        action,
        actor: {
          ip: req.ip,
          userAgent: req.get("user-agent"),
          sessionId: req.body?.sessionId || req.params?.sessionId,
        },
        resource: {
          type: "endpoint",
          id: req.path,
        },
        result: res.statusCode < 400 ? "success" : "failure",
        details: {
          method: req.method,
          statusCode: res.statusCode,
          durationMs: duration,
        },
      });

      return originalEnd(...args);
    } as typeof res.end;

    next();
  };
}

// ============================================================================
// REQUEST AUTHENTICATION (SFI: Verify Explicitly)
// ============================================================================

export interface AuthConfig {
  enabled: boolean;
  apiKeyHeader?: string;
  validateApiKey?: (key: string) => Promise<boolean>;
}

export function createAuthMiddleware(config: AuthConfig): RequestHandler {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    if (!config.enabled) {
      next();
      return;
    }

    const apiKey = req.get(config.apiKeyHeader || "X-API-Key");

    if (!apiKey) {
      logAuditEvent({
        eventType: "auth",
        action: "api_key_missing",
        actor: { ip: req.ip },
        result: "denied",
      });

      res.status(401).json({ error: "API key required" });
      return;
    }

    try {
      const isValid = config.validateApiKey
        ? await config.validateApiKey(apiKey)
        : true;

      if (!isValid) {
        logAuditEvent({
          eventType: "auth",
          action: "api_key_invalid",
          actor: { ip: req.ip },
          result: "denied",
        });

        res.status(403).json({ error: "Invalid API key" });
        return;
      }

      next();
    } catch (error) {
      logger.error("Auth validation failed", error);
      res.status(500).json({ error: "Authentication error" });
    }
  };
}

// ============================================================================
// CORS CONFIGURATION (SFI: Network Protection)
// ============================================================================

export interface CorsOptions {
  allowedOrigins: string[];
  allowedMethods?: string[];
  allowedHeaders?: string[];
  maxAge?: number;
}

export function corsMiddleware(options: CorsOptions): RequestHandler {
  const {
    allowedOrigins,
    allowedMethods = ["GET", "POST", "DELETE", "OPTIONS"],
    allowedHeaders = ["Content-Type", "Authorization", "X-API-Key"],
    maxAge = 86400,
  } = options;

  return (req: Request, res: Response, next: NextFunction): void => {
    const origin = req.get("origin");

    // Check if origin is allowed
    if (origin && allowedOrigins.includes(origin)) {
      res.setHeader("Access-Control-Allow-Origin", origin);
    } else if (allowedOrigins.includes("*")) {
      res.setHeader("Access-Control-Allow-Origin", "*");
    }

    res.setHeader("Access-Control-Allow-Methods", allowedMethods.join(", "));
    res.setHeader("Access-Control-Allow-Headers", allowedHeaders.join(", "));
    res.setHeader("Access-Control-Max-Age", maxAge.toString());
    res.setHeader("Access-Control-Allow-Credentials", "true");

    // Handle preflight
    if (req.method === "OPTIONS") {
      res.status(204).end();
      return;
    }

    next();
  };
}
