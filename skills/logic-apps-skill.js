/**
 * Logic Apps Skill
 * Azure Logic Apps workflow patterns and connector guidance.
 */

export const skill = {
  manifest: {
    id: "logic-apps-skill",
    name: "LogicApps",
    description: "Logic Apps assistant - Connectors, workflow patterns, expressions",
    version: "1.0.0",
    author: "PowerHoof",
    permissions: ["read-context"],
    examples: [
      "/logicapps expression format date",
      "/workflow http trigger",
      "/logicapps error handling"
    ],
    tags: ["logic-apps", "azure", "workflow", "connectors", "automation"]
  },

  knowledge: {
    expressions: {
      string: ["concat('a','b')", "substring(str,start,len)", "replace(str,old,new)", "split(str,',')", "toLower(str)", "toUpper(str)"],
      datetime: ["utcNow()", "addDays(utcNow(),7)", "formatDateTime(utcNow(),'yyyy-MM-dd')", "ticks(timestamp)"],
      conversion: ["int('123')", "string(123)", "json(str)", "base64(str)", "decodeBase64(str)"],
      reference: ["triggerBody()", "triggerOutputs()", "body('ActionName')", "outputs('ActionName')", "variables('varName')"]
    },
    connectors: {
      common: ['HTTP', 'Outlook', 'SharePoint', 'Dataverse', 'SQL Server', 'Azure Blob', 'Service Bus', 'Event Grid'],
      triggers: ['When HTTP request received', 'Recurrence', 'When item created', 'When a message is received']
    },
    patterns: {
      retry: '{ "type": "exponential", "count": 4, "interval": "PT7S", "maximumInterval": "PT1H" }',
      errorHandling: `"runAfter": { "Previous_Action": ["Failed", "Skipped", "TimedOut"] }`
    }
  },

  async canHandle(context) {
    const content = context.message.content?.toLowerCase() || "";
    return ['/logicapps', '/logicapp', '/workflow', 'logic app', 'workflow expression'].some(t => content.includes(t));
  },

  async execute(context) {
    const content = context.message.content.toLowerCase();
    
    if (content.includes('expression') || content.includes('format') || content.includes('date')) {
      return {
        success: true,
        content: `**Logic Apps Expressions:**\n\n**DateTime:** ${this.knowledge.expressions.datetime.map(e => `\`${e}\``).join(', ')}\n\n**String:** ${this.knowledge.expressions.string.slice(0,4).map(e => `\`${e}\``).join(', ')}\n\n**Reference:** ${this.knowledge.expressions.reference.map(e => `\`${e}\``).join(', ')}`
      };
    }
    
    if (content.includes('connector') || content.includes('trigger')) {
      return {
        success: true,
        content: `**Common Connectors:** ${this.knowledge.connectors.common.join(', ')}\n\n**Trigger Types:**\n${this.knowledge.connectors.triggers.map(t => `- ${t}`).join('\n')}`
      };
    }
    
    if (content.includes('error') || content.includes('retry') || content.includes('handling')) {
      return {
        success: true,
        content: `**Error Handling:**\n\`\`\`json\n${this.knowledge.patterns.errorHandling}\n\`\`\`\n\n**Retry Policy:**\n\`\`\`json\n${this.knowledge.patterns.retry}\n\`\`\``
      };
    }
    
    return {
      success: true,
      content: `**Logic Apps Assistant**\n\n- Workflow expressions\n- Connector patterns\n- Error handling & retry\n\nTry: "/logicapps expression date" or "/workflow error handling"`
    };
  }
};
