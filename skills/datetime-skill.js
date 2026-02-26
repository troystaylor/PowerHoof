/**
 * DateTime Skill
 * 
 * Provides current date and time information.
 */

export const skill = {
  manifest: {
    id: "datetime-skill",
    name: "DateTime",
    description: "Provides current date, time, and timezone information",
    version: "1.0.0",
    author: "PowerHoof",
    permissions: ["read-context"],
    examples: [
      "What time is it?",
      "What's the date?",
      "/time"
    ],
    tags: ["utility", "datetime"]
  },

  async canHandle(context) {
    const content = context.message.content?.toLowerCase() || "";
    const triggers = [
      "/time",
      "/date",
      "what time",
      "what's the time",
      "what date",
      "what's the date",
      "current time",
      "current date"
    ];
    return triggers.some(t => content.includes(t));
  },

  async execute(context) {
    const now = new Date();
    const options = {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      timeZoneName: 'short'
    };
    
    const formattedDate = now.toLocaleDateString('en-US', options);
    const isoDate = now.toISOString();
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    
    return {
      success: true,
      content: `📅 **Current Date/Time**\n\n${formattedDate}\n\n*ISO:* \`${isoDate}\`\n*Timezone:* ${timezone}`,
      data: {
        timestamp: now.getTime(),
        iso: isoDate,
        timezone
      },
      nextAction: "respond"
    };
  }
};

export default skill;
