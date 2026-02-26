/**
 * Simple logger utility
 */

type LogLevel = "debug" | "info" | "warn" | "error";

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

/**
 * Logger interface for namespaced loggers
 */
export interface Logger {
  debug(message: string, ...args: unknown[]): void;
  info(message: string, ...args: unknown[]): void;
  warn(message: string, ...args: unknown[]): void;
  error(message: string, ...args: unknown[]): void;
}

const currentLevel: LogLevel = (process.env.LOG_LEVEL as LogLevel) || "info";

function shouldLog(level: LogLevel): boolean {
  return LOG_LEVELS[level] >= LOG_LEVELS[currentLevel];
}

function formatMessage(level: LogLevel, message: string, ...args: unknown[]): string {
  const timestamp = new Date().toISOString();
  const prefix = `[${timestamp}] [${level.toUpperCase()}]`;
  return `${prefix} ${message} ${args.length > 0 ? JSON.stringify(args) : ""}`.trim();
}

export const logger = {
  debug(message: string, ...args: unknown[]): void {
    if (shouldLog("debug")) {
      console.debug(formatMessage("debug", message, ...args));
    }
  },

  info(message: string, ...args: unknown[]): void {
    if (shouldLog("info")) {
      console.info(formatMessage("info", message, ...args));
    }
  },

  warn(message: string, ...args: unknown[]): void {
    if (shouldLog("warn")) {
      console.warn(formatMessage("warn", message, ...args));
    }
  },

  error(message: string, ...args: unknown[]): void {
    if (shouldLog("error")) {
      console.error(formatMessage("error", message, ...args));
    }
  },
};

/**
 * Create a namespaced logger
 */
export function createLogger(namespace: string): Logger {
  const prefix = `[${namespace}]`;

  return {
    debug(message: string, ...args: unknown[]): void {
      if (shouldLog("debug")) {
        console.debug(formatMessage("debug", `${prefix} ${message}`, ...args));
      }
    },

    info(message: string, ...args: unknown[]): void {
      if (shouldLog("info")) {
        console.info(formatMessage("info", `${prefix} ${message}`, ...args));
      }
    },

    warn(message: string, ...args: unknown[]): void {
      if (shouldLog("warn")) {
        console.warn(formatMessage("warn", `${prefix} ${message}`, ...args));
      }
    },

    error(message: string, ...args: unknown[]): void {
      if (shouldLog("error")) {
        console.error(formatMessage("error", `${prefix} ${message}`, ...args));
      }
    },
  };
}
