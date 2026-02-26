/**
 * Health Checks & Observability
 *
 * Provides health check endpoints and metrics for monitoring.
 */

import { ProviderRegistry } from "../providers/index.js";
import { SessionExecutor } from "../nushell/index.js";
import { MemoryStore } from "../memory/index.js";
import { SecretResolver } from "../secrets/index.js";
import { logger } from "./logger.js";

export interface HealthStatus {
  status: "healthy" | "degraded" | "unhealthy";
  timestamp: string;
  uptime: number;
  version: string;
  components: {
    [key: string]: ComponentHealth;
  };
}

export interface ComponentHealth {
  status: "up" | "down" | "degraded";
  latencyMs?: number;
  message?: string;
  lastCheck: string;
}

export interface HealthChecker {
  /**
   * Run all health checks.
   */
  check(): Promise<HealthStatus>;

  /**
   * Run a specific component check.
   */
  checkComponent(name: string): Promise<ComponentHealth>;

  /**
   * Register a custom health check.
   */
  register(name: string, check: () => Promise<boolean>): void;
}

/**
 * Create a health checker for PowerHoof.
 */
export function createHealthChecker(deps: {
  providers?: ProviderRegistry;
  executor?: SessionExecutor;
  memory?: MemoryStore;
  secrets?: SecretResolver;
}): HealthChecker {
  const startTime = Date.now();
  const customChecks = new Map<string, () => Promise<boolean>>();

  const version = process.env.npm_package_version || "0.1.0";

  async function checkWithTimeout<T>(
    name: string,
    check: () => Promise<T>,
    timeoutMs: number = 5000
  ): Promise<{ success: boolean; result?: T; latencyMs: number }> {
    const start = Date.now();

    try {
      const result = await Promise.race([
        check(),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error("Timeout")), timeoutMs)
        ),
      ]);

      return {
        success: true,
        result,
        latencyMs: Date.now() - start,
      };
    } catch (error) {
      logger.warn(`Health check ${name} failed:`, error);
      return {
        success: false,
        latencyMs: Date.now() - start,
      };
    }
  }

  return {
    async check(): Promise<HealthStatus> {
      const components: Record<string, ComponentHealth> = {};
      const now = new Date().toISOString();

      // Check providers (Azure OpenAI)
      if (deps.providers) {
        const providerHealth = await checkWithTimeout(
          "providers",
          () => deps.providers!.healthCheck()
        );

        const allUp =
          providerHealth.success &&
          providerHealth.result &&
          Object.values(providerHealth.result).every((v) => v);

        components.providers = {
          status: providerHealth.success
            ? allUp
              ? "up"
              : "degraded"
            : "down",
          latencyMs: providerHealth.latencyMs,
          lastCheck: now,
        };
      }

      // Check Nushell executor
      if (deps.executor) {
        const executorHealth = await checkWithTimeout("executor", () =>
          deps.executor!.healthCheck()
        );

        components.executor = {
          status: executorHealth.success && executorHealth.result ? "up" : "down",
          latencyMs: executorHealth.latencyMs,
          lastCheck: now,
        };
      }

      // Check memory store
      if (deps.memory) {
        const memoryHealth = await checkWithTimeout("memory", () =>
          deps.memory!.healthCheck()
        );

        components.memory = {
          status: memoryHealth.success && memoryHealth.result ? "up" : "down",
          latencyMs: memoryHealth.latencyMs,
          lastCheck: now,
        };
      }

      // Check secrets resolver
      if (deps.secrets) {
        const secretsHealth = await checkWithTimeout("secrets", () =>
          deps.secrets!.healthCheck()
        );

        components.secrets = {
          status: secretsHealth.success && secretsHealth.result ? "up" : "down",
          latencyMs: secretsHealth.latencyMs,
          lastCheck: now,
        };
      }

      // Run custom checks
      for (const [name, check] of customChecks) {
        const result = await checkWithTimeout(name, check);
        components[name] = {
          status: result.success && result.result ? "up" : "down",
          latencyMs: result.latencyMs,
          lastCheck: now,
        };
      }

      // Determine overall status
      const componentStatuses = Object.values(components);
      const allUp = componentStatuses.every((c) => c.status === "up");
      const anyDown = componentStatuses.some((c) => c.status === "down");

      let status: "healthy" | "degraded" | "unhealthy";
      if (allUp) {
        status = "healthy";
      } else if (anyDown) {
        status = "unhealthy";
      } else {
        status = "degraded";
      }

      return {
        status,
        timestamp: now,
        uptime: Math.floor((Date.now() - startTime) / 1000),
        version,
        components,
      };
    },

    async checkComponent(name: string): Promise<ComponentHealth> {
      const now = new Date().toISOString();

      // Check built-in components
      if (name === "providers" && deps.providers) {
        const result = await checkWithTimeout("providers", () =>
          deps.providers!.healthCheck()
        );
        const allUp =
          result.success &&
          result.result &&
          Object.values(result.result).every((v) => v);
        return {
          status: result.success ? (allUp ? "up" : "degraded") : "down",
          latencyMs: result.latencyMs,
          lastCheck: now,
        };
      }

      if (name === "executor" && deps.executor) {
        const result = await checkWithTimeout("executor", () =>
          deps.executor!.healthCheck()
        );
        return {
          status: result.success && result.result ? "up" : "down",
          latencyMs: result.latencyMs,
          lastCheck: now,
        };
      }

      if (name === "memory" && deps.memory) {
        const result = await checkWithTimeout("memory", () =>
          deps.memory!.healthCheck()
        );
        return {
          status: result.success && result.result ? "up" : "down",
          latencyMs: result.latencyMs,
          lastCheck: now,
        };
      }

      // Check custom checks
      const customCheck = customChecks.get(name);
      if (customCheck) {
        const result = await checkWithTimeout(name, customCheck);
        return {
          status: result.success && result.result ? "up" : "down",
          latencyMs: result.latencyMs,
          lastCheck: now,
        };
      }

      return {
        status: "down",
        message: `Unknown component: ${name}`,
        lastCheck: now,
      };
    },

    register(name: string, check: () => Promise<boolean>): void {
      customChecks.set(name, check);
      logger.debug(`Registered health check: ${name}`);
    },
  };
}

/**
 * Structured logging with context for observability.
 */
export function createRequestLogger(requestId: string) {
  return {
    info: (message: string, data?: Record<string, unknown>) =>
      logger.info(`[${requestId}] ${message}`, data),
    warn: (message: string, data?: Record<string, unknown>) =>
      logger.warn(`[${requestId}] ${message}`, data),
    error: (message: string, error?: unknown) =>
      logger.error(`[${requestId}] ${message}`, error),
    debug: (message: string, data?: Record<string, unknown>) =>
      logger.debug(`[${requestId}] ${message}`, data),
  };
}

/**
 * Generate a unique request ID.
 */
export function generateRequestId(): string {
  return `req-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
}
