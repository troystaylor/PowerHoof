/**
 * Azure Container Apps Dynamic Sessions Executor
 *
 * Executes Nushell scripts in sandboxed ACA Dynamic Sessions.
 * Uses Hyper-V isolation for security.
 */

import { spawn } from "child_process";
import { logger } from "../utils/logger.js";
import { validateScript, ValidationResult } from "./validator.js";

export interface ExecutionRequest {
  /** Nushell script to execute */
  script: string;
  /** Session ID for maintaining state across calls */
  sessionId?: string;
  /** Maximum execution time in milliseconds */
  timeoutMs?: number;
  /** Environment variables to set */
  env?: Record<string, string>;
}

export interface ExecutionResult {
  success: boolean;
  /** Raw output from Nushell */
  output: string;
  /** Parsed structured data (if output is valid JSON/table) */
  data?: unknown;
  /** Error message if execution failed */
  error?: string;
  /** Execution duration in milliseconds */
  durationMs: number;
  /** Session ID for follow-up calls */
  sessionId: string;
  /** Validation result from pre-execution check */
  validation: ValidationResult;
}

export interface SessionExecutor {
  /**
   * Execute a Nushell script in a sandboxed session.
   */
  execute(request: ExecutionRequest): Promise<ExecutionResult>;

  /**
   * Health check the session pool.
   */
  healthCheck(): Promise<boolean>;

  /**
   * Terminate a session and clean up resources.
   */
  terminateSession(sessionId: string): Promise<void>;
}

/**
 * Create a session executor for ACA Dynamic Sessions.
 */
export function createSessionExecutor(config: {
  sessionPoolEndpoint: string;
  defaultTimeoutMs?: number;
  maxOutputSize?: number;
}): SessionExecutor {
  const { sessionPoolEndpoint, defaultTimeoutMs = 30_000, maxOutputSize = 1_000_000 } = config;

  logger.info(`Initializing ACA Dynamic Sessions executor: ${sessionPoolEndpoint}`);

  return {
    async execute(request: ExecutionRequest): Promise<ExecutionResult> {
      const startTime = Date.now();

      // Validate script before execution
      const validation = validateScript(request.script);

      if (!validation.valid) {
        return {
          success: false,
          output: "",
          error: `Script validation failed: ${validation.errors.join(", ")}`,
          durationMs: Date.now() - startTime,
          sessionId: request.sessionId || generateSessionId(),
          validation,
        };
      }

      const sessionId = request.sessionId || generateSessionId();
      const timeoutMs = request.timeoutMs ?? defaultTimeoutMs;

      try {
        // Build the execution request for ACA Dynamic Sessions
        const apiUrl = `${sessionPoolEndpoint}/code/execute`;

        const response = await fetchWithTimeout(
          apiUrl,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "X-Session-Id": sessionId,
            },
            body: JSON.stringify({
              properties: {
                codeInputType: "inline",
                executionType: "synchronous",
                code: validation.script,
                timeoutInSeconds: Math.ceil(timeoutMs / 1000),
              },
            }),
          },
          timeoutMs
        );

        if (!response.ok) {
          const errorBody = await response.text();
          logger.error("ACA Dynamic Sessions execution failed:", {
            status: response.status,
            body: errorBody,
          });

          return {
            success: false,
            output: "",
            error: `Execution failed: ${response.status} - ${errorBody}`,
            durationMs: Date.now() - startTime,
            sessionId,
            validation,
          };
        }

        const result = await response.json() as {
          properties?: {
            stdout?: string;
            stderr?: string;
            executionResult?: string;
            result?: unknown;
          };
        };

        // Parse the response
        const stdout = result.properties?.stdout || "";
        const stderr = result.properties?.stderr || "";
        const executionResult = result.properties?.executionResult || "";

        // Truncate output if too large
        let output = stdout || executionResult;
        if (output.length > maxOutputSize) {
          output = output.substring(0, maxOutputSize) + "\n... [output truncated]";
        }

        // Try to parse structured data
        let data: unknown = undefined;
        if (output) {
          try {
            data = JSON.parse(output);
          } catch {
            // Not JSON, might be Nushell table format - leave as string
          }
        }

        const success = !stderr || stderr.trim() === "";

        return {
          success,
          output,
          data,
          error: stderr || undefined,
          durationMs: Date.now() - startTime,
          sessionId,
          validation,
        };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        logger.error("Session execution error:", error);

        return {
          success: false,
          output: "",
          error: errorMessage,
          durationMs: Date.now() - startTime,
          sessionId,
          validation,
        };
      }
    },

    async healthCheck(): Promise<boolean> {
      try {
        const response = await fetchWithTimeout(
          `${sessionPoolEndpoint}/sessions`,
          { method: "GET" },
          5000
        );
        return response.ok;
      } catch (error) {
        logger.warn("Session pool health check failed:", error);
        return false;
      }
    },

    async terminateSession(sessionId: string): Promise<void> {
      try {
        await fetchWithTimeout(
          `${sessionPoolEndpoint}/sessions/${sessionId}`,
          { method: "DELETE" },
          5000
        );
        logger.info(`Session ${sessionId} terminated`);
      } catch (error) {
        logger.warn(`Failed to terminate session ${sessionId}:`, error);
      }
    },
  };
}

