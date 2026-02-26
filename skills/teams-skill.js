/**
 * Microsoft Teams Skill
 * 
 * Create chats, post messages, and manage Teams channels via Microsoft Graph API.
 * Based on Microsoft Agent 365 tooling servers.
 * 
 * Requires: Microsoft Graph API access with Teams permissions
 */

export const skill = {
  manifest: {
    id: "teams-skill",
    name: "Teams",
    description: "Create chats, post messages, and manage Microsoft Teams channels",
    version: "1.0.0",
    author: "PowerHoof",
    permissions: ["read-context", "network", "teams"],
    examples: [
      "/teams chats",
      "/teams channels",
      "/teams send message to General",
      "/teams create chat with user@example.com"
    ],
    tags: ["teams", "chat", "microsoft365", "collaboration", "messaging"],
    requires: {
      env: ["MICROSOFT_GRAPH_TOKEN"]
    }
  },

  async canHandle(context) {
    const content = context.message.content?.toLowerCase() || "";
    const triggers = [
      "/teams",
      "/chat",
      "/channel",
      "teams chat",
      "teams channel",
      "post to teams",
      "send teams message"
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
      if (lower.match(/^\/?teams\s+chats|my chats/)) {
        return await this.listChats(token);
      } else if (lower.match(/^\/?teams\s+channels|^\/?channel/)) {
        return await this.listChannels(token);
      } else if (lower.match(/^\/?teams\s+members/)) {
        return await this.listTeams(token);
      } else if (lower.match(/^\/?teams\s+(?:send|post)/)) {
        return this.composeMessage(content);
      } else if (lower.match(/^\/?teams\s+create\s+chat/)) {
        return this.createChatPrompt(content);
      }

      return {
        success: true,
        content: this.getHelp(),
        nextAction: "respond"
      };
    } catch (error) {
      return {
        success: false,
        content: `Teams operation failed: ${error.message}`,
        nextAction: "respond"
      };
    }
  },

  async listChats(token) {
    try {
      const response = await fetch(
        `https://graph.microsoft.com/v1.0/me/chats?$top=10&$orderby=lastUpdatedDateTime desc&$expand=members`,
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
        throw new Error(`Graph API error: ${response.status}`);
      }

      const data = await response.json();
      const chats = data.value || [];

      return {
        success: true,
        content: this.formatChats(chats),
        data: { chats },
        nextAction: "respond"
      };
    } catch (error) {
      throw error;
    }
  },

  formatChats(chats) {
    let output = `💬 **Recent Teams Chats** (${chats.length})\n\n`;

    if (chats.length === 0) {
      output += "No chats found.\n";
      return output;
    }

    for (const chat of chats) {
      const chatType = chat.chatType === "oneOnOne" ? "👤" : 
                       chat.chatType === "group" ? "👥" : "📢";
      
      let title = chat.topic || "";
      if (!title && chat.members) {
        const memberNames = chat.members
          .filter(m => m.displayName)
          .map(m => m.displayName)
          .slice(0, 3);
        title = memberNames.join(", ") || "Chat";
        if (chat.members.length > 3) {
          title += ` +${chat.members.length - 3}`;
        }
      }
      
      const updated = chat.lastUpdatedDateTime 
        ? new Date(chat.lastUpdatedDateTime).toLocaleDateString() 
        : "";
      
      output += `${chatType} **${title || "Unnamed Chat"}**\n`;
      output += `Type: ${chat.chatType} • ID: \`${chat.id.substring(0, 20)}...\`\n`;
      if (updated) output += `Last active: ${updated}\n`;
      output += "\n";
    }

    return output;
  },

  async listTeams(token) {
    try {
      const response = await fetch(
        `https://graph.microsoft.com/v1.0/me/joinedTeams`,
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
      const teams = data.value || [];

      let output = `🏢 **Your Teams** (${teams.length})\n\n`;

      for (const team of teams) {
        output += `**${team.displayName}**\n`;
        if (team.description) {
          output += `_${team.description.substring(0, 80)}${team.description.length > 80 ? "..." : ""}_\n`;
        }
        output += `ID: \`${team.id}\`\n\n`;
      }

      return {
        success: true,
        content: output,
        data: { teams },
        nextAction: "respond"
      };
    } catch (error) {
      throw error;
    }
  },

  async listChannels(token) {
    // First, get teams
    try {
      const teamsResponse = await fetch(
        `https://graph.microsoft.com/v1.0/me/joinedTeams`,
        {
          headers: {
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json"
          }
        }
      );

      if (!teamsResponse.ok) {
        throw new Error(`Graph API error: ${teamsResponse.status}`);
      }

      const teamsData = await teamsResponse.json();
      const teams = teamsData.value || [];

      let output = `📺 **Teams Channels**\n\n`;

      // Get channels for first 3 teams
      for (const team of teams.slice(0, 3)) {
        const channelsResponse = await fetch(
          `https://graph.microsoft.com/v1.0/teams/${team.id}/channels`,
          {
            headers: {
              "Authorization": `Bearer ${token}`,
              "Content-Type": "application/json"
            }
          }
        );

        if (channelsResponse.ok) {
          const channelsData = await channelsResponse.json();
          const channels = channelsData.value || [];

          output += `**${team.displayName}:**\n`;
          for (const channel of channels.slice(0, 5)) {
            const icon = channel.membershipType === "standard" ? "📢" : "🔒";
            output += `  ${icon} ${channel.displayName}\n`;
          }
          if (channels.length > 5) {
            output += `  ... and ${channels.length - 5} more\n`;
          }
          output += "\n";
        }
      }

      return {
        success: true,
        content: output,
        nextAction: "respond"
      };
    } catch (error) {
      throw error;
    }
  },

  composeMessage(content) {
    const channelMatch = content.match(/to\s+(?:channel\s+)?["']?([^"'\n]+)["']?/i);
    const messageMatch = content.match(/message[:\s]+["']?([^"'\n]+)["']?/i);
    
    const channel = channelMatch ? channelMatch[1] : null;
    const message = messageMatch ? messageMatch[1] : null;

    let instructions = `💬 **Compose Teams Message**\n\n`;
    
    if (channel) instructions += `**Channel:** ${channel}\n`;
    if (message) instructions += `**Message:** ${message}\n`;
    
    instructions += `
To send a message via Microsoft Graph API:

**To a channel:**
\`\`\`json
POST /teams/{team-id}/channels/{channel-id}/messages
{
  "body": {
    "content": "Your message here"
  }
}
\`\`\`

**To a chat:**
\`\`\`json
POST /chats/{chat-id}/messages
{
  "body": {
    "content": "Your message here"
  }
}
\`\`\`

**Required Permission:** ChannelMessage.Send, Chat.ReadWrite`;

    return {
      success: true,
      content: instructions,
      data: { channel, message },
      nextAction: "respond"
    };
  },

  createChatPrompt(content) {
    const userMatch = content.match(/with\s+([^\s,]+@[^\s,]+)/i);
    const user = userMatch ? userMatch[1] : null;

    let output = `💬 **Create Teams Chat**\n\n`;
    
    if (user) {
      output += `**With:** ${user}\n\n`;
    }

    output += `To create a 1:1 chat via Microsoft Graph API:

\`\`\`json
POST /chats
{
  "chatType": "oneOnOne",
  "members": [
    {
      "@odata.type": "#microsoft.graph.aadUserConversationMember",
      "roles": ["owner"],
      "user@odata.bind": "https://graph.microsoft.com/v1.0/users('{user-id}')"
    },
    {
      "@odata.type": "#microsoft.graph.aadUserConversationMember",
      "roles": ["owner"],
      "user@odata.bind": "https://graph.microsoft.com/v1.0/users('{your-id}')"
    }
  ]
}
\`\`\`

**Required Permission:** Chat.Create, Chat.ReadWrite`;

    return {
      success: true,
      content: output,
      data: { user },
      nextAction: "respond"
    };
  },

  getSetupInstructions() {
    return `💬 **Teams Skill - Setup Required**

This skill requires Microsoft Graph API access.

**Setup Steps:**
1. Register an app in Azure AD
2. Request Teams permissions
3. Get an access token
4. Set \`MICROSOFT_GRAPH_TOKEN\` environment variable

**Required Permissions:**
• \`Chat.Read\` - Read user's chats
• \`Chat.ReadWrite\` - Create and manage chats
• \`Team.ReadBasic.All\` - Read teams info
• \`Channel.ReadBasic.All\` - Read channels
• \`ChannelMessage.Send\` - Send channel messages

**Quick Test:**
\`\`\`bash
az login
export MICROSOFT_GRAPH_TOKEN=$(az account get-access-token --resource https://graph.microsoft.com --query accessToken -o tsv)
\`\`\`

**MCP Server Alternative:**
Use the Agent 365 Teams MCP server for enterprise deployment.`;
  },

  getHelp() {
    return `💬 **Microsoft Teams Skill**

Manage Teams chats, channels, and messages via Microsoft Graph API.

**Commands:**
\`/teams chats\` - List recent chats
\`/teams members\` - List your teams
\`/teams channels\` - List channels
\`/teams send\` - Compose a message
\`/teams create chat\` - Start a new chat

**Examples:**
• \`/teams chats\`
• \`/teams channels\`
• \`/teams send to General channel\`
• \`/teams create chat with user@example.com\`

**Requirements:**
• \`MICROSOFT_GRAPH_TOKEN\` environment variable
• Appropriate Teams/Chat permissions

**Microsoft Agent 365:**
This skill aligns with the [Teams MCP Server](https://learn.microsoft.com/en-us/microsoft-agent-365/mcp-server-reference/teams).`;
  }
};

export default skill;
