/**
 * Power Automate Skill
 * 
 * Reference guide for Power Automate flows, triggers, actions, and connectors.
 * Provides syntax help, common patterns, and best practices.
 */

export const skill = {
  manifest: {
    id: "power-automate-skill",
    name: "PowerAutomate",
    description: "Power Automate flow builder assistant with triggers, actions, and connector reference",
    version: "1.0.0",
    author: "PowerHoof",
    permissions: ["read-context"],
    examples: [
      "/flow triggers",
      "/automate actions approval",
      "/flow connectors sharepoint",
      "how do I send an email in Power Automate",
      "create approval workflow"
    ],
    tags: ["power-automate", "flows", "triggers", "actions", "connectors", "automation"]
  },

  // Trigger reference
  triggers: {
    automated: {
      "When an item is created": { connector: "SharePoint", desc: "Triggers when a new SharePoint item is created" },
      "When an item is created or modified": { connector: "SharePoint", desc: "Triggers on SharePoint item changes" },
      "When a new email arrives": { connector: "Outlook", desc: "Triggers on new email in specified folder" },
      "When a file is created": { connector: "OneDrive/SharePoint", desc: "Triggers when a file is added" },
      "When a row is added, modified or deleted": { connector: "Dataverse", desc: "Triggers on Dataverse table changes" },
      "When a HTTP request is received": { connector: "HTTP", desc: "Triggers from external HTTP POST" },
      "When a new response is submitted": { connector: "Forms", desc: "Triggers on Microsoft Forms response" },
      "When a record is created": { connector: "Dynamics 365", desc: "Triggers on CRM record creation" },
      "When an event is added, updated or deleted": { connector: "Outlook Calendar", desc: "Triggers on calendar changes" },
      "When a message is posted to a channel": { connector: "Teams", desc: "Triggers on Teams channel message" },
    },
    scheduled: {
      "Recurrence": { desc: "Run on a schedule (minute, hour, day, week, month)" },
      "Sliding Window": { desc: "Process data in time windows for catch-up scenarios" },
    },
    instant: {
      "Manually trigger a flow": { desc: "Run from Power Automate portal or mobile app" },
      "For a selected message": { connector: "Teams", desc: "Run from Teams message context menu" },
      "For a selected item": { connector: "SharePoint", desc: "Run from SharePoint list item" },
      "For a selected row": { connector: "Dataverse", desc: "Run from Dataverse table row" },
      "From Power Apps": { desc: "Called from a Power Apps canvas app" },
      "From Copilot": { desc: "Triggered by Copilot Studio or M365 Copilot" },
    }
  },

  // Common actions by category
  actions: {
    control: {
      "Condition": { desc: "If/else branching based on expression", syntax: "@equals(triggerBody()?['Status'], 'Approved')" },
      "Apply to each": { desc: "Loop through array items", syntax: "@{items('Apply_to_each')?['fieldName']}" },
      "Do until": { desc: "Loop until condition is met" },
      "Switch": { desc: "Multi-branch based on value matching" },
      "Scope": { desc: "Group actions for error handling" },
      "Terminate": { desc: "End flow with Succeeded, Failed, or Cancelled" },
      "Compose": { desc: "Create or transform data", syntax: "@json(variables('myVar'))" },
      "Filter array": { desc: "Filter items in array", syntax: "@equals(item()?['Status'], 'Active')" },
      "Select": { desc: "Map/transform array items" },
      "Create HTML table": { desc: "Convert array to HTML table" },
      "Create CSV table": { desc: "Convert array to CSV" },
      "Parse JSON": { desc: "Parse JSON string with schema" },
    },
    variables: {
      "Initialize variable": { desc: "Create a variable (String, Integer, Float, Boolean, Array, Object)" },
      "Set variable": { desc: "Update variable value" },
      "Increment variable": { desc: "Add to numeric variable" },
      "Append to string variable": { desc: "Concatenate to string" },
      "Append to array variable": { desc: "Add item to array" },
    },
    data: {
      "Get items": { connector: "SharePoint", desc: "Query SharePoint list items" },
      "Get item": { connector: "SharePoint", desc: "Get single item by ID" },
      "Create item": { connector: "SharePoint", desc: "Create new list item" },
      "Update item": { connector: "SharePoint", desc: "Update existing item" },
      "Delete item": { connector: "SharePoint", desc: "Delete list item" },
      "List rows": { connector: "Dataverse", desc: "Query Dataverse table" },
      "Get a row by ID": { connector: "Dataverse", desc: "Get single row" },
      "Add a new row": { connector: "Dataverse", desc: "Create Dataverse row" },
      "Update a row": { connector: "Dataverse", desc: "Update Dataverse row" },
      "Delete a row": { connector: "Dataverse", desc: "Delete Dataverse row" },
      "Get file content": { connector: "SharePoint/OneDrive", desc: "Read file binary content" },
      "Create file": { connector: "SharePoint/OneDrive", desc: "Create new file" },
    },
    approval: {
      "Start and wait for an approval": { desc: "Create approval and wait for response" },
      "Create an approval": { desc: "Create approval without waiting" },
      "Wait for an approval": { desc: "Wait for existing approval" },
      "Respond to an approval": { desc: "Submit approval response programmatically" },
    },
    communication: {
      "Send an email (V2)": { connector: "Outlook", desc: "Send email from signed-in user" },
      "Send email from shared mailbox": { connector: "Outlook", desc: "Send from shared mailbox" },
      "Post message in a chat or channel": { connector: "Teams", desc: "Post Teams message" },
      "Post adaptive card in chat or channel": { connector: "Teams", desc: "Post rich adaptive card" },
      "Post a choice of options as the Flow bot": { connector: "Teams", desc: "Interactive choice message" },
      "Send an HTTP request to SharePoint": { connector: "SharePoint", desc: "REST API call to SharePoint" },
    },
    ai: {
      "Create text with GPT": { connector: "AI Builder", desc: "Generate text using GPT" },
      "Extract information from forms": { connector: "AI Builder", desc: "Document processing" },
      "Analyze sentiment": { connector: "AI Builder", desc: "Sentiment analysis" },
      "Categorize text": { connector: "AI Builder", desc: "Text classification" },
      "HTTP": { desc: "Call external AI APIs (OpenAI, Azure OpenAI, etc.)" },
    }
  },

  // Expression functions
  expressions: {
    string: {
      concat: "concat('Hello ', variables('name'))",
      substring: "substring(variables('text'), 0, 10)",
      replace: "replace(variables('text'), 'old', 'new')",
      split: "split(variables('csv'), ',')",
      trim: "trim(variables('text'))",
      toLower: "toLower(variables('text'))",
      toUpper: "toUpper(variables('text'))",
      length: "length(variables('text'))",
      indexOf: "indexOf(variables('text'), 'find')",
      startsWith: "startsWith(variables('text'), 'prefix')",
      endsWith: "endsWith(variables('text'), 'suffix')",
      contains: "contains(variables('text'), 'search')",
      formatNumber: "formatNumber(1234.5, 'C2')",
    },
    collection: {
      length: "length(variables('myArray'))",
      first: "first(variables('myArray'))",
      last: "last(variables('myArray'))",
      take: "take(variables('myArray'), 5)",
      skip: "skip(variables('myArray'), 2)",
      join: "join(variables('myArray'), ', ')",
      intersection: "intersection(array1, array2)",
      union: "union(array1, array2)",
      contains: "contains(variables('myArray'), 'item')",
      empty: "empty(variables('myArray'))",
    },
    logical: {
      if: "if(equals(variables('status'), 'Active'), 'Yes', 'No')",
      equals: "equals(variables('a'), variables('b'))",
      and: "and(greater(variables('x'), 0), less(variables('x'), 100))",
      or: "or(equals(variables('status'), 'A'), equals(variables('status'), 'B'))",
      not: "not(equals(variables('x'), 0))",
      greater: "greater(variables('x'), variables('y'))",
      less: "less(variables('x'), variables('y'))",
      greaterOrEquals: "greaterOrEquals(variables('x'), 10)",
      lessOrEquals: "lessOrEquals(variables('x'), 100)",
      coalesce: "coalesce(triggerBody()?['field'], 'default')",
    },
    datetime: {
      utcNow: "utcNow()",
      addDays: "addDays(utcNow(), 7)",
      addHours: "addHours(utcNow(), 2)",
      addMinutes: "addMinutes(utcNow(), 30)",
      formatDateTime: "formatDateTime(utcNow(), 'yyyy-MM-dd')",
      parseDateTime: "parseDateTime('2024-01-15', 'yyyy-MM-dd')",
      startOfDay: "startOfDay(utcNow())",
      startOfMonth: "startOfMonth(utcNow())",
      dayOfWeek: "dayOfWeek(utcNow())",
      dayOfMonth: "dayOfMonth(utcNow())",
      convertTimeZone: "convertTimeZone(utcNow(), 'UTC', 'Pacific Standard Time')",
    },
    conversion: {
      int: "int(variables('stringNumber'))",
      float: "float(variables('stringDecimal'))",
      string: "string(variables('number'))",
      bool: "bool(variables('value'))",
      json: "json(variables('jsonString'))",
      xml: "xml(variables('xmlString'))",
      base64: "base64(variables('text'))",
      base64ToString: "base64ToString(variables('encoded'))",
      dataUri: "dataUri(variables('content'))",
      dataUriToBinary: "dataUriToBinary(variables('dataUri'))",
    },
    reference: {
      triggerBody: "triggerBody()?['fieldName']",
      triggerOutputs: "triggerOutputs()?['headers']?['x-ms-user-timestamp']",
      body: "body('ActionName')?['value']",
      outputs: "outputs('ActionName')?['body']",
      items: "items('Apply_to_each')?['fieldName']",
      variables: "variables('myVariable')",
      parameters: "parameters('myParameter')",
      workflow: "workflow()?['run']?['name']",
    }
  },

  // Common patterns
  patterns: {
    approvalWorkflow: {
      name: "Approval Workflow",
      desc: "Request manager approval before processing",
      steps: [
        "1. Trigger: When an item is created",
        "2. Get manager from Azure AD",
        "3. Start and wait for approval (Approve/Reject)",
        "4. Condition: If approved",
        "5. Yes: Process request, send confirmation",
        "6. No: Send rejection notification"
      ]
    },
    documentProcessing: {
      name: "Document Processing",
      desc: "Process uploaded documents with AI",
      steps: [
        "1. Trigger: When a file is created in SharePoint",
        "2. Get file content",
        "3. AI Builder: Extract information",
        "4. Create Dataverse row with extracted data",
        "5. Send email summary"
      ]
    },
    scheduledReport: {
      name: "Scheduled Report",
      desc: "Generate and email periodic reports",
      steps: [
        "1. Trigger: Recurrence (daily/weekly)",
        "2. Get items from SharePoint/Dataverse",
        "3. Filter array by date range",
        "4. Create HTML table",
        "5. Send email with table"
      ]
    },
    errorHandling: {
      name: "Error Handling Pattern",
      desc: "Proper error handling with Scope",
      steps: [
        "1. Scope: Try",
        "   - Main flow actions",
        "2. Scope: Catch (Configure Run After: has failed)",
        "   - Log error details",
        "   - Send notification",
        "   - Terminate with Failed"
      ]
    }
  },

  async canHandle(context) {
    const content = context.message.content?.toLowerCase() || "";
    const triggers = [
      "/flow",
      "/automate",
      "/powerautomate",
      "power automate",
      "create a flow",
      "flow trigger",
      "flow action",
      "connector",
      "approval workflow"
    ];
    return triggers.some(t => content.includes(t));
  },

  async execute(context) {
    const content = context.message.content || "";
    const lower = content.toLowerCase();

    // Triggers
    if (lower.match(/trigger/)) {
      return this.showTriggers(lower);
    }

    // Actions
    if (lower.match(/action/)) {
      return this.showActions(lower);
    }

    // Expressions
    if (lower.match(/expression|formula|function/)) {
      return this.showExpressions(lower);
    }

    // Patterns
    if (lower.match(/pattern|workflow|example|approval|document|report|error/)) {
      return this.showPatterns(lower);
    }

    // Connectors
    if (lower.match(/connector/)) {
      return this.showConnectors();
    }

    return this.showHelp();
  },

  showTriggers(query) {
    let content = "## Power Automate Triggers\n\n";

    if (query.includes("automated") || query.includes("event")) {
      content += "### Automated Triggers (Event-based)\n\n| Trigger | Connector | Description |\n|---------|-----------|-------------|\n";
      for (const [name, info] of Object.entries(this.triggers.automated)) {
        content += `| ${name} | ${info.connector} | ${info.desc} |\n`;
      }
    } else if (query.includes("schedule")) {
      content += "### Scheduled Triggers\n\n| Trigger | Description |\n|---------|-------------|\n";
      for (const [name, info] of Object.entries(this.triggers.scheduled)) {
        content += `| ${name} | ${info.desc} |\n`;
      }
    } else if (query.includes("instant") || query.includes("manual")) {
      content += "### Instant Triggers (Manual)\n\n| Trigger | Description |\n|---------|-------------|\n";
      for (const [name, info] of Object.entries(this.triggers.instant)) {
        const connector = info.connector ? ` (${info.connector})` : "";
        content += `| ${name}${connector} | ${info.desc} |\n`;
      }
    } else {
      // Show all categories
      content += "### Automated (Event-based)\n";
      for (const [name, info] of Object.entries(this.triggers.automated)) {
        content += `- **${name}** - ${info.connector}\n`;
      }
      content += "\n### Scheduled\n";
      for (const [name, info] of Object.entries(this.triggers.scheduled)) {
        content += `- **${name}** - ${info.desc}\n`;
      }
      content += "\n### Instant (Manual)\n";
      for (const [name, info] of Object.entries(this.triggers.instant)) {
        content += `- **${name}** - ${info.desc}\n`;
      }
    }

    return { success: true, content, nextAction: "respond" };
  },

  showActions(query) {
    let content = "## Power Automate Actions\n\n";
    
    const categories = {
      control: "Control",
      variables: "Variables",
      data: "Data Operations",
      approval: "Approvals",
      communication: "Communication",
      ai: "AI Builder"
    };

    // Find matching category
    for (const [key, title] of Object.entries(categories)) {
      if (query.includes(key) || query.includes(title.toLowerCase())) {
        content += `### ${title}\n\n| Action | Description |\n|--------|-------------|\n`;
        for (const [name, info] of Object.entries(this.actions[key])) {
          const connector = info.connector ? ` (${info.connector})` : "";
          const syntax = info.syntax ? `<br>\`${info.syntax}\`` : "";
          content += `| **${name}**${connector} | ${info.desc}${syntax} |\n`;
        }
        return { success: true, content, nextAction: "respond" };
      }
    }

    // Show all categories summary
    for (const [key, title] of Object.entries(categories)) {
      content += `### ${title}\n`;
      for (const [name, info] of Object.entries(this.actions[key])) {
        content += `- **${name}**\n`;
      }
      content += "\n";
    }

    content += "Use `/flow actions <category>` for details (control, variables, data, approval, communication, ai)";

    return { success: true, content, nextAction: "respond" };
  },

  showExpressions(query) {
    let content = "## Power Automate Expressions\n\n";
    
    const categories = {
      string: "String Functions",
      collection: "Collection Functions",
      logical: "Logical Functions",
      datetime: "Date/Time Functions",
      conversion: "Conversion Functions",
      reference: "Reference Functions"
    };

    for (const [key, title] of Object.entries(categories)) {
      if (query.includes(key) || query.includes(title.toLowerCase().split(" ")[0])) {
        content += `### ${title}\n\n| Function | Example |\n|----------|----------|\n`;
        for (const [name, example] of Object.entries(this.expressions[key])) {
          content += `| **${name}** | \`${example}\` |\n`;
        }
        return { success: true, content, nextAction: "respond" };
      }
    }

    // Show all
    for (const [key, title] of Object.entries(categories)) {
      content += `### ${title}\n`;
      for (const [name, example] of Object.entries(this.expressions[key])) {
        content += `- \`${example}\`\n`;
      }
      content += "\n";
    }

    return { success: true, content, nextAction: "respond" };
  },

  showPatterns(query) {
    let content = "## Power Automate Patterns\n\n";

    for (const [key, pattern] of Object.entries(this.patterns)) {
      if (query.includes(key.toLowerCase()) || query.includes(pattern.name.toLowerCase())) {
        content += `### ${pattern.name}\n\n${pattern.desc}\n\n**Steps:**\n`;
        for (const step of pattern.steps) {
          content += `${step}\n`;
        }
        return { success: true, content, nextAction: "respond" };
      }
    }

    // Show all patterns
    for (const [key, pattern] of Object.entries(this.patterns)) {
      content += `### ${pattern.name}\n${pattern.desc}\n\n`;
    }

    content += "Use `/flow pattern <name>` for detailed steps";

    return { success: true, content, nextAction: "respond" };
  },

  showConnectors() {
    return {
      success: true,
      content: `## Popular Power Automate Connectors

| Connector | Common Triggers | Common Actions |
|-----------|-----------------|----------------|
| **SharePoint** | Item created/modified, File created | Get/Create/Update items, Get file content |
| **Outlook** | New email, Event created | Send email, Create event |
| **Teams** | Message posted, Mention | Post message, Post adaptive card |
| **Dataverse** | Row added/modified | List/Add/Update rows |
| **OneDrive** | File created | Get/Create file |
| **Forms** | Response submitted | Get response details |
| **HTTP** | HTTP request received | HTTP request |
| **Approvals** | - | Start approval, Wait for approval |
| **AI Builder** | - | GPT, Document processing |
| **Azure** | - | Blob storage, Functions, Service Bus |

📚 [All Connectors](https://learn.microsoft.com/connectors/connector-reference/)`,
      nextAction: "respond"
    };
  },

  showHelp() {
    return {
      success: true,
      content: `## Power Automate Assistant

Build automated workflows with Power Automate.

### Commands

| Command | Description |
|---------|-------------|
| \`/flow triggers\` | List all trigger types |
| \`/flow actions\` | List action categories |
| \`/flow actions approval\` | Approval actions |
| \`/flow expressions\` | Expression functions |
| \`/flow connectors\` | Popular connectors |
| \`/flow patterns\` | Common workflow patterns |

### Quick Examples

**Get trigger data:**
\`\`\`
@triggerBody()?['Title']
@triggerOutputs()?['headers']?['x-ms-user-timestamp']
\`\`\`

**Loop through items:**
\`\`\`
@items('Apply_to_each')?['Email']
\`\`\`

**Conditional expression:**
\`\`\`
@if(equals(variables('Status'), 'Approved'), 'Yes', 'No')
\`\`\`

📚 [Power Automate Docs](https://learn.microsoft.com/power-automate/)`,
      nextAction: "respond"
    };
  }
};
