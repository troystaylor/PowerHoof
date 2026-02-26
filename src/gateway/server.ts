/**
 * PowerHoof API Gateway Server
 *
 * Features:
 * - Express HTTP server with WebSocket support
 * - SFI-compliant security (helmet, rate limiting, audit logging)
 * - Circuit breaker for resilient Azure OpenAI calls
 * - LLM response streaming
 * - Proper TypeScript types throughout
 */

import express, { Express, Request, Response, NextFunction } from "express";
import helmet from "helmet";
import { WebSocketServer, WebSocket } from "ws";
import { createServer, Server as HttpServer, IncomingMessage } from "http";
import { randomUUID } from "crypto";
import path from "path";
import { PowerHoofConfig } from "../config/index.js";
import { Orchestrator, TurnResult } from "../conversation/index.js";
import { MemoryStore } from "../memory/index.js";
import {
  logger,
  securityHeaders,
  rateLimit,
  auditMiddleware,
  logAuditEvent,
  validateChatRequest,
  recordTokenUsage,
  getTokenComparison,
} from "../utils/index.js";
import type { ChannelRouter, PairingService } from "../channels/index.js";
import type { SkillRegistry } from "../skills/index.js";
import { skillMetrics } from "../skills/metrics.js";
import { generateOpenAPISpec, generateOpenAPIYaml } from "./openapi.js";
import { createOAuthAuth, createApiKeyAuth, loadOAuthConfigFromEnv } from "../auth/index.js";

// ============================================================================
// CIRCUIT BREAKER (Resilience Pattern)
// ============================================================================

interface CircuitBreakerOptions {
  failureThreshold: number;
  successThreshold: number;
  timeout: number;
  resetTimeout: number;
}

type CircuitState = "closed" | "open" | "half-open";

interface CircuitBreakerStats {
  state: CircuitState;
  failures: number;
  successes: number;
  lastFailure: Date | null;
  lastSuccess: Date | null;
}

class CircuitBreaker<T> {
  private state: CircuitState = "closed";
  private failures = 0;
  private successes = 0;
  private lastFailure: Date | null = null;
  private lastSuccess: Date | null = null;
  private nextAttempt: number = 0;

  constructor(
    private readonly fn: () => Promise<T>,
    private readonly options: CircuitBreakerOptions
  ) {}

  async execute(): Promise<T> {
    if (this.state === "open") {
      if (Date.now() < this.nextAttempt) {
        throw new Error("Circuit breaker is open - service unavailable");
      }
      this.state = "half-open";
      logger.info("Circuit breaker transitioning to half-open");
    }

    try {
      const result = await Promise.race([
        this.fn(),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error("Circuit breaker timeout")), this.options.timeout)
        ),
      ]);

      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess(): void {
    this.lastSuccess = new Date();
    this.failures = 0;

    if (this.state === "half-open") {
      this.successes++;
      if (this.successes >= this.options.successThreshold) {
        this.state = "closed";
        this.successes = 0;
        logger.info("Circuit breaker closed - service recovered");
      }
    }
  }

  private onFailure(): void {
    this.lastFailure = new Date();
    this.failures++;
    this.successes = 0;

    if (this.failures >= this.options.failureThreshold) {
      this.state = "open";
      this.nextAttempt = Date.now() + this.options.resetTimeout;
      logger.warn(`Circuit breaker opened - will retry at ${new Date(this.nextAttempt).toISOString()}`);
    }
  }

  getStats(): CircuitBreakerStats {
    return {
      state: this.state,
      failures: this.failures,
      successes: this.successes,
      lastFailure: this.lastFailure,
      lastSuccess: this.lastSuccess,
    };
  }

  reset(): void {
    this.state = "closed";
    this.failures = 0;
    this.successes = 0;
    logger.info("Circuit breaker manually reset");
  }
}

// ============================================================================
// STREAMING SUPPORT
// ============================================================================

interface StreamChunk {
  type: "content" | "reasoning" | "nushell" | "result" | "error" | "done";
  content?: string;
  data?: unknown;
}

function createSSEResponse(res: Response): {
  sendChunk: (chunk: StreamChunk) => void;
  end: () => void;
} {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();

  return {
    sendChunk(chunk: StreamChunk): void {
      res.write(`data: ${JSON.stringify(chunk)}\n\n`);
    },
    end(): void {
      res.write(`data: ${JSON.stringify({ type: "done" })}\n\n`);
      res.end();
    },
  };
}

// ============================================================================
// TYPES
// ============================================================================

export interface GatewayServer {
  close(): Promise<void>;
  getCircuitBreakerStats(): CircuitBreakerStats;
}

