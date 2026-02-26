/**
 * Outlook Calendar Skill
 * 
 * Interact with Microsoft Outlook Calendar using Microsoft Graph API.
 * Based on Microsoft Agent 365 tooling servers.
 * 
 * Requires: Microsoft Graph API access with Calendar permissions
 */

export const skill = {
  manifest: {
    id: "outlook-calendar-skill",
    name: "OutlookCalendar",
    description: "Create, list, and manage Outlook calendar events via Microsoft Graph",
    version: "1.0.0",
    author: "PowerHoof",
    permissions: ["read-context", "network", "calendar"],
    examples: [
      "/calendar list",
      "/calendar create Meeting with team tomorrow at 2pm",
      "/events today",
      "/schedule meeting"
    ],
    tags: ["calendar", "outlook", "microsoft365", "scheduling", "events"],
    requires: {
      env: ["MICROSOFT_GRAPH_TOKEN"]
    }
  },

  async canHandle(context) {
    const content = context.message.content?.toLowerCase() || "";
    const triggers = [
      "/calendar",
      "/events",
      "/schedule",
      "/meeting",
      "my calendar",
      "create event",
      "schedule meeting",
      "what's on my calendar",
      "upcoming meetings"
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
      if (lower.match(/^\/?calendar\s+list|^\/?events|what'?s on|upcoming/)) {
        return await this.listEvents(token, content);
      } else if (lower.match(/^\/?calendar\s+create|^\/?schedule|create event/)) {
        return await this.createEventPrompt(content);
      } else if (lower.match(/^\/?meeting/)) {
        return await this.createEventPrompt(content);
      }

      return {
        success: true,
        content: this.getHelp(),
        nextAction: "respond"
      };
    } catch (error) {
      return {
        success: false,
        content: `Calendar operation failed: ${error.message}`,
        nextAction: "respond"
      };
    }
  },

  async listEvents(token, content) {
    // Parse timeframe
    const lower = content.toLowerCase();
    let startDate = new Date();
    let endDate = new Date();
    endDate.setDate(endDate.getDate() + 7); // Default: next 7 days

    if (lower.includes("today")) {
      endDate = new Date();
      endDate.setHours(23, 59, 59, 999);
    } else if (lower.includes("tomorrow")) {
      startDate.setDate(startDate.getDate() + 1);
      startDate.setHours(0, 0, 0, 0);
      endDate.setDate(endDate.getDate() + 1);
      endDate.setHours(23, 59, 59, 999);
    } else if (lower.includes("this week")) {
      const dayOfWeek = startDate.getDay();
      endDate.setDate(startDate.getDate() + (7 - dayOfWeek));
    }

    const startISO = startDate.toISOString();
    const endISO = endDate.toISOString();

    try {
      const response = await fetch(
        `https://graph.microsoft.com/v1.0/me/calendarview?startDateTime=${startISO}&endDateTime=${endISO}&$top=10&$orderby=start/dateTime`,
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
      const events = data.value || [];

      return {
        success: true,
        content: this.formatEvents(events, startDate, endDate),
        data: { events, startDate, endDate },
        nextAction: "respond"
      };
    } catch (error) {
      throw error;
    }
  },

  formatEvents(events, startDate, endDate) {
    const dateRange = `${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()}`;
    let output = `📅 **Calendar Events** (${dateRange})\n\n`;

    if (events.length === 0) {
      output += "No events scheduled.\n";
      return output;
    }

    for (const event of events) {
      const start = new Date(event.start.dateTime + "Z");
      const end = new Date(event.end.dateTime + "Z");
      
      const dateStr = start.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
      const timeStr = start.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
      const endTimeStr = end.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
      
      output += `**${event.subject || "No Title"}**\n`;
      output += `📆 ${dateStr} • ${timeStr} - ${endTimeStr}\n`;
      
      if (event.location?.displayName) {
        output += `📍 ${event.location.displayName}\n`;
      }
      
      if (event.isOnlineMeeting) {
        output += `🔗 Online meeting\n`;
      }
      
      if (event.attendees?.length > 0) {
        const attendeeCount = event.attendees.length;
        output += `👥 ${attendeeCount} attendee${attendeeCount > 1 ? "s" : ""}\n`;
      }
      
      output += "\n";
    }

    return output;
  },

  async createEventPrompt(content) {
    // Parse event details from natural language
    const details = content
      .replace(/^\/?(?:calendar\s+create|schedule|meeting|create event)\s*/i, "")
      .trim();

    if (!details) {
      return {
        success: true,
        content: `📅 **Create Calendar Event**

To create an event, provide details like:
\`/calendar create Team standup tomorrow at 9am for 30 minutes\`

Or specify:
• **Title**: Meeting name
• **Date/Time**: When it occurs
• **Duration**: How long
• **Attendees**: Who to invite (optional)
• **Location**: Where (optional)

_Note: Requires MICROSOFT_GRAPH_TOKEN with Calendar.ReadWrite permission._`,
        nextAction: "respond"
      };
    }

    // Return structured data for event creation
    // In a full implementation, this would parse and call Graph API
    return {
      success: true,
      content: `📅 **Event Details Parsed**

"${details}"

To create this event via Microsoft Graph API:
1. Parse date/time from input
2. POST to \`/me/events\` endpoint
3. Include attendees if specified

_Full implementation requires Graph API Calendar.ReadWrite permission._`,
      data: { rawInput: details },
      nextAction: "respond"
    };
  },

  getSetupInstructions() {
    return `📅 **Outlook Calendar Skill - Setup Required**

This skill requires Microsoft Graph API access.

**Setup Steps:**
1. Register an app in Azure AD
2. Request Calendar.Read and Calendar.ReadWrite permissions
3. Get an access token
4. Set \`MICROSOFT_GRAPH_TOKEN\` environment variable

**Azure AD Registration:**
1. Go to https://portal.azure.com
2. Navigate to Azure Active Directory → App registrations
3. Create new registration
4. Add Microsoft Graph permissions:
   • \`Calendars.Read\`
   • \`Calendars.ReadWrite\`

**Quick Test:**
\`\`\`bash
# Get token using Azure CLI
az login
export MICROSOFT_GRAPH_TOKEN=$(az account get-access-token --resource https://graph.microsoft.com --query accessToken -o tsv)
\`\`\`

**MCP Server Alternative:**
Use the Agent 365 Calendar MCP server for enterprise deployment.`;
  },

  getHelp() {
    return `📅 **Outlook Calendar Skill**

Manage your Outlook calendar via Microsoft Graph API.

**Commands:**
\`/calendar list\` - Show upcoming events
\`/events today\` - Show today's events
\`/events tomorrow\` - Show tomorrow's events
\`/calendar create <details>\` - Create new event
\`/schedule meeting <details>\` - Schedule a meeting

**Examples:**
• \`/events today\`
• \`/calendar list this week\`
• \`/calendar create Team standup tomorrow at 9am\`

**Requirements:**
• \`MICROSOFT_GRAPH_TOKEN\` environment variable
• Calendar.Read / Calendar.ReadWrite permissions

**Microsoft Agent 365:**
This skill aligns with the [Outlook Calendar MCP Server](https://learn.microsoft.com/en-us/microsoft-agent-365/mcp-server-reference/calendar).`;
  }
};

export default skill;
