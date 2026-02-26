/**
 * Skill Metrics - Tracks skill usage statistics
 * Provides structured logging and metrics export
 */

import { logger } from "../utils/logger.js";

interface SkillInvocation {
  skillId: string;
  skillName: string;
  timestamp: Date;
  success: boolean;
  durationMs: number;
  channel: string;
  delegatedFrom?: string;
}

interface SkillStats {
  totalInvocations: number;
  successCount: number;
  failureCount: number;
  averageDurationMs: number;
  lastInvocation?: Date;
  lastError?: string;
}

interface SkillMetrics {
  /** Record a skill invocation */
  record(invocation: SkillInvocation): void;
  
  /** Get stats for a specific skill */
  getStats(skillId: string): SkillStats | undefined;
  
  /** Get stats for all skills */
  getAllStats(): Record<string, SkillStats>;
  
  /** Get recent invocations (for debugging) */
  getRecentInvocations(limit?: number): SkillInvocation[];
  
  /** Get metrics in Prometheus format */
  getPrometheusMetrics(): string;
  
  /** Reset all metrics */
  reset(): void;
}

// In-memory storage
const invocations: SkillInvocation[] = [];
const stats: Map<string, SkillStats> = new Map();
const MAX_INVOCATIONS = 1000; // Keep last 1000 for recent history

/**
 * Create the skill metrics tracker
 */
export function createSkillMetrics(): SkillMetrics {
  return {
    record(invocation: SkillInvocation): void {
      // Keep bounded history
      if (invocations.length >= MAX_INVOCATIONS) {
        invocations.shift();
      }
      invocations.push(invocation);
      
      // Update stats
      let skillStats = stats.get(invocation.skillId);
      if (!skillStats) {
        skillStats = {
          totalInvocations: 0,
          successCount: 0,
          failureCount: 0,
          averageDurationMs: 0,
        };
      }
      
      skillStats.totalInvocations++;
      if (invocation.success) {
        skillStats.successCount++;
      } else {
        skillStats.failureCount++;
      }
      
      // Running average for duration
      skillStats.averageDurationMs = 
        (skillStats.averageDurationMs * (skillStats.totalInvocations - 1) + invocation.durationMs) 
        / skillStats.totalInvocations;
      
      skillStats.lastInvocation = invocation.timestamp;
      
      stats.set(invocation.skillId, skillStats);
      
      // Structured logging
      logger.info(`Skill executed: ${invocation.skillId}`, {
        skill: invocation.skillId,
        name: invocation.skillName,
        success: invocation.success,
        durationMs: invocation.durationMs,
        channel: invocation.channel,
        delegatedFrom: invocation.delegatedFrom,
      });
    },
    
    getStats(skillId: string): SkillStats | undefined {
      return stats.get(skillId);
    },
    
    getAllStats(): Record<string, SkillStats> {
      const result: Record<string, SkillStats> = {};
      stats.forEach((value, key) => {
        result[key] = value;
      });
      return result;
    },
    
    getRecentInvocations(limit = 50): SkillInvocation[] {
      return invocations.slice(-limit);
    },
    
    getPrometheusMetrics(): string {
      const lines: string[] = [
        "# HELP skill_invocations_total Total number of skill invocations",
        "# TYPE skill_invocations_total counter",
      ];
      
      stats.forEach((s, skillId) => {
        lines.push(`skill_invocations_total{skill="${skillId}",status="success"} ${s.successCount}`);
        lines.push(`skill_invocations_total{skill="${skillId}",status="failure"} ${s.failureCount}`);
      });
      
      lines.push("");
      lines.push("# HELP skill_duration_seconds_avg Average skill execution duration");
      lines.push("# TYPE skill_duration_seconds_avg gauge");
      
      stats.forEach((s, skillId) => {
        lines.push(`skill_duration_seconds_avg{skill="${skillId}"} ${(s.averageDurationMs / 1000).toFixed(4)}`);
      });
      
      return lines.join("\n");
    },
    
    reset(): void {
      invocations.length = 0;
      stats.clear();
    },
  };
}

// Singleton instance
export const skillMetrics = createSkillMetrics();
