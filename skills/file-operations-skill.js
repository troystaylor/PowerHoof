/**
 * File Operations Skill
 * 
 * Read, write, and manage files in the workspace.
 */

import { readFile, writeFile, readdir, stat, mkdir } from "fs/promises";
import { join, resolve, basename, dirname, extname } from "path";
import { existsSync } from "fs";

export const skill = {
  manifest: {
    id: "file-operations-skill",
    name: "FileOps",
    description: "Read, write, list, and manage files in the workspace",
    version: "1.0.0",
    author: "PowerHoof",
    permissions: ["read-context", "file-read", "file-write"],
    examples: [
      "/read package.json",
      "/ls src",
      "/write notes.txt Hello world",
      "/cat README.md"
    ],
    tags: ["file", "filesystem", "utility", "io"]
  },

  async canHandle(context) {
    const content = context.message.content?.toLowerCase() || "";
    const triggers = [
      "/read",
      "/write",
      "/cat",
      "/ls",
      "/dir",
      "/mkdir",
      "/tree",
      "read file",
      "write file",
      "list files",
      "show file",
      "create directory"
    ];
    return triggers.some(t => content.includes(t));
  },

  async execute(context) {
    const content = context.message.content || "";
    const lower = content.toLowerCase();
    const workingDir = context.workingDirectory || process.cwd();

    try {
      // Determine operation
      if (lower.match(/^\/?(?:read|cat|show file)/)) {
        return await this.readFileOp(content, workingDir);
      } else if (lower.match(/^\/?(?:write|create file)/)) {
        return await this.writeFileOp(content, workingDir);
      } else if (lower.match(/^\/?(?:ls|dir|list)/)) {
        return await this.listDir(content, workingDir);
      } else if (lower.match(/^\/?(?:mkdir|create directory)/)) {
        return await this.mkdirOp(content, workingDir);
      } else if (lower.match(/^\/?tree/)) {
        return await this.treeOp(content, workingDir);
      }

      return {
        success: true,
        content: this.getHelp(),
        nextAction: "respond"
      };
    } catch (error) {
      return {
        success: false,
        content: `File operation failed: ${error.message}`,
        nextAction: "respond"
      };
    }
  },

  async readFileOp(content, workingDir) {
    const pathArg = content
      .replace(/^\/?(?:read|cat|show)\s*/i, "")
      .replace(/^file\s*/i, "")
      .trim();

    if (!pathArg) {
      return {
        success: false,
        content: "Please specify a file path. Example: `/read package.json`",
        nextAction: "respond"
      };
    }

    const filePath = this.resolvePath(pathArg, workingDir);
    
    if (!existsSync(filePath)) {
      return {
        success: false,
        content: `File not found: ${pathArg}`,
        nextAction: "respond"
      };
    }

    const stats = await stat(filePath);
    
    if (stats.isDirectory()) {
      return await this.listDir(`/ls ${pathArg}`, workingDir);
    }

    // Check file size (limit to 100KB for display)
    if (stats.size > 100 * 1024) {
      return {
        success: false,
        content: `File too large to display (${(stats.size / 1024).toFixed(1)}KB). Maximum is 100KB.`,
        nextAction: "respond"
      };
    }

    const fileContent = await readFile(filePath, "utf-8");
    const ext = extname(filePath).slice(1) || "text";
    const lang = this.getLanguage(ext);

    return {
      success: true,
      content: `📄 **${basename(filePath)}** (${(stats.size / 1024).toFixed(1)}KB)\n\n\`\`\`${lang}\n${fileContent}\n\`\`\``,
      data: { path: filePath, size: stats.size, content: fileContent },
      nextAction: "respond"
    };
  },

  async writeFileOp(content, workingDir) {
    // Parse: /write <path> <content>
    const match = content.match(/^\/?write\s+(\S+)\s+([\s\S]+)$/i);
    
    if (!match) {
      return {
        success: false,
        content: "Usage: `/write <filename> <content>`\n\nExample: `/write notes.txt Hello world`",
        nextAction: "respond"
      };
    }

    const [, pathArg, fileContent] = match;
    const filePath = this.resolvePath(pathArg, workingDir);
    
    // Ensure directory exists
    const dir = dirname(filePath);
    if (!existsSync(dir)) {
      await mkdir(dir, { recursive: true });
    }

    await writeFile(filePath, fileContent, "utf-8");

    return {
      success: true,
      content: `✅ Written to **${basename(filePath)}** (${fileContent.length} bytes)`,
      data: { path: filePath, size: fileContent.length },
      nextAction: "respond"
    };
  },

  async listDir(content, workingDir) {
    const pathArg = content
      .replace(/^\/?(?:ls|dir|list)\s*/i, "")
      .replace(/^files?\s*/i, "")
      .trim() || ".";

    const dirPath = this.resolvePath(pathArg, workingDir);
    
    if (!existsSync(dirPath)) {
      return {
        success: false,
        content: `Directory not found: ${pathArg}`,
        nextAction: "respond"
      };
    }

    const entries = await readdir(dirPath, { withFileTypes: true });
    
    const dirs = entries.filter(e => e.isDirectory()).map(e => `📁 ${e.name}/`);
    const files = entries.filter(e => e.isFile()).map(e => `📄 ${e.name}`);
    
    const output = [
      `📂 **${pathArg === "." ? basename(workingDir) : pathArg}/**`,
      "",
      ...dirs.sort(),
      ...files.sort()
    ].join("\n");

    return {
      success: true,
      content: output || "Empty directory",
      data: { path: dirPath, count: entries.length },
      nextAction: "respond"
    };
  },

  async mkdirOp(content, workingDir) {
    const pathArg = content
      .replace(/^\/?(?:mkdir|create directory)\s*/i, "")
      .trim();

    if (!pathArg) {
      return {
        success: false,
        content: "Please specify a directory name. Example: `/mkdir new-folder`",
        nextAction: "respond"
      };
    }

    const dirPath = this.resolvePath(pathArg, workingDir);
    await mkdir(dirPath, { recursive: true });

    return {
      success: true,
      content: `✅ Created directory: **${pathArg}**`,
      data: { path: dirPath },
      nextAction: "respond"
    };
  },

  async treeOp(content, workingDir, depth = 0, maxDepth = 3) {
    const pathArg = content
      .replace(/^\/?tree\s*/i, "")
      .trim() || ".";

    const dirPath = this.resolvePath(pathArg, workingDir);
    
    if (!existsSync(dirPath)) {
      return {
        success: false,
        content: `Directory not found: ${pathArg}`,
        nextAction: "respond"
      };
    }

    const tree = await this.buildTree(dirPath, 0, 3);
    
    return {
      success: true,
      content: `🌳 **${pathArg}**\n\n\`\`\`\n${tree}\n\`\`\``,
      nextAction: "respond"
    };
  },

  async buildTree(dirPath, depth = 0, maxDepth = 3, prefix = "") {
    if (depth >= maxDepth) return "";
    
    const entries = await readdir(dirPath, { withFileTypes: true });
    const lines = [];
    
    const sortedEntries = [
      ...entries.filter(e => e.isDirectory()).sort((a, b) => a.name.localeCompare(b.name)),
      ...entries.filter(e => e.isFile()).sort((a, b) => a.name.localeCompare(b.name))
    ];
    
    // Skip common ignored directories
    const ignored = ["node_modules", ".git", "dist", "coverage", ".next", "__pycache__"];
    
    for (let i = 0; i < sortedEntries.length; i++) {
      const entry = sortedEntries[i];
      const isLast = i === sortedEntries.length - 1;
      const connector = isLast ? "└── " : "├── ";
      const childPrefix = isLast ? "    " : "│   ";
      
      if (entry.isDirectory()) {
        if (ignored.includes(entry.name)) {
          lines.push(`${prefix}${connector}${entry.name}/ (ignored)`);
        } else {
          lines.push(`${prefix}${connector}${entry.name}/`);
          const children = await this.buildTree(
            join(dirPath, entry.name),
            depth + 1,
            maxDepth,
            prefix + childPrefix
          );
          if (children) lines.push(children);
        }
      } else {
        lines.push(`${prefix}${connector}${entry.name}`);
      }
    }
    
    return lines.join("\n");
  },

  resolvePath(pathArg, workingDir) {
    if (pathArg.startsWith("/") || /^[A-Za-z]:/.test(pathArg)) {
      return resolve(pathArg);
    }
    return resolve(workingDir, pathArg);
  },

  getLanguage(ext) {
    const map = {
      js: "javascript", ts: "typescript", py: "python", rb: "ruby",
      json: "json", yaml: "yaml", yml: "yaml", md: "markdown",
      html: "html", css: "css", sql: "sql", sh: "bash",
      ps1: "powershell", nu: "nushell", rs: "rust", go: "go",
      java: "java", cs: "csharp", cpp: "cpp", c: "c"
    };
    return map[ext.toLowerCase()] || ext;
  },

  getHelp() {
    return `📁 **File Operations Skill**

**Commands:**
\`/read <file>\` - Display file contents
\`/cat <file>\` - Alias for read
\`/ls [dir]\` - List directory contents
\`/tree [dir]\` - Show directory tree
\`/write <file> <content>\` - Write content to file
\`/mkdir <dir>\` - Create directory

**Examples:**
- \`/read package.json\`
- \`/ls src\`
- \`/tree .\`
- \`/write notes.txt Hello world\``;
  }
};

export default skill;
