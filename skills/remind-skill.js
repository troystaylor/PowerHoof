/**
 * Remind Skill
 * 
 * Set reminders that will be stored in memory and retrieved later.
 * Supports setting, listing, and clearing reminders.
 */

// In-memory reminder storage (per session)
const reminders = new Map();
let reminderIdCounter = 1;

export const skill = {
  manifest: {
    id: "remind-skill",
    name: "Remind",
    description: "Set and manage reminders",
    version: "1.0.0",
    author: "PowerHoof",
    permissions: ["read-context"],
    examples: [
      "/remind buy groceries",
      "/remind in 30 minutes check the oven",
      "/reminders",
      "/remind list",
      "/remind clear"
    ],
    tags: ["reminder", "todo", "productivity"]
  },

  async canHandle(context) {
    const content = context.message.content?.toLowerCase() || "";
    
    // Command triggers (must start with these)
    const commandTriggers = ["/remind", "/reminder", "/reminders"];
    if (commandTriggers.some(t => content.startsWith(t))) {
      return true;
    }
    
    // Natural language triggers
    const nlTriggers = ["remind me", "set a reminder", "set reminder"];
    return nlTriggers.some(t => content.includes(t));
  },

  async execute(context) {
    const content = context.message.content || "";
    const userId = context.conversationId || "default";
    
    // Initialize user's reminders if needed
    if (!reminders.has(userId)) {
      reminders.set(userId, []);
    }
    const userReminders = reminders.get(userId);
    
    const lowerContent = content.toLowerCase();
    
    // List reminders
    if (lowerContent.includes("list") || lowerContent.match(/^\/reminders?$/)) {
      return this.listReminders(userReminders);
    }
    
    // Clear reminders
    if (lowerContent.includes("clear") || lowerContent.includes("delete all")) {
      const count = userReminders.length;
      reminders.set(userId, []);
      return {
        success: true,
        content: count > 0 
          ? `🗑️ Cleared ${count} reminder${count !== 1 ? 's' : ''}.`
          : "📭 No reminders to clear."
      };
    }
    
    // Delete specific reminder
    const deleteMatch = content.match(/(?:delete|remove|done|complete)\s*#?(\d+)/i);
    if (deleteMatch) {
      const id = parseInt(deleteMatch[1]);
      const index = userReminders.findIndex(r => r.id === id);
      if (index !== -1) {
        const removed = userReminders.splice(index, 1)[0];
        return {
          success: true,
          content: `✅ Completed: "${removed.text}"`
        };
      }
      return {
        success: true,
        content: `❌ Reminder #${id} not found.`
      };
    }
    
    // Add new reminder
    const reminderText = this.parseReminderText(content);
    if (reminderText) {
      const reminder = {
        id: reminderIdCounter++,
        text: reminderText.text,
        time: reminderText.time,
        created: new Date()
      };
      userReminders.push(reminder);
      
      let message = `⏰ Reminder set: "${reminder.text}"`;
      if (reminder.time) {
        message += `\n📅 Due: ${reminder.time}`;
      }
      message += `\n🔢 ID: #${reminder.id}`;
      message += `\n\n_Use \`/reminders\` to list or \`/remind done #${reminder.id}\` to complete._`;
      
      return { success: true, content: message };
    }
    
    return {
      success: true,
      content: this.getHelp()
    };
  },
  
  parseReminderText(content) {
    // Remove command prefix
    let text = content
      .replace(/^\/?remind(?:er|ers)?\s*/i, "")
      .replace(/^(?:me\s+(?:to\s+)?)?/i, "")
      .replace(/^(?:set\s+(?:a\s+)?reminder\s+(?:to\s+)?)/i, "")
      .trim();
    
    if (!text || text.toLowerCase() === "list" || text.toLowerCase() === "clear") {
      return null;
    }
    
    // Parse time expressions
    let time = null;
    
    // "in X minutes/hours"
    const inTimeMatch = text.match(/^in\s+(\d+)\s+(minute|min|hour|hr|day)s?\s+/i);
    if (inTimeMatch) {
      const amount = parseInt(inTimeMatch[1]);
      const unit = inTimeMatch[2].toLowerCase();
      const now = new Date();
      
      if (unit.startsWith("min")) {
        now.setMinutes(now.getMinutes() + amount);
      } else if (unit.startsWith("hour") || unit === "hr") {
        now.setHours(now.getHours() + amount);
      } else if (unit.startsWith("day")) {
        now.setDate(now.getDate() + amount);
      }
      
      time = now.toLocaleString('en-US', { 
        weekday: 'short', 
        month: 'short', 
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit'
      });
      text = text.replace(inTimeMatch[0], "").trim();
    }
    
    // "at X:XX" or "at X pm"
    const atTimeMatch = text.match(/^at\s+(\d{1,2})(?::(\d{2}))?\s*(am|pm)?\s+/i);
    if (atTimeMatch) {
      let hours = parseInt(atTimeMatch[1]);
      const minutes = atTimeMatch[2] ? parseInt(atTimeMatch[2]) : 0;
      const ampm = atTimeMatch[3]?.toLowerCase();
      
      if (ampm === "pm" && hours < 12) hours += 12;
      if (ampm === "am" && hours === 12) hours = 0;
      
      const now = new Date();
      now.setHours(hours, minutes, 0, 0);
      if (now < new Date()) {
        now.setDate(now.getDate() + 1); // Next day if time has passed
      }
      
      time = now.toLocaleString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit'
      });
      text = text.replace(atTimeMatch[0], "").trim();
    }
    
    // "tomorrow"
    if (text.toLowerCase().startsWith("tomorrow")) {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(9, 0, 0, 0); // Default to 9 AM
      time = tomorrow.toLocaleString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit'
      });
      text = text.replace(/^tomorrow\s*/i, "").trim();
    }
    
    return text ? { text, time } : null;
  },
  
  listReminders(userReminders) {
    if (userReminders.length === 0) {
      return {
        success: true,
        content: "📭 No reminders set.\n\n_Use `/remind <task>` to add one._"
      };
    }
    
    let message = `## 📋 Your Reminders (${userReminders.length})\n\n`;
    
    for (const r of userReminders) {
      message += `- **#${r.id}** ${r.text}`;
      if (r.time) {
        message += ` _(${r.time})_`;
      }
      message += `\n`;
    }
    
    message += `\n_Use \`/remind done #ID\` to complete a reminder._`;
    
    return { success: true, content: message };
  },
  
  getHelp() {
    return `## ⏰ Remind Skill

**Set a reminder:**
- \`/remind buy groceries\`
- \`/remind in 30 minutes check the oven\`
- \`/remind at 3pm call mom\`
- \`/remind tomorrow submit report\`

**Manage reminders:**
- \`/reminders\` - List all
- \`/remind done #1\` - Complete reminder
- \`/remind clear\` - Clear all`;
  }
};

export default skill;
