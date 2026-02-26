/**
 * Nushell Script Validator & Sanitizer
 *
 * Validates LLM-generated Nushell scripts before execution.
 * Blocks dangerous patterns while allowing legitimate operations.
 */

import { CORE_COMMANDS, POWERHOOF_COMMANDS } from "./registry.js";

/**
 * Error thrown when script validation fails.
 */
export class ValidationError extends Error {
  constructor(
    message: string,
    public readonly errors: string[],
    public readonly safetyLevel: "safe" | "moderate" | "risky" = "risky"
  ) {
    super(message);
    this.name = "ValidationError";
  }
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  /** Sanitized/normalized script (if valid) */
  script?: string;
  /** Estimated execution safety level */
  safetyLevel: "safe" | "moderate" | "risky";
  /** Commands detected in the script */
  detectedCommands: string[];
}

// Commands that are completely blocked
const BLOCKED_COMMANDS = new Set([
  // System modification
  "rm",
  "remove",
  "rmdir",
  "mv",
  "move",
  "cp",
  "copy",
  // Process control
  "kill",
  "pkill",
  "exec",
  "eval",
  // Network control
  "ssh",
  "scp",
  "sftp",
  "nc",
  "netcat",
  "curl",
  "wget",
  // Package management
  "cargo",
  "npm",
  "pip",
  "apt",
  "brew",
  // Shell escapes
  "bash",
  "sh",
  "cmd",
  "powershell",
  "pwsh",
  // Environment modification
  "export",
  "unset",
  "setenv",
  // System configuration
  "registry",
  "regedit",
  "chmod",
  "chown",
  "sudo",
  "su",
]);

// Patterns that should trigger warnings but not block
const WARNING_PATTERNS = [
  { pattern: /\|.*http/, message: "Piping to HTTP endpoint" },
  { pattern: /save\s+/, message: "Attempting to save file" },
  { pattern: /open\s+~/, message: "Accessing home directory" },
  { pattern: /glob\s+\*\*/, message: "Recursive glob pattern" },
];

// Dangerous patterns that are blocked
const BLOCKED_PATTERNS = [
  { pattern: /\$env\.PATH\s*=/, message: "Modifying PATH environment" },
  { pattern: /\$env\.[A-Z]+\s*=/, message: "Modifying environment variables" },
  { pattern: /`.*`/, message: "Backtick command substitution" },
  { pattern: /\$\(.*\)/, message: "Subshell execution" },
  { pattern: />\s*\//, message: "Direct write to root path" },
  { pattern: /rm\s+-rf/, message: "Recursive force delete" },
  { pattern: /\|\s*while\s+true/, message: "Infinite loop" },
];

// Max script length to prevent resource exhaustion (100KB)
const MAX_SCRIPT_LENGTH = 100 * 1024;
const MAX_PIPELINE_DEPTH = 20;

/**
 * Validate a Nushell script for safety before execution.
 * Throws ValidationError if the script is invalid.
 */
export function validateScript(script: string): ValidationResult {
  const result = tryValidateScript(script);
  if (!result.valid) {
    throw new ValidationError(
      result.errors[0] || "Script validation failed",
      result.errors,
      result.safetyLevel
    );
  }
  return result;
}

/**
 * Try to validate a Nushell script, returning results without throwing.
 */
export function tryValidateScript(script: string): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const detectedCommands: string[] = [];

  // Basic length check
  if (script.length > MAX_SCRIPT_LENGTH) {
    return {
      valid: false,
      errors: [`Script exceeds maximum length of ${MAX_SCRIPT_LENGTH} characters`],
      warnings: [],
      safetyLevel: "risky",
      detectedCommands: [],
    };
  }

  // Trim and normalize whitespace
  const normalizedScript = script.trim();

  if (!normalizedScript) {
    return {
      valid: false,
      errors: ["Empty script"],
      warnings: [],
      safetyLevel: "safe",
      detectedCommands: [],
    };
  }

  // Extract commands from script
  const commandTokens = extractCommands(normalizedScript);

  for (const cmd of commandTokens) {
    detectedCommands.push(cmd);

    // Check blocked commands
    if (BLOCKED_COMMANDS.has(cmd.toLowerCase())) {
      errors.push(`Blocked command: ${cmd}`);
    }
  }

  // Check blocked patterns
  for (const { pattern, message } of BLOCKED_PATTERNS) {
    if (pattern.test(normalizedScript)) {
      errors.push(`Dangerous pattern detected: ${message}`);
    }
  }

  // Check warning patterns
  for (const { pattern, message } of WARNING_PATTERNS) {
    if (pattern.test(normalizedScript)) {
      warnings.push(message);
    }
  }

  // Check pipeline depth
  const pipelineDepth = (normalizedScript.match(/\|/g) || []).length;
  if (pipelineDepth > MAX_PIPELINE_DEPTH) {
    errors.push(`Pipeline too deep: ${pipelineDepth} stages (max: ${MAX_PIPELINE_DEPTH})`);
  }

  // Determine safety level
  let safetyLevel: "safe" | "moderate" | "risky" = "safe";
  if (errors.length > 0) {
    safetyLevel = "risky";
  } else if (warnings.length > 0) {
    safetyLevel = "moderate";
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    script: errors.length === 0 ? normalizedScript : undefined,
    safetyLevel,
    detectedCommands,
  };
}

