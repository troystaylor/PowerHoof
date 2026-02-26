/**
 * DAX (Data Analysis Expressions) Skill
 * 
 * Formula language for Power BI, Analysis Services, and Power Pivot.
 * Provides function reference, syntax help, patterns, and examples.
 */

export const skill = {
  manifest: {
    id: "dax-skill",
    name: "DAX",
    description: "DAX formula language assistant for Power BI, Analysis Services, and Power Pivot",
    version: "1.0.0",
    author: "PowerHoof",
    permissions: ["read-context"],
    examples: [
      "/dax CALCULATE",
      "/dax time intelligence",
      "/dax functions filter",
      "how do I use SUMX in DAX",
      "DAX measure for year over year"
    ],
    tags: ["dax", "power-bi", "analysis-services", "power-pivot", "measures", "calculated-columns"]
  },

  // DAX functions by category
  functionReference: {
    aggregation: {
      SUM: { syntax: "SUM(<column>)", desc: "Adds all numbers in a column" },
      SUMX: { syntax: "SUMX(<table>, <expression>)", desc: "Returns sum of expression evaluated for each row" },
      AVERAGE: { syntax: "AVERAGE(<column>)", desc: "Returns average of numbers in a column" },
      AVERAGEX: { syntax: "AVERAGEX(<table>, <expression>)", desc: "Returns average of expression for each row" },
      COUNT: { syntax: "COUNT(<column>)", desc: "Counts cells containing numbers" },
      COUNTA: { syntax: "COUNTA(<column>)", desc: "Counts non-blank cells" },
      COUNTX: { syntax: "COUNTX(<table>, <expression>)", desc: "Counts expression results for each row" },
      COUNTROWS: { syntax: "COUNTROWS(<table>)", desc: "Counts rows in a table" },
      DISTINCTCOUNT: { syntax: "DISTINCTCOUNT(<column>)", desc: "Counts unique values" },
      DISTINCTCOUNTNOBLANK: { syntax: "DISTINCTCOUNTNOBLANK(<column>)", desc: "Counts unique non-blank values" },
      MIN: { syntax: "MIN(<column>) or MIN(<expr1>, <expr2>)", desc: "Returns minimum value" },
      MINX: { syntax: "MINX(<table>, <expression>)", desc: "Returns minimum expression value" },
      MAX: { syntax: "MAX(<column>) or MAX(<expr1>, <expr2>)", desc: "Returns maximum value" },
      MAXX: { syntax: "MAXX(<table>, <expression>)", desc: "Returns maximum expression value" },
      PRODUCT: { syntax: "PRODUCT(<column>)", desc: "Returns product of numbers" },
      PRODUCTX: { syntax: "PRODUCTX(<table>, <expression>)", desc: "Returns product of expression" }
    },
    filter: {
      CALCULATE: { syntax: "CALCULATE(<expression> [, <filter1>, <filter2>, ...])", desc: "Evaluates expression in modified filter context" },
      CALCULATETABLE: { syntax: "CALCULATETABLE(<table> [, <filter1>, ...])", desc: "Returns a filtered table" },
      FILTER: { syntax: "FILTER(<table>, <filter>)", desc: "Returns filtered table based on condition" },
      ALL: { syntax: "ALL(<table>) or ALL(<column1> [, <column2>, ...])", desc: "Removes all filters" },
      ALLEXCEPT: { syntax: "ALLEXCEPT(<table>, <column1> [, <column2>, ...])", desc: "Removes all filters except specified columns" },
      ALLSELECTED: { syntax: "ALLSELECTED([<table>|<column>])", desc: "Removes filters within current selection" },
      REMOVEFILTERS: { syntax: "REMOVEFILTERS([<table>|<column>])", desc: "Clears filters from specified tables or columns" },
      KEEPFILTERS: { syntax: "KEEPFILTERS(<expression>)", desc: "Adds filter without replacing existing" },
      VALUES: { syntax: "VALUES(<column>)", desc: "Returns unique values including blank" },
      DISTINCT: { syntax: "DISTINCT(<column>)", desc: "Returns unique values" },
      HASONEVALUE: { syntax: "HASONEVALUE(<column>)", desc: "Returns TRUE if context has one value" },
      HASONEFILTER: { syntax: "HASONEFILTER(<column>)", desc: "Returns TRUE if one filter on column" },
      ISFILTERED: { syntax: "ISFILTERED(<column>)", desc: "Returns TRUE if column is filtered" },
      ISCROSSFILTERED: { syntax: "ISCROSSFILTERED(<column>)", desc: "Returns TRUE if column is cross-filtered" },
      SELECTEDVALUE: { syntax: "SELECTEDVALUE(<column> [, <alternateResult>])", desc: "Returns value if single value in context" }
    },
    timeIntelligence: {
      DATEADD: { syntax: "DATEADD(<dates>, <number>, <interval>)", desc: "Shifts dates by interval" },
      DATESYTD: { syntax: "DATESYTD(<dates> [, <yearEndDate>])", desc: "Returns year-to-date dates" },
      DATESQTD: { syntax: "DATESQTD(<dates>)", desc: "Returns quarter-to-date dates" },
      DATESMTD: { syntax: "DATESMTD(<dates>)", desc: "Returns month-to-date dates" },
      TOTALYTD: { syntax: "TOTALYTD(<expression>, <dates> [, <filter>] [, <yearEndDate>])", desc: "Evaluates year-to-date total" },
      TOTALQTD: { syntax: "TOTALQTD(<expression>, <dates> [, <filter>])", desc: "Evaluates quarter-to-date total" },
      TOTALMTD: { syntax: "TOTALMTD(<expression>, <dates> [, <filter>])", desc: "Evaluates month-to-date total" },
      SAMEPERIODLASTYEAR: { syntax: "SAMEPERIODLASTYEAR(<dates>)", desc: "Returns dates shifted back one year" },
      PREVIOUSYEAR: { syntax: "PREVIOUSYEAR(<dates> [, <yearEndDate>])", desc: "Returns previous year dates" },
      PREVIOUSQUARTER: { syntax: "PREVIOUSQUARTER(<dates>)", desc: "Returns previous quarter dates" },
      PREVIOUSMONTH: { syntax: "PREVIOUSMONTH(<dates>)", desc: "Returns previous month dates" },
      PREVIOUSDAY: { syntax: "PREVIOUSDAY(<dates>)", desc: "Returns previous day" },
      NEXTYEAR: { syntax: "NEXTYEAR(<dates> [, <yearEndDate>])", desc: "Returns next year dates" },
      NEXTQUARTER: { syntax: "NEXTQUARTER(<dates>)", desc: "Returns next quarter dates" },
      NEXTMONTH: { syntax: "NEXTMONTH(<dates>)", desc: "Returns next month dates" },
      NEXTDAY: { syntax: "NEXTDAY(<dates>)", desc: "Returns next day" },
      PARALLELPERIOD: { syntax: "PARALLELPERIOD(<dates>, <number>, <interval>)", desc: "Returns parallel period dates" },
      DATESBETWEEN: { syntax: "DATESBETWEEN(<dates>, <startDate>, <endDate>)", desc: "Returns dates in range" },
      DATESINPERIOD: { syntax: "DATESINPERIOD(<dates>, <startDate>, <number>, <interval>)", desc: "Returns dates in period" },
      STARTOFYEAR: { syntax: "STARTOFYEAR(<dates>)", desc: "Returns first date of year" },
      ENDOFYEAR: { syntax: "ENDOFYEAR(<dates>)", desc: "Returns last date of year" },
      STARTOFQUARTER: { syntax: "STARTOFQUARTER(<dates>)", desc: "Returns first date of quarter" },
      ENDOFQUARTER: { syntax: "ENDOFQUARTER(<dates>)", desc: "Returns last date of quarter" },
      STARTOFMONTH: { syntax: "STARTOFMONTH(<dates>)", desc: "Returns first date of month" },
      ENDOFMONTH: { syntax: "ENDOFMONTH(<dates>)", desc: "Returns last date of month" }
    },
    logical: {
      IF: { syntax: "IF(<condition>, <valueIfTrue> [, <valueIfFalse>])", desc: "Returns value based on condition" },
      SWITCH: { syntax: "SWITCH(<expression>, <value1>, <result1> [, ...] [, <else>])", desc: "Returns matching result" },
      AND: { syntax: "AND(<condition1>, <condition2>)", desc: "Returns TRUE if both conditions are TRUE" },
      OR: { syntax: "OR(<condition1>, <condition2>)", desc: "Returns TRUE if either condition is TRUE" },
      NOT: { syntax: "NOT(<condition>)", desc: "Reverses logical value" },
      TRUE: { syntax: "TRUE()", desc: "Returns TRUE" },
      FALSE: { syntax: "FALSE()", desc: "Returns FALSE" },
      IFERROR: { syntax: "IFERROR(<value>, <valueIfError>)", desc: "Returns value if error" },
      ISERROR: { syntax: "ISERROR(<value>)", desc: "Returns TRUE if value is error" },
      ISBLANK: { syntax: "ISBLANK(<value>)", desc: "Returns TRUE if value is blank" },
      COALESCE: { syntax: "COALESCE(<expression1>, <expression2> [, ...])", desc: "Returns first non-blank value" }
    },
    text: {
      CONCATENATE: { syntax: "CONCATENATE(<text1>, <text2>)", desc: "Joins two text strings" },
      COMBINEVALUES: { syntax: "COMBINEVALUES(<delimiter>, <expression1>, <expression2> [, ...])", desc: "Joins values with delimiter" },
      FORMAT: { syntax: "FORMAT(<value>, <formatString>)", desc: "Formats value as text" },
      LEFT: { syntax: "LEFT(<text>, <numChars>)", desc: "Returns leftmost characters" },
      RIGHT: { syntax: "RIGHT(<text>, <numChars>)", desc: "Returns rightmost characters" },
      MID: { syntax: "MID(<text>, <startPos>, <numChars>)", desc: "Returns middle characters" },
      LEN: { syntax: "LEN(<text>)", desc: "Returns text length" },
      UPPER: { syntax: "UPPER(<text>)", desc: "Converts to uppercase" },
      LOWER: { syntax: "LOWER(<text>)", desc: "Converts to lowercase" },
      TRIM: { syntax: "TRIM(<text>)", desc: "Removes extra spaces" },
      SUBSTITUTE: { syntax: "SUBSTITUTE(<text>, <oldText>, <newText> [, <instanceNum>])", desc: "Replaces text" },
      SEARCH: { syntax: "SEARCH(<findText>, <withinText> [, <startPos>] [, <notFoundValue>])", desc: "Finds text position (case-insensitive)" },
      FIND: { syntax: "FIND(<findText>, <withinText> [, <startPos>] [, <notFoundValue>])", desc: "Finds text position (case-sensitive)" },
      BLANK: { syntax: "BLANK()", desc: "Returns a blank value" },
      UNICHAR: { syntax: "UNICHAR(<number>)", desc: "Returns Unicode character" }
    },
    table: {
      ADDCOLUMNS: { syntax: "ADDCOLUMNS(<table>, <name1>, <expression1> [, ...])", desc: "Returns table with new columns" },
      SUMMARIZE: { syntax: "SUMMARIZE(<table>, <groupBy1> [, ...] [, <name>, <expression>, ...])", desc: "Groups and summarizes table" },
      SUMMARIZECOLUMNS: { syntax: "SUMMARIZECOLUMNS(<groupBy1> [, ...] [, <filterTable>, ...] [, <name>, <expression>, ...])", desc: "Creates summary table" },
      SELECTCOLUMNS: { syntax: "SELECTCOLUMNS(<table>, <name1>, <expression1> [, ...])", desc: "Returns table with specified columns" },
      TOPN: { syntax: "TOPN(<n>, <table> [, <orderBy> [, <order>] [, ...]])", desc: "Returns top N rows" },
      UNION: { syntax: "UNION(<table1>, <table2> [, ...])", desc: "Combines tables vertically" },
      INTERSECT: { syntax: "INTERSECT(<table1>, <table2>)", desc: "Returns common rows" },
      EXCEPT: { syntax: "EXCEPT(<table1>, <table2>)", desc: "Returns rows in first not in second" },
      CROSSJOIN: { syntax: "CROSSJOIN(<table1>, <table2> [, ...])", desc: "Returns Cartesian product" },
      NATURALLEFTOUTERJOIN: { syntax: "NATURALLEFTOUTERJOIN(<table1>, <table2>)", desc: "Left outer join on common columns" },
      NATURALINNERJOIN: { syntax: "NATURALINNERJOIN(<table1>, <table2>)", desc: "Inner join on common columns" },
      GENERATE: { syntax: "GENERATE(<table1>, <table2Expr>)", desc: "Returns Cartesian product with expression" },
      GENERATEALL: { syntax: "GENERATEALL(<table1>, <table2Expr>)", desc: "Like GENERATE but keeps empty results" },
      ROW: { syntax: "ROW(<name1>, <expression1> [, ...])", desc: "Returns single-row table" },
      DATATABLE: { syntax: "DATATABLE(<name1>, <type1> [, ...], {{<data>}})", desc: "Creates table with data" },
      TREATAS: { syntax: "TREATAS(<expression>, <column> [, ...])", desc: "Applies table as filter to columns" }
    },
    relationship: {
      RELATED: { syntax: "RELATED(<column>)", desc: "Returns related value from many-to-one" },
      RELATEDTABLE: { syntax: "RELATEDTABLE(<table>)", desc: "Returns related table (one-to-many)" },
      USERELATIONSHIP: { syntax: "USERELATIONSHIP(<column1>, <column2>)", desc: "Activates inactive relationship" },
      CROSSFILTER: { syntax: "CROSSFILTER(<column1>, <column2>, <direction>)", desc: "Specifies cross-filter direction" },
      LOOKUPVALUE: { syntax: "LOOKUPVALUE(<resultCol>, <searchCol1>, <searchVal1> [, ...])", desc: "Returns value from matching row" }
    },
    information: {
      ISBLANK: { syntax: "ISBLANK(<value>)", desc: "Checks if value is blank" },
      ISERROR: { syntax: "ISERROR(<value>)", desc: "Checks if value is error" },
      ISTEXT: { syntax: "ISTEXT(<value>)", desc: "Checks if value is text" },
      ISNUMBER: { syntax: "ISNUMBER(<value>)", desc: "Checks if value is number" },
      ISLOGICAL: { syntax: "ISLOGICAL(<value>)", desc: "Checks if value is logical" },
      ISNONTEXT: { syntax: "ISNONTEXT(<value>)", desc: "Checks if value is not text" },
      USERNAME: { syntax: "USERNAME()", desc: "Returns current user's domain\\username" },
      USERPRINCIPALNAME: { syntax: "USERPRINCIPALNAME()", desc: "Returns current user's UPN" },
      CUSTOMDATA: { syntax: "CUSTOMDATA()", desc: "Returns CustomData connection string property" }
    }
  },

  // Common patterns
  patterns: {
    yearOverYear: {
      name: "Year over Year Growth",
      code: `YoY Growth % = 
VAR CurrentSales = [Total Sales]
VAR PriorYearSales = CALCULATE([Total Sales], SAMEPERIODLASTYEAR('Date'[Date]))
RETURN
DIVIDE(CurrentSales - PriorYearSales, PriorYearSales)`
    },
    runningTotal: {
      name: "Running Total",
      code: `Running Total = 
CALCULATE(
    [Total Sales],
    FILTER(
        ALL('Date'),
        'Date'[Date] <= MAX('Date'[Date])
    )
)`
    },
    percentOfTotal: {
      name: "Percent of Total",
      code: `% of Total = 
DIVIDE(
    [Total Sales],
    CALCULATE([Total Sales], ALL(Products))
)`
    },
    movingAverage: {
      name: "Moving Average",
      code: `3 Month Avg = 
AVERAGEX(
    DATESINPERIOD('Date'[Date], LASTDATE('Date'[Date]), -3, MONTH),
    [Total Sales]
)`
    },
    rankWithinGroup: {
      name: "Rank Within Group",
      code: `Product Rank = 
RANKX(
    ALLSELECTED(Products[ProductName]),
    [Total Sales],
    ,
    DESC,
    Dense
)`
    },
    newVsReturning: {
      name: "New vs Returning Customers",
      code: `New Customers = 
CALCULATE(
    DISTINCTCOUNT(Sales[CustomerID]),
    FILTER(
        ALL(Sales),
        CALCULATE(MIN(Sales[OrderDate])) = MAX('Date'[Date])
    )
)`
    }
  },

  async canHandle(context) {
    const content = context.message.content?.toLowerCase() || "";
    const triggers = [
      "/dax",
      "dax formula",
      "dax function",
      "dax measure",
      "dax calculated",
      "power bi formula",
      "power bi measure",
      "how do i calculate in dax",
      "time intelligence"
    ];
    return triggers.some(t => content.includes(t));
  },

  async execute(context) {
    const content = context.message.content || "";
    const lower = content.toLowerCase();

    // Category listings
    if (lower.match(/functions?\s+(list|all|categories)/)) {
      return this.listCategories();
    }
    if (lower.match(/functions?\s+(aggregat|sum|count|average)/)) {
      return this.listCategoryFunctions("aggregation", "Aggregation Functions");
    }
    if (lower.match(/functions?\s+(filter|calculate|all\b)/)) {
      return this.listCategoryFunctions("filter", "Filter Functions");
    }
    if (lower.match(/time\s+intelligence|functions?\s+(date|time|year|month|quarter)/)) {
      return this.listCategoryFunctions("timeIntelligence", "Time Intelligence Functions");
    }
    if (lower.match(/functions?\s+(logic|if|switch|and|or)/)) {
      return this.listCategoryFunctions("logical", "Logical Functions");
    }
    if (lower.match(/functions?\s+(text|string|concat|format)/)) {
      return this.listCategoryFunctions("text", "Text Functions");
    }
    if (lower.match(/functions?\s+(table|summarize|column)/)) {
      return this.listCategoryFunctions("table", "Table Functions");
    }
    if (lower.match(/functions?\s+(relation|related|lookup)/)) {
      return this.listCategoryFunctions("relationship", "Relationship Functions");
    }
    if (lower.match(/functions?\s+(info|is\w+|user)/)) {
      return this.listCategoryFunctions("information", "Information Functions");
    }

    // Patterns
    if (lower.match(/pattern|year\s*over\s*year|yoy|running\s*total|percent\s*of\s*total|moving\s*average|rank/)) {
      return this.showPatterns(lower);
    }

    // Function lookup
    const functionMatch = content.match(/(?:help|syntax|how|use|about)\s+(\w+)|(\w+)\s+(?:syntax|help|function)|^\/?dax\s+(\w+)/i);
    if (functionMatch) {
      const funcName = functionMatch[1] || functionMatch[2] || functionMatch[3];
      return this.lookupFunction(funcName);
    }

    return this.showHelp();
  },

  lookupFunction(name) {
    const searchName = name.toUpperCase();
    
    for (const [category, functions] of Object.entries(this.functionReference)) {
      for (const [funcName, info] of Object.entries(functions)) {
        if (funcName.toUpperCase() === searchName) {
          return {
            success: true,
            content: this.formatFunctionHelp(funcName, info, category),
            nextAction: "respond"
          };
        }
      }
    }

    // Partial match
    const matches = [];
    for (const [category, functions] of Object.entries(this.functionReference)) {
      for (const [funcName, info] of Object.entries(functions)) {
        if (funcName.toUpperCase().includes(searchName)) {
          matches.push({ name: funcName, info, category });
        }
      }
    }

    if (matches.length > 0) {
      if (matches.length === 1) {
        const m = matches[0];
        return {
          success: true,
          content: this.formatFunctionHelp(m.name, m.info, m.category),
          nextAction: "respond"
        };
      }
      
      let content = `## DAX Functions Matching "${name}"\n\n`;
      for (const m of matches.slice(0, 10)) {
        content += `### ${m.name}\n\`${m.info.syntax}\`\n${m.info.desc}\n\n`;
      }
      if (matches.length > 10) {
        content += `_...and ${matches.length - 10} more_\n`;
      }
      return { success: true, content, nextAction: "respond" };
    }

    return {
      success: true,
      content: `No DAX function found matching "${name}".\n\nUse \`/dax functions list\` to see all categories.`,
      nextAction: "respond"
    };
  },

  formatFunctionHelp(name, info, category) {
    const examples = this.getExamples(name);
    
    let content = `## DAX: ${name}\n\n`;
    content += `**Category:** ${category}\n\n`;
    content += `**Syntax:**\n\`\`\`dax\n${info.syntax}\n\`\`\`\n\n`;
    content += `**Description:** ${info.desc}\n\n`;
    
    if (examples) {
      content += `**Examples:**\n\`\`\`dax\n${examples}\n\`\`\`\n\n`;
    }
    
    content += `📚 [Documentation](https://learn.microsoft.com/dax/${name.toLowerCase()}-function-dax)`;
    
    return content;
  },

  getExamples(funcName) {
    const examples = {
      CALCULATE: `// Sales for Bikes category only
Bike Sales = CALCULATE([Total Sales], Products[Category] = "Bikes")

// Remove year filter
All Year Sales = CALCULATE([Total Sales], ALL('Date'[Year]))`,
      
      SUMX: `// Sum of extended price (price * quantity)
Total Revenue = SUMX(Sales, Sales[Price] * Sales[Quantity])`,
      
      FILTER: `// High value transactions
High Value Sales = 
CALCULATE(
    [Total Sales],
    FILTER(Sales, Sales[Amount] > 1000)
)`,
      
      RELATED: `// Get category from related Products table
Category = RELATED(Products[Category])`,
      
      DATEADD: `// Sales same period last year
Prior Year Sales = 
CALCULATE(
    [Total Sales],
    DATEADD('Date'[Date], -1, YEAR)
)`,
      
      TOTALYTD: `// Year to date sales
YTD Sales = TOTALYTD([Total Sales], 'Date'[Date])`,
      
      SWITCH: `// Map status codes
Status Text = 
SWITCH(
    [StatusCode],
    1, "New",
    2, "In Progress",
    3, "Complete",
    "Unknown"
)`,
      
      SELECTEDVALUE: `// Get selected slicer value with default
Selected Year = SELECTEDVALUE('Date'[Year], "All Years")`
    };
    
    return examples[funcName] || null;
  },

  showPatterns(query) {
    if (query.includes("year") && query.includes("year") || query.includes("yoy")) {
      return { success: true, content: `## DAX Pattern: Year over Year\n\n\`\`\`dax\n${this.patterns.yearOverYear.code}\n\`\`\``, nextAction: "respond" };
    }
    if (query.includes("running")) {
      return { success: true, content: `## DAX Pattern: Running Total\n\n\`\`\`dax\n${this.patterns.runningTotal.code}\n\`\`\``, nextAction: "respond" };
    }
    if (query.includes("percent")) {
      return { success: true, content: `## DAX Pattern: Percent of Total\n\n\`\`\`dax\n${this.patterns.percentOfTotal.code}\n\`\`\``, nextAction: "respond" };
    }
    if (query.includes("moving") || query.includes("average")) {
      return { success: true, content: `## DAX Pattern: Moving Average\n\n\`\`\`dax\n${this.patterns.movingAverage.code}\n\`\`\``, nextAction: "respond" };
    }
    if (query.includes("rank")) {
      return { success: true, content: `## DAX Pattern: Rank Within Group\n\n\`\`\`dax\n${this.patterns.rankWithinGroup.code}\n\`\`\``, nextAction: "respond" };
    }

    let content = `## Common DAX Patterns\n\n`;
    for (const [key, pattern] of Object.entries(this.patterns)) {
      content += `### ${pattern.name}\n\`\`\`dax\n${pattern.code}\n\`\`\`\n\n`;
    }
    return { success: true, content, nextAction: "respond" };
  },

  listCategories() {
    let content = `## DAX Function Categories\n\n`;
    content += `| Category | Description | Example Functions |\n`;
    content += `|----------|-------------|-------------------|\n`;
    content += `| **Aggregation** | Sum, count, average | SUM, SUMX, COUNT, AVERAGE |\n`;
    content += `| **Filter** | Modify filter context | CALCULATE, FILTER, ALL, VALUES |\n`;
    content += `| **Time Intelligence** | Date calculations | DATEADD, TOTALYTD, SAMEPERIODLASTYEAR |\n`;
    content += `| **Logical** | Conditions | IF, SWITCH, AND, OR |\n`;
    content += `| **Text** | String manipulation | CONCATENATE, FORMAT, LEFT |\n`;
    content += `| **Table** | Table manipulation | SUMMARIZE, ADDCOLUMNS, TOPN |\n`;
    content += `| **Relationship** | Navigate relationships | RELATED, RELATEDTABLE, LOOKUPVALUE |\n`;
    content += `| **Information** | Data type checks | ISBLANK, ISERROR, USERNAME |\n\n`;
    content += `Use \`/dax functions <category>\` to list functions, or \`/dax <function>\` for details.`;
    
    return { success: true, content, nextAction: "respond" };
  },

  listCategoryFunctions(category, title) {
    const functions = this.functionReference[category];
    if (!functions) {
      return { success: false, content: `Unknown category: ${category}`, nextAction: "respond" };
    }

    let content = `## DAX ${title}\n\n`;
    content += `| Function | Syntax | Description |\n`;
    content += `|----------|--------|-------------|\n`;
    
    for (const [name, info] of Object.entries(functions)) {
      const shortSyntax = info.syntax.length > 50 ? info.syntax.substring(0, 47) + "..." : info.syntax;
      content += `| **${name}** | \`${shortSyntax}\` | ${info.desc} |\n`;
    }
    
    content += `\nUse \`/dax <function>\` for detailed help.`;
    
    return { success: true, content, nextAction: "respond" };
  },

  showHelp() {
    return {
      success: true,
      content: `## DAX Formula Assistant

DAX (Data Analysis Expressions) is used in Power BI, Analysis Services, and Power Pivot.

### Commands

| Command | Description |
|---------|-------------|
| \`/dax <function>\` | Get help for a function |
| \`/dax functions list\` | List all categories |
| \`/dax functions filter\` | Filter functions (CALCULATE, ALL, etc.) |
| \`/dax time intelligence\` | Time intelligence functions |
| \`/dax patterns\` | Common DAX patterns |
| \`/dax year over year\` | YoY growth pattern |
| \`/dax running total\` | Running total pattern |

### Examples
\`\`\`
/dax CALCULATE
/dax time intelligence
/dax year over year
\`\`\`

📚 [DAX Reference](https://learn.microsoft.com/dax/)
📚 [DAX Guide](https://dax.guide/)`,
      nextAction: "respond"
    };
  }
};
