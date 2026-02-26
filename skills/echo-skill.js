/**
 * Echo Skill
 * 
 * A simple demonstration skill that echoes messages back.
 */

export const skill = {
  manifest: {
    id: "echo-skill",
    name: "Echo",
    description: "Echoes messages back to the user (demo skill)",
    version: "1.0.0",
    author: "PowerHoof",
    permissions: ["read-context"],
    examples: [
      "echo hello world",
      "/echo test message"
    ],
    tags: ["demo", "utility"]
  },

  async canHandle(context) {
    const content = context.message.content?.toLowerCase() || "";
    return content.startsWith("echo ") || content.startsWith("/echo ");
  },

  async execute(context) {
    const content = context.message.content || "";
    const message = content.replace(/^\/?(echo)\s*/i, "");
    
    return {
      success: true,
      content: `🔊 Echo: ${message}`,
      nextAction: "respond"
    };
  }
};

export default skill;
