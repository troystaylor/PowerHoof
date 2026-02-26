/**
 * Memory/Knowledge Skill
 * 
 * Store and retrieve information across conversations.
 * Similar to OpenClaw's "ontology" skill for structured memory.
 */

// In-memory store (would be replaced with persistent storage in production)
const memoryStore = new Map();

export const skill = {
  manifest: {
    id: "memory-skill",
    name: "Memory",
    description: "Remember and recall information across conversations",
    version: "1.0.0",
    author: "PowerHoof",
    permissions: ["read-context", "write-memory"],
    examples: [
      "/remember my favorite color is blue",
      "/recall favorite color",
      "/forget favorite color",
      "what do I know about project X"
    ],
    tags: ["memory", "knowledge", "utility", "storage"]
  },

  async canHandle(context) {
    const content = context.message.content?.toLowerCase() || "";
    const triggers = [
      "/remember",
      "/recall",
      "/forget",
      "/memory",
      "remember that",
      "remember this",
      "what do i know",
      "what do you know",
      "recall ",
      "forget about"
    ];
    return triggers.some(t => content.includes(t));
  },

  async execute(context) {
    const content = context.message.content || "";
    const lower = content.toLowerCase();
    const userId = context.userId || "default";
    
    // Determine action
    if (lower.includes("/remember") || lower.includes("remember that") || lower.includes("remember this")) {
      return this.remember(content, userId);
    } else if (lower.includes("/recall") || lower.includes("what do i know") || lower.includes("what do you know")) {
      return this.recall(content, userId);
    } else if (lower.includes("/forget") || lower.includes("forget about")) {
      return this.forget(content, userId);
    } else if (lower.includes("/memory")) {
      return this.listMemories(userId);
    }

    return {
      success: true,
      content: this.getHelp(),
      nextAction: "respond"
    };
  },

  remember(content, userId) {
    // Extract what to remember
    let fact = content
      .replace(/^\/?remember\s*/i, "")
      .replace(/^that\s*/i, "")
      .replace(/^this:\s*/i, "")
      .trim();

    if (!fact) {
      return {
        success: false,
        content: "What would you like me to remember? Example: `/remember my API key is xyz`",
        nextAction: "respond"
      };
    }

    // Extract key-value if possible (e.g., "my name is John" -> key: "name", value: "John")
    const kvMatch = fact.match(/^(?:my\s+)?(\w+(?:\s+\w+)?)\s+(?:is|are|=)\s+(.+)$/i);
    
    let key, value;
    if (kvMatch) {
      key = kvMatch[1].toLowerCase().replace(/\s+/g, "_");
      value = kvMatch[2];
    } else {
      // Use hash of the fact as key
      key = `fact_${Date.now()}`;
      value = fact;
    }

    // Store in memory
    if (!memoryStore.has(userId)) {
      memoryStore.set(userId, new Map());
    }
    const userMemory = memoryStore.get(userId);
    userMemory.set(key, {
      value,
      originalFact: fact,
      timestamp: new Date().toISOString()
    });

    return {
      success: true,
      content: `🧠 **Remembered:** "${fact}"\n\nKey: \`${key}\`\nValue: \`${value}\``,
      data: { key, value, fact },
      nextAction: "respond"
    };
  },

  recall(content, userId) {
    // Extract what to recall
    let query = content
      .replace(/^\/?recall\s*/i, "")
      .replace(/^what do (?:i|you) know about\s*/i, "")
      .trim();

    const userMemory = memoryStore.get(userId);
    
    if (!userMemory || userMemory.size === 0) {
      return {
        success: true,
        content: "🧠 I don't have any memories stored yet. Use `/remember` to save information.",
        nextAction: "respond"
      };
    }

    if (!query) {
      // Return all memories
      return this.listMemories(userId);
    }

    // Search for matching memories
    const queryLower = query.toLowerCase().replace(/\s+/g, "_");
    const matches = [];

    for (const [key, data] of userMemory) {
      if (key.includes(queryLower) || 
          data.value.toLowerCase().includes(query.toLowerCase()) ||
          data.originalFact.toLowerCase().includes(query.toLowerCase())) {
        matches.push({ key, ...data });
      }
    }

    if (matches.length === 0) {
      return {
        success: true,
        content: `🧠 I don't have any memories matching "${query}".`,
        nextAction: "respond"
      };
    }

    let output = `🧠 **Found ${matches.length} memor${matches.length === 1 ? "y" : "ies"}:**\n\n`;
    for (const match of matches) {
      output += `• **${match.key}**: ${match.value}\n`;
      output += `  _Saved: ${new Date(match.timestamp).toLocaleString()}_\n\n`;
    }

    return {
      success: true,
      content: output.trim(),
      data: { query, matches },
      nextAction: "respond"
    };
  },

  forget(content, userId) {
    let key = content
      .replace(/^\/?forget\s*/i, "")
      .replace(/^about\s*/i, "")
      .trim()
      .toLowerCase()
      .replace(/\s+/g, "_");

    const userMemory = memoryStore.get(userId);
    
    if (!userMemory) {
      return {
        success: true,
        content: "🧠 No memories to forget.",
        nextAction: "respond"
      };
    }

    if (key === "all" || key === "everything") {
      const count = userMemory.size;
      userMemory.clear();
      return {
        success: true,
        content: `🧠 Forgot ${count} memor${count === 1 ? "y" : "ies"}.`,
        nextAction: "respond"
      };
    }

    if (userMemory.has(key)) {
      const data = userMemory.get(key);
      userMemory.delete(key);
      return {
        success: true,
        content: `🧠 Forgot: "${data.originalFact}"`,
        nextAction: "respond"
      };
    }

    return {
      success: false,
      content: `🧠 I don't have a memory with key "${key}". Use \`/memory\` to see all stored memories.`,
      nextAction: "respond"
    };
  },

  listMemories(userId) {
    const userMemory = memoryStore.get(userId);
    
    if (!userMemory || userMemory.size === 0) {
      return {
        success: true,
        content: "🧠 **Memory Bank**\n\nNo memories stored. Use `/remember <fact>` to save information.",
        nextAction: "respond"
      };
    }

    let output = `🧠 **Memory Bank** (${userMemory.size} items)\n\n`;
    
    for (const [key, data] of userMemory) {
      output += `• **${key}**: ${data.value}\n`;
    }
    
    output += `\n_Commands: /remember, /recall, /forget_`;

    return {
      success: true,
      content: output,
      data: { count: userMemory.size },
      nextAction: "respond"
    };
  },

  getHelp() {
    return `🧠 **Memory Skill**

**Commands:**
\`/remember <fact>\` - Store information
\`/recall <query>\` - Search memories
\`/memory\` - List all memories
\`/forget <key>\` - Remove a memory
\`/forget all\` - Clear all memories

**Examples:**
- \`/remember my project deadline is March 15\`
- \`/recall deadline\`
- \`what do I know about project\`

**Note:** Memories are stored per user and persist for the session.`;
  }
};

export default skill;
