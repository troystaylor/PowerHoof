/**
 * Help Skill
 * Lists all available skills and their triggers
 */
export const skill = {
  manifest: {
    id: "help-skill",
    name: "Help",
    description: "Lists all available skills and their command triggers",
    version: "1.0.0",
    author: "PowerHoof",
    permissions: ["read-context"],
    examples: ["/help", "/skills", "what can you do", "list commands"],
    tags: ["utility", "help", "documentation"]
  },

  // Skill directory - populated at runtime
  skillDirectory: {
    "calculator-skill": { triggers: ["/calc", "/calculate"], desc: "Math calculations and unit conversions" },
    "sql-skill": { triggers: ["/sql", "/tsql", "/query"], desc: "SQL window functions, CTEs, optimization" },
    "regex-skill": { triggers: ["/regex", "/pattern"], desc: "Regular expression patterns and syntax" },
    "dataverse-skill": { triggers: ["/dataverse", "/dv", "/fetchxml"], desc: "Dataverse FetchXML and OData queries" },
    "power-bi-skill": { triggers: ["/powerbi", "/pbi"], desc: "DAX patterns, time intelligence, visuals" },
    "power-pages-skill": { triggers: ["/powerpages", "/portal", "/liquid"], desc: "Liquid templates, Web API" },
    "azure-devops-skill": { triggers: ["/devops", "/ado", "/pipeline"], desc: "YAML pipelines, WIQL queries" },
    "logic-apps-skill": { triggers: ["/logicapps", "/workflow"], desc: "Workflow expressions, connectors" },
    "azure-ai-skill": { triggers: ["/azureai", "/docint"], desc: "Document Intelligence, Language, Vision" },
    "json-schema-skill": { triggers: ["/jsonschema", "/schema"], desc: "JSON Schema validation patterns" },
    "datetime-skill": { triggers: ["/date", "/time", "/now"], desc: "Date/time formatting and calculations" },
    "echo-skill": { triggers: ["/echo"], desc: "Echo back messages (testing)" },
    "weather-skill": { triggers: ["/weather"], desc: "Weather information" },
    "memory-skill": { triggers: ["/remember", "/recall"], desc: "Store and retrieve information" },
    "summarize-skill": { triggers: ["/summarize", "/tldr"], desc: "Summarize text content" },
    "dax-skill": { triggers: ["/dax"], desc: "DAX formula reference" },
    "kql-skill": { triggers: ["/kql", "/kusto"], desc: "KQL query patterns" },
    "power-fx-skill": { triggers: ["/powerfx", "/fx"], desc: "Power Fx formula reference" },
    "power-query-m-skill": { triggers: ["/powerquery", "/m"], desc: "Power Query M language" },
    "power-apps-skill": { triggers: ["/powerapps"], desc: "Power Apps development" },
    "power-automate-skill": { triggers: ["/powerautomate", "/flow"], desc: "Power Automate flows" },
    "github-skill": { triggers: ["/github", "/gh"], desc: "GitHub operations" },
    "teams-skill": { triggers: ["/teams"], desc: "Microsoft Teams integration" },
    "sharepoint-skill": { triggers: ["/sharepoint", "/sp"], desc: "SharePoint operations" },
    "outlook-mail-skill": { triggers: ["/mail", "/email"], desc: "Outlook mail operations" },
    "outlook-calendar-skill": { triggers: ["/calendar", "/meeting"], desc: "Calendar and meetings" },
    "file-operations-skill": { triggers: ["/file", "/files"], desc: "File system operations" },
    "system-info-skill": { triggers: ["/system", "/sysinfo"], desc: "System information" },
    "web-search-skill": { triggers: ["/search", "/web"], desc: "Web search" },
    "microsoft-learn-skill": { triggers: ["/learn", "/docs"], desc: "Microsoft Learn documentation" },
    "copilot-studio-skill": { triggers: ["/copilotstudio"], desc: "Copilot Studio integration" },
    "help-skill": { triggers: ["/help", "/skills", "help"], desc: "This help menu" }
  },

  async canHandle(context) {
    const content = context.message.content?.toLowerCase() || "";
    return ['/help', '/skills', 'what can you do', 'list commands', 'available skills'].some(t => content.includes(t));
  },

  async execute(context) {
    const content = context.message.content.toLowerCase();
    
    // Check if asking about a specific skill
    for (const [skillId, info] of Object.entries(this.skillDirectory)) {
      for (const trigger of info.triggers) {
        if (content.includes(`help ${trigger}`) || content.includes(`${trigger} help`)) {
          return {
            success: true,
            content: `**${skillId}**\n\n${info.desc}\n\n**Triggers:** ${info.triggers.map(t => `\`${t}\``).join(', ')}`
          };
        }
      }
    }
    
    // Group skills by category
    const categories = {
      "🔢 Data & Analytics": ["sql-skill", "dax-skill", "kql-skill", "power-bi-skill", "power-query-m-skill"],
      "⚡ Power Platform": ["dataverse-skill", "power-apps-skill", "power-automate-skill", "power-pages-skill", "power-fx-skill", "copilot-studio-skill"],
      "☁️ Azure": ["azure-devops-skill", "azure-ai-skill", "logic-apps-skill"],
      "🛠️ Developer Tools": ["regex-skill", "json-schema-skill", "github-skill", "calculator-skill"],
      "📧 Microsoft 365": ["teams-skill", "sharepoint-skill", "outlook-mail-skill", "outlook-calendar-skill"],
      "🔧 Utilities": ["datetime-skill", "file-operations-skill", "system-info-skill", "web-search-skill", "memory-skill", "summarize-skill", "microsoft-learn-skill", "help-skill"]
    };
    
    let response = "**PowerHoof Skills**\n\n";
    
    for (const [category, skillIds] of Object.entries(categories)) {
      response += `**${category}**\n`;
      for (const skillId of skillIds) {
        const info = this.skillDirectory[skillId];
        if (info) {
          response += `- ${info.triggers[0]} - ${info.desc}\n`;
        }
      }
      response += "\n";
    }
    
    response += "_Type `/help <command>` for details on a specific skill_";
    
    return {
      success: true,
      content: response
    };
  }
};
