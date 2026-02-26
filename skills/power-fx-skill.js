/**
 * Power Fx Skill
 * 
 * Microsoft Power Fx formula language assistant.
 * Provides syntax help, function reference, examples, and formula validation.
 * 
 * Power Fx is the low-code formula language used across Microsoft Power Platform
 * (Power Apps, Power Automate, Dataverse, etc.)
 */

export const skill = {
  manifest: {
    id: "power-fx-skill",
    name: "PowerFx",
    description: "Power Fx formula language assistant - syntax help, function reference, and examples",
    version: "1.0.0",
    author: "PowerHoof",
    permissions: ["read-context", "network"],
    examples: [
      "/powerfx Filter",
      "/formula LookUp syntax",
      "/fx functions text",
      "power fx help collect",
      "how do I use Patch in Power Fx"
    ],
    tags: ["powerfx", "power-fx", "powerapps", "formulas", "low-code", "canvas-apps", "power-platform"]
  },

  // Common Power Fx functions by category
  functionReference: {
    text: {
      Concat: { syntax: "Concat(table, formula [, separator])", desc: "Concatenates strings from a table" },
      Concatenate: { syntax: "Concatenate(string1 [, string2, ...])", desc: "Joins strings together" },
      Left: { syntax: "Left(string, numChars)", desc: "Returns leftmost characters" },
      Right: { syntax: "Right(string, numChars)", desc: "Returns rightmost characters" },
      Mid: { syntax: "Mid(string, startPos [, numChars])", desc: "Returns middle portion of string" },
      Len: { syntax: "Len(string)", desc: "Returns length of string" },
      Lower: { syntax: "Lower(string)", desc: "Converts to lowercase" },
      Upper: { syntax: "Upper(string)", desc: "Converts to uppercase" },
      Proper: { syntax: "Proper(string)", desc: "Converts to proper case" },
      Trim: { syntax: "Trim(string)", desc: "Removes extra spaces" },
      Substitute: { syntax: "Substitute(string, old, new [, instance])", desc: "Replaces text" },
      Text: { syntax: "Text(value [, format])", desc: "Formats number/date as text" },
      Value: { syntax: "Value(string [, language])", desc: "Converts text to number" },
      Split: { syntax: "Split(text, separator)", desc: "Splits text into table" },
      Find: { syntax: "Find(findText, withinText [, startPos])", desc: "Finds position of text" },
      Replace: { syntax: "Replace(string, startPos, numChars, newText)", desc: "Replaces characters" }
    },
    logical: {
      If: { syntax: "If(condition, thenResult [, elseResult])", desc: "Conditional logic" },
      Switch: { syntax: "Switch(formula, match1, result1 [, match2, result2, ...] [, default])", desc: "Multiple condition matching" },
      And: { syntax: "And(condition1, condition2 [, ...])", desc: "Logical AND" },
      Or: { syntax: "Or(condition1, condition2 [, ...])", desc: "Logical OR" },
      Not: { syntax: "Not(condition)", desc: "Logical NOT" },
      IsBlank: { syntax: "IsBlank(value)", desc: "Checks if value is blank" },
      IsEmpty: { syntax: "IsEmpty(table)", desc: "Checks if table is empty" },
      IsError: { syntax: "IsError(value)", desc: "Checks if value is an error" },
      IsNumeric: { syntax: "IsNumeric(value)", desc: "Checks if value is numeric" },
      Coalesce: { syntax: "Coalesce(value1 [, value2, ...])", desc: "Returns first non-blank value" },
      IfError: { syntax: "IfError(value, fallback)", desc: "Returns fallback if error" }
    },
    table: {
      Filter: { syntax: "Filter(table, condition1 [, condition2, ...])", desc: "Filters rows matching conditions" },
      LookUp: { syntax: "LookUp(table, condition [, formula])", desc: "Finds first matching record" },
      Search: { syntax: "Search(table, searchText, column1 [, column2, ...])", desc: "Searches table for text" },
      Sort: { syntax: "Sort(table, formula [, order])", desc: "Sorts table by formula" },
      SortByColumns: { syntax: "SortByColumns(table, column1 [, order1, column2, order2, ...])", desc: "Sorts by multiple columns" },
      First: { syntax: "First(table)", desc: "Returns first record" },
      Last: { syntax: "Last(table)", desc: "Returns last record" },
      FirstN: { syntax: "FirstN(table [, count])", desc: "Returns first N records" },
      LastN: { syntax: "LastN(table [, count])", desc: "Returns last N records" },
      CountRows: { syntax: "CountRows(table)", desc: "Counts rows in table" },
      CountIf: { syntax: "CountIf(table, condition)", desc: "Counts rows meeting condition" },
      Distinct: { syntax: "Distinct(table, formula)", desc: "Returns unique values" },
      AddColumns: { syntax: "AddColumns(table, column1, formula1 [, ...])", desc: "Adds calculated columns" },
      DropColumns: { syntax: "DropColumns(table, column1 [, column2, ...])", desc: "Removes columns" },
      ShowColumns: { syntax: "ShowColumns(table, column1 [, column2, ...])", desc: "Shows only specified columns" },
      RenameColumns: { syntax: "RenameColumns(table, old1, new1 [, ...])", desc: "Renames columns" },
      GroupBy: { syntax: "GroupBy(table, column1 [, column2, ...], groupColumn)", desc: "Groups rows" },
      Ungroup: { syntax: "Ungroup(table, groupColumn)", desc: "Flattens grouped table" }
    },
    data: {
      Collect: { syntax: "Collect(dataSource, record1 [, record2, ...])", desc: "Adds records to data source" },
      ClearCollect: { syntax: "ClearCollect(collection, record1 [, ...])", desc: "Clears and adds records" },
      Patch: { syntax: "Patch(dataSource, baseRecord, changeRecord1 [, ...])", desc: "Modifies or creates records" },
      Update: { syntax: "Update(dataSource, oldRecord, newRecord [, All])", desc: "Replaces a record" },
      UpdateIf: { syntax: "UpdateIf(dataSource, condition, changeRecord)", desc: "Updates matching records" },
      Remove: { syntax: "Remove(dataSource, record1 [, record2, ...])", desc: "Removes specific records" },
      RemoveIf: { syntax: "RemoveIf(dataSource, condition)", desc: "Removes matching records" },
      Clear: { syntax: "Clear(collection)", desc: "Removes all records from collection" },
      Defaults: { syntax: "Defaults(dataSource)", desc: "Returns default values for data source" },
      DataSourceInfo: { syntax: "DataSourceInfo(dataSource, info)", desc: "Gets data source metadata" }
    },
    math: {
      Sum: { syntax: "Sum(table, formula) or Sum(value1 [, value2, ...])", desc: "Calculates sum" },
      Average: { syntax: "Average(table, formula) or Average(value1 [, ...])", desc: "Calculates average" },
      Min: { syntax: "Min(table, formula) or Min(value1 [, value2, ...])", desc: "Returns minimum value" },
      Max: { syntax: "Max(table, formula) or Max(value1 [, value2, ...])", desc: "Returns maximum value" },
      Abs: { syntax: "Abs(number)", desc: "Returns absolute value" },
      Round: { syntax: "Round(number, decimalPlaces)", desc: "Rounds to decimal places" },
      RoundUp: { syntax: "RoundUp(number, decimalPlaces)", desc: "Rounds up" },
      RoundDown: { syntax: "RoundDown(number, decimalPlaces)", desc: "Rounds down" },
      Power: { syntax: "Power(base, exponent)", desc: "Raises to power" },
      Sqrt: { syntax: "Sqrt(number)", desc: "Square root" },
      Mod: { syntax: "Mod(number, divisor)", desc: "Remainder after division" },
      Rand: { syntax: "Rand()", desc: "Random number 0-1" },
      RandBetween: { syntax: "RandBetween(min, max)", desc: "Random integer in range" }
    },
    datetime: {
      Now: { syntax: "Now()", desc: "Current date and time" },
      Today: { syntax: "Today()", desc: "Current date (no time)" },
      Date: { syntax: "Date(year, month, day)", desc: "Creates date value" },
      Time: { syntax: "Time(hour, minute, second [, millisecond])", desc: "Creates time value" },
      DateAdd: { syntax: "DateAdd(datetime, addition [, units])", desc: "Adds to date" },
      DateDiff: { syntax: "DateDiff(startDate, endDate [, units])", desc: "Difference between dates" },
      Year: { syntax: "Year(datetime)", desc: "Extracts year" },
      Month: { syntax: "Month(datetime)", desc: "Extracts month (1-12)" },
      Day: { syntax: "Day(datetime)", desc: "Extracts day of month" },
      Hour: { syntax: "Hour(datetime)", desc: "Extracts hour" },
      Minute: { syntax: "Minute(datetime)", desc: "Extracts minute" },
      Second: { syntax: "Second(datetime)", desc: "Extracts second" },
      Weekday: { syntax: "Weekday(datetime [, startOfWeek])", desc: "Day of week" },
      WeekNum: { syntax: "WeekNum(datetime [, startOfWeek])", desc: "Week number of year" },
      DateValue: { syntax: "DateValue(string [, language])", desc: "Converts text to date" },
      TimeValue: { syntax: "TimeValue(string [, language])", desc: "Converts text to time" }
    },
    behavior: {
      Navigate: { syntax: "Navigate(screen [, transition [, updateContext]])", desc: "Navigates to screen" },
      Back: { syntax: "Back([transition])", desc: "Returns to previous screen" },
      Set: { syntax: "Set(variable, value)", desc: "Sets global variable" },
      UpdateContext: { syntax: "UpdateContext({var1: value1 [, var2: value2, ...]})", desc: "Sets context variables" },
      Notify: { syntax: "Notify(message [, type [, timeout]])", desc: "Shows notification banner" },
      Launch: { syntax: "Launch(url [, target [, param1, value1, ...]])", desc: "Opens URL or app" },
      Exit: { syntax: "Exit([signout])", desc: "Exits app" },
      Refresh: { syntax: "Refresh(dataSource)", desc: "Refreshes data source" },
      Reset: { syntax: "Reset(control)", desc: "Resets control to default" },
      SetFocus: { syntax: "SetFocus(control)", desc: "Sets focus to control" },
      Select: { syntax: "Select(control)", desc: "Simulates select on control" }
    }
  },

  // Data types in Power Fx
  dataTypes: {
    Text: "String values enclosed in double quotes: \"Hello World\"",
    Number: "Numeric values including decimals: 42, 3.14159",
    Boolean: "true or false values",
    Date: "Date values (no time component)",
    Time: "Time values (no date component)",
    DateTime: "Combined date and time values",
    Record: "Single row with named columns: {Name: \"John\", Age: 30}",
    Table: "Collection of records: [{Name: \"A\"}, {Name: \"B\"}]",
    Color: "Color values: Color.Red, RGBA(255, 0, 0, 1)",
    Hyperlink: "URL values as text",
    Image: "Image reference or URL",
    Media: "Audio or video reference",
    Blank: "Absence of a value (null equivalent)",
    Error: "Error value with message"
  },

  // Common operators
  operators: {
    arithmetic: "+ (add), - (subtract), * (multiply), / (divide), ^ (power), % (percent)",
    comparison: "= (equal), <> (not equal), < (less), > (greater), <= (less/equal), >= (greater/equal)",
    logical: "&& or And, || or Or, ! or Not",
    text: "& (concatenate text)",
    inOperator: "in (check if value in table/text), exactin (case-sensitive)",
    thisRecord: "@ (disambiguation), . (dot operator for record fields)",
    scope: "ThisItem, ThisRecord, Parent, Self"
  },

  async canHandle(context) {
    const content = context.message.content?.toLowerCase() || "";
    const triggers = [
      "/powerfx",
      "/power-fx",
      "/fx",
      "/formula",
      "power fx",
      "powerfx",
      "power-fx",
      "canvas app formula",
      "power apps formula",
      "powerapps formula",
      "how do i use",
      "fx help"
    ];
    // Also match function names directly
    const functionTriggers = ["filter(", "lookup(", "patch(", "collect(", "if(", "switch("];
    
    return triggers.some(t => content.includes(t)) || 
           functionTriggers.some(f => content.includes(f));
  },

  async execute(context) {
    const content = context.message.content || "";
    const lower = content.toLowerCase();

    // Parse the query
    if (lower.match(/functions?\s+(list|all|categories)/)) {
      return this.listCategories();
    }
    
    if (lower.match(/functions?\s+(text|string)/)) {
      return this.listCategoryFunctions("text", "Text Functions");
    }
    
    if (lower.match(/functions?\s+(logic|logical|condition)/)) {
      return this.listCategoryFunctions("logical", "Logical Functions");
    }
    
    if (lower.match(/functions?\s+(table|record|collection)/)) {
      return this.listCategoryFunctions("table", "Table Functions");
    }
    
    if (lower.match(/functions?\s+(data|patch|collect|crud)/)) {
      return this.listCategoryFunctions("data", "Data Functions");
    }
    
    if (lower.match(/functions?\s+(math|number|calc)/)) {
      return this.listCategoryFunctions("math", "Math Functions");
    }
    
    if (lower.match(/functions?\s+(date|time|datetime)/)) {
      return this.listCategoryFunctions("datetime", "Date/Time Functions");
    }
    
    if (lower.match(/functions?\s+(behavior|action|navigate)/)) {
      return this.listCategoryFunctions("behavior", "Behavior Functions");
    }

    if (lower.match(/data\s*types?|types?\s+list/)) {
      return this.listDataTypes();
    }

    if (lower.match(/operators?/)) {
      return this.listOperators();
    }

    // Search for specific function
    const functionMatch = content.match(/(?:help|syntax|how|use|about|what is)\s+(\w+)|(\w+)\s+(?:syntax|help|function|formula)/i);
    if (functionMatch) {
      const funcName = functionMatch[1] || functionMatch[2];
      return this.lookupFunction(funcName);
    }

    // Direct function lookup
    const directMatch = content.match(/^\/?(?:powerfx|power-fx|fx|formula)\s+(\w+)/i);
    if (directMatch) {
      return this.lookupFunction(directMatch[1]);
    }

    // Default: show help
    return this.showHelp();
  },

  lookupFunction(name) {
    const searchName = name.toLowerCase();
    
    // Search all categories
    for (const [category, functions] of Object.entries(this.functionReference)) {
      for (const [funcName, info] of Object.entries(functions)) {
        if (funcName.toLowerCase() === searchName) {
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
        if (funcName.toLowerCase().includes(searchName)) {
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
      
      let content = `## Power Fx Functions Matching "${name}"\n\n`;
      for (const m of matches) {
        content += `### ${m.name}\n\`${m.info.syntax}\`\n${m.info.desc}\n\n`;
      }
      return {
        success: true,
        content,
        nextAction: "respond"
      };
    }

    return {
      success: true,
      content: `No Power Fx function found matching "${name}".\n\nUse \`/powerfx functions list\` to see all categories, or \`/powerfx functions text\` to list text functions.`,
      nextAction: "respond"
    };
  },

  formatFunctionHelp(name, info, category) {
    const examples = this.getExamples(name);
    
    let content = `## Power Fx: ${name}\n\n`;
    content += `**Category:** ${category}\n\n`;
    content += `**Syntax:**\n\`\`\`\n${info.syntax}\n\`\`\`\n\n`;
    content += `**Description:** ${info.desc}\n\n`;
    
    if (examples) {
      content += `**Examples:**\n\`\`\`powerfx\n${examples}\n\`\`\`\n\n`;
    }
    
    content += `📚 [Full Documentation](https://learn.microsoft.com/en-us/power-platform/power-fx/formula-reference/${name.toLowerCase()})`;
    
    return content;
  },

  getExamples(funcName) {
    const examples = {
      Filter: `// Filter accounts where revenue > 1000000
Filter(Accounts, Revenue > 1000000)

// Multiple conditions
Filter(Contacts, Status = "Active", Country = "USA")`,
      
      LookUp: `// Find first matching record
LookUp(Employees, ID = 123)

// Return specific field
LookUp(Employees, ID = 123, FullName)`,
      
      Patch: `// Update existing record
Patch(Contacts, First(Filter(Contacts, ID = 1)), {Status: "Updated"})

// Create new record
Patch(Contacts, Defaults(Contacts), {FirstName: "John", LastName: "Doe"})`,
      
      Collect: `// Add record to collection
Collect(MyCollection, {Name: "Item 1", Value: 100})

// Add multiple records
Collect(MyCollection, {Name: "A"}, {Name: "B"}, {Name: "C"})`,
      
      If: `// Simple condition
If(Score >= 70, "Pass", "Fail")

// Nested conditions
If(Score >= 90, "A", Score >= 80, "B", Score >= 70, "C", "F")`,
      
      Switch: `// Match specific values
Switch(Status, 
    "New", Color.Blue,
    "InProgress", Color.Yellow,
    "Complete", Color.Green,
    Color.Gray  // default
)`,
      
      Navigate: `// Navigate to screen
Navigate(DetailsScreen)

// With transition
Navigate(DetailsScreen, ScreenTransition.Fade)

// Passing context
Navigate(DetailsScreen, ScreenTransition.None, {SelectedItem: Gallery1.Selected})`,
      
      Set: `// Set global variable
Set(CurrentUser, User())

// Set counter
Set(Counter, Counter + 1)`,
      
      UpdateContext: `// Set local context variable
UpdateContext({ShowPopup: true})

// Multiple variables
UpdateContext({Loading: false, Results: myData})`
    };
    
    return examples[funcName] || null;
  },

  listCategories() {
    let content = `## Power Fx Function Categories\n\n`;
    content += `| Category | Description | Example Functions |\n`;
    content += `|----------|-------------|-------------------|\n`;
    content += `| **Text** | String manipulation | Len, Left, Right, Substitute |\n`;
    content += `| **Logical** | Conditions & checks | If, Switch, And, Or, IsBlank |\n`;
    content += `| **Table** | Record operations | Filter, LookUp, Sort, First |\n`;
    content += `| **Data** | CRUD operations | Patch, Collect, Update, Remove |\n`;
    content += `| **Math** | Calculations | Sum, Average, Round, Abs |\n`;
    content += `| **DateTime** | Date/time handling | Now, DateAdd, DateDiff, Year |\n`;
    content += `| **Behavior** | App actions | Navigate, Set, Notify, Launch |\n\n`;
    content += `Use \`/powerfx functions <category>\` to list functions in a category.\n`;
    content += `Use \`/powerfx <FunctionName>\` for detailed help on a specific function.`;
    
    return {
      success: true,
      content,
      nextAction: "respond"
    };
  },

  listCategoryFunctions(category, title) {
    const functions = this.functionReference[category];
    if (!functions) {
      return {
        success: false,
        content: `Unknown category: ${category}`,
        nextAction: "respond"
      };
    }

    let content = `## Power Fx ${title}\n\n`;
    content += `| Function | Syntax | Description |\n`;
    content += `|----------|--------|-------------|\n`;
    
    for (const [name, info] of Object.entries(functions)) {
      content += `| **${name}** | \`${info.syntax}\` | ${info.desc} |\n`;
    }
    
    content += `\nUse \`/powerfx <FunctionName>\` for detailed help with examples.`;
    
    return {
      success: true,
      content,
      nextAction: "respond"
    };
  },

  listDataTypes() {
    let content = `## Power Fx Data Types\n\n`;
    content += `| Type | Description |\n`;
    content += `|------|-------------|\n`;
    
    for (const [type, desc] of Object.entries(this.dataTypes)) {
      content += `| **${type}** | ${desc} |\n`;
    }
    
    content += `\n📚 [Full Documentation](https://learn.microsoft.com/en-us/power-platform/power-fx/data-types)`;
    
    return {
      success: true,
      content,
      nextAction: "respond"
    };
  },

  listOperators() {
    let content = `## Power Fx Operators\n\n`;
    
    for (const [category, ops] of Object.entries(this.operators)) {
      content += `### ${category.charAt(0).toUpperCase() + category.slice(1)}\n`;
      content += `${ops}\n\n`;
    }
    
    content += `📚 [Full Documentation](https://learn.microsoft.com/en-us/power-platform/power-fx/operators)`;
    
    return {
      success: true,
      content,
      nextAction: "respond"
    };
  },

  showHelp() {
    return {
      success: true,
      content: `## Power Fx Formula Assistant

Power Fx is Microsoft's low-code formula language for Power Platform.

### Commands

| Command | Description |
|---------|-------------|
| \`/powerfx <function>\` | Get help for a specific function |
| \`/powerfx functions list\` | List all function categories |
| \`/powerfx functions text\` | List text manipulation functions |
| \`/powerfx functions logical\` | List logical/condition functions |
| \`/powerfx functions table\` | List table/record functions |
| \`/powerfx functions data\` | List data operation functions |
| \`/powerfx functions math\` | List math functions |
| \`/powerfx functions datetime\` | List date/time functions |
| \`/powerfx functions behavior\` | List behavior/action functions |
| \`/powerfx data types\` | List data types |
| \`/powerfx operators\` | List operators |

### Examples
\`\`\`
/powerfx Filter
/powerfx functions table
How do I use Patch in Power Fx?
\`\`\`

📚 [Power Fx Documentation](https://learn.microsoft.com/en-us/power-platform/power-fx/overview)
📚 [Formula Reference](https://learn.microsoft.com/en-us/power-platform/power-fx/formula-reference)`,
      nextAction: "respond"
    };
  }
};
