/**
 * SharePoint/OneDrive Skill
 * 
 * Upload files, search, and manage documents via Microsoft Graph API.
 * Based on Microsoft Agent 365 tooling servers.
 * 
 * Requires: Microsoft Graph API access with Files permissions
 */

export const skill = {
  manifest: {
    id: "sharepoint-skill",
    name: "SharePoint",
    description: "Upload, search, and manage SharePoint/OneDrive files via Microsoft Graph",
    version: "1.0.0",
    author: "PowerHoof",
    permissions: ["read-context", "network", "files"],
    examples: [
      "/onedrive list",
      "/sharepoint search project",
      "/files recent",
      "/drive upload"
    ],
    tags: ["sharepoint", "onedrive", "files", "microsoft365", "documents", "storage"],
    requires: {
      env: ["MICROSOFT_GRAPH_TOKEN"]
    }
  },

  async canHandle(context) {
    const content = context.message.content?.toLowerCase() || "";
    const triggers = [
      "/sharepoint",
      "/onedrive",
      "/drive",
      "/files",
      "my files",
      "onedrive files",
      "sharepoint search",
      "upload to onedrive"
    ];
    return triggers.some(t => content.includes(t));
  },

  async execute(context) {
    const content = context.message.content || "";
    const lower = content.toLowerCase();

    // Check for Graph API token
    const token = process.env.MICROSOFT_GRAPH_TOKEN;
    
    if (!token) {
      return {
        success: false,
        content: this.getSetupInstructions(),
        nextAction: "respond"
      };
    }

    try {
      if (lower.match(/^\/?(?:onedrive|drive|files)\s+list|my files/)) {
        return await this.listFiles(token, content);
      } else if (lower.match(/^\/?(?:onedrive|drive|files)\s+recent/)) {
        return await this.listRecentFiles(token);
      } else if (lower.match(/^\/?(?:sharepoint|onedrive|drive|files)\s+search/)) {
        return await this.searchFiles(token, content);
      } else if (lower.match(/^\/?(?:sharepoint|onedrive|drive)\s+sites/)) {
        return await this.listSites(token);
      } else if (lower.match(/^\/?(?:drive|files)\s+upload/)) {
        return this.uploadPrompt(content);
      }

      return {
        success: true,
        content: this.getHelp(),
        nextAction: "respond"
      };
    } catch (error) {
      return {
        success: false,
        content: `SharePoint/OneDrive operation failed: ${error.message}`,
        nextAction: "respond"
      };
    }
  },

  async listFiles(token, content) {
    // Parse folder path if provided
    let path = content
      .replace(/^\/?(?:onedrive|drive|files)\s+list\s*/i, "")
      .trim();
    
    const endpoint = path 
      ? `https://graph.microsoft.com/v1.0/me/drive/root:/${encodeURIComponent(path)}:/children`
      : `https://graph.microsoft.com/v1.0/me/drive/root/children`;

    try {
      const response = await fetch(
        `${endpoint}?$top=20&$orderby=name`,
        {
          headers: {
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json"
          }
        }
      );

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error("Token expired or invalid.");
        }
        if (response.status === 404) {
          throw new Error(`Folder not found: ${path}`);
        }
        throw new Error(`Graph API error: ${response.status}`);
      }

      const data = await response.json();
      const items = data.value || [];

      return {
        success: true,
        content: this.formatFiles(items, path || "OneDrive"),
        data: { items, path },
        nextAction: "respond"
      };
    } catch (error) {
      throw error;
    }
  },

  async listRecentFiles(token) {
    try {
      const response = await fetch(
        `https://graph.microsoft.com/v1.0/me/drive/recent?$top=15`,
        {
          headers: {
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json"
          }
        }
      );

      if (!response.ok) {
        throw new Error(`Graph API error: ${response.status}`);
      }

      const data = await response.json();
      const items = data.value || [];

      return {
        success: true,
        content: this.formatFiles(items, "Recent Files"),
        data: { items },
        nextAction: "respond"
      };
    } catch (error) {
      throw error;
    }
  },

  async searchFiles(token, content) {
    const query = content
      .replace(/^\/?(?:sharepoint|onedrive|drive|files)\s+search\s*/i, "")
      .trim();

    if (!query) {
      return {
        success: false,
        content: "What would you like to search for? Example: `/drive search quarterly report`",
        nextAction: "respond"
      };
    }

    try {
      const response = await fetch(
        `https://graph.microsoft.com/v1.0/me/drive/root/search(q='${encodeURIComponent(query)}')?$top=15`,
        {
          headers: {
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json"
          }
        }
      );

      if (!response.ok) {
        throw new Error(`Graph API error: ${response.status}`);
      }

      const data = await response.json();
      const items = data.value || [];

      return {
        success: true,
        content: this.formatFiles(items, `Search: "${query}"`),
        data: { query, items },
        nextAction: "respond"
      };
    } catch (error) {
      throw error;
    }
  },

  async listSites(token) {
    try {
      const response = await fetch(
        `https://graph.microsoft.com/v1.0/sites?search=*&$top=10`,
        {
          headers: {
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json"
          }
        }
      );

      if (!response.ok) {
        throw new Error(`Graph API error: ${response.status}`);
      }

      const data = await response.json();
      const sites = data.value || [];

      let output = `🏢 **SharePoint Sites** (${sites.length})\n\n`;

      for (const site of sites) {
        output += `**${site.displayName || site.name}**\n`;
        if (site.description) {
          output += `_${site.description.substring(0, 80)}${site.description.length > 80 ? "..." : ""}_\n`;
        }
        output += `🔗 ${site.webUrl}\n\n`;
      }

      return {
        success: true,
        content: output,
        data: { sites },
        nextAction: "respond"
      };
    } catch (error) {
      throw error;
    }
  },

  formatFiles(items, title) {
    let output = `📁 **${title}** (${items.length} items)\n\n`;

    if (items.length === 0) {
      output += "No files found.\n";
      return output;
    }

    for (const item of items) {
      const isFolder = item.folder !== undefined;
      const icon = isFolder ? "📁" : this.getFileIcon(item.name);
      
      output += `${icon} **${item.name}**\n`;
      
      if (!isFolder && item.size) {
        output += `Size: ${this.formatSize(item.size)}`;
      } else if (isFolder && item.folder?.childCount !== undefined) {
        output += `${item.folder.childCount} items`;
      }
      
      if (item.lastModifiedDateTime) {
        const modified = new Date(item.lastModifiedDateTime);
        output += ` • Modified: ${modified.toLocaleDateString()}\n`;
      } else {
        output += "\n";
      }
      
      if (item.webUrl) {
        output += `🔗 ${item.webUrl}\n`;
      }
      
      output += "\n";
    }

    return output;
  },

  getFileIcon(filename) {
    const ext = filename.split(".").pop()?.toLowerCase() || "";
    const icons = {
      // Documents
      doc: "📝", docx: "📝", pdf: "📕", txt: "📄",
      // Spreadsheets
      xls: "📊", xlsx: "📊", csv: "📊",
      // Presentations
      ppt: "📽️", pptx: "📽️",
      // Images
      jpg: "🖼️", jpeg: "🖼️", png: "🖼️", gif: "🖼️", svg: "🖼️",
      // Code
      js: "💻", ts: "💻", py: "💻", cs: "💻", json: "💻",
      // Archives
      zip: "📦", rar: "📦", tar: "📦", gz: "📦",
      // Media
      mp4: "🎬", mp3: "🎵", wav: "🎵"
    };
    return icons[ext] || "📄";
  },

  formatSize(bytes) {
    const units = ["B", "KB", "MB", "GB"];
    let size = bytes;
    let unitIndex = 0;
    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }
    return `${size.toFixed(1)} ${units[unitIndex]}`;
  },

  uploadPrompt(content) {
    return {
      success: true,
      content: `📤 **Upload to OneDrive**

To upload a file via Microsoft Graph API:

**Small files (< 4MB):**
\`\`\`http
PUT /me/drive/root:/{filename}:/content
Content-Type: application/octet-stream

<file content>
\`\`\`

**Large files (> 4MB):**
Use upload sessions:
\`\`\`http
POST /me/drive/root:/{filename}:/createUploadSession
\`\`\`

**Upload to folder:**
\`\`\`http
PUT /me/drive/root:/{folder}/{filename}:/content
\`\`\`

**Required Permission:** Files.ReadWrite

**Note:** For programmatic upload, use Microsoft Graph SDK or direct API calls.`,
      nextAction: "respond"
    };
  },

  getSetupInstructions() {
    return `📁 **SharePoint/OneDrive Skill - Setup Required**

This skill requires Microsoft Graph API access.

**Setup Steps:**
1. Register an app in Azure AD
2. Request Files permissions
3. Get an access token
4. Set \`MICROSOFT_GRAPH_TOKEN\` environment variable

**Required Permissions:**
• \`Files.Read\` - Read user's files
• \`Files.ReadWrite\` - Read and write files
• \`Sites.Read.All\` - Read SharePoint sites
• \`Sites.ReadWrite.All\` - Read and write to sites

**Quick Test:**
\`\`\`bash
az login
export MICROSOFT_GRAPH_TOKEN=$(az account get-access-token --resource https://graph.microsoft.com --query accessToken -o tsv)
\`\`\`

**MCP Server Alternative:**
Use the Agent 365 SharePoint/OneDrive MCP server for enterprise deployment.`;
  },

  getHelp() {
    return `📁 **SharePoint/OneDrive Skill**

Manage files and documents via Microsoft Graph API.

**Commands:**
\`/onedrive list [path]\` - List files (default: root)
\`/files recent\` - List recently accessed files
\`/drive search <query>\` - Search files
\`/sharepoint sites\` - List SharePoint sites
\`/drive upload\` - Show upload instructions

**Examples:**
• \`/onedrive list\`
• \`/files list Documents\`
• \`/drive search quarterly report\`
• \`/sharepoint sites\`

**Requirements:**
• \`MICROSOFT_GRAPH_TOKEN\` environment variable
• Files.Read / Files.ReadWrite permissions

**Microsoft Agent 365:**
This skill aligns with the [SharePoint/OneDrive MCP Server](https://learn.microsoft.com/en-us/microsoft-agent-365/mcp-server-reference/odspremoteserver).`;
  }
};

export default skill;
