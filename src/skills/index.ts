/**
 * Skills Platform
 *
 * Pluggable capabilities that extend the agent without modifying core code.
 * Skills are loaded dynamically and support hot-reload.
 */

// Types
export type {
  SkillManifest,
  SkillPermission,
  SkillContext,
  NushellInterface,
  NushellResult,
  SecretsInterface,
  SkillResult,
  Skill,
  SkillRegistry,
  SkillHook,
  SkillHookHandler,
  SkillLoaderConfig,
} from "./types.js";

// Registry
export { createSkillRegistry } from "./registry.js";

// Loader
export { createSkillLoader, defineSkill } from "./loader.js";
