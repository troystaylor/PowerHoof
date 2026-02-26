/**
 * Outlook Mail Skill
 * 
 * Read, send, and manage Outlook emails using Microsoft Graph API.
 * Based on Microsoft Agent 365 tooling servers.
 * 
 * Requires: Microsoft Graph API access with Mail permissions
 */

export const skill = {
  manifest: {
    id: "outlook-mail-skill",
    name: "OutlookMail",
    description: "Read, send, and search Outlook emails via Microsoft Graph",
    version: "1.0.0",
    author: "PowerHoof",
    permissions: ["read-context", "network", "mail"],
    examples: [
      "/mail inbox",
      "/mail search project update",
      "/mail send to john@example.com",
      "/email unread"
    ],
    tags: ["mail", "email", "outlook", "microsoft365", "messaging"],
    requires: {
      env: ["MICROSOFT_GRAPH_TOKEN"]
    }
  },

  async canHandle(context) {
    const content = context.message.content?.toLowerCase() || "";
    
    // Don't match if another skill command is being used
    const excludedCommands = ["/remind", "/reminder", "/reminders"];
    if (excludedCommands.some(cmd => content.startsWith(cmd))) {
      return false;
    }
    
    const triggers = [
      "/mail",
      "/email",
      "/inbox",
      "/send email",
      "my emails",
      "check email",
      "unread emails",
      "send an email"
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
      if (lower.match(/^\/?(?:mail|email)\s+inbox|^\/?inbox|check email|my emails/)) {
        return await this.listInbox(token, content);
      } else if (lower.match(/^\/?(?:mail|email)\s+unread|unread emails/)) {
        return await this.listUnread(token);
      } else if (lower.match(/^\/?(?:mail|email)\s+search/)) {
        return await this.searchMail(token, content);
      } else if (lower.match(/^\/?(?:mail|email)\s+send|send (?:an )?email/)) {
        return await this.composeMail(content);
      }

      return {
        success: true,
        content: this.getHelp(),
        nextAction: "respond"
      };
    } catch (error) {
      return {
        success: false,
        content: `Mail operation failed: ${error.message}`,
        nextAction: "respond"
      };
    }
  },

  async listInbox(token, content) {
    try {
      const response = await fetch(
        `https://graph.microsoft.com/v1.0/me/messages?$top=10&$orderby=receivedDateTime desc&$select=id,subject,from,receivedDateTime,isRead,bodyPreview`,
        {
          headers: {
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json"
          }
        }
      );

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error("Token expired or invalid. Re-authenticate with Microsoft Graph.");
        }
        throw new Error(`Graph API error: ${response.status}`);
      }

      const data = await response.json();
      const messages = data.value || [];

      return {
        success: true,
        content: this.formatMessages(messages, "Inbox"),
        data: { messages },
        nextAction: "respond"
      };
    } catch (error) {
      throw error;
    }
  },

  async listUnread(token) {
    try {
      const response = await fetch(
        `https://graph.microsoft.com/v1.0/me/messages?$filter=isRead eq false&$top=10&$orderby=receivedDateTime desc&$select=id,subject,from,receivedDateTime,bodyPreview`,
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
      const messages = data.value || [];

      return {
        success: true,
        content: this.formatMessages(messages, "Unread"),
        data: { messages },
        nextAction: "respond"
      };
    } catch (error) {
      throw error;
    }
  },

  async searchMail(token, content) {
    const query = content
      .replace(/^\/?(?:mail|email)\s+search\s*/i, "")
      .trim();

    if (!query) {
      return {
        success: false,
        content: "What would you like to search for? Example: `/mail search project update`",
        nextAction: "respond"
      };
    }

    try {
      const encoded = encodeURIComponent(query);
      const response = await fetch(
        `https://graph.microsoft.com/v1.0/me/messages?$search="${encoded}"&$top=10&$select=id,subject,from,receivedDateTime,isRead,bodyPreview`,
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
      const messages = data.value || [];

      return {
        success: true,
        content: this.formatMessages(messages, `Search: "${query}"`),
        data: { query, messages },
        nextAction: "respond"
      };
    } catch (error) {
      throw error;
    }
  },

  formatMessages(messages, title) {
    let output = `📧 **${title}** (${messages.length} messages)\n\n`;

    if (messages.length === 0) {
      output += "No messages found.\n";
      return output;
    }

    for (const msg of messages) {
      const date = new Date(msg.receivedDateTime);
      const dateStr = date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
      const timeStr = date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
      const readIcon = msg.isRead ? "📭" : "📬";
      
      const from = msg.from?.emailAddress?.name || msg.from?.emailAddress?.address || "Unknown";
      
      output += `${readIcon} **${msg.subject || "(No Subject)"}**\n`;
      output += `From: ${from} • ${dateStr} ${timeStr}\n`;
      
      if (msg.bodyPreview) {
        const preview = msg.bodyPreview.substring(0, 100);
        output += `_${preview}${msg.bodyPreview.length > 100 ? "..." : ""}_\n`;
      }
      
      output += "\n";
    }

    return output;
  },

  async composeMail(content) {
    // Parse recipient and subject from content
    const toMatch = content.match(/to\s+([^\s,]+@[^\s,]+)/i);
    const subjectMatch = content.match(/subject[:\s]+["']?([^"'\n]+)["']?/i);
    
    const to = toMatch ? toMatch[1] : null;
    const subject = subjectMatch ? subjectMatch[1] : null;

    let instructions = `📝 **Compose Email**\n\n`;
    
    if (to) {
      instructions += `**To:** ${to}\n`;
    }
    if (subject) {
      instructions += `**Subject:** ${subject}\n`;
    }
    
    instructions += `
To send an email via Microsoft Graph API:

\`\`\`json
POST /me/sendMail
{
  "message": {
    "subject": "Your Subject",
    "body": {
      "contentType": "Text",
      "content": "Your message here"
    },
    "toRecipients": [
      { "emailAddress": { "address": "recipient@example.com" } }
    ]
  }
}
\`\`\`

**Required Permission:** Mail.Send

_For security, email sending requires explicit confirmation._`;

    return {
      success: true,
      content: instructions,
      data: { to, subject },
      nextAction: "respond"
    };
  },

  getSetupInstructions() {
    return `📧 **Outlook Mail Skill - Setup Required**

This skill requires Microsoft Graph API access.

**Setup Steps:**
1. Register an app in Azure AD
2. Request Mail permissions
3. Get an access token
4. Set \`MICROSOFT_GRAPH_TOKEN\` environment variable

**Required Permissions:**
• \`Mail.Read\` - Read user's mail
• \`Mail.ReadWrite\` - Read and write mail
• \`Mail.Send\` - Send mail as user

**Quick Test:**
\`\`\`bash
# Get token using Azure CLI
az login
export MICROSOFT_GRAPH_TOKEN=$(az account get-access-token --resource https://graph.microsoft.com --query accessToken -o tsv)
\`\`\`

**MCP Server Alternative:**
Use the Agent 365 Mail MCP server for enterprise deployment.`;
  },

  getHelp() {
    return `📧 **Outlook Mail Skill**

Read and manage your Outlook email via Microsoft Graph API.

**Commands:**
\`/mail inbox\` - Show recent messages
\`/mail unread\` - Show unread messages
\`/mail search <query>\` - Search emails
\`/mail send\` - Compose new email

**Examples:**
• \`/mail inbox\`
• \`/email unread\`
• \`/mail search project deadline\`
• \`/mail send to john@example.com\`

**Requirements:**
• \`MICROSOFT_GRAPH_TOKEN\` environment variable
• Mail.Read / Mail.Send permissions

**Microsoft Agent 365:**
This skill aligns with the [Outlook Mail MCP Server](https://learn.microsoft.com/en-us/microsoft-agent-365/mcp-server-reference/mail).`;
  }
};

export default skill;
