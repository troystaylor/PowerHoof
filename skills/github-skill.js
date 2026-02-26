/**
 * GitHub Skill
 * 
 * Interact with GitHub using the gh CLI or GitHub API.
 * Supports issues, PRs, repos, and more.
 */

import { spawn } from "child_process";

export const skill = {
  manifest: {
    id: "github-skill",
    name: "GitHub",
    description: "Interact with GitHub repositories, issues, PRs, and more",
    version: "1.0.0",
    author: "PowerHoof",
    permissions: ["read-context", "execute", "network"],
    examples: [
      "/gh issue list",
      "/gh pr status",
      "github create issue",
      "/gh repo view"
    ],
    tags: ["github", "git", "development", "vcs"],
    requires: {
      bins: ["gh"]
    }
  },

  async canHandle(context) {
    const content = context.message.content?.toLowerCase() || "";
    const triggers = [
      "/gh",
      "/github",
      "github ",
      "gh issue",
      "gh pr",
      "gh repo",
      "create issue",
      "list issues",
      "list prs",
      "pull requests"
    ];
    return triggers.some(t => content.includes(t));
  },

  async execute(context) {
    const content = context.message.content || "";
    
    // Extract GitHub command
    let command = content
      .replace(/^\/?(?:gh|github)\s*/i, "")
      .trim();

    // Parse common natural language commands
    command = this.parseNaturalLanguage(command);

    if (!command) {
      return {
        success: true,
        content: this.getHelp(),
        nextAction: "respond"
      };
    }

    try {
      const result = await this.runGhCommand(command);
      return {
        success: true,
        content: result,
        data: { command },
        nextAction: "respond"
      };
    } catch (error) {
      return {
        success: false,
        content: `GitHub command failed: ${error.message}\n\n${this.getHelp()}`,
        nextAction: "respond"
      };
    }
  },

  parseNaturalLanguage(command) {
    const lower = command.toLowerCase();
    
    // Map natural language to gh commands
    const mappings = [
      { pattern: /^list\s+issues?$/i, cmd: "issue list" },
      { pattern: /^list\s+(?:pull\s+requests?|prs?)$/i, cmd: "pr list" },
      { pattern: /^(?:show|view)\s+repo(?:sitory)?$/i, cmd: "repo view" },
      { pattern: /^pr\s+status$/i, cmd: "pr status" },
      { pattern: /^issue\s+status$/i, cmd: "issue status" },
      { pattern: /^my\s+issues?$/i, cmd: "issue list --assignee @me" },
      { pattern: /^my\s+prs?$/i, cmd: "pr list --author @me" },
      { pattern: /^create\s+issue\s+(.+)$/i, cmd: (m) => `issue create --title "${m[1]}"` },
      { pattern: /^(?:view|show)\s+issue\s+#?(\d+)$/i, cmd: (m) => `issue view ${m[1]}` },
      { pattern: /^(?:view|show)\s+pr\s+#?(\d+)$/i, cmd: (m) => `pr view ${m[1]}` },
    ];

    for (const { pattern, cmd } of mappings) {
      const match = lower.match(pattern);
      if (match) {
        return typeof cmd === "function" ? cmd(match) : cmd;
      }
    }

    return command;
  },

  async runGhCommand(args) {
    return new Promise((resolve, reject) => {
      const proc = spawn("gh", args.split(/\s+/), {
        shell: true,
        env: { ...process.env, GH_PAGER: "" }
      });

      let stdout = "";
      let stderr = "";

      proc.stdout?.on("data", (data) => {
        stdout += data.toString();
      });

      proc.stderr?.on("data", (data) => {
        stderr += data.toString();
      });

      proc.on("error", (error) => {
        reject(new Error(`Failed to run gh: ${error.message}. Is gh CLI installed?`));
      });

      proc.on("close", (code) => {
        if (code === 0) {
          resolve(stdout.trim() || "Command completed successfully.");
        } else {
          reject(new Error(stderr.trim() || `gh exited with code ${code}`));
        }
      });

      // Timeout after 30 seconds
      setTimeout(() => {
        proc.kill();
        reject(new Error("Command timed out"));
      }, 30000);
    });
  },

  getHelp() {
    return `🐙 **GitHub Skill**

**Commands:**
\`/gh issue list\` - List open issues
\`/gh issue view <number>\` - View specific issue
\`/gh pr list\` - List open pull requests
\`/gh pr status\` - Show PR status for current branch
\`/gh repo view\` - View repository info
\`/gh my issues\` - List issues assigned to you
\`/gh my prs\` - List your pull requests

**Natural Language:**
- "list issues"
- "show pr 123"
- "create issue Fix the bug"

**Requires:** gh CLI installed and authenticated (\`gh auth login\`)`;
  }
};

export default skill;
