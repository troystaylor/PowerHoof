/**
 * KQL (Kusto Query Language) Skill
 * 
 * Query language for Azure Data Explorer, Log Analytics, and Microsoft Sentinel.
 * Provides operator reference, function help, and common patterns.
 */

export const skill = {
  manifest: {
    id: "kql-skill",
    name: "KQL",
    description: "KQL (Kusto Query Language) assistant for Azure Data Explorer and Log Analytics",
    version: "1.0.0",
    author: "PowerHoof",
    permissions: ["read-context"],
    examples: [
      "/kql where",
      "/kql operators",
      "/kql summarize by",
      "how do I filter in KQL",
      "kusto query for top 10"
    ],
    tags: ["kql", "kusto", "azure-data-explorer", "log-analytics", "sentinel", "azure-monitor"]
  },

  // KQL operators and functions
  operatorReference: {
    tabular: {
      where: { syntax: "T | where Predicate", desc: "Filters rows by predicate" },
      project: { syntax: "T | project Column1, Column2, ...", desc: "Selects/renames/computes columns" },
      "project-away": { syntax: "T | project-away Column1, Column2", desc: "Excludes specified columns" },
      "project-keep": { syntax: "T | project-keep Column1, Column2", desc: "Keeps only specified columns" },
      "project-rename": { syntax: "T | project-rename NewName = OldName", desc: "Renames columns" },
      "project-reorder": { syntax: "T | project-reorder Column1, Column2", desc: "Reorders columns" },
      extend: { syntax: "T | extend NewColumn = Expression", desc: "Adds calculated columns" },
      summarize: { syntax: "T | summarize Aggregation by GroupColumn", desc: "Groups and aggregates" },
      distinct: { syntax: "T | distinct Column1, Column2", desc: "Returns unique combinations" },
      top: { syntax: "T | top N by Column [asc|desc]", desc: "Returns top N rows" },
      take: { syntax: "T | take N", desc: "Returns first N rows (random order)" },
      limit: { syntax: "T | limit N", desc: "Same as take" },
      sort: { syntax: "T | sort by Column [asc|desc]", desc: "Sorts rows" },
      order: { syntax: "T | order by Column [asc|desc]", desc: "Same as sort" },
      join: { syntax: "T1 | join [kind=...] T2 on Key", desc: "Joins two tables" },
      union: { syntax: "union T1, T2, ...", desc: "Combines tables vertically" },
      count: { syntax: "T | count", desc: "Returns row count" },
      lookup: { syntax: "T1 | lookup T2 on Key", desc: "Looks up matches from dimension table" },
      mv_expand: { syntax: "T | mv-expand Column", desc: "Expands multi-value to rows" },
      parse: { syntax: "T | parse Column with Pattern", desc: "Parses text into columns" },
      "parse-where": { syntax: "T | parse-where Column with Pattern", desc: "Parse and filter" },
      evaluate: { syntax: "T | evaluate PluginName(args)", desc: "Invokes plugin" },
      render: { syntax: "T | render ChartType", desc: "Renders visualization" },
      serialize: { syntax: "T | serialize", desc: "Orders rows for window functions" },
      range: { syntax: "range x from Start to End step Step", desc: "Generates sequence" },
      print: { syntax: "print Expression", desc: "Outputs single row" },
      let: { syntax: "let Name = Expression;", desc: "Defines variable or function" },
      datatable: { syntax: "datatable(Col1:type1, ...) [data]", desc: "Creates inline table" }
    },
    aggregation: {
      count: { syntax: "count()", desc: "Counts rows" },
      countif: { syntax: "countif(Predicate)", desc: "Counts rows matching predicate" },
      dcount: { syntax: "dcount(Column)", desc: "Counts distinct values" },
      dcountif: { syntax: "dcountif(Column, Predicate)", desc: "Conditional distinct count" },
      sum: { syntax: "sum(Column)", desc: "Sums values" },
      sumif: { syntax: "sumif(Column, Predicate)", desc: "Conditional sum" },
      avg: { syntax: "avg(Column)", desc: "Returns average" },
      avgif: { syntax: "avgif(Column, Predicate)", desc: "Conditional average" },
      min: { syntax: "min(Column)", desc: "Returns minimum" },
      max: { syntax: "max(Column)", desc: "Returns maximum" },
      percentile: { syntax: "percentile(Column, Percentile)", desc: "Returns percentile value" },
      percentiles: { syntax: "percentiles(Column, P1, P2, ...)", desc: "Returns multiple percentiles" },
      stdev: { syntax: "stdev(Column)", desc: "Returns standard deviation" },
      variance: { syntax: "variance(Column)", desc: "Returns variance" },
      make_list: { syntax: "make_list(Column)", desc: "Creates JSON array of values" },
      make_set: { syntax: "make_set(Column)", desc: "Creates JSON array of unique values" },
      make_bag: { syntax: "make_bag(Column)", desc: "Creates JSON object" },
      arg_max: { syntax: "arg_max(Column, *)", desc: "Row with maximum value" },
      arg_min: { syntax: "arg_min(Column, *)", desc: "Row with minimum value" },
      any: { syntax: "any(Column)", desc: "Returns any non-empty value" },
      take_any: { syntax: "take_any(Column)", desc: "Same as any" }
    },
    scalar: {
      // String functions
      strlen: { syntax: "strlen(String)", desc: "Returns string length" },
      substring: { syntax: "substring(String, Start, Length)", desc: "Extracts substring" },
      tolower: { syntax: "tolower(String)", desc: "Converts to lowercase" },
      toupper: { syntax: "toupper(String)", desc: "Converts to uppercase" },
      trim: { syntax: "trim(String)", desc: "Removes whitespace" },
      split: { syntax: "split(String, Delimiter)", desc: "Splits into array" },
      strcat: { syntax: "strcat(String1, String2, ...)", desc: "Concatenates strings" },
      strcat_delim: { syntax: "strcat_delim(Delimiter, String1, ...)", desc: "Concatenates with delimiter" },
      replace_string: { syntax: "replace_string(Text, Old, New)", desc: "Replaces text" },
      extract: { syntax: "extract(Regex, CaptureGroup, Text)", desc: "Extracts regex match" },
      extract_all: { syntax: "extract_all(Regex, Text)", desc: "Extracts all matches" },
      parse_json: { syntax: "parse_json(JsonString)", desc: "Parses JSON string" },
      parse_xml: { syntax: "parse_xml(XmlString)", desc: "Parses XML string" },
      // DateTime functions
      now: { syntax: "now()", desc: "Current UTC datetime" },
      ago: { syntax: "ago(TimeSpan)", desc: "Datetime in the past" },
      datetime: { syntax: "datetime(String)", desc: "Parses datetime" },
      startofday: { syntax: "startofday(DateTime)", desc: "Start of day" },
      startofweek: { syntax: "startofweek(DateTime)", desc: "Start of week" },
      startofmonth: { syntax: "startofmonth(DateTime)", desc: "Start of month" },
      startofyear: { syntax: "startofyear(DateTime)", desc: "Start of year" },
      endofday: { syntax: "endofday(DateTime)", desc: "End of day" },
      endofweek: { syntax: "endofweek(DateTime)", desc: "End of week" },
      endofmonth: { syntax: "endofmonth(DateTime)", desc: "End of month" },
      endofyear: { syntax: "endofyear(DateTime)", desc: "End of year" },
      datetime_diff: { syntax: "datetime_diff(Part, DateTime1, DateTime2)", desc: "Difference between datetimes" },
      datetime_add: { syntax: "datetime_add(Part, Amount, DateTime)", desc: "Adds to datetime" },
      format_datetime: { syntax: "format_datetime(DateTime, Format)", desc: "Formats datetime" },
      bin: { syntax: "bin(Value, RoundTo)", desc: "Rounds down to interval" },
      // Conditional
      iff: { syntax: "iff(Condition, IfTrue, IfFalse)", desc: "Conditional value" },
      iif: { syntax: "iif(Condition, IfTrue, IfFalse)", desc: "Same as iff" },
      case: { syntax: "case(Pred1, Val1, Pred2, Val2, ..., Default)", desc: "Multi-condition" },
      coalesce: { syntax: "coalesce(Expr1, Expr2, ...)", desc: "First non-null" },
      isempty: { syntax: "isempty(Value)", desc: "Tests if empty/null" },
      isnotempty: { syntax: "isnotempty(Value)", desc: "Tests if not empty" },
      isnull: { syntax: "isnull(Value)", desc: "Tests if null" },
      isnotnull: { syntax: "isnotnull(Value)", desc: "Tests if not null" },
      // Type conversion
      toint: { syntax: "toint(Value)", desc: "Converts to int" },
      tolong: { syntax: "tolong(Value)", desc: "Converts to long" },
      todouble: { syntax: "todouble(Value)", desc: "Converts to double" },
      tostring: { syntax: "tostring(Value)", desc: "Converts to string" },
      tobool: { syntax: "tobool(Value)", desc: "Converts to boolean" },
      todatetime: { syntax: "todatetime(Value)", desc: "Converts to datetime" },
      totimespan: { syntax: "totimespan(Value)", desc: "Converts to timespan" },
      // Array/Dynamic
      array_length: { syntax: "array_length(Array)", desc: "Returns array length" },
      pack: { syntax: "pack(Key1, Value1, ...)", desc: "Creates dynamic object" },
      pack_all: { syntax: "pack_all()", desc: "Packs all columns to object" },
      bag_keys: { syntax: "bag_keys(Bag)", desc: "Returns object keys" }
    },
    joins: {
      inner: { syntax: "T1 | join kind=inner T2 on Key", desc: "Only matching rows" },
      leftouter: { syntax: "T1 | join kind=leftouter T2 on Key", desc: "All left, matching right" },
      rightouter: { syntax: "T1 | join kind=rightouter T2 on Key", desc: "All right, matching left" },
      fullouter: { syntax: "T1 | join kind=fullouter T2 on Key", desc: "All rows from both" },
      leftanti: { syntax: "T1 | join kind=leftanti T2 on Key", desc: "Left rows without match" },
      rightanti: { syntax: "T1 | join kind=rightanti T2 on Key", desc: "Right rows without match" },
      leftsemi: { syntax: "T1 | join kind=leftsemi T2 on Key", desc: "Left rows with match" },
      rightsemi: { syntax: "T1 | join kind=rightsemi T2 on Key", desc: "Right rows with match" }
    }
  },

  // Common patterns
  patterns: {
    timeFilter: {
      name: "Time Range Filter",
      code: `// Last 24 hours
TableName
| where TimeGenerated > ago(24h)

// Specific date range
TableName
| where TimeGenerated between (datetime(2024-01-01) .. datetime(2024-01-31))`
    },
    topByGroup: {
      name: "Top N Per Group",
      code: `TableName
| summarize Count = count() by Category
| top 10 by Count desc`
    },
    timeSeries: {
      name: "Time Series Aggregation",
      code: `TableName
| where TimeGenerated > ago(7d)
| summarize Count = count() by bin(TimeGenerated, 1h)
| render timechart`
    },
    percentiles: {
      name: "Performance Percentiles",
      code: `Requests
| summarize 
    p50 = percentile(Duration, 50),
    p90 = percentile(Duration, 90),
    p99 = percentile(Duration, 99)
    by bin(TimeGenerated, 1h)`
    },
    errorAnalysis: {
      name: "Error Analysis",
      code: `AppExceptions
| where TimeGenerated > ago(24h)
| summarize Count = count() by ExceptionType, bin(TimeGenerated, 1h)
| order by Count desc`
    },
    searchLogs: {
      name: "Search Across Tables",
      code: `search in (Syslog, SecurityEvent, Event) "error"
| where TimeGenerated > ago(1h)
| project TimeGenerated, $table, Message = strcat_delim(' ', *)`
    }
  },

  async canHandle(context) {
    const content = context.message.content?.toLowerCase() || "";
    const triggers = [
      "/kql",
      "/kusto",
      "kusto query",
      "kql query",
      "azure data explorer",
      "log analytics query",
      "sentinel query",
      "| where",
      "| summarize"
    ];
    return triggers.some(t => content.includes(t));
  },

  async execute(context) {
    const content = context.message.content || "";
    const lower = content.toLowerCase();

    // Category listings
    if (lower.match(/operators?\s+(list|all|categories)/)) {
      return this.listCategories();
    }
    if (lower.match(/operators?\s+(tabular|table)/)) {
      return this.listCategoryFunctions("tabular", "Tabular Operators");
    }
    if (lower.match(/operators?\s+(aggregat|summarize)/)) {
      return this.listCategoryFunctions("aggregation", "Aggregation Functions");
    }
    if (lower.match(/functions?\s+(scalar|string|date|convert)/)) {
      return this.listCategoryFunctions("scalar", "Scalar Functions");
    }
    if (lower.match(/join/)) {
      return this.listCategoryFunctions("joins", "Join Types");
    }

    // Patterns
    if (lower.match(/pattern|time\s*(series|filter|range)|top.*by|percentile|error|search/)) {
      return this.showPatterns(lower);
    }

    // Operator/function lookup
    const match = content.match(/(?:help|syntax|how|use|about)\s+(\w+)|(\w+)\s+(?:syntax|help)|^\/?(?:kql|kusto)\s+(\w+)/i);
    if (match) {
      const name = match[1] || match[2] || match[3];
      return this.lookupOperator(name);
    }

    return this.showHelp();
  },

  lookupOperator(name) {
    const searchName = name.toLowerCase().replace("-", "_");
    
    for (const [category, operators] of Object.entries(this.operatorReference)) {
      for (const [opName, info] of Object.entries(operators)) {
        if (opName.toLowerCase().replace("-", "_") === searchName) {
          return {
            success: true,
            content: this.formatOperatorHelp(opName, info, category),
            nextAction: "respond"
          };
        }
      }
    }

    // Partial match
    const matches = [];
    for (const [category, operators] of Object.entries(this.operatorReference)) {
      for (const [opName, info] of Object.entries(operators)) {
        if (opName.toLowerCase().includes(searchName)) {
          matches.push({ name: opName, info, category });
        }
      }
    }

    if (matches.length > 0) {
      if (matches.length === 1) {
        const m = matches[0];
        return {
          success: true,
          content: this.formatOperatorHelp(m.name, m.info, m.category),
          nextAction: "respond"
        };
      }
      
      let content = `## KQL Operators/Functions Matching "${name}"\n\n`;
      for (const m of matches.slice(0, 10)) {
        content += `### ${m.name}\n\`${m.info.syntax}\`\n${m.info.desc}\n\n`;
      }
      return { success: true, content, nextAction: "respond" };
    }

    return {
      success: true,
      content: `No KQL operator found matching "${name}".\n\nUse \`/kql operators list\` to see all categories.`,
      nextAction: "respond"
    };
  },

  formatOperatorHelp(name, info, category) {
    const examples = this.getExamples(name);
    
    let content = `## KQL: ${name}\n\n`;
    content += `**Category:** ${category}\n\n`;
    content += `**Syntax:**\n\`\`\`kusto\n${info.syntax}\n\`\`\`\n\n`;
    content += `**Description:** ${info.desc}\n\n`;
    
    if (examples) {
      content += `**Example:**\n\`\`\`kusto\n${examples}\n\`\`\`\n\n`;
    }
    
    content += `📚 [Documentation](https://learn.microsoft.com/azure/data-explorer/kusto/query/${name.replace("_", "-")}operator)`;
    
    return content;
  },

  getExamples(opName) {
    const examples = {
      where: `// Filter by condition
StormEvents
| where State == "FLORIDA"
| where StartTime > ago(7d)`,
      
      project: `// Select and rename columns
StormEvents
| project EventId, State, EventType, 
          Duration = EndTime - StartTime`,
      
      extend: `// Add calculated columns
StormEvents
| extend Duration = EndTime - StartTime,
         Year = datetime_part("year", StartTime)`,
      
      summarize: `// Group and aggregate
StormEvents
| summarize 
    EventCount = count(),
    TotalDamage = sum(DamageProperty)
    by State, EventType
| order by EventCount desc`,
      
      join: `// Join tables
Table1
| join kind=inner (Table2) on CommonColumn`,
      
      top: `// Get top N rows
StormEvents
| top 10 by DamageProperty desc`,
      
      ago: `// Time relative to now
StormEvents
| where StartTime > ago(24h)`,
      
      bin: `// Group time into buckets
Requests
| summarize count() by bin(timestamp, 1h)
| render timechart`
    };
    
    return examples[opName] || null;
  },

  showPatterns(query) {
    if (query.includes("time") && (query.includes("filter") || query.includes("range"))) {
      return { success: true, content: `## KQL Pattern: Time Range\n\n\`\`\`kusto\n${this.patterns.timeFilter.code}\n\`\`\``, nextAction: "respond" };
    }
    if (query.includes("top") || query.includes("group")) {
      return { success: true, content: `## KQL Pattern: Top N Per Group\n\n\`\`\`kusto\n${this.patterns.topByGroup.code}\n\`\`\``, nextAction: "respond" };
    }
    if (query.includes("time") && query.includes("series")) {
      return { success: true, content: `## KQL Pattern: Time Series\n\n\`\`\`kusto\n${this.patterns.timeSeries.code}\n\`\`\``, nextAction: "respond" };
    }
    if (query.includes("percentile")) {
      return { success: true, content: `## KQL Pattern: Percentiles\n\n\`\`\`kusto\n${this.patterns.percentiles.code}\n\`\`\``, nextAction: "respond" };
    }
    if (query.includes("error")) {
      return { success: true, content: `## KQL Pattern: Error Analysis\n\n\`\`\`kusto\n${this.patterns.errorAnalysis.code}\n\`\`\``, nextAction: "respond" };
    }
    if (query.includes("search")) {
      return { success: true, content: `## KQL Pattern: Search Logs\n\n\`\`\`kusto\n${this.patterns.searchLogs.code}\n\`\`\``, nextAction: "respond" };
    }

    let content = `## Common KQL Patterns\n\n`;
    for (const [key, pattern] of Object.entries(this.patterns)) {
      content += `### ${pattern.name}\n\`\`\`kusto\n${pattern.code}\n\`\`\`\n\n`;
    }
    return { success: true, content, nextAction: "respond" };
  },

  listCategories() {
    let content = `## KQL Operator & Function Categories\n\n`;
    content += `| Category | Description | Examples |\n`;
    content += `|----------|-------------|----------|\n`;
    content += `| **Tabular** | Table operations | where, project, summarize, join |\n`;
    content += `| **Aggregation** | Summary functions | count, sum, avg, dcount |\n`;
    content += `| **Scalar** | Value functions | strlen, ago, iff, parse_json |\n`;
    content += `| **Joins** | Join types | inner, leftouter, leftanti |\n\n`;
    content += `Use \`/kql operators <category>\` or \`/kql <operator>\` for details.`;
    
    return { success: true, content, nextAction: "respond" };
  },

  listCategoryFunctions(category, title) {
    const operators = this.operatorReference[category];
    if (!operators) {
      return { success: false, content: `Unknown category: ${category}`, nextAction: "respond" };
    }

    let content = `## KQL ${title}\n\n`;
    content += `| Operator/Function | Description |\n`;
    content += `|-------------------|-------------|\n`;
    
    for (const [name, info] of Object.entries(operators)) {
      content += `| **${name}** | ${info.desc} |\n`;
    }
    
    content += `\nUse \`/kql <operator>\` for detailed syntax.`;
    
    return { success: true, content, nextAction: "respond" };
  },

  showHelp() {
    return {
      success: true,
      content: `## KQL (Kusto Query Language) Assistant

KQL is used in Azure Data Explorer, Log Analytics, Microsoft Sentinel, and Azure Monitor.

### Commands

| Command | Description |
|---------|-------------|
| \`/kql <operator>\` | Get help for operator/function |
| \`/kql operators list\` | List all categories |
| \`/kql operators tabular\` | Tabular operators |
| \`/kql operators aggregation\` | Aggregation functions |
| \`/kql join\` | Join types |
| \`/kql patterns\` | Common query patterns |

### Basic Query Structure
\`\`\`kusto
TableName
| where TimeGenerated > ago(24h)
| where Column == "value"
| summarize Count = count() by Category
| order by Count desc
| take 10
\`\`\`

📚 [KQL Reference](https://learn.microsoft.com/azure/data-explorer/kusto/query/)`,
      nextAction: "respond"
    };
  }
};
