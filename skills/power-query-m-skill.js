/**
 * Power Query M Skill
 * 
 * Data transformation language for Power BI, Excel, and Dataflows.
 * Provides function reference, syntax help, and common patterns.
 */

export const skill = {
  manifest: {
    id: "power-query-m-skill",
    name: "PowerQueryM",
    description: "Power Query M language assistant for data transformation in Power BI and Excel",
    version: "1.0.0",
    author: "PowerHoof",
    permissions: ["read-context"],
    examples: [
      "/m Table.SelectRows",
      "/powerquery functions text",
      "/pq transform columns",
      "how do I filter rows in M",
      "power query split column"
    ],
    tags: ["power-query", "m-language", "power-bi", "excel", "etl", "data-transformation"]
  },

  // M functions by category
  functionReference: {
    table: {
      "Table.SelectRows": { syntax: "Table.SelectRows(table, condition)", desc: "Filters rows based on condition" },
      "Table.SelectColumns": { syntax: "Table.SelectColumns(table, columns)", desc: "Returns table with only specified columns" },
      "Table.RemoveColumns": { syntax: "Table.RemoveColumns(table, columns)", desc: "Removes specified columns" },
      "Table.RenameColumns": { syntax: "Table.RenameColumns(table, renames)", desc: "Renames columns" },
      "Table.TransformColumns": { syntax: "Table.TransformColumns(table, transformations)", desc: "Transforms column values" },
      "Table.AddColumn": { syntax: "Table.AddColumn(table, name, columnGenerator)", desc: "Adds a new column" },
      "Table.DuplicateColumn": { syntax: "Table.DuplicateColumn(table, column, newName)", desc: "Duplicates a column" },
      "Table.ReorderColumns": { syntax: "Table.ReorderColumns(table, columnOrder)", desc: "Reorders columns" },
      "Table.Sort": { syntax: "Table.Sort(table, comparisonCriteria)", desc: "Sorts table rows" },
      "Table.Group": { syntax: "Table.Group(table, key, aggregatedColumns)", desc: "Groups rows by key columns" },
      "Table.Pivot": { syntax: "Table.Pivot(table, pivotColumn, valueColumn, aggregation)", desc: "Pivots column values to columns" },
      "Table.Unpivot": { syntax: "Table.Unpivot(table, columnsToUnpivot, attributeColumn, valueColumn)", desc: "Unpivots columns to rows" },
      "Table.UnpivotOtherColumns": { syntax: "Table.UnpivotOtherColumns(table, pivotColumns, attributeColumn, valueColumn)", desc: "Unpivots all except specified columns" },
      "Table.Join": { syntax: "Table.Join(table1, key1, table2, key2, joinKind)", desc: "Joins two tables" },
      "Table.NestedJoin": { syntax: "Table.NestedJoin(table1, key1, table2, key2, newColumn, joinKind)", desc: "Joins and creates nested table column" },
      "Table.Combine": { syntax: "Table.Combine(tables)", desc: "Appends multiple tables" },
      "Table.FirstN": { syntax: "Table.FirstN(table, count)", desc: "Returns first N rows" },
      "Table.LastN": { syntax: "Table.LastN(table, count)", desc: "Returns last N rows" },
      "Table.Skip": { syntax: "Table.Skip(table, count)", desc: "Skips first N rows" },
      "Table.Range": { syntax: "Table.Range(table, offset, count)", desc: "Returns range of rows" },
      "Table.Distinct": { syntax: "Table.Distinct(table)", desc: "Removes duplicate rows" },
      "Table.RowCount": { syntax: "Table.RowCount(table)", desc: "Returns number of rows" },
      "Table.ColumnNames": { syntax: "Table.ColumnNames(table)", desc: "Returns list of column names" },
      "Table.TransformColumnTypes": { syntax: "Table.TransformColumnTypes(table, typeTransformations)", desc: "Changes column data types" },
      "Table.FillDown": { syntax: "Table.FillDown(table, columns)", desc: "Fills null values with previous values" },
      "Table.FillUp": { syntax: "Table.FillUp(table, columns)", desc: "Fills null values with next values" },
      "Table.ReplaceValue": { syntax: "Table.ReplaceValue(table, oldValue, newValue, replacer, columns)", desc: "Replaces values in columns" },
      "Table.PromoteHeaders": { syntax: "Table.PromoteHeaders(table)", desc: "Promotes first row to headers" },
      "Table.DemoteHeaders": { syntax: "Table.DemoteHeaders(table)", desc: "Demotes headers to first row" },
      "Table.FromRecords": { syntax: "Table.FromRecords(records)", desc: "Creates table from list of records" },
      "Table.ToRecords": { syntax: "Table.ToRecords(table)", desc: "Converts table to list of records" }
    },
    text: {
      "Text.Start": { syntax: "Text.Start(text, count)", desc: "Returns first N characters" },
      "Text.End": { syntax: "Text.End(text, count)", desc: "Returns last N characters" },
      "Text.Middle": { syntax: "Text.Middle(text, start, count)", desc: "Returns middle portion" },
      "Text.Length": { syntax: "Text.Length(text)", desc: "Returns character count" },
      "Text.Lower": { syntax: "Text.Lower(text)", desc: "Converts to lowercase" },
      "Text.Upper": { syntax: "Text.Upper(text)", desc: "Converts to uppercase" },
      "Text.Proper": { syntax: "Text.Proper(text)", desc: "Converts to proper case" },
      "Text.Trim": { syntax: "Text.Trim(text)", desc: "Removes leading/trailing whitespace" },
      "Text.TrimStart": { syntax: "Text.TrimStart(text)", desc: "Removes leading whitespace" },
      "Text.TrimEnd": { syntax: "Text.TrimEnd(text)", desc: "Removes trailing whitespace" },
      "Text.Clean": { syntax: "Text.Clean(text)", desc: "Removes non-printable characters" },
      "Text.Combine": { syntax: "Text.Combine(texts, separator)", desc: "Joins texts with separator" },
      "Text.Split": { syntax: "Text.Split(text, separator)", desc: "Splits text by separator" },
      "Text.SplitAny": { syntax: "Text.SplitAny(text, separators)", desc: "Splits by any of the separators" },
      "Text.Contains": { syntax: "Text.Contains(text, substring)", desc: "Returns true if contains substring" },
      "Text.StartsWith": { syntax: "Text.StartsWith(text, substring)", desc: "Tests if text starts with value" },
      "Text.EndsWith": { syntax: "Text.EndsWith(text, substring)", desc: "Tests if text ends with value" },
      "Text.Replace": { syntax: "Text.Replace(text, old, new)", desc: "Replaces occurrences" },
      "Text.Remove": { syntax: "Text.Remove(text, removeChars)", desc: "Removes specified characters" },
      "Text.Select": { syntax: "Text.Select(text, selectChars)", desc: "Keeps only specified characters" },
      "Text.PadStart": { syntax: "Text.PadStart(text, count, character)", desc: "Pads start to length" },
      "Text.PadEnd": { syntax: "Text.PadEnd(text, count, character)", desc: "Pads end to length" },
      "Text.Repeat": { syntax: "Text.Repeat(text, count)", desc: "Repeats text N times" },
      "Text.PositionOf": { syntax: "Text.PositionOf(text, substring)", desc: "Returns position of substring" },
      "Text.PositionOfAny": { syntax: "Text.PositionOfAny(text, characters)", desc: "Returns position of any character" },
      "Text.Range": { syntax: "Text.Range(text, offset, count)", desc: "Extracts range of characters" },
      "Text.BeforeDelimiter": { syntax: "Text.BeforeDelimiter(text, delimiter)", desc: "Text before delimiter" },
      "Text.AfterDelimiter": { syntax: "Text.AfterDelimiter(text, delimiter)", desc: "Text after delimiter" },
      "Text.BetweenDelimiters": { syntax: "Text.BetweenDelimiters(text, startDelimiter, endDelimiter)", desc: "Text between delimiters" },
      "Text.From": { syntax: "Text.From(value)", desc: "Converts value to text" }
    },
    number: {
      "Number.Round": { syntax: "Number.Round(number, digits)", desc: "Rounds to decimal places" },
      "Number.RoundUp": { syntax: "Number.RoundUp(number, digits)", desc: "Rounds up" },
      "Number.RoundDown": { syntax: "Number.RoundDown(number, digits)", desc: "Rounds down" },
      "Number.RoundTowardZero": { syntax: "Number.RoundTowardZero(number, digits)", desc: "Rounds toward zero" },
      "Number.RoundAwayFromZero": { syntax: "Number.RoundAwayFromZero(number, digits)", desc: "Rounds away from zero" },
      "Number.Abs": { syntax: "Number.Abs(number)", desc: "Returns absolute value" },
      "Number.Sign": { syntax: "Number.Sign(number)", desc: "Returns sign (-1, 0, 1)" },
      "Number.Mod": { syntax: "Number.Mod(number, divisor)", desc: "Returns remainder" },
      "Number.Power": { syntax: "Number.Power(number, power)", desc: "Raises to power" },
      "Number.Sqrt": { syntax: "Number.Sqrt(number)", desc: "Returns square root" },
      "Number.Log": { syntax: "Number.Log(number, base)", desc: "Returns logarithm" },
      "Number.Log10": { syntax: "Number.Log10(number)", desc: "Returns base-10 logarithm" },
      "Number.Exp": { syntax: "Number.Exp(number)", desc: "Returns e raised to power" },
      "Number.Random": { syntax: "Number.Random()", desc: "Returns random number 0-1" },
      "Number.RandomBetween": { syntax: "Number.RandomBetween(min, max)", desc: "Returns random in range" },
      "Number.From": { syntax: "Number.From(value)", desc: "Converts value to number" },
      "Number.ToText": { syntax: "Number.ToText(number, format)", desc: "Formats number as text" }
    },
    date: {
      "Date.From": { syntax: "Date.From(value)", desc: "Converts value to date" },
      "Date.FromText": { syntax: "Date.FromText(text)", desc: "Parses text as date" },
      "Date.ToText": { syntax: "Date.ToText(date, format)", desc: "Formats date as text" },
      "Date.Year": { syntax: "Date.Year(date)", desc: "Extracts year" },
      "Date.Month": { syntax: "Date.Month(date)", desc: "Extracts month (1-12)" },
      "Date.Day": { syntax: "Date.Day(date)", desc: "Extracts day of month" },
      "Date.DayOfWeek": { syntax: "Date.DayOfWeek(date)", desc: "Returns day of week" },
      "Date.DayOfYear": { syntax: "Date.DayOfYear(date)", desc: "Returns day of year" },
      "Date.WeekOfYear": { syntax: "Date.WeekOfYear(date)", desc: "Returns week number" },
      "Date.WeekOfMonth": { syntax: "Date.WeekOfMonth(date)", desc: "Returns week of month" },
      "Date.QuarterOfYear": { syntax: "Date.QuarterOfYear(date)", desc: "Returns quarter (1-4)" },
      "Date.StartOfYear": { syntax: "Date.StartOfYear(date)", desc: "Returns first day of year" },
      "Date.EndOfYear": { syntax: "Date.EndOfYear(date)", desc: "Returns last day of year" },
      "Date.StartOfMonth": { syntax: "Date.StartOfMonth(date)", desc: "Returns first day of month" },
      "Date.EndOfMonth": { syntax: "Date.EndOfMonth(date)", desc: "Returns last day of month" },
      "Date.StartOfWeek": { syntax: "Date.StartOfWeek(date)", desc: "Returns first day of week" },
      "Date.EndOfWeek": { syntax: "Date.EndOfWeek(date)", desc: "Returns last day of week" },
      "Date.StartOfQuarter": { syntax: "Date.StartOfQuarter(date)", desc: "Returns first day of quarter" },
      "Date.EndOfQuarter": { syntax: "Date.EndOfQuarter(date)", desc: "Returns last day of quarter" },
      "Date.AddDays": { syntax: "Date.AddDays(date, days)", desc: "Adds days to date" },
      "Date.AddMonths": { syntax: "Date.AddMonths(date, months)", desc: "Adds months to date" },
      "Date.AddYears": { syntax: "Date.AddYears(date, years)", desc: "Adds years to date" },
      "Date.AddWeeks": { syntax: "Date.AddWeeks(date, weeks)", desc: "Adds weeks to date" },
      "Date.AddQuarters": { syntax: "Date.AddQuarters(date, quarters)", desc: "Adds quarters to date" },
      "Date.MonthName": { syntax: "Date.MonthName(date)", desc: "Returns month name" },
      "Date.DayOfWeekName": { syntax: "Date.DayOfWeekName(date)", desc: "Returns day name" },
      "Date.IsInCurrentYear": { syntax: "Date.IsInCurrentYear(date)", desc: "Is date in current year" },
      "Date.IsInCurrentMonth": { syntax: "Date.IsInCurrentMonth(date)", desc: "Is date in current month" },
      "Date.IsInCurrentWeek": { syntax: "Date.IsInCurrentWeek(date)", desc: "Is date in current week" },
      "Date.IsInPreviousYear": { syntax: "Date.IsInPreviousYear(date)", desc: "Is date in previous year" },
      "Date.IsInPreviousMonth": { syntax: "Date.IsInPreviousMonth(date)", desc: "Is date in previous month" }
    },
    list: {
      "List.Select": { syntax: "List.Select(list, condition)", desc: "Filters list items" },
      "List.Transform": { syntax: "List.Transform(list, transform)", desc: "Transforms each item" },
      "List.Accumulate": { syntax: "List.Accumulate(list, seed, accumulator)", desc: "Reduces list to single value" },
      "List.First": { syntax: "List.First(list)", desc: "Returns first item" },
      "List.Last": { syntax: "List.Last(list)", desc: "Returns last item" },
      "List.FirstN": { syntax: "List.FirstN(list, count)", desc: "Returns first N items" },
      "List.LastN": { syntax: "List.LastN(list, count)", desc: "Returns last N items" },
      "List.Skip": { syntax: "List.Skip(list, count)", desc: "Skips first N items" },
      "List.Range": { syntax: "List.Range(list, offset, count)", desc: "Returns range of items" },
      "List.Count": { syntax: "List.Count(list)", desc: "Returns item count" },
      "List.Sum": { syntax: "List.Sum(list)", desc: "Sums numeric items" },
      "List.Average": { syntax: "List.Average(list)", desc: "Averages numeric items" },
      "List.Min": { syntax: "List.Min(list)", desc: "Returns minimum" },
      "List.Max": { syntax: "List.Max(list)", desc: "Returns maximum" },
      "List.Median": { syntax: "List.Median(list)", desc: "Returns median" },
      "List.StandardDeviation": { syntax: "List.StandardDeviation(list)", desc: "Returns standard deviation" },
      "List.Distinct": { syntax: "List.Distinct(list)", desc: "Returns unique items" },
      "List.Sort": { syntax: "List.Sort(list, comparisonCriteria)", desc: "Sorts list" },
      "List.Reverse": { syntax: "List.Reverse(list)", desc: "Reverses list" },
      "List.Contains": { syntax: "List.Contains(list, value)", desc: "Tests if list contains value" },
      "List.ContainsAny": { syntax: "List.ContainsAny(list, values)", desc: "Tests if contains any value" },
      "List.ContainsAll": { syntax: "List.ContainsAll(list, values)", desc: "Tests if contains all values" },
      "List.PositionOf": { syntax: "List.PositionOf(list, value)", desc: "Returns position of value" },
      "List.Combine": { syntax: "List.Combine(lists)", desc: "Combines multiple lists" },
      "List.Zip": { syntax: "List.Zip(lists)", desc: "Creates list of lists by position" },
      "List.Generate": { syntax: "List.Generate(initial, condition, next, selector)", desc: "Generates list programmatically" },
      "List.Numbers": { syntax: "List.Numbers(start, count, increment)", desc: "Generates number sequence" },
      "List.Dates": { syntax: "List.Dates(start, count, step)", desc: "Generates date sequence" }
    },
    record: {
      "Record.Field": { syntax: "Record.Field(record, field)", desc: "Returns field value" },
      "Record.FieldNames": { syntax: "Record.FieldNames(record)", desc: "Returns list of field names" },
      "Record.FieldValues": { syntax: "Record.FieldValues(record)", desc: "Returns list of field values" },
      "Record.AddField": { syntax: "Record.AddField(record, name, value)", desc: "Adds field to record" },
      "Record.RemoveFields": { syntax: "Record.RemoveFields(record, fields)", desc: "Removes fields from record" },
      "Record.RenameFields": { syntax: "Record.RenameFields(record, renames)", desc: "Renames record fields" },
      "Record.SelectFields": { syntax: "Record.SelectFields(record, fields)", desc: "Returns record with only specified fields" },
      "Record.TransformFields": { syntax: "Record.TransformFields(record, transformations)", desc: "Transforms field values" },
      "Record.Combine": { syntax: "Record.Combine(records)", desc: "Combines records" },
      "Record.FromList": { syntax: "Record.FromList(list, fields)", desc: "Creates record from list" },
      "Record.ToList": { syntax: "Record.ToList(record)", desc: "Converts record to list" },
      "Record.FromTable": { syntax: "Record.FromTable(table)", desc: "Creates record from name/value table" },
      "Record.ToTable": { syntax: "Record.ToTable(record)", desc: "Converts record to name/value table" },
      "Record.HasFields": { syntax: "Record.HasFields(record, fields)", desc: "Tests if record has fields" }
    },
    access: {
      "Csv.Document": { syntax: "Csv.Document(source, columns, delimiter, encoding)", desc: "Reads CSV file" },
      "Excel.Workbook": { syntax: "Excel.Workbook(workbook, useHeaders)", desc: "Reads Excel workbook" },
      "Json.Document": { syntax: "Json.Document(jsonText)", desc: "Parses JSON" },
      "Xml.Document": { syntax: "Xml.Document(contents)", desc: "Parses XML" },
      "Web.Contents": { syntax: "Web.Contents(url, options)", desc: "Downloads web content" },
      "Sql.Database": { syntax: "Sql.Database(server, database, options)", desc: "Connects to SQL Server" },
      "OData.Feed": { syntax: "OData.Feed(serviceUri, headers, options)", desc: "Returns OData feed" },
      "SharePoint.Tables": { syntax: "SharePoint.Tables(url, options)", desc: "Returns SharePoint lists" },
      "File.Contents": { syntax: "File.Contents(path)", desc: "Reads file as binary" },
      "Folder.Contents": { syntax: "Folder.Contents(path)", desc: "Returns folder contents table" },
      "Folder.Files": { syntax: "Folder.Files(path)", desc: "Returns files in folder tree" }
    }
  },

  async canHandle(context) {
    const content = context.message.content?.toLowerCase() || "";
    const triggers = [
      "/m ",
      "/powerquery",
      "/pq",
      "power query",
      "m language",
      "m formula",
      "table.select",
      "list.transform",
      "text.split",
      "how do i transform",
      "how do i filter in m"
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
    if (lower.match(/functions?\s+table/)) {
      return this.listCategoryFunctions("table", "Table Functions");
    }
    if (lower.match(/functions?\s+(text|string)/)) {
      return this.listCategoryFunctions("text", "Text Functions");
    }
    if (lower.match(/functions?\s+(number|math)/)) {
      return this.listCategoryFunctions("number", "Number Functions");
    }
    if (lower.match(/functions?\s+(date|time)/)) {
      return this.listCategoryFunctions("date", "Date Functions");
    }
    if (lower.match(/functions?\s+list/)) {
      return this.listCategoryFunctions("list", "List Functions");
    }
    if (lower.match(/functions?\s+record/)) {
      return this.listCategoryFunctions("record", "Record Functions");
    }
    if (lower.match(/functions?\s+(access|data\s*source|connect)/)) {
      return this.listCategoryFunctions("access", "Data Access Functions");
    }

    // Function lookup
    const functionMatch = content.match(/(?:help|syntax|how|use|about)\s+([\w.]+)|([\w.]+)\s+(?:syntax|help|function)|^\/?(?:m|pq|powerquery)\s+([\w.]+)/i);
    if (functionMatch) {
      const funcName = functionMatch[1] || functionMatch[2] || functionMatch[3];
      return this.lookupFunction(funcName);
    }

    return this.showHelp();
  },

  lookupFunction(name) {
    // Normalize: add prefix if missing
    let searchName = name;
    if (!name.includes(".")) {
      // Try with common prefixes
      const prefixes = ["Table.", "Text.", "List.", "Number.", "Date.", "Record."];
      for (const prefix of prefixes) {
        const fullName = prefix + name;
        for (const functions of Object.values(this.functionReference)) {
          if (functions[fullName]) {
            searchName = fullName;
            break;
          }
        }
      }
    }

    // Direct match
    for (const [category, functions] of Object.entries(this.functionReference)) {
      for (const [funcName, info] of Object.entries(functions)) {
        if (funcName.toLowerCase() === searchName.toLowerCase()) {
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
        if (funcName.toLowerCase().includes(searchName.toLowerCase())) {
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
      
      let content = `## M Functions Matching "${name}"\n\n`;
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
      content: `No M function found matching "${name}".\n\nUse \`/m functions list\` to see categories.`,
      nextAction: "respond"
    };
  },

  formatFunctionHelp(name, info, category) {
    const examples = this.getExamples(name);
    
    let content = `## Power Query M: ${name}\n\n`;
    content += `**Category:** ${category}\n\n`;
    content += `**Syntax:**\n\`\`\`powerquery\n${info.syntax}\n\`\`\`\n\n`;
    content += `**Description:** ${info.desc}\n\n`;
    
    if (examples) {
      content += `**Example:**\n\`\`\`powerquery\n${examples}\n\`\`\`\n\n`;
    }
    
    content += `📚 [Documentation](https://learn.microsoft.com/powerquery-m/${name.toLowerCase().replace(".", "-")})`;
    
    return content;
  },

  getExamples(funcName) {
    const examples = {
      "Table.SelectRows": `// Filter rows where Amount > 100
Table.SelectRows(Source, each [Amount] > 100)

// Multiple conditions
Table.SelectRows(Source, each [Status] = "Active" and [Amount] > 0)`,
      
      "Table.AddColumn": `// Add calculated column
Table.AddColumn(Source, "FullName", each [FirstName] & " " & [LastName])`,
      
      "Table.TransformColumns": `// Convert column to uppercase
Table.TransformColumns(Source, {{"Name", Text.Upper}})`,
      
      "Table.Group": `// Group by Category and sum Amount
Table.Group(Source, {"Category"}, {{"Total", each List.Sum([Amount]), type number}})`,
      
      "Text.Split": `// Split by delimiter
Text.Split("A,B,C", ",")  // Returns {"A", "B", "C"}`,
      
      "List.Transform": `// Transform each item
List.Transform({1, 2, 3}, each _ * 2)  // Returns {2, 4, 6}`,
      
      "List.Accumulate": `// Sum list items
List.Accumulate({1, 2, 3, 4}, 0, (state, current) => state + current)  // Returns 10`,
      
      "Date.AddMonths": `// Add 3 months to date
Date.AddMonths(#date(2024, 1, 15), 3)  // Returns 2024-04-15`
    };
    
    return examples[funcName] || null;
  },

  listCategories() {
    let content = `## Power Query M Function Categories\n\n`;
    content += `| Category | Description | Example Functions |\n`;
    content += `|----------|-------------|-------------------|\n`;
    content += `| **Table** | Table operations | Table.SelectRows, Table.AddColumn |\n`;
    content += `| **Text** | String manipulation | Text.Split, Text.Combine |\n`;
    content += `| **Number** | Numeric operations | Number.Round, Number.Power |\n`;
    content += `| **Date** | Date/time operations | Date.AddMonths, Date.Year |\n`;
    content += `| **List** | List operations | List.Transform, List.Sum |\n`;
    content += `| **Record** | Record operations | Record.Field, Record.Combine |\n`;
    content += `| **Access** | Data sources | Csv.Document, Sql.Database |\n\n`;
    content += `Use \`/m functions <category>\` to list functions.`;
    
    return { success: true, content, nextAction: "respond" };
  },

  listCategoryFunctions(category, title) {
    const functions = this.functionReference[category];
    if (!functions) {
      return { success: false, content: `Unknown category: ${category}`, nextAction: "respond" };
    }

    let content = `## Power Query M ${title}\n\n`;
    content += `| Function | Description |\n`;
    content += `|----------|-------------|\n`;
    
    for (const [name, info] of Object.entries(functions)) {
      content += `| **${name}** | ${info.desc} |\n`;
    }
    
    content += `\nUse \`/m <function>\` for detailed syntax and examples.`;
    
    return { success: true, content, nextAction: "respond" };
  },

  showHelp() {
    return {
      success: true,
      content: `## Power Query M Assistant

Power Query M is the data transformation language for Power BI, Excel, and Dataflows.

### Commands

| Command | Description |
|---------|-------------|
| \`/m <function>\` | Get help for a function |
| \`/m functions list\` | List all categories |
| \`/m functions table\` | Table functions |
| \`/m functions text\` | Text functions |
| \`/m functions date\` | Date functions |
| \`/m functions list\` | List functions |

### Query Structure
\`\`\`powerquery
let
    Source = Csv.Document(File.Contents("data.csv")),
    Filtered = Table.SelectRows(Source, each [Amount] > 100),
    Result = Table.AddColumn(Filtered, "Tax", each [Amount] * 0.1)
in
    Result
\`\`\`

📚 [M Reference](https://learn.microsoft.com/powerquery-m/)`,
      nextAction: "respond"
    };
  }
};
