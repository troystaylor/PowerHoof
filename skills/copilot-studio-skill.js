/**
 * Copilot Studio Skill
 * 
 * Reference guide for building copilots with Microsoft Copilot Studio.
 * Covers topics, entities, actions, generative AI, and deployment.
 */

export const skill = {
  manifest: {
    id: "copilot-studio-skill",
    name: "CopilotStudio",
    description: "Copilot Studio assistant for building AI copilots, topics, and actions",
    version: "1.0.0",
    author: "PowerHoof",
    permissions: ["read-context"],
    examples: [
      "/copilot topics",
      "/studio entities",
      "/copilot generative actions",
      "how do I create a topic in Copilot Studio",
      "copilot handoff to agent"
    ],
    tags: ["copilot-studio", "chatbot", "topics", "entities", "generative-ai", "actions"]
  },

  // Topic types and patterns
  topics: {
    types: {
      "Trigger phrases": { desc: "Start topic from user phrases (5-10 variations recommended)" },
      "Redirect": { desc: "Redirect from another topic" },
      "Event-based": { desc: "Triggered by events (conversation start, escalation)" },
    },
    system: {
      "Greeting": { desc: "Welcome message when conversation starts" },
      "Goodbye": { desc: "End conversation topic" },
      "Escalate": { desc: "Hand off to human agent" },
      "Fallback": { desc: "When no topic matches" },
      "Multiple topics matched": { desc: "Disambiguation when multiple matches" },
      "On Error": { desc: "Handle errors gracefully" },
      "Reset conversation": { desc: "Clear conversation and restart" },
    },
    nodes: {
      "Message": { desc: "Send text, images, or cards to user" },
      "Question": { desc: "Ask user for input and store in variable" },
      "Condition": { desc: "Branch based on variable values" },
      "Variable management": { desc: "Set or clear variables" },
      "Topic management": { desc: "Redirect to or end topics" },
      "Call an action": { desc: "Run Power Automate flow or plugin" },
      "Generative answers": { desc: "Use AI to generate response from data" },
      "Advanced": { desc: "Authentication, hand off, transfer" },
    }
  },

  // Entity types
  entities: {
    prebuilt: {
      "Age": { desc: "Age values (25 years old, thirty)", example: "25 years, thirty" },
      "Boolean": { desc: "Yes/no values", example: "yes, no, true, false" },
      "City": { desc: "City names", example: "Seattle, New York" },
      "Color": { desc: "Color values", example: "red, blue, #FF0000" },
      "Continent": { desc: "Continent names", example: "North America, Europe" },
      "Country": { desc: "Country names", example: "United States, Japan" },
      "Currency": { desc: "Currency values", example: "$50, 100 euros" },
      "Date and time": { desc: "Date/time expressions", example: "tomorrow, next week, 3pm" },
      "Duration": { desc: "Time duration", example: "2 hours, 30 minutes" },
      "Email": { desc: "Email addresses", example: "user@example.com" },
      "Geolocation": { desc: "Coordinates", example: "47.6062° N, 122.3321° W" },
      "Integer": { desc: "Whole numbers", example: "5, 100, -20" },
      "Language": { desc: "Language names", example: "English, Spanish" },
      "Money": { desc: "Monetary amounts", example: "$100, 50€" },
      "Number": { desc: "Any number", example: "3.14, 100, -5.5" },
      "Ordinal": { desc: "Ordinal numbers", example: "first, 2nd, third" },
      "Organization": { desc: "Company names", example: "Microsoft, Apple" },
      "Percentage": { desc: "Percent values", example: "50%, 0.75" },
      "Person name": { desc: "Personal names", example: "John Smith, Mary" },
      "Phone number": { desc: "Phone numbers", example: "+1-555-123-4567" },
      "Speed": { desc: "Speed values", example: "60 mph, 100 km/h" },
      "State": { desc: "State/province names", example: "Washington, California" },
      "Street address": { desc: "Full addresses", example: "123 Main St, Seattle" },
      "Temperature": { desc: "Temperature values", example: "72°F, 20°C" },
      "URL": { desc: "Web URLs", example: "https://microsoft.com" },
      "Weight": { desc: "Weight values", example: "150 lbs, 70 kg" },
    },
    custom: {
      "Closed list": { desc: "Fixed set of values (like enum)" },
      "Regular expression": { desc: "Regex pattern matching" },
      "Smart match": { desc: "AI-powered fuzzy matching" },
    }
  },

  // Actions and integrations
  actions: {
    builtin: {
      "Send a message": { desc: "Send text, adaptive cards, or media" },
      "Ask a question": { desc: "Prompt user and capture response" },
      "Set variable": { desc: "Assign value to variable" },
      "Clear variable": { desc: "Reset variable to empty" },
      "Redirect to topic": { desc: "Go to another topic" },
      "End conversation": { desc: "End with survey or message" },
      "Authenticate": { desc: "Sign in user with OAuth" },
      "Transfer to agent": { desc: "Hand off to human agent" },
    },
    powerAutomate: {
      "Standard flows": { desc: "Call Power Automate cloud flows" },
      "Parameters": { desc: "Pass variables to flow, receive outputs" },
      "Async support": { desc: "Long-running flow with status updates" },
    },
    plugins: {
      "AI Builder prompts": { desc: "Custom GPT prompts" },
      "Dataverse actions": { desc: "CRUD on Dataverse tables" },
      "Connector actions": { desc: "Use any Power Platform connector" },
      "Custom connectors": { desc: "Call external APIs" },
    },
    generative: {
      "Generative answers": { desc: "AI generates response from knowledge sources" },
      "Generative actions": { desc: "AI calls actions based on user intent" },
      "Generative prompts": { desc: "Use custom GPT prompts in topics" },
    }
  },

  // Knowledge sources for generative AI
  knowledgeSources: {
    types: {
      "Public websites": { desc: "Index and search public web content" },
      "SharePoint": { desc: "Connect to SharePoint document libraries" },
      "Dataverse": { desc: "Use Dataverse table data" },
      "Documents": { desc: "Upload files (PDF, Word, etc.)" },
      "Azure AI Search": { desc: "Custom Azure AI Search index" },
    },
    bestPractices: [
      "Keep content up-to-date for accurate answers",
      "Use structured data when possible",
      "Configure content filters appropriately",
      "Test with diverse questions",
      "Monitor and review AI responses"
    ]
  },

  // Variables
  variables: {
    scopes: {
      "Topic": { desc: "Exists only within current topic" },
      "Global": { desc: "Persists across all topics in conversation" },
      "System": { desc: "Built-in variables (User.DisplayName, Conversation.Id)" },
    },
    system: {
      "User.DisplayName": "Current user's display name",
      "User.Email": "Current user's email (if authenticated)",
      "User.Id": "Unique user identifier",
      "Conversation.Id": "Current conversation ID",
      "Activity.Text": "Latest user message text",
      "Activity.Channel": "Channel name (Teams, Web, etc.)",
      "LastMessage.Text": "Previous bot message",
    }
  },

  // Channel deployment
  channels: {
    types: {
      "Demo website": { desc: "Built-in test website" },
      "Custom website": { desc: "Embed in your own site with iframe or SDK" },
      "Microsoft Teams": { desc: "Publish as Teams app" },
      "Facebook": { desc: "Connect to Facebook Messenger" },
      "Mobile app": { desc: "Use with Direct Line SDK" },
      "Dynamics 365": { desc: "Integrate with Omnichannel" },
      "Power Apps": { desc: "Embed in canvas apps" },
    },
    teamsIntegration: `// Teams manifest app ID
{
  "permissions": ["identity", "messageTeamMembers"],
  "validDomains": ["powerva.microsoft.com", "api.botframework.com"]
}`
  },

  // Common patterns
  patterns: {
    faq: {
      name: "FAQ with Generative AI",
      steps: [
        "1. Add knowledge sources (SharePoint, websites)",
        "2. Enable generative answers in Fallback topic",
        "3. Test with sample questions",
        "4. Review and refine AI responses",
        "5. Add custom topics for complex scenarios"
      ]
    },
    authentication: {
      name: "Authenticated Copilot",
      steps: [
        "1. Configure authentication in Settings > Security",
        "2. Choose authentication type (AAD, Generic OAuth)",
        "3. Add 'Authenticate' node in topic",
        "4. Access User.* variables after auth",
        "5. Call authenticated APIs with token"
      ]
    },
    handoff: {
      name: "Human Handoff",
      steps: [
        "1. Configure agent transfer in Settings > Agent transfers",
        "2. Connect to Omnichannel or Dynamics 365",
        "3. Use 'Transfer to agent' node",
        "4. Pass conversation context",
        "5. Handle transfer failures gracefully"
      ]
    },
    multiLanguage: {
      name: "Multi-language Support",
      steps: [
        "1. Go to Settings > Languages",
        "2. Add secondary languages",
        "3. Localize trigger phrases and messages",
        "4. Test each language",
        "5. Configure language detection"
      ]
    }
  },

  async canHandle(context) {
    const content = context.message.content?.toLowerCase() || "";
    const triggers = [
      "/copilot",
      "/studio",
      "/pva",
      "copilot studio",
      "power virtual agent",
      "chatbot topic",
      "copilot action",
      "generative answer",
      "copilot entity"
    ];
    return triggers.some(t => content.includes(t));
  },

  async execute(context) {
    const content = context.message.content || "";
    const lower = content.toLowerCase();

    // Topics
    if (lower.match(/topic/)) {
      return this.showTopics(lower);
    }

    // Entities
    if (lower.match(/entit/)) {
      return this.showEntities(lower);
    }

    // Actions
    if (lower.match(/action|plugin|flow|generative/)) {
      return this.showActions(lower);
    }

    // Variables
    if (lower.match(/variable/)) {
      return this.showVariables();
    }

    // Knowledge
    if (lower.match(/knowledge|source|generat/)) {
      return this.showKnowledge();
    }

    // Channels
    if (lower.match(/channel|deploy|teams|website/)) {
      return this.showChannels();
    }

    // Patterns
    if (lower.match(/pattern|faq|auth|handoff|language/)) {
      return this.showPatterns(lower);
    }

    return this.showHelp();
  },

  showTopics(query) {
    let content = "## Copilot Studio Topics\n\n";

    if (query.includes("system")) {
      content += "### System Topics\n\n| Topic | Description |\n|-------|-------------|\n";
      for (const [name, info] of Object.entries(this.topics.system)) {
        content += `| **${name}** | ${info.desc} |\n`;
      }
    } else if (query.includes("node")) {
      content += "### Topic Nodes\n\n| Node | Description |\n|------|-------------|\n";
      for (const [name, info] of Object.entries(this.topics.nodes)) {
        content += `| **${name}** | ${info.desc} |\n`;
      }
    } else {
      content += "### Topic Trigger Types\n";
      for (const [name, info] of Object.entries(this.topics.types)) {
        content += `- **${name}** - ${info.desc}\n`;
      }
      content += "\n### System Topics\n";
      for (const [name, info] of Object.entries(this.topics.system)) {
        content += `- **${name}** - ${info.desc}\n`;
      }
      content += "\n### Topic Nodes\n";
      for (const [name, info] of Object.entries(this.topics.nodes)) {
        content += `- **${name}** - ${info.desc}\n`;
      }
    }

    return { success: true, content, nextAction: "respond" };
  },

  showEntities(query) {
    let content = "## Copilot Studio Entities\n\n";

    if (query.includes("custom")) {
      content += "### Custom Entity Types\n\n| Type | Description |\n|------|-------------|\n";
      for (const [name, info] of Object.entries(this.entities.custom)) {
        content += `| **${name}** | ${info.desc} |\n`;
      }
    } else {
      content += "### Prebuilt Entities\n\n| Entity | Description | Example |\n|--------|-------------|----------|\n";
      for (const [name, info] of Object.entries(this.entities.prebuilt)) {
        content += `| **${name}** | ${info.desc} | ${info.example} |\n`;
      }
      content += "\n### Custom Entities\n";
      for (const [name, info] of Object.entries(this.entities.custom)) {
        content += `- **${name}** - ${info.desc}\n`;
      }
    }

    return { success: true, content, nextAction: "respond" };
  },

  showActions(query) {
    let content = "## Copilot Studio Actions\n\n";

    if (query.includes("generative")) {
      content += "### Generative AI Actions\n\n| Action | Description |\n|--------|-------------|\n";
      for (const [name, info] of Object.entries(this.actions.generative)) {
        content += `| **${name}** | ${info.desc} |\n`;
      }
    } else if (query.includes("plugin") || query.includes("connector")) {
      content += "### Plugins & Connectors\n\n| Type | Description |\n|------|-------------|\n";
      for (const [name, info] of Object.entries(this.actions.plugins)) {
        content += `| **${name}** | ${info.desc} |\n`;
      }
    } else if (query.includes("flow") || query.includes("automate")) {
      content += "### Power Automate Integration\n\n| Feature | Description |\n|---------|-------------|\n";
      for (const [name, info] of Object.entries(this.actions.powerAutomate)) {
        content += `| **${name}** | ${info.desc} |\n`;
      }
    } else {
      content += "### Built-in Actions\n";
      for (const [name, info] of Object.entries(this.actions.builtin)) {
        content += `- **${name}** - ${info.desc}\n`;
      }
      content += "\n### Generative AI\n";
      for (const [name, info] of Object.entries(this.actions.generative)) {
        content += `- **${name}** - ${info.desc}\n`;
      }
    }

    return { success: true, content, nextAction: "respond" };
  },

  showVariables() {
    let content = "## Copilot Studio Variables\n\n";

    content += "### Variable Scopes\n\n| Scope | Description |\n|-------|-------------|\n";
    for (const [name, info] of Object.entries(this.variables.scopes)) {
      content += `| **${name}** | ${info.desc} |\n`;
    }

    content += "\n### System Variables\n\n| Variable | Description |\n|----------|-------------|\n";
    for (const [name, desc] of Object.entries(this.variables.system)) {
      content += `| \`${name}\` | ${desc} |\n`;
    }

    return { success: true, content, nextAction: "respond" };
  },

  showKnowledge() {
    let content = "## Copilot Studio Knowledge Sources\n\n";

    content += "### Source Types\n\n| Type | Description |\n|------|-------------|\n";
    for (const [name, info] of Object.entries(this.knowledgeSources.types)) {
      content += `| **${name}** | ${info.desc} |\n`;
    }

    content += "\n### Best Practices\n";
    for (const practice of this.knowledgeSources.bestPractices) {
      content += `- ${practice}\n`;
    }

    return { success: true, content, nextAction: "respond" };
  },

  showChannels() {
    let content = "## Copilot Studio Channels\n\n";

    content += "### Deployment Channels\n\n| Channel | Description |\n|---------|-------------|\n";
    for (const [name, info] of Object.entries(this.channels.types)) {
      content += `| **${name}** | ${info.desc} |\n`;
    }

    content += `\n### Teams Integration\n\`\`\`json\n${this.channels.teamsIntegration}\n\`\`\``;

    return { success: true, content, nextAction: "respond" };
  },

  showPatterns(query) {
    let content = "## Copilot Studio Patterns\n\n";

    for (const [key, pattern] of Object.entries(this.patterns)) {
      if (query.includes(key) || query.includes(pattern.name.toLowerCase().split(" ")[0])) {
        content += `### ${pattern.name}\n\n`;
        for (const step of pattern.steps) {
          content += `${step}\n`;
        }
        return { success: true, content, nextAction: "respond" };
      }
    }

    // Show all patterns
    for (const [key, pattern] of Object.entries(this.patterns)) {
      content += `### ${pattern.name}\n`;
      for (const step of pattern.steps) {
        content += `${step}\n`;
      }
      content += "\n";
    }

    return { success: true, content, nextAction: "respond" };
  },

  showHelp() {
    return {
      success: true,
      content: `## Copilot Studio Assistant

Build conversational AI copilots with Microsoft Copilot Studio.

### Commands

| Command | Description |
|---------|-------------|
| \`/copilot topics\` | Topic types and nodes |
| \`/copilot entities\` | Entity reference |
| \`/copilot actions\` | Actions and integrations |
| \`/copilot variables\` | Variable types |
| \`/copilot knowledge\` | Knowledge sources |
| \`/copilot channels\` | Deployment channels |
| \`/copilot patterns\` | Common patterns |

### Quick Tips

- Use **5-10 trigger phrases** per topic for better matching
- Enable **generative answers** for FAQ scenarios
- Use **global variables** for cross-topic data
- Configure **authentication** early if needed
- Test in **Demo website** before deployment

📚 [Copilot Studio Docs](https://learn.microsoft.com/microsoft-copilot-studio/)`,
      nextAction: "respond"
    };
  }
};