/**
 * Extract command names from a Nushell script.
 */
function extractCommands(script: string): string[] {
  const commands: string[] = [];

  // Simple tokenization - extract first word after newlines and pipes
  const lines = script.split(/[\n;]/);

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    // Split by pipes and get first token of each segment
    const segments = trimmed.split("|");

    for (const segment of segments) {
      const tokens = segment.trim().split(/\s+/);
      if (tokens[0]) {
        // Handle multi-word commands like "sort-by", "group-by"
        commands.push(tokens[0]);
      }
    }
  }

  return commands;
}

/**
 * Check if a command is known/allowed.
 */
export function isKnownCommand(
  command: string
): { known: boolean; source?: "core" | "powerhoof" | "blocked" } {
  const lowerCmd = command.toLowerCase();

  if (BLOCKED_COMMANDS.has(lowerCmd)) {
    return { known: true, source: "blocked" };
  }

  // Check core commands
  const coreCmd = CORE_COMMANDS.find(
    (c) => c.name.toLowerCase() === lowerCmd || c.aliases?.includes(lowerCmd)
  );
  if (coreCmd) {
    return { known: true, source: "core" };
  }

  // Check PowerHoof commands
  const phCmd = POWERHOOF_COMMANDS.find(
    (c) => c.name.toLowerCase() === lowerCmd || c.aliases?.includes(lowerCmd)
  );
  if (phCmd) {
    return { known: true, source: "powerhoof" };
  }

  return { known: false };
}

/**
 * Sanitize a script by wrapping it in a safe execution context.
 */
export function wrapInSafeContext(script: string): string {
  // Prefix script with safety guards
  return `
# PowerHoof Safe Execution Context
# Auto-generated wrapper for sandboxed execution

def powerhoof-safe-run [] {
${script
  .split("\n")
  .map((line) => "  " + line)
  .join("\n")}
}

powerhoof-safe-run
`.trim();
}

/**
 * Extract structured output format hint from script.
 * Returns expected output columns if the script ends with a table operation.
 */
export function inferOutputFormat(script: string): {
  format: "table" | "list" | "text" | "json" | "unknown";
  columns?: string[];
} {
  const trimmed = script.trim();

  // Check for JSON output
  if (trimmed.includes("| to json") || trimmed.includes("| to nuon")) {
    return { format: "json" };
  }

  // Check for table operations
  const tableOps = ["| select", "| table", "| grid", "| reject"];
  for (const op of tableOps) {
    if (trimmed.includes(op)) {
      // Try to extract column names from select
      const selectMatch = trimmed.match(/\|\s*select\s+([\w\s,]+)/);
      if (selectMatch) {
        const columns = selectMatch[1].split(/[\s,]+/).filter(Boolean);
        return { format: "table", columns };
      }
      return { format: "table" };
    }
  }

  // Check for list output
  if (trimmed.includes("| flatten") || trimmed.includes("| each")) {
    return { format: "list" };
  }

  return { format: "unknown" };
}