/**
 * Generate a unique session ID.
 */
function generateSessionId(): string {
  return `ph-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Fetch with timeout support.
 */
async function fetchWithTimeout(
  url: string,
  options: RequestInit,
  timeoutMs: number
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    return response;
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Create a mock executor for local development/testing.
 */
export function createMockExecutor(): SessionExecutor {
  logger.info("Using mock session executor for local development");

  return {
    async execute(request: ExecutionRequest): Promise<ExecutionResult> {
      const startTime = Date.now();
      const validation = validateScript(request.script);

      if (!validation.valid) {
        return {
          success: false,
          output: "",
          error: `Validation failed: ${validation.errors.join(", ")}`,
          durationMs: Date.now() - startTime,
          sessionId: generateSessionId(),
          validation,
        };
      }

      // Return mock response based on command
      const mockOutput = `[Mock Executor] Would execute:\n${request.script}`;

      return {
        success: true,
        output: mockOutput,
        durationMs: Date.now() - startTime,
        sessionId: request.sessionId || generateSessionId(),
        validation,
      };
    },

    async healthCheck(): Promise<boolean> {
      return true;
    },

    async terminateSession(_sessionId: string): Promise<void> {
      // No-op for mock
    },
  };
}

/**
 * Create a local Nushell executor that runs `nu` on the host machine.
 * 
 * ⚠️ WARNING: This runs commands directly on your machine without sandboxing.
 * Only use for local development with trusted input.
 */
export function createLocalExecutor(config?: {
  nuPath?: string;
  defaultTimeoutMs?: number;
  workingDirectory?: string;
}): SessionExecutor {
  const { 
    nuPath = "nu", 
    defaultTimeoutMs = 30_000,
    workingDirectory = process.cwd()
  } = config ?? {};

  logger.info(`Using local Nushell executor (nu=${nuPath}, cwd=${workingDirectory})`);
  logger.warn("⚠️  Local executor runs commands directly on your machine - use only for development!");

  return {
    async execute(request: ExecutionRequest): Promise<ExecutionResult> {
      const startTime = Date.now();
      const sessionId = request.sessionId || generateSessionId();
      const timeoutMs = request.timeoutMs ?? defaultTimeoutMs;

      // Validate script before execution
      const validation = validateScript(request.script);

      if (!validation.valid) {
        return {
          success: false,
          output: "",
          error: `Script validation failed: ${validation.errors.join(", ")}`,
          durationMs: Date.now() - startTime,
          sessionId,
          validation,
        };
      }

      return new Promise((resolve) => {
        const chunks: Buffer[] = [];
        const errorChunks: Buffer[] = [];

        // Spawn nu with the script via -c flag
        const child = spawn(nuPath, ["-c", request.script], {
          cwd: workingDirectory,
          env: { ...process.env, ...request.env },
          shell: false,
          timeout: timeoutMs,
        });

        // Set up timeout
        const timeoutId = setTimeout(() => {
          child.kill("SIGTERM");
          resolve({
            success: false,
            output: Buffer.concat(chunks).toString("utf8"),
            error: `Execution timed out after ${timeoutMs}ms`,
            durationMs: Date.now() - startTime,
            sessionId,
            validation,
          });
        }, timeoutMs);

        child.stdout.on("data", (data: Buffer) => chunks.push(data));
        child.stderr.on("data", (data: Buffer) => errorChunks.push(data));

        child.on("error", (err: Error) => {
          clearTimeout(timeoutId);
          resolve({
            success: false,
            output: "",
            error: `Failed to execute nu: ${err.message}. Is Nushell installed? Run: winget install nushell`,
            durationMs: Date.now() - startTime,
            sessionId,
            validation,
          });
        });

        child.on("close", (code: number | null) => {
          clearTimeout(timeoutId);
          const output = Buffer.concat(chunks).toString("utf8");
          const stderr = Buffer.concat(errorChunks).toString("utf8");

          // Try to parse output as JSON
          let data: unknown;
          try {
            data = JSON.parse(output);
          } catch {
            // Not JSON, leave as string
          }

          resolve({
            success: code === 0,
            output,
            data,
            error: code !== 0 ? stderr || `Exit code ${code}` : undefined,
            durationMs: Date.now() - startTime,
            sessionId,
            validation,
          });
        });
      });
    },

    async healthCheck(): Promise<boolean> {
      return new Promise((resolve) => {
        const child = spawn(nuPath, ["--version"], {
          timeout: 5000,
          shell: false,
        });

        child.on("error", () => resolve(false));
        child.on("close", (code: number | null) => resolve(code === 0));
      });
    },

    async terminateSession(_sessionId: string): Promise<void> {
      // No-op for local executor - each command is a new process
    },
  };
}
