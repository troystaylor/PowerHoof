/**
 * OpenTelemetry Integration for Azure Application Insights
 *
 * SFI Pillar: Monitor and Detect Cyberthreats
 * - Unified telemetry ingestion
 * - Distributed tracing
 * - Metrics collection
 */

import { logger } from "./logger.js";

// Types for telemetry (when @azure/monitor-opentelemetry is installed)
export interface TelemetryClient {
  trackRequest(name: string, properties?: Record<string, string>): void;
  trackDependency(
    name: string,
    target: string,
    duration: number,
    success: boolean
  ): void;
  trackException(error: Error, properties?: Record<string, string>): void;
  trackEvent(name: string, properties?: Record<string, string>): void;
  trackMetric(name: string, value: number): void;
  flush(): Promise<void>;
}

export interface TraceContext {
  traceId: string;
  spanId: string;
  startSpan(name: string): SpanContext;
}

export interface SpanContext {
  setStatus(status: "ok" | "error", message?: string): void;
  setAttribute(key: string, value: string | number | boolean): void;
  end(): void;
}

/**
 * Initialize OpenTelemetry with Azure Monitor.
 *
 * Call this at application startup before any other imports
 * to ensure proper instrumentation.
 */
export async function initializeTelemetry(): Promise<TelemetryClient | null> {
  const connectionString = process.env.APPLICATIONINSIGHTS_CONNECTION_STRING;

  if (!connectionString) {
    logger.warn("Application Insights not configured - telemetry disabled");
    return createNoOpClient();
  }

  try {
    // Dynamic import to avoid errors if package not installed
    const { useAzureMonitor } = await import("@azure/monitor-opentelemetry");
    const { trace, metrics } = await import("@opentelemetry/api");

    useAzureMonitor({
      azureMonitorExporterOptions: {
        connectionString,
      },
      instrumentationOptions: {
        http: { enabled: true },
        azureSdk: { enabled: true },
      },
    });

    logger.info("Application Insights telemetry initialized");

    return createTelemetryClient(trace, metrics);
  } catch (error) {
    logger.warn("Failed to initialize telemetry, using no-op client", error);
    return createNoOpClient();
  }
}

function createTelemetryClient(
  trace: typeof import("@opentelemetry/api").trace,
  metrics: typeof import("@opentelemetry/api").metrics
): TelemetryClient {
  const tracer = trace.getTracer("powerhoof");
  const meter = metrics.getMeter("powerhoof");

  // Create metrics
  const requestCounter = meter.createCounter("powerhoof.requests", {
    description: "Total number of requests",
  });
  const errorCounter = meter.createCounter("powerhoof.errors", {
    description: "Total number of errors",
  });
  const latencyHistogram = meter.createHistogram("powerhoof.latency", {
    description: "Request latency in milliseconds",
    unit: "ms",
  });

  return {
    trackRequest(name: string, properties?: Record<string, string>): void {
      requestCounter.add(1, { name, ...properties });
    },

    trackDependency(
      name: string,
      target: string,
      duration: number,
      success: boolean
    ): void {
      const span = tracer.startSpan(`dependency.${name}`);
      span.setAttribute("target", target);
      span.setAttribute("duration", duration);
      span.setAttribute("success", success);
      latencyHistogram.record(duration, { dependency: name });
      span.end();
    },

    trackException(error: Error, properties?: Record<string, string>): void {
      errorCounter.add(1, { type: error.name, ...properties });
      const span = tracer.startSpan("exception");
      span.recordException(error);
      span.setStatus({ code: 2, message: error.message }); // SpanStatusCode.ERROR = 2
      Object.entries(properties || {}).forEach(([k, v]) =>
        span.setAttribute(k, v)
      );
      span.end();
    },

    trackEvent(name: string, properties?: Record<string, string>): void {
      const span = tracer.startSpan(`event.${name}`);
      Object.entries(properties || {}).forEach(([k, v]) =>
        span.setAttribute(k, v)
      );
      span.end();
    },

    trackMetric(name: string, value: number): void {
      const gauge = meter.createObservableGauge(`powerhoof.${name}`);
      gauge.addCallback((result) => result.observe(value));
    },

    async flush(): Promise<void> {
      // OpenTelemetry flushes automatically, but we can force it
      await new Promise((resolve) => setTimeout(resolve, 100));
    },
  };
}

function createNoOpClient(): TelemetryClient {
  return {
    trackRequest: () => {},
    trackDependency: () => {},
    trackException: (error: Error) => logger.error("Exception", error),
    trackEvent: () => {},
    trackMetric: () => {},
    flush: async () => {},
  };
}

/**
 * Create a trace context for distributed tracing.
 */
export function createTraceContext(): TraceContext {
  const traceId = generateId(32);
  const spanId = generateId(16);

  return {
    traceId,
    spanId,
    startSpan(name: string): SpanContext {
      const start = Date.now();
      let status: "ok" | "error" = "ok";
      let statusMessage: string | undefined;
      const attributes: Record<string, string | number | boolean> = {};

      return {
        setStatus(s: "ok" | "error", message?: string): void {
          status = s;
          statusMessage = message;
        },
        setAttribute(key: string, value: string | number | boolean): void {
          attributes[key] = value;
        },
        end(): void {
          const duration = Date.now() - start;
          logger.debug(`Span ${name} completed`, {
            traceId,
            spanId,
            duration,
            status,
            statusMessage,
            ...attributes,
          });
        },
      };
    },
  };
}

function generateId(length: number): string {
  const chars = "0123456789abcdef";
  let result = "";
  for (let i = 0; i < length; i++) {
    result += chars[Math.floor(Math.random() * chars.length)];
  }
  return result;
}

/**
 * Middleware to add trace context to requests.
 */
export function traceMiddleware() {
  return (
    req: { traceContext?: TraceContext },
    _res: unknown,
    next: () => void
  ): void => {
    req.traceContext = createTraceContext();
    next();
  };
}
