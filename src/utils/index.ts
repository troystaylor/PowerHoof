export { logger, createLogger, type Logger } from "./logger.js";
export {
  recordTokenUsage,
  getTokenMetrics,
  getTokenComparison,
  resetTokenMetrics,
  generateSavingsReport,
  logEfficiencyStats,
  type TokenMetrics,
  type TokenComparison,
} from "./token-tracking.js";
export {
  createHealthChecker,
  createRequestLogger,
  generateRequestId,
  type HealthStatus,
  type ComponentHealth,
  type HealthChecker,
} from "./health.js";

// SFI Security Layer
export {
  validateChatRequest,
  validateSessionId,
  rateLimit,
  securityHeaders,
  logAuditEvent,
  getRecentAuditEvents,
  auditMiddleware,
  createAuthMiddleware,
  corsMiddleware,
  type RateLimitOptions,
  type AuditEvent,
  type AuthConfig,
  type CorsOptions,
} from "./security.js";

// OpenTelemetry / Application Insights
export {
  initializeTelemetry,
  createTraceContext,
  traceMiddleware,
  type TelemetryClient,
  type TraceContext,
} from "./telemetry.js";
