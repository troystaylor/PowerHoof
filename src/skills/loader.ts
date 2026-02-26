/**
 * Skill Loader
 *
 * Dynamically loads skills from the filesystem with hot-reload support.
 */

import { readdir, watch } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import { join, extname } from "node:path";
import type { Skill, SkillLoaderConfig, SkillPermission } from "./types.js";
import { createLogger } from "../utils/logger.js";

const logger = createLogger("skill-loader");

/**
 * Create a skill loader
 */
export function createSkillLoader(config: SkillLoaderConfig) {
  const loadedSkills = new Map<string, Skill>();
  let watchController: AbortController | null = null;

  /**
   * Validate skill has required properties
   */
  const validateSkill = (skill: unknown, path: string): skill is Skill => {
    if (!skill || typeof skill !== "object") {
      logger.warn(`Invalid skill at ${path}: not an object`);
      return false;
    }

    const s = skill as Record<string, unknown>;
    if (!s.manifest || typeof s.manifest !== "object") {
      logger.warn(`Invalid skill at ${path}: missing manifest`);
      return false;
    }

    const manifest = s.manifest as Record<string, unknown>;
    if (!manifest.id || typeof manifest.id !== "string") {
      logger.warn(`Invalid skill at ${path}: missing manifest.id`);
      return false;
    }

    if (typeof s.execute !== "function") {
      logger.warn(`Invalid skill at ${path}: missing execute function`);
      return false;
    }

    if (typeof s.canHandle !== "function") {
      logger.warn(`Invalid skill at ${path}: missing canHandle function`);
      return false;
    }

    return true;
  };

  /**
   * Apply default permissions to skill
   */
  const applyDefaults = (skill: Skill): Skill => {
    if (config.defaultPermissions && !skill.manifest.permissions) {
      skill.manifest.permissions = config.defaultPermissions;
    }
    return skill;
  };

  /**
   * Load a single skill from file
   */
  const loadFromFile = async (filePath: string): Promise<Skill | null> => {
    try {
      // Add timestamp to bust cache
      const fileUrl = pathToFileURL(filePath).href + `?t=${Date.now()}`;
      const module = await import(fileUrl);

      // Look for default export or 'skill' named export
      const skill = module.default || module.skill;

      if (config.validateSkills !== false && !validateSkill(skill, filePath)) {
        return null;
      }

      return applyDefaults(skill);
    } catch (error) {
      logger.error(`Failed to load skill from ${filePath}:`, error);
      return null;
    }
  };

  /**
   * Load all skills from directory
   */
  const loadFromDirectory = async (dirPath?: string): Promise<Skill[]> => {
    const targetDir = dirPath || config.skillsDir;
    const skills: Skill[] = [];

    try {
      const entries = await readdir(targetDir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = join(targetDir, entry.name);

        if (entry.isFile() && (entry.name.endsWith(".js") || entry.name.endsWith(".ts"))) {
          // Skip test files and type definitions
          if (entry.name.includes(".test.") || entry.name.endsWith(".d.ts")) {
            continue;
          }

          const skill = await loadFromFile(fullPath);
          if (skill) {
            skills.push(skill);
            loadedSkills.set(skill.manifest.id, skill);
            logger.info(`Loaded skill: ${skill.manifest.name} (${skill.manifest.id})`);
          }
        } else if (entry.isDirectory() && !entry.name.startsWith("_")) {
          // Recurse into subdirectories
          const subSkills = await loadFromDirectory(fullPath);
          skills.push(...subSkills);
        }
      }
    } catch (error) {
      logger.error(`Failed to read skills directory ${targetDir}:`, error);
    }

    return skills;
  };

  /**
   * Watch directory for skill changes
   */
  const startWatching = async (
    onChange: (skills: Skill[]) => void
  ): Promise<() => void> => {
    watchController = new AbortController();

    const handleChange = async (eventType: string, filename: string | null) => {
      if (!filename) return;
      
      // Only handle JS/TS files
      const ext = extname(filename);
      if (ext !== ".js" && ext !== ".ts") return;
      if (filename.includes(".test.") || filename.endsWith(".d.ts")) return;

      logger.info(`Skill file changed: ${filename} (${eventType})`);

      // Reload all skills
      const skills = await loadFromDirectory();
      onChange(skills);
    };

    try {
      const watcher = watch(config.skillsDir, {
        recursive: true,
        signal: watchController.signal,
      });

      // Process watch events
      (async () => {
        try {
          for await (const event of watcher) {
            await handleChange(event.eventType, event.filename);
          }
        } catch (error) {
          if ((error as NodeJS.ErrnoException).code !== "ABORT_ERR") {
            logger.error("Watch error:", error);
          }
        }
      })();

      logger.info(`Watching for skill changes in: ${config.skillsDir}`);
    } catch (error) {
      logger.error("Failed to start file watcher:", error);
    }

    return () => {
      watchController?.abort();
      watchController = null;
    };
  };

  return {
    loadFromFile,
    loadFromDirectory,
    startWatching,
    getLoadedSkills: () => Array.from(loadedSkills.values()),
    stopWatching: () => {
      watchController?.abort();
      watchController = null;
    },
  };
}

/**
 * Create a skill from a simple function
 */
export function defineSkill<TInput = unknown, TOutput = unknown>(options: {
  id: string;
  name: string;
  description: string;
  version?: string;
  permissions?: SkillPermission[];
  tags?: string[];
  canHandle?: (context: unknown) => Promise<boolean> | boolean;
  execute: (input: TInput, context: unknown) => Promise<TOutput>;
}): Skill {
  return {
    manifest: {
      id: options.id,
      name: options.name,
      description: options.description,
      version: options.version || "1.0.0",
      permissions: options.permissions,
      tags: options.tags,
    },
    canHandle: async (context) => {
      if (options.canHandle) {
        return options.canHandle(context);
      }
      // Default: can handle anything
      return true;
    },
    execute: async (context) => {
      try {
        const result = await options.execute(context as TInput, context);
        return {
          success: true,
          data: result as Record<string, unknown>,
        };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
        };
      }
    },
  };
}