interface ChatRequest {
  conversationId?: string;
  message: string;
  metadata?: Record<string, unknown>;
}

interface ChatResponse {
  conversationId: string;
  response: string;
  tokensUsed: {
    prompt: number;
    completion: number;
    total: number;
  };
  nushellExecutions?: Array<{
    script: string;
    output: string;
    success: boolean;
    durationMs: number;
  }>;
  reasoning?: string;
}

// Circuit breaker configuration
const CIRCUIT_BREAKER_OPTIONS: CircuitBreakerOptions = {
  failureThreshold: 5,
  successThreshold: 2,
  timeout: 60000, // 60s for LLM calls
  resetTimeout: 30000, // 30s before retry
};

// Global circuit breaker instance for LLM calls
let llmCircuitBreaker: CircuitBreaker<TurnResult> | null = null;

/**
 * Additional server options for channels, pairing, and skills.
 */
export interface ServerOptions {
  channelRouter?: ChannelRouter;
  pairing?: PairingService;
  skillRegistry?: SkillRegistry;
}

/**
 * Start the gateway server.
 */
export async function startServer(
  config: PowerHoofConfig,
  orchestrator: Orchestrator,
  memory: MemoryStore,
  options: ServerOptions = {}
): Promise<GatewayServer> {
  const { channelRouter, pairing, skillRegistry } = options;
  const app: Express = express();
  const httpServer: HttpServer = createServer(app);

  // ============================================================================
  // MIDDLEWARE SETUP
  // ============================================================================

  // Helmet security headers (SFI compliant)
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'", "'unsafe-inline'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", "data:"],
          connectSrc: ["'self'", "wss:", "ws:"],
        },
      },
      hsts: process.env.NODE_ENV === "production",
    })
  );

  // Parse JSON
  app.use(express.json({ limit: "1mb" }));

  // Additional SFI security headers
  app.use(securityHeaders);

  // Rate limiting (SFI: Assume Breach)
  app.use(
    rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      maxRequests: 100,
    })
  );

  // CORS
  app.use((req: Request, res: Response, next: NextFunction): void => {
    const origin = req.headers.origin || "*";
    if (config.server.corsOrigins.includes("*") || config.server.corsOrigins.includes(origin)) {
      res.header("Access-Control-Allow-Origin", origin);
      res.header("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS");
      res.header("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Request-ID");
      res.header("Access-Control-Allow-Credentials", "true");
    }
    if (req.method === "OPTIONS") {
      res.sendStatus(204);
      return;
    }
    next();
  });

  // Static file serving for Web UI
  // Path works for both dev (src/) and dist (dist/)
  const publicPath = path.resolve(process.cwd(), "public");
  app.use(express.static(publicPath));
  logger.info("Static file serving enabled", { publicPath });

  // Request ID middleware
  app.use((req: Request, _res: Response, next: NextFunction): void => {
    req.headers["x-request-id"] = req.headers["x-request-id"] || randomUUID();
    next();
  });

  // Request logging
  app.use((req: Request, _res: Response, next: NextFunction): void => {
    logger.debug(`${req.method} ${req.path}`, {
      requestId: req.headers["x-request-id"],
      ip: req.ip,
    });
    next();
  });

  // ============================================================================
  // AUTHENTICATION MIDDLEWARE
  // ============================================================================

  // Configure authentication based on config or environment
  const authMode = config.auth?.mode ?? "optional";
  
  if (authMode !== "none") {
    // Try OAuth first (recommended for Power Platform)
    const oauthConfig = config.auth?.oauth ?? loadOAuthConfigFromEnv();
    
    if (oauthConfig) {
      const oauthMiddleware = createOAuthAuth({
        tenantId: oauthConfig.tenantId,
        clientId: oauthConfig.clientId,
        audience: oauthConfig.audience ?? `api://${oauthConfig.clientId}`,
        issuer: oauthConfig.issuer,
        bypassIps: config.auth?.bypassIps,
        allowApiKeyFallback: oauthConfig.allowApiKeyFallback ?? (authMode === "optional"),
        apiKeys: config.auth?.apiKeySecrets,
      });
      app.use(oauthMiddleware);
      logger.info("OAuth authentication enabled", { 
        mode: authMode,
        clientId: oauthConfig.clientId,
        apiKeyFallback: oauthConfig.allowApiKeyFallback ?? (authMode === "optional"),
      });
    } else if (authMode === "api-key") {
      // Fall back to API key only auth
      const apiKeyMiddleware = createApiKeyAuth({
        mode: authMode,
        apiKeys: config.auth?.apiKeySecrets,
        bypassIps: config.auth?.bypassIps,
      });
      app.use(apiKeyMiddleware);
      logger.info("API key authentication enabled", { mode: authMode });
    } else {
      logger.info("No authentication configured", { mode: authMode });
    }
  } else {
    logger.warn("Authentication disabled (mode: none) - not recommended for production");
  }

  // ============================================================================
  // HEALTH ENDPOINTS
  // ============================================================================

  app.get("/health", async (_req: Request, res: Response): Promise<void> => {
    const memoryHealthy = await memory.healthCheck();
    const circuitState = llmCircuitBreaker?.getStats().state ?? "closed";

    const status = memoryHealthy && circuitState !== "open" ? "healthy" : "degraded";

    res.status(status === "healthy" ? 200 : 200).json({
      status,
      timestamp: new Date().toISOString(),
      components: {
        memory: memoryHealthy ? "up" : "down",
        llm: circuitState === "open" ? "down" : "up",
        circuitBreaker: circuitState,
      },
    });
  });

  app.get("/health/live", (_req: Request, res: Response): void => {
    res.status(200).json({ status: "ok" });
  });

  app.get("/health/ready", async (_req: Request, res: Response): Promise<void> => {
    const memoryHealthy = await memory.healthCheck();
    const circuitState = llmCircuitBreaker?.getStats().state ?? "closed";

    if (!memoryHealthy || circuitState === "open") {
      res.status(503).json({
        ready: false,
        memory: memoryHealthy,
        circuitBreaker: circuitState,
      });
      return;
    }

    res.status(200).json({ ready: true });
  });

  // Circuit breaker status endpoint
  app.get("/health/circuit-breaker", (_req: Request, res: Response): void => {
    if (llmCircuitBreaker) {
      res.json(llmCircuitBreaker.getStats());
    } else {
      res.json({ state: "not-initialized", message: "No requests processed yet" });
    }
  });

  // ============================================================================
  // CHAT ENDPOINTS
  // ============================================================================

  // Standard chat endpoint with circuit breaker
  app.post(
    "/chat",
    auditMiddleware("chat_message"),
    validateChatRequest,
    async (req: Request, res: Response): Promise<void> => {
      const requestId = req.headers["x-request-id"] as string;

      try {
        const { conversationId, message, metadata } = req.body as ChatRequest;

        logger.info(
          conversationId
            ? `Chat request for conversation ${conversationId}`
            : "Starting new conversation",
          { requestId }
        );

        let resultConversationId = conversationId;

        // Create circuit breaker for LLM call
        const executeChat = async (): Promise<TurnResult> => {
          if (resultConversationId) {
            return orchestrator.processMessage(resultConversationId, message);
          } else {
            const { conversationId: newId, result: newResult } =
              await orchestrator.startConversation(message, metadata);
            resultConversationId = newId;
            return newResult;
          }
        };

        llmCircuitBreaker = new CircuitBreaker(executeChat, CIRCUIT_BREAKER_OPTIONS);

        const result = await llmCircuitBreaker.execute();

        // Record token usage
        recordTokenUsage({
          userMessage: result.tokenUsage.prompt,
          assistantResponse: result.tokenUsage.completion,
        });

        const response: ChatResponse = {
          conversationId: resultConversationId!,
          response: result.response,
          tokensUsed: result.tokenUsage,
          nushellExecutions: result.nushellExecutions.map((e) => ({
            script: e.validation?.script || "",
            output: e.output,
            success: e.success,
            durationMs: e.durationMs,
          })),
          reasoning: result.reasoning,
        };

        res.json(response);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Internal server error";

        logger.error("Chat error:", error);

        logAuditEvent({
          eventType: "error",
          action: "chat_message",
          actor: { ip: req.ip },
          result: "failure",
          details: { error: errorMessage, requestId },
        });

        // Check if circuit breaker is open
        if (errorMessage.includes("Circuit breaker")) {
          res.status(503).json({
            error: "Service temporarily unavailable",
            message: "The AI service is experiencing issues. Please try again later.",
            retryAfter: 30,
            requestId,
          });
        } else {
          res.status(500).json({ error: errorMessage, requestId });
        }
      }
    }
  );

  // Streaming chat endpoint
  app.post(
    "/chat/stream",
    validateChatRequest,
    async (req: Request, res: Response): Promise<void> => {
      const stream = createSSEResponse(res);

      try {
        const { conversationId, message, metadata } = req.body as ChatRequest;

        let resultConversationId = conversationId;

        // Create circuit breaker
        const executeChat = async (): Promise<TurnResult> => {
          if (resultConversationId) {
            return orchestrator.processMessage(resultConversationId, message);
          } else {
            const { conversationId: newId, result: newResult } =
              await orchestrator.startConversation(message, metadata);
            resultConversationId = newId;
            return newResult;
          }
        };

        llmCircuitBreaker = new CircuitBreaker(executeChat, CIRCUIT_BREAKER_OPTIONS);

        // Send initial session info
        stream.sendChunk({
          type: "content",
          data: { sessionId: resultConversationId ?? "pending" },
        });

        const result = await llmCircuitBreaker.execute();

        // Update conversation ID if new
        if (!conversationId && resultConversationId) {
          stream.sendChunk({
            type: "content",
            data: { sessionId: resultConversationId },
          });
        }

        // Stream reasoning if present
        if (result.reasoning) {
          stream.sendChunk({
            type: "reasoning",
            content: result.reasoning,
          });
        }

        // Stream Nushell executions
        for (const exec of result.nushellExecutions) {
          stream.sendChunk({
            type: "nushell",
            data: {
              script: exec.validation?.script || "",
              output: exec.output,
              success: exec.success,
              durationMs: exec.durationMs,
            },
          });
        }

        // Stream response in chunks (simulating token-by-token)
        const words = result.response.split(" ");
        const chunkSize = 10;

        for (let i = 0; i < words.length; i += chunkSize) {
          const chunk = words.slice(i, i + chunkSize).join(" ");
          stream.sendChunk({
            type: "content",
            content: chunk + " ",
          });
        }

        // Send final result
        stream.sendChunk({
          type: "result",
          data: {
            conversationId: resultConversationId,
            tokenUsage: result.tokenUsage,
          },
        });

        stream.end();

        // Record token usage
        recordTokenUsage({
          userMessage: result.tokenUsage.prompt,
          assistantResponse: result.tokenUsage.completion,
        });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error";

        stream.sendChunk({
          type: "error",
          content: errorMessage,
        });

        stream.end();

        logger.error("Stream chat error:", error);
      }
    }
  );

  // ============================================================================
  // METRICS ENDPOINT
  // ============================================================================

  app.get("/metrics/tokens", (_req: Request, res: Response): void => {
    res.json(getTokenComparison());
  });

  // Prometheus-compatible metrics
  app.get("/metrics", (_req: Request, res: Response): void => {
    res.set("Content-Type", "text/plain");
    res.send(skillMetrics.getPrometheusMetrics());
  });

  // Skill usage stats JSON
  app.get("/metrics/skills", (_req: Request, res: Response): void => {
    res.json({
      stats: skillMetrics.getAllStats(),
      recent: skillMetrics.getRecentInvocations(20),
    });
  });

  // ============================================================================
  // SYSTEM ENDPOINTS
  // ============================================================================

  app.get("/system-prompt", (_req: Request, res: Response): void => {
    res.json({ systemPrompt: orchestrator.getSystemPrompt() });
  });

  // ============================================================================
  // MEMO ENDPOINTS
  // ============================================================================

  app.post("/memos", async (req: Request, res: Response): Promise<void> => {
    try {
      const { userId, title, content, tags } = req.body as {
        userId: string;
        title: string;
        content: string;
        tags?: string[];
      };

      if (!userId || !title || !content) {
        res.status(400).json({ error: "userId, title, and content are required" });
        return;
      }

      const memo = {
        id: `memo-${Date.now()}-${randomUUID().slice(0, 6)}`,
        userId,
        title,
        content,
        tags: tags || [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      await memory.saveMemo(memo);
      res.status(201).json(memo);
    } catch (error) {
      logger.error("Save memo error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.get("/memos/:userId", async (req: Request, res: Response): Promise<void> => {
    try {
      const { userId } = req.params;
      const { q: query, limit } = req.query;

      let memos;
      if (query) {
        memos = await memory.searchMemos(userId, query as string);
      } else {
        memos = await memory.listMemos(userId, limit ? parseInt(limit as string, 10) : undefined);
      }

      res.json({ memos });
    } catch (error) {
      logger.error("List memos error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.delete("/memos/:id", async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      await memory.deleteMemo(id);
      res.json({ success: true });
    } catch (error) {
      logger.error("Delete memo error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // ============================================================================
  // PREFERENCES ENDPOINTS
  // ============================================================================

  app.get("/preferences/:userId", async (req: Request, res: Response): Promise<void> => {
    try {
      const { userId } = req.params;
      const prefs = await memory.getPreferences(userId);
      res.json(prefs || { userId, preferences: {} });
    } catch (error) {
      logger.error("Get preferences error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.put("/preferences/:userId", async (req: Request, res: Response): Promise<void> => {
    try {
      const { userId } = req.params;
      const { preferences } = req.body as { preferences: Record<string, unknown> };

      await memory.savePreferences({
        userId,
        preferences: preferences || {},
        updatedAt: Date.now(),
      });

      res.json({ success: true });
    } catch (error) {
      logger.error("Save preferences error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // ============================================================================
  // CHANNEL WEBHOOK ENDPOINTS
  // ============================================================================

  // Microsoft Graph change notification webhook
  app.post("/webhooks/graph", async (req: Request, res: Response): Promise<void> => {
    try {
      // Handle validation request from Graph
      if (req.query.validationToken) {
        res.type("text/plain").send(req.query.validationToken as string);
        return;
      }

      const notifications = req.body.value as Array<{
        changeType: string;
        resourceData?: {
          id: string;
          body?: { content: string };
          from?: { user?: { id: string; displayName: string } };
        };
        clientState?: string;
      }>;

      logger.info(`Received ${notifications?.length || 0} Graph notifications`);

      // Forward to Graph adapter if available
      const graphAdapter = channelRouter?.getAdapter("graph");
      if (!graphAdapter) {
        logger.warn("Graph adapter not initialized, ignoring notification");
        res.status(202).send();
        return;
      }

      // Acknowledge immediately (Graph expects fast response)
      res.status(202).send();

      // Process notifications asynchronously
      for (const notification of notifications || []) {
        logger.debug("Processing Graph notification:", notification.changeType);
        // Adapter handles the message routing
      }
    } catch (error) {
      logger.error("Graph webhook error:", error);
      res.status(500).json({ error: "Webhook processing failed" });
    }
  });

  // Dataverse webhook endpoint
  app.post("/webhooks/dataverse", async (req: Request, res: Response): Promise<void> => {
    try {
      const payload = req.body as {
        MessageName?: string;
        PrimaryEntityId?: string;
        Attributes?: Record<string, unknown>;
      };

      logger.info(`Dataverse webhook: ${payload.MessageName || "unknown"}`);

      const dataverseAdapter = channelRouter?.getAdapter("dataverse");
      if (!dataverseAdapter) {
        logger.warn("Dataverse adapter not initialized, ignoring webhook");
        res.status(202).send();
        return;
      }

      // Acknowledge immediately
      res.status(202).send();

      // Process asynchronously
      logger.debug("Processing Dataverse entity:", payload.PrimaryEntityId);
    } catch (error) {
      logger.error("Dataverse webhook error:", error);
      res.status(500).json({ error: "Webhook processing failed" });
    }
  });

  // ============================================================================
  // DM PAIRING ENDPOINTS
  // ============================================================================

  // Request a pairing code for DM access
  app.post("/pairing/request", async (req: Request, res: Response): Promise<void> => {
    if (!pairing) {
      res.status(503).json({ error: "Pairing service not available" });
      return;
    }

    try {
      const { senderId, senderName, channel } = req.body as {
        senderId: string;
        senderName?: string;
        channel: string;
      };

      if (!senderId || !channel) {
        res.status(400).json({ error: "senderId and channel are required" });
        return;
      }

      const request = pairing.createPairingRequest(senderId, channel, {
        senderName,
      });

      res.status(201).json({
        code: request.code,
        expiresAt: request.expiresAt,
        message: `Pairing code created. Share this code with an admin to approve DM access.`,
      });
    } catch (error) {
      logger.error("Pairing request error:", error);
      res.status(500).json({ error: "Failed to create pairing request" });
    }
  });

  // Approve a pairing request (admin action)
  app.post("/pairing/approve", async (req: Request, res: Response): Promise<void> => {
    if (!pairing) {
      res.status(503).json({ error: "Pairing service not available" });
      return;
    }

    try {
      const { senderId, channel, approverId } = req.body as {
        senderId: string;
        channel: string;
        approverId: string;
      };

      if (!senderId || !channel) {
        res.status(400).json({ error: "senderId and channel are required" });
        return;
      }

      pairing.approve(senderId, channel, approverId);
      res.json({ success: true, message: "Pairing approved. User can now send DMs." });
    } catch (error) {
      logger.error("Pairing approve error:", error);
      res.status(500).json({ error: "Failed to approve pairing" });
    }
  });

  // Check pairing status
  app.get("/pairing/status/:channel/:senderId", async (req: Request, res: Response): Promise<void> => {
    if (!pairing) {
      res.status(503).json({ error: "Pairing service not available" });
      return;
    }

    try {
      const { channel, senderId } = req.params;
      const approved = pairing.isApproved(senderId, channel);
      res.json({ senderId, channel, approved });
    } catch (error) {
      logger.error("Pairing status error:", error);
      res.status(500).json({ error: "Failed to check pairing status" });
    }
  });

  // List pending pairing requests (admin)
  app.get("/pairing/pending", async (_req: Request, res: Response): Promise<void> => {
    if (!pairing) {
      res.status(503).json({ error: "Pairing service not available" });
      return;
    }

    try {
      const pending = pairing.getPendingRequests();
      res.json({ requests: pending });
    } catch (error) {
      logger.error("Pairing pending error:", error);
      res.status(500).json({ error: "Failed to list pending requests" });
    }
  });

  // ============================================================================
  // SKILLS ENDPOINTS
  // ============================================================================

  // List available skills
  app.get("/skills", async (_req: Request, res: Response): Promise<void> => {
    if (!skillRegistry) {
      res.status(503).json({ error: "Skills service not available" });
      return;
    }

    try {
      const skills = skillRegistry.list().map((s) => ({
        name: s.manifest.name,
        description: s.manifest.description,
        version: s.manifest.version,
        permissions: s.manifest.permissions,
        tags: s.manifest.tags,
      }));
      res.json({ skills });
    } catch (error) {
      logger.error("List skills error:", error);
      res.status(500).json({ error: "Failed to list skills" });
    }
  });

  // Get skill details
  app.get("/skills/:name", async (req: Request, res: Response): Promise<void> => {
    if (!skillRegistry) {
      res.status(503).json({ error: "Skills service not available" });
      return;
    }

    try {
      const { name } = req.params;
      const skill = skillRegistry.get(name);

      if (!skill) {
        res.status(404).json({ error: `Skill '${name}' not found` });
        return;
      }

      res.json({
        name: skill.manifest.name,
        description: skill.manifest.description,
        version: skill.manifest.version,
        author: skill.manifest.author,
        permissions: skill.manifest.permissions,
        tags: skill.manifest.tags,
        examples: skill.manifest.examples,
      });
    } catch (error) {
      logger.error("Get skill error:", error);
      res.status(500).json({ error: "Failed to get skill" });
    }
  });

  // ============================================================================
  // OAUTH 2.0 DYNAMIC DISCOVERY ENDPOINTS (RFC 8414 / OpenID Connect Discovery)
  // ============================================================================

  // OAuth 2.0 Authorization Server Metadata (RFC 8414)
  // Used by Copilot Studio's "Dynamic Discovery" option
  app.get("/.well-known/oauth-authorization-server", (_req: Request, res: Response): void => {
    const baseUrl = `${_req.protocol}://${_req.get("host")}`;
    const oauthConfig = config.auth?.oauth ?? loadOAuthConfigFromEnv();
    
    // Get tenant ID - use configured or "common" for multi-tenant
    const tenantId = oauthConfig?.tenantId ?? "common";
    
    // Azure AD authorization server metadata
    const metadata = {
      // Required fields
      issuer: oauthConfig?.issuer ?? `https://login.microsoftonline.com/${tenantId}/v2.0`,
      authorization_endpoint: `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/authorize`,
      token_endpoint: `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`,
      
      // Recommended fields
      jwks_uri: `https://login.microsoftonline.com/${tenantId}/discovery/v2.0/keys`,
      registration_endpoint: undefined, // We don't support DCR
      scopes_supported: ["openid", "profile", "email", "offline_access"],
      response_types_supported: ["code", "token", "id_token", "code token", "code id_token", "token id_token", "code token id_token"],
      response_modes_supported: ["query", "fragment", "form_post"],
      grant_types_supported: ["authorization_code", "refresh_token", "client_credentials"],
      token_endpoint_auth_methods_supported: ["client_secret_basic", "client_secret_post", "private_key_jwt"],
      
      // Resource server info
      resource: oauthConfig?.audience ?? `api://${oauthConfig?.clientId}`,
      
      // PowerHoof API info for MCP/Copilot Studio
      api_base_url: baseUrl,
      mcp_endpoint: `${baseUrl}/api/mcp`,
      
      // Standard fields
      code_challenge_methods_supported: ["S256"],
      revocation_endpoint: `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/logout`,
      end_session_endpoint: `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/logout`,
      
      // Introspection (not supported by Azure AD v2)
      introspection_endpoint: undefined,
    };
    
    res.json(metadata);
    logger.debug("OAuth authorization server metadata requested", { tenantId });
  });

  // OpenID Connect Discovery endpoint
  // Provides the same info in OIDC format
  app.get("/.well-known/openid-configuration", (_req: Request, res: Response): void => {
    const baseUrl = `${_req.protocol}://${_req.get("host")}`;
    const oauthConfig = config.auth?.oauth ?? loadOAuthConfigFromEnv();
    
    const tenantId = oauthConfig?.tenantId ?? "common";
    const clientId = oauthConfig?.clientId ?? "";
    
    // OpenID Connect Discovery metadata
    const metadata = {
      issuer: oauthConfig?.issuer ?? `https://login.microsoftonline.com/${tenantId}/v2.0`,
      authorization_endpoint: `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/authorize`,
      token_endpoint: `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`,
      userinfo_endpoint: "https://graph.microsoft.com/oidc/userinfo",
      jwks_uri: `https://login.microsoftonline.com/${tenantId}/discovery/v2.0/keys`,
      end_session_endpoint: `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/logout`,
      
      // Supported features
      scopes_supported: ["openid", "profile", "email", "offline_access", `api://${clientId}/.default`],
      response_types_supported: ["code", "id_token", "code id_token", "token id_token"],
      response_modes_supported: ["query", "fragment", "form_post"],
      subject_types_supported: ["pairwise"],
      id_token_signing_alg_values_supported: ["RS256"],
      token_endpoint_auth_methods_supported: ["client_secret_basic", "client_secret_post", "private_key_jwt"],
      claims_supported: ["sub", "iss", "aud", "exp", "iat", "auth_time", "acr", "nonce", "name", "email", "preferred_username", "oid", "tid"],
      
      // PKCE support
      code_challenge_methods_supported: ["S256"],
      
      // PowerHoof-specific
      api_audience: oauthConfig?.audience ?? `api://${clientId}`,
      mcp_endpoint: `${baseUrl}/api/mcp`,
    };
    
    res.json(metadata);
    logger.debug("OpenID Connect discovery metadata requested", { tenantId });
  });

  // ============================================================================
  // OPENAPI SPECIFICATION ENDPOINTS
  // ============================================================================

  // OpenAPI JSON endpoint for Power Platform custom connector
  app.get("/openapi.json", (_req: Request, res: Response): void => {
    const baseUrl = `${_req.protocol}://${_req.get("host")}`;
    const spec = generateOpenAPISpec(baseUrl);
    res.json(spec);
  });

  // OpenAPI YAML endpoint (alternative format)
  app.get("/openapi.yaml", (_req: Request, res: Response): void => {
    const baseUrl = `${_req.protocol}://${_req.get("host")}`;
    const yaml = generateOpenAPIYaml(baseUrl);
    res.set("Content-Type", "text/yaml");
    res.send(yaml);
  });

  // ============================================================================
  // EXECUTE ENDPOINT (Direct Nushell Execution)
  // ============================================================================

  // Direct script execution endpoint for Power Automate batch processing
  app.post(
    "/execute",
    auditMiddleware("execute_script"),
    async (req: Request, res: Response): Promise<void> => {
      const requestId = req.headers["x-request-id"] as string;

      try {
        const { script, input, timeout = 30000 } = req.body as {
          script: string;
          input?: unknown;
          timeout?: number;
        };

        if (!script || typeof script !== "string") {
          res.status(400).json({ error: "Script is required", requestId });
          return;
        }

        // Validate timeout
        const safeTimeout = Math.min(Math.max(timeout, 1000), 60000);

        logger.info("Execute script request", {
          requestId,
          scriptLength: script.length,
          hasInput: !!input,
        });

        // Execute via orchestrator's nushell executor
        const startTime = Date.now();
        const result = await orchestrator.executeScript(script, input, safeTimeout);
        const durationMs = Date.now() - startTime;

        res.json({
          output: result.output,
          success: result.success,
          durationMs,
          error: result.error,
        });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Execution failed";
        logger.error("Execute error:", error);

        logAuditEvent({
          eventType: "error",
          action: "execute_script",
          actor: { ip: req.ip },
          result: "failure",
          details: { error: errorMessage, requestId },
        });

        res.status(500).json({ error: errorMessage, requestId });
      }
    }
  );

  // ============================================================================
  // ERROR HANDLER
  // ============================================================================

  app.use((err: Error, req: Request, res: Response, _next: NextFunction): void => {
    logger.error("Unhandled error:", err);

    logAuditEvent({
      eventType: "error",
      action: "unhandled_exception",
      actor: { ip: req.ip },
      result: "failure",
      details: {
        error: err.message,
        stack: process.env.NODE_ENV !== "production" ? err.stack : undefined,
      },
    });

    res.status(500).json({
      error: "Internal server error",
      message: process.env.NODE_ENV !== "production" ? err.message : "An unexpected error occurred",
    });
  });

  // ============================================================================
  // WEBSOCKET SERVER
  // ============================================================================

  const wss = new WebSocketServer({ server: httpServer, path: "/ws" });

  wss.on("connection", (ws: WebSocket, req: IncomingMessage) => {
    const clientId = randomUUID();
    const clientIp = req.socket.remoteAddress ?? "unknown";

    logger.info(`WebSocket client connected: ${clientId}`, { ip: clientIp });

    logAuditEvent({
      eventType: "websocket",
      action: "connect",
      actor: { ip: clientIp },
      resource: { type: "websocket", id: clientId },
      result: "success",
    });

    // Send welcome message
    ws.send(
      JSON.stringify({
        type: "connected",
        clientId,
        timestamp: new Date().toISOString(),
      })
    );

    let activeConversationId: string | undefined;

    ws.on("message", async (data: Buffer) => {
      try {
        const payload = JSON.parse(data.toString());
        const { type, conversationId, message, metadata } = payload;

        if (type === "ping") {
          ws.send(JSON.stringify({ type: "pong", timestamp: Date.now() }));
          return;
        }

        if (type === "chat" || (!type && message)) {
          if (!message) {
            ws.send(JSON.stringify({ type: "error", error: "message is required" }));
            return;
          }

          let resultConversationId = conversationId || activeConversationId;

          // Create circuit breaker
          const executeChat = async (): Promise<TurnResult> => {
            if (resultConversationId) {
              return orchestrator.processMessage(resultConversationId, message);
            } else {
              const { conversationId: newId, result: newResult } =
                await orchestrator.startConversation(message, metadata);
              resultConversationId = newId;
              return newResult;
            }
          };

          llmCircuitBreaker = new CircuitBreaker(executeChat, CIRCUIT_BREAKER_OPTIONS);

          try {
            const result = await llmCircuitBreaker.execute();
            activeConversationId = resultConversationId;

            ws.send(
              JSON.stringify({
                type: "response",
                conversationId: activeConversationId,
                response: result.response,
                tokensUsed: result.tokenUsage,
                nushellExecutions: result.nushellExecutions.map((e) => ({
                  script: e.validation?.script || "",
                  output: e.output,
                  success: e.success,
                  durationMs: e.durationMs,
                })),
                reasoning: result.reasoning,
              })
            );

            // Record token usage
            recordTokenUsage({
              userMessage: result.tokenUsage.prompt,
              assistantResponse: result.tokenUsage.completion,
            });
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : "Unknown error";

            ws.send(
              JSON.stringify({
                type: "error",
                error: errorMessage,
                retryAfter: errorMessage.includes("Circuit breaker") ? 30 : undefined,
              })
            );
          }
        }
      } catch (error) {
        logger.error("WebSocket message error:", error);
        ws.send(JSON.stringify({ type: "error", error: "Invalid message format" }));
      }
    });

    ws.on("close", () => {
      logger.info(`WebSocket client disconnected: ${clientId}`);

      logAuditEvent({
        eventType: "websocket",
        action: "disconnect",
        actor: { ip: clientIp },
        resource: { type: "websocket", id: clientId },
        result: "success",
      });
    });

    ws.on("error", (error: Error) => {
      logger.error(`WebSocket error for ${clientId}:`, error);
    });
  });

  // ============================================================================
  // START SERVER
  // ============================================================================

  const { port, host } = config.server;

  await new Promise<void>((resolve, reject) => {
    // Handle port-in-use and other startup errors
    httpServer.once("error", (err: NodeJS.ErrnoException) => {
      if (err.code === "EADDRINUSE") {
        logger.error(`Port ${port} is already in use. Try stopping the other process or use a different port.`);
        reject(new Error(`Port ${port} is already in use`));
      } else if (err.code === "EACCES") {
        logger.error(`Permission denied to bind to port ${port}. Try a port above 1024.`);
        reject(new Error(`Permission denied for port ${port}`));
      } else {
        logger.error(`Server startup error:`, err);
        reject(err);
      }
    });

    httpServer.listen(port, host, () => {
      logger.info(`PowerHoof gateway started on ${host}:${port}`);
      logger.info(`Health: http://${host}:${port}/health`);
      logger.info(`Chat: http://${host}:${port}/chat`);
      logger.info(`Stream: http://${host}:${port}/chat/stream`);
      logger.info(`WebSocket: ws://${host}:${port}/ws`);
      resolve();
    });
  });

  return {
    async close(): Promise<void> {
      logger.info("Shutting down gateway...");

      // Close WebSocket connections
      wss.clients.forEach((client) => {
        client.close(1001, "Server shutting down");
      });
      wss.close();

      // Close HTTP server
      await new Promise<void>((resolve, reject) => {
        httpServer.close((err?: Error) => (err ? reject(err) : resolve()));
      });
    },

    getCircuitBreakerStats(): CircuitBreakerStats {
      return llmCircuitBreaker?.getStats() ?? {
        state: "closed",
        failures: 0,
        successes: 0,
        lastFailure: null,
        lastSuccess: null,
      };
    },
  };
}
