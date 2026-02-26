/**
 * Skills Platform Types
 *
 * Skills are pluggable capabilities that can be invoked by agents.
 * They extend agent functionality without modifying core code.
 */

import type { InboundMessage } from "../channels/types.js";

/**
 * Skill metadata for discovery and invocation
 */
export interface SkillManifest {
  /** Unique skill identifier */
  id: string;
  /** Human-readable name */
  name: string;
  /** What this skill does */
  description: string;
  /** Semantic version */
  version: string;
  /** Skill author */
  author?: string;
  /** Required permissions */
  permissions?: SkillPermission[];
  /** Input schema (JSON Schema) */
  inputSchema?: Record<string, unknown>;
  /** Example invocations */
  examples?: string[];
  /** Skill tags for categorization */
  tags?: string[];
}

/**
 * Permission levels for skills
 */
export type SkillPermission =
  | "read-context" // Can read conversation context
  | "write-context" // Can write to conversation context
  | "execute-shell" // Can run Nushell commands
  | "network" // Can make network requests
  | "secrets" // Can access secrets
  | "files"; // Can read/write files

/**
 * Skill execution context
 */
export interface SkillContext {
  /** Triggering message */
  message: InboundMessage;
  /** Conversation history */
  history?: InboundMessage[];
  /** Session metadata */
  session: {
    id: string;
    userId: string;
    channel: string;
    metadata?: Record<string, unknown>;
  };
  /** Nushell interface (if permitted) */
  nushell?: NushellInterface;
  /** Secrets access (if permitted) */
  secrets?: SecretsInterface;
}

/**
 * Nushell interface for skill execution
 */
export interface NushellInterface {
  /** Execute a Nushell command */
  execute(command: string): Promise<NushellResult>;
  /** Execute command with streaming output */
  executeStreaming(
    command: string,
    onOutput: (chunk: string) => void
  ): Promise<NushellResult>;
}

/**
 * Nushell execution result
 */
export interface NushellResult {
  /** Exit code (0 = success) */
  exitCode: number;
  /** Standard output */
  stdout: string;
  /** Standard error */
  stderr: string;
  /** Execution time ms */
  durationMs: number;
}

/**
 * Secrets interface for skill execution
 */
export interface SecretsInterface {
  /** Get a secret value */
  get(key: string): Promise<string | undefined>;
  /** Check if secret exists */
  has(key: string): Promise<boolean>;
}

/**
 * Skill result
 */
export interface SkillResult {
  /** Was execution successful */
  success: boolean;
  /** Response content */
  content?: string;
  /** Structured data output */
  data?: Record<string, unknown>;
  /** Error message if failed */
  error?: string;
  /** Suggested next action */
  nextAction?: "respond" | "delegate" | "escalate" | "silent" | "fallthrough";
  /** Skill ID to delegate to (when nextAction is "delegate") */
  delegateTo?: string;
  /** Modified message to pass to delegated skill or LLM (for delegation/fallthrough) */
  delegateMessage?: string;
}

/**
 * Skill interface
 */
export interface Skill {
  /** Skill manifest */
  manifest: SkillManifest;

  /** Initialize the skill */
  initialize?(): Promise<void>;

  /** Check if this skill can handle a request */
  canHandle(context: SkillContext): Promise<boolean>;

  /** Execute the skill */
  execute(context: SkillContext): Promise<SkillResult>;

  /** Clean up resources */
  shutdown?(): Promise<void>;
}

/**
 * Skill registry interface
 */
export interface SkillRegistry {
  /** Register a skill */
  register(skill: Skill): Promise<void>;

  /** Unregister a skill */
  unregister(skillId: string): Promise<void>;

  /** Get skill by ID */
  get(skillId: string): Skill | undefined;

  /** List all registered skills */
  list(): Skill[];

  /** Find skills that can handle a context */
  match(context: SkillContext): Promise<Skill[]>;

  /** Get skill count */
  count(): number;
}

/**
 * Skill hook types
 */
export type SkillHook =
  | "pre-execute"
  | "post-execute"
  | "on-error"
  | "on-match";

/**
 * Skill hook handler
 */
export type SkillHookHandler = (
  hook: SkillHook,
  skill: Skill,
  context: SkillContext,
  result?: SkillResult
) => Promise<void>;

/**
 * Dynamic skill loader config
 */
export interface SkillLoaderConfig {
  /** Directory to load skills from */
  skillsDir: string;
  /** Watch for file changes */
  watchForChanges?: boolean;
  /** Required permissions to grant to loaded skills */
  defaultPermissions?: SkillPermission[];
  /** Skill validation enabled */
  validateSkills?: boolean;
}
