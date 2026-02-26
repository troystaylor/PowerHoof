/**
 * Skill Registry Implementation
 *
 * Manages skill lifecycle, discovery, and execution.
 */

import type {
  Skill,
  SkillContext,
  SkillHook,
  SkillHookHandler,
  SkillRegistry,
  SkillResult,
} from "./types.js";
import { createLogger } from "../utils/logger.js";

const logger = createLogger("skill-registry");

/**
 * Create a skill registry instance
 */
export function createSkillRegistry(): SkillRegistry & {
  addHook: (handler: SkillHookHandler) => void;
  removeHook: (handler: SkillHookHandler) => void;
  execute: (skillId: string, context: SkillContext) => Promise<SkillResult>;
  initializeAll: () => Promise<void>;
  shutdownAll: () => Promise<void>;
} {
  const skills = new Map<string, Skill>();
  const hooks: SkillHookHandler[] = [];

  const triggerHook = async (
    hook: SkillHook,
    skill: Skill,
    context: SkillContext,
    result?: SkillResult
  ) => {
    for (const handler of hooks) {
      try {
        await handler(hook, skill, context, result);
      } catch (error) {
        logger.error(`Hook ${hook} failed:`, error);
      }
    }
  };

  return {
    async register(skill: Skill): Promise<void> {
      const { id, name } = skill.manifest;

      if (skills.has(id)) {
        logger.warn(`Skill ${id} already registered, replacing`);
        await this.unregister(id);
      }

      // Initialize skill if needed
      if (skill.initialize) {
        try {
          await skill.initialize();
          logger.info(`Initialized skill: ${name} (${id})`);
        } catch (error) {
          logger.error(`Failed to initialize skill ${id}:`, error);
          throw error;
        }
      }

      skills.set(id, skill);
      logger.info(`Registered skill: ${name} (${id})`);
    },

    async unregister(skillId: string): Promise<void> {
      const skill = skills.get(skillId);
      if (!skill) return;

      // Shutdown skill if needed
      if (skill.shutdown) {
        try {
          await skill.shutdown();
        } catch (error) {
          logger.error(`Error shutting down skill ${skillId}:`, error);
        }
      }

      skills.delete(skillId);
      logger.info(`Unregistered skill: ${skillId}`);
    },

    get(skillId: string): Skill | undefined {
      return skills.get(skillId);
    },

    list(): Skill[] {
      return Array.from(skills.values());
    },

    async match(context: SkillContext): Promise<Skill[]> {
      const matches: Skill[] = [];

      for (const skill of skills.values()) {
        try {
          if (await skill.canHandle(context)) {
            matches.push(skill);
            await triggerHook("on-match", skill, context);
          }
        } catch (error) {
          logger.error(`Error checking skill ${skill.manifest.id}:`, error);
        }
      }

      return matches;
    },

    count(): number {
      return skills.size;
    },

    addHook(handler: SkillHookHandler): void {
      hooks.push(handler);
    },

    removeHook(handler: SkillHookHandler): void {
      const index = hooks.indexOf(handler);
      if (index !== -1) hooks.splice(index, 1);
    },

    async execute(skillId: string, context: SkillContext): Promise<SkillResult> {
      const skill = skills.get(skillId);
      if (!skill) {
        return {
          success: false,
          error: `Skill not found: ${skillId}`,
        };
      }

      logger.info(`Executing skill: ${skill.manifest.name}`);
      await triggerHook("pre-execute", skill, context);

      try {
        const result = await skill.execute(context);
        await triggerHook("post-execute", skill, context, result);
        return result;
      } catch (error) {
        const errorResult: SkillResult = {
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
        };
        await triggerHook("on-error", skill, context, errorResult);
        return errorResult;
      }
    },

    async initializeAll(): Promise<void> {
      for (const skill of skills.values()) {
        if (skill.initialize) {
          try {
            await skill.initialize();
          } catch (error) {
            logger.error(`Failed to initialize ${skill.manifest.id}:`, error);
          }
        }
      }
    },

    async shutdownAll(): Promise<void> {
      for (const skill of skills.values()) {
        if (skill.shutdown) {
          try {
            await skill.shutdown();
          } catch (error) {
            logger.error(`Failed to shutdown ${skill.manifest.id}:`, error);
          }
        }
      }
      skills.clear();
    },
  };
}
