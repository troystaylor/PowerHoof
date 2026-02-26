/**
 * Self-Improving Agent Skill
 * 
 * Captures learnings, errors, and corrections to enable continuous improvement.
 * Based on: https://clawhub.ai/pskoett/self-improving-agent
 * 
 * Use when:
 * - A command or operation fails unexpectedly
 * - User corrects the agent
 * - User requests a missing feature
 * - Knowledge was outdated
 * - A better approach is discovered
 */

import { readFile, writeFile, mkdir } from "fs/promises";
import { existsSync } from "fs";
import { join, dirname } from "path";

export const skill = {
  manifest: {
    id: "self-improving-skill",
    name: "SelfImproving",
    description: "Captures learnings, errors, and corrections for continuous improvement",
    version: "1.0.0",
    author: "PowerHoof (based on pskoett/self-improving-agent)",
    permissions: ["read-context", "file-read", "file-write"],
    examples: [
      "/learn my API key format was wrong",
      "/error command X failed with Y",
      "/feature request ability to do Z",
      "/learnings list",
      "/promote LRN-20260225-001"
    ],
    tags: ["learning", "improvement", "memory", "errors", "self-improvement"]
  },

  learningsDir: ".learnings",

  async canHandle(context) {
    const content = context.message.content?.toLowerCase() || "";
    const triggers = [
      "/learn",
      "/learning",
      "/error",
      "/err",
      "/feature",
      "/feat",
      "/learnings",
      "/errors",
      "/features",
      "/promote",
      "log this learning",
      "log this error",
      "remember this",
      "that was wrong",
      "actually it should",
      "correct that"
    ];
    return triggers.some(t => content.includes(t));
  },

  async execute(context) {
    const content = context.message.content || "";
    const lower = content.toLowerCase();
    const workingDir = context.workingDirectory || process.cwd();

    try {
      // Ensure .learnings directory exists
      await this.ensureLearningsDir(workingDir);

      // Determine action
      if (lower.match(/^\/?(?:learn|learning)\b/)) {
        return await this.logLearning(content, workingDir, context);
      } else if (lower.match(/^\/?(?:error|err)\b/)) {
        return await this.logError(content, workingDir, context);
      } else if (lower.match(/^\/?(?:feature|feat)\b/)) {
        return await this.logFeatureRequest(content, workingDir, context);
      } else if (lower.match(/^\/?learnings\s+list|^\/?errors\s+list|^\/?features\s+list/)) {
        return await this.listEntries(content, workingDir);
      } else if (lower.match(/^\/?promote\b/)) {
        return await this.promoteEntry(content, workingDir);
      } else if (lower.includes("that was wrong") || lower.includes("actually it should") || lower.includes("correct that")) {
        return await this.logCorrection(content, workingDir, context);
      }

      return {
        success: true,
        content: this.getHelp(),
        nextAction: "respond"
      };
    } catch (error) {
      return {
        success: false,
        content: `Self-improvement error: ${error.message}`,
        nextAction: "respond"
      };
    }
  },

  async ensureLearningsDir(workingDir) {
    const learningsPath = join(workingDir, this.learningsDir);
    if (!existsSync(learningsPath)) {
      await mkdir(learningsPath, { recursive: true });
      
      // Create template files
      await this.createTemplateFiles(learningsPath);
    }
    return learningsPath;
  },

  async createTemplateFiles(learningsPath) {
    const learningsFile = join(learningsPath, "LEARNINGS.md");
    const errorsFile = join(learningsPath, "ERRORS.md");
    const featuresFile = join(learningsPath, "FEATURE_REQUESTS.md");

    if (!existsSync(learningsFile)) {
      await writeFile(learningsFile, `# Learnings Log

Corrections, knowledge gaps, and best practices discovered during development.

---

`);
    }

    if (!existsSync(errorsFile)) {
      await writeFile(errorsFile, `# Errors Log

Command failures, exceptions, and unexpected behaviors encountered.

---

`);
    }

    if (!existsSync(featuresFile)) {
      await writeFile(featuresFile, `# Feature Requests Log

User-requested capabilities and enhancements.

---

`);
    }
  },

  generateId(type) {
    const now = new Date();
    const date = now.toISOString().slice(0, 10).replace(/-/g, "");
    const seq = Math.random().toString(36).substring(2, 5).toUpperCase();
    return `${type}-${date}-${seq}`;
  },

  async logLearning(content, workingDir, context) {
    const description = content
      .replace(/^\/?(?:learn|learning)\s*/i, "")
      .trim();

    if (!description) {
      return {
        success: false,
        content: "What did you learn? Example: `/learn API requires Bearer token prefix`",
        nextAction: "respond"
      };
    }

    const id = this.generateId("LRN");
    const timestamp = new Date().toISOString();
    
    // Detect category
    let category = "general";
    if (content.toLowerCase().includes("wrong") || content.toLowerCase().includes("correct")) {
      category = "correction";
    } else if (content.toLowerCase().includes("didn't know") || content.toLowerCase().includes("learned")) {
      category = "knowledge_gap";
    } else if (content.toLowerCase().includes("better") || content.toLowerCase().includes("should")) {
      category = "best_practice";
    }

    const entry = `
## [${id}] ${category}

**Logged**: ${timestamp}
**Priority**: medium
**Status**: pending
**Area**: ${this.detectArea(description)}

### Summary
${description}

### Details
Context from conversation - learning captured for future reference.

### Suggested Action
Apply this knowledge in future similar situations.

### Metadata
- Source: user_feedback
- Tags: ${category}

---
`;

    const filePath = join(workingDir, this.learningsDir, "LEARNINGS.md");
    await this.appendToFile(filePath, entry);

    return {
      success: true,
      content: `📚 **Learning Logged**\n\nID: \`${id}\`\nCategory: ${category}\n\n"${description}"\n\n_Saved to ${this.learningsDir}/LEARNINGS.md_`,
      data: { id, category, description },
      nextAction: "respond"
    };
  },

  async logError(content, workingDir, context) {
    const description = content
      .replace(/^\/?(?:error|err)\s*/i, "")
      .trim();

    if (!description) {
      return {
        success: false,
        content: "What error occurred? Example: `/error npm install failed: EACCES permission denied`",
        nextAction: "respond"
      };
    }

    const id = this.generateId("ERR");
    const timestamp = new Date().toISOString();

    const entry = `
## [${id}] command_failure

**Logged**: ${timestamp}
**Priority**: high
**Status**: pending
**Area**: ${this.detectArea(description)}

### Summary
${description}

### Error
\`\`\`
${description}
\`\`\`

### Context
- Command/operation that failed
- Environment: ${process.platform} / Node ${process.version}

### Suggested Fix
Investigate root cause and document solution.

### Metadata
- Reproducible: unknown
- Source: error

---
`;

    const filePath = join(workingDir, this.learningsDir, "ERRORS.md");
    await this.appendToFile(filePath, entry);

    return {
      success: true,
      content: `🚨 **Error Logged**\n\nID: \`${id}\`\nPriority: high\n\n"${description}"\n\n_Saved to ${this.learningsDir}/ERRORS.md_`,
      data: { id, description },
      nextAction: "respond"
    };
  },

  async logFeatureRequest(content, workingDir, context) {
    const description = content
      .replace(/^\/?(?:feature|feat)(?:\s+request)?\s*/i, "")
      .trim();

    if (!description) {
      return {
        success: false,
        content: "What feature would you like? Example: `/feature support for PDF export`",
        nextAction: "respond"
      };
    }

    const id = this.generateId("FEAT");
    const timestamp = new Date().toISOString();

    const entry = `
## [${id}] ${this.slugify(description.substring(0, 30))}

**Logged**: ${timestamp}
**Priority**: medium
**Status**: pending
**Area**: ${this.detectArea(description)}

### Requested Capability
${description}

### User Context
Feature requested during conversation.

### Complexity Estimate
medium

### Suggested Implementation
To be determined based on requirements.

### Metadata
- Frequency: first_time
- Source: user_request

---
`;

    const filePath = join(workingDir, this.learningsDir, "FEATURE_REQUESTS.md");
    await this.appendToFile(filePath, entry);

    return {
      success: true,
      content: `💡 **Feature Request Logged**\n\nID: \`${id}\`\n\n"${description}"\n\n_Saved to ${this.learningsDir}/FEATURE_REQUESTS.md_`,
      data: { id, description },
      nextAction: "respond"
    };
  },

  async logCorrection(content, workingDir, context) {
    // Extract correction from natural language
    const description = content
      .replace(/^(?:that was wrong|actually it should|correct that)[,:]?\s*/i, "")
      .trim() || content;

    return await this.logLearning(`/learn correction: ${description}`, workingDir, context);
  },

  async listEntries(content, workingDir) {
    const lower = content.toLowerCase();
    let filename;
    let title;

    if (lower.includes("error")) {
      filename = "ERRORS.md";
      title = "Errors";
    } else if (lower.includes("feature")) {
      filename = "FEATURE_REQUESTS.md";
      title = "Feature Requests";
    } else {
      filename = "LEARNINGS.md";
      title = "Learnings";
    }

    const filePath = join(workingDir, this.learningsDir, filename);
    
    if (!existsSync(filePath)) {
      return {
        success: true,
        content: `📋 **${title}**\n\nNo entries yet.`,
        nextAction: "respond"
      };
    }

    const fileContent = await readFile(filePath, "utf-8");
    
    // Count entries
    const entries = fileContent.match(/## \[(?:LRN|ERR|FEAT)-\d+-\w+\]/g) || [];
    const pending = (fileContent.match(/Status\*\*: pending/g) || []).length;
    const resolved = (fileContent.match(/Status\*\*: resolved/g) || []).length;

    // Get recent entries (last 5)
    const entryPattern = /## \[(LRN|ERR|FEAT)-(\d+)-(\w+)\] (\w+)/g;
    const recentEntries = [];
    let match;
    while ((match = entryPattern.exec(fileContent)) !== null) {
      recentEntries.push({
        id: `${match[1]}-${match[2]}-${match[3]}`,
        category: match[4]
      });
    }

    let output = `📋 **${title}** (${entries.length} total)\n\n`;
    output += `• Pending: ${pending}\n`;
    output += `• Resolved: ${resolved}\n\n`;

    if (recentEntries.length > 0) {
      output += `**Recent:**\n`;
      for (const entry of recentEntries.slice(-5).reverse()) {
        output += `• \`${entry.id}\` - ${entry.category}\n`;
      }
    }

    return {
      success: true,
      content: output,
      data: { total: entries.length, pending, resolved },
      nextAction: "respond"
    };
  },

  async promoteEntry(content, workingDir) {
    const idMatch = content.match(/(LRN|ERR|FEAT)-\d+-\w+/i);
    
    if (!idMatch) {
      return {
        success: false,
        content: "Specify an entry ID to promote. Example: `/promote LRN-20260225-A7B`",
        nextAction: "respond"
      };
    }

    const entryId = idMatch[0].toUpperCase();
    
    return {
      success: true,
      content: `🚀 **Promotion Target: ${entryId}**\n\nTo promote this learning, add it to one of:\n` +
               `• \`CLAUDE.md\` - Project facts and conventions\n` +
               `• \`AGENTS.md\` - Workflows and automation\n` +
               `• \`.github/copilot-instructions.md\` - Copilot context\n\n` +
               `_Mark as promoted: Update status to \`promoted\` in the entry._`,
      data: { entryId },
      nextAction: "respond"
    };
  },

  async appendToFile(filePath, content) {
    let existing = "";
    if (existsSync(filePath)) {
      existing = await readFile(filePath, "utf-8");
    }
    await writeFile(filePath, existing + content);
  },

  detectArea(text) {
    const lower = text.toLowerCase();
    if (lower.match(/\b(?:ui|component|css|html|react|vue|angular|frontend)\b/)) return "frontend";
    if (lower.match(/\b(?:api|server|database|sql|backend|node|express)\b/)) return "backend";
    if (lower.match(/\b(?:ci|cd|docker|deploy|azure|aws|infra|kubernetes)\b/)) return "infra";
    if (lower.match(/\b(?:test|spec|jest|vitest|coverage)\b/)) return "tests";
    if (lower.match(/\b(?:doc|readme|comment|markdown)\b/)) return "docs";
    if (lower.match(/\b(?:config|env|setting|json|yaml)\b/)) return "config";
    return "general";
  },

  slugify(text) {
    return text.toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_|_$/g, "")
      .substring(0, 30);
  },

  getHelp() {
    return `📚 **Self-Improving Agent Skill**

Captures learnings, errors, and corrections for continuous improvement.

**Commands:**
\`/learn <what you learned>\` - Log a learning or correction
\`/error <what failed>\` - Log an error or failure
\`/feature <requested capability>\` - Log a feature request
\`/learnings list\` - Show learnings summary
\`/errors list\` - Show errors summary
\`/promote <ID>\` - Promote entry to project memory

**Auto-Detection:**
Say "that was wrong" or "actually it should be..." to auto-log corrections.

**Files Created:**
• \`.learnings/LEARNINGS.md\` - Corrections, knowledge gaps, best practices
• \`.learnings/ERRORS.md\` - Command failures, exceptions
• \`.learnings/FEATURE_REQUESTS.md\` - User-requested capabilities

**Entry Format:** \`TYPE-YYYYMMDD-XXX\` (e.g., LRN-20260225-A7B)`;
  }
};

export default skill;
