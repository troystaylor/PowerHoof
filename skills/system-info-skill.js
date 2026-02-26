/**
 * System Info Skill
 * 
 * Get system information, environment details, and diagnostics.
 */

import { cpus, totalmem, freemem, platform, release, arch, hostname, uptime, networkInterfaces } from "os";
import { version as nodeVersion } from "process";

export const skill = {
  manifest: {
    id: "system-info-skill",
    name: "SystemInfo",
    description: "Get system information, environment, and diagnostics",
    version: "1.0.0",
    author: "PowerHoof",
    permissions: ["read-context", "system-info"],
    examples: [
      "/sysinfo",
      "/env NODE_ENV",
      "system information",
      "/uptime"
    ],
    tags: ["system", "diagnostics", "utility", "info"]
  },

  async canHandle(context) {
    const content = context.message.content?.toLowerCase() || "";
    const triggers = [
      "/sysinfo",
      "/system",
      "/env",
      "/uptime",
      "/cpu",
      "/memory",
      "/network",
      "system info",
      "system information",
      "show environment"
    ];
    return triggers.some(t => content.includes(t));
  },

  async execute(context) {
    const content = context.message.content || "";
    const lower = content.toLowerCase();

    if (lower.includes("/env")) {
      return this.getEnv(content);
    } else if (lower.includes("/cpu")) {
      return this.getCpuInfo();
    } else if (lower.includes("/memory") || lower.includes("/mem")) {
      return this.getMemoryInfo();
    } else if (lower.includes("/network") || lower.includes("/net")) {
      return this.getNetworkInfo();
    } else if (lower.includes("/uptime")) {
      return this.getUptime();
    } else {
      return this.getFullSystemInfo();
    }
  },

  getFullSystemInfo() {
    const cpuInfo = cpus();
    const totalMem = totalmem();
    const freeMem = freemem();
    const usedMem = totalMem - freeMem;

    const info = `🖥️ **System Information**

**Platform:**
• OS: ${platform()} ${release()}
• Architecture: ${arch()}
• Hostname: ${hostname()}
• Uptime: ${this.formatUptime(uptime())}

**CPU:**
• Model: ${cpuInfo[0]?.model || "Unknown"}
• Cores: ${cpuInfo.length}
• Speed: ${cpuInfo[0]?.speed || 0} MHz

**Memory:**
• Total: ${this.formatBytes(totalMem)}
• Used: ${this.formatBytes(usedMem)} (${Math.round(usedMem / totalMem * 100)}%)
• Free: ${this.formatBytes(freeMem)} (${Math.round(freeMem / totalMem * 100)}%)

**Runtime:**
• Node.js: ${nodeVersion}
• Working Dir: ${process.cwd()}`;

    return {
      success: true,
      content: info,
      data: {
        platform: platform(),
        arch: arch(),
        cpuCores: cpuInfo.length,
        totalMemory: totalMem,
        freeMemory: freeMem,
        uptime: uptime()
      },
      nextAction: "respond"
    };
  },

  getEnv(content) {
    const varName = content
      .replace(/^\/?env\s*/i, "")
      .trim()
      .toUpperCase();

    if (!varName) {
      // Show safe subset of env vars
      const safeVars = [
        "NODE_ENV", "PATH", "HOME", "USER", "SHELL", "LANG",
        "TERM", "EDITOR", "TZ", "PWD", "HOSTNAME"
      ];
      
      const envList = safeVars
        .filter(v => process.env[v])
        .map(v => `• **${v}**: \`${this.truncate(process.env[v], 50)}\``)
        .join("\n");

      return {
        success: true,
        content: `🔧 **Environment Variables**\n\n${envList || "No common variables set."}\n\n_Use \`/env <NAME>\` to get a specific variable._`,
        nextAction: "respond"
      };
    }

    const value = process.env[varName];
    
    if (value === undefined) {
      return {
        success: true,
        content: `🔧 Environment variable \`${varName}\` is not set.`,
        nextAction: "respond"
      };
    }

    // Don't expose sensitive-looking vars
    const sensitive = ["KEY", "SECRET", "PASSWORD", "TOKEN", "CREDENTIAL", "AUTH"];
    if (sensitive.some(s => varName.includes(s))) {
      return {
        success: true,
        content: `🔧 **${varName}**: \`[REDACTED - contains sensitive data]\``,
        nextAction: "respond"
      };
    }

    return {
      success: true,
      content: `🔧 **${varName}**: \`${value}\``,
      data: { name: varName, value },
      nextAction: "respond"
    };
  },

  getCpuInfo() {
    const cpuInfo = cpus();
    const model = cpuInfo[0]?.model || "Unknown";
    
    let output = `🔲 **CPU Information**\n\n`;
    output += `• Model: ${model}\n`;
    output += `• Cores: ${cpuInfo.length}\n`;
    output += `• Base Speed: ${cpuInfo[0]?.speed || 0} MHz\n\n`;
    output += `**Per-Core Usage:**\n`;

    for (let i = 0; i < Math.min(cpuInfo.length, 8); i++) {
      const cpu = cpuInfo[i];
      const total = Object.values(cpu.times).reduce((a, b) => a + b, 0);
      const idle = cpu.times.idle;
      const usage = Math.round((1 - idle / total) * 100);
      output += `• Core ${i}: ${usage}% (${cpu.speed} MHz)\n`;
    }
    
    if (cpuInfo.length > 8) {
      output += `• ... and ${cpuInfo.length - 8} more cores\n`;
    }

    return {
      success: true,
      content: output,
      data: { model, cores: cpuInfo.length },
      nextAction: "respond"
    };
  },

  getMemoryInfo() {
    const totalMem = totalmem();
    const freeMem = freemem();
    const usedMem = totalMem - freeMem;
    const usedPercent = Math.round(usedMem / totalMem * 100);
    
    // Memory bar visualization
    const barLength = 20;
    const filledLength = Math.round(usedPercent / 100 * barLength);
    const bar = "█".repeat(filledLength) + "░".repeat(barLength - filledLength);

    const processMemory = process.memoryUsage();

    const output = `💾 **Memory Information**

**System Memory:**
\`[${bar}]\` ${usedPercent}%
• Total: ${this.formatBytes(totalMem)}
• Used: ${this.formatBytes(usedMem)}
• Free: ${this.formatBytes(freeMem)}

**Process Memory (Node.js):**
• Heap Used: ${this.formatBytes(processMemory.heapUsed)}
• Heap Total: ${this.formatBytes(processMemory.heapTotal)}
• RSS: ${this.formatBytes(processMemory.rss)}
• External: ${this.formatBytes(processMemory.external)}`;

    return {
      success: true,
      content: output,
      data: { totalMem, freeMem, usedMem, processMemory },
      nextAction: "respond"
    };
  },

  getNetworkInfo() {
    const interfaces = networkInterfaces();
    let output = `🌐 **Network Interfaces**\n\n`;

    for (const [name, addrs] of Object.entries(interfaces)) {
      if (!addrs) continue;
      
      const ipv4 = addrs.find(a => a.family === "IPv4" && !a.internal);
      const ipv6 = addrs.find(a => a.family === "IPv6" && !a.internal);
      
      if (ipv4 || ipv6) {
        output += `**${name}:**\n`;
        if (ipv4) output += `  • IPv4: \`${ipv4.address}\`\n`;
        if (ipv6) output += `  • IPv6: \`${ipv6.address}\`\n`;
        if (ipv4) output += `  • MAC: \`${ipv4.mac}\`\n`;
        output += "\n";
      }
    }

    // Add localhost info
    output += `**Localhost:**\n`;
    output += `  • IPv4: \`127.0.0.1\`\n`;
    output += `  • IPv6: \`::1\`\n`;

    return {
      success: true,
      content: output.trim(),
      data: { interfaces: Object.keys(interfaces) },
      nextAction: "respond"
    };
  },

  getUptime() {
    const sysUptime = uptime();
    const processUptime = process.uptime();

    return {
      success: true,
      content: `⏱️ **Uptime**

• System: ${this.formatUptime(sysUptime)}
• Process: ${this.formatUptime(processUptime)}
• Started: ${new Date(Date.now() - processUptime * 1000).toLocaleString()}`,
      data: { systemUptime: sysUptime, processUptime },
      nextAction: "respond"
    };
  },

  formatBytes(bytes) {
    const units = ["B", "KB", "MB", "GB", "TB"];
    let unitIndex = 0;
    let size = bytes;
    
    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }
    
    return `${size.toFixed(2)} ${units[unitIndex]}`;
  },

  formatUptime(seconds) {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    const parts = [];
    if (days > 0) parts.push(`${days}d`);
    if (hours > 0) parts.push(`${hours}h`);
    if (minutes > 0) parts.push(`${minutes}m`);
    parts.push(`${secs}s`);

    return parts.join(" ");
  },

  truncate(str, length) {
    if (!str || str.length <= length) return str;
    return str.substring(0, length) + "...";
  }
};

export default skill;
