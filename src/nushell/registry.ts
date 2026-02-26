/**
 * Nushell Capability Registry
 *
 * Defines available Nushell commands as a compact reference for the LLM.
 * This replaces MCP's verbose JSON Schema tool definitions.
 */

export interface NushellCommand {
  name: string;
  description: string;
  usage: string;
  examples?: string[];
  aliases?: string[];
}

/**
 * Core Nushell commands available in sandboxed execution.
 * This is a curated subset - not all Nushell commands are exposed.
 */
export const CORE_COMMANDS: NushellCommand[] = [
  // Data manipulation
  {
    name: "ls",
    description: "List directory contents as a table",
    usage: "ls [path] [--all] [--long]",
    examples: ["ls", "ls ~/Documents", "ls -la"],
  },
  {
    name: "open",
    description: "Open a file and parse its contents (JSON, YAML, CSV, etc.)",
    usage: "open <file>",
    examples: ["open data.json", "open config.yaml"],
  },
  {
    name: "where",
    description: "Filter rows based on a condition",
    usage: "<input> | where <condition>",
    examples: ["ls | where size > 1mb", "open data.json | where status == 'active'"],
  },
  {
    name: "select",
    description: "Select specific columns from a table",
    usage: "<input> | select <columns...>",
    examples: ["ls | select name size", "open data.json | select id name email"],
  },
  {
    name: "get",
    description: "Get a value at a path from structured data",
    usage: "<input> | get <path>",
    examples: ["open config.json | get database.host", "$env | get PATH"],
  },
  {
    name: "sort-by",
    description: "Sort table by column(s)",
    usage: "<input> | sort-by <column> [--reverse]",
    examples: ["ls | sort-by size", "ls | sort-by modified -r"],
  },
  {
    name: "group-by",
    description: "Group rows by a column value",
    usage: "<input> | group-by <column>",
    examples: ["ls | group-by type"],
  },
  {
    name: "reduce",
    description: "Reduce a list to a single value",
    usage: "<input> | reduce { |acc, it| <expression> }",
    examples: ["[1 2 3 4] | reduce { |acc, it| $acc + $it }"],
  },
  {
    name: "each",
    description: "Run a closure on each row",
    usage: "<input> | each { |it| <expression> }",
    examples: ["[1 2 3] | each { |it| $it * 2 }"],
  },
  {
    name: "to json",
    description: "Convert data to JSON format",
    usage: "<input> | to json",
    examples: ["ls | to json", "{name: 'test'} | to json"],
  },
  {
    name: "from json",
    description: "Parse JSON string to structured data",
    usage: "<input> | from json",
    examples: ["'{\"a\": 1}' | from json"],
  },

  // String operations
  {
    name: "str contains",
    description: "Check if string contains a substring",
    usage: "<input> | str contains <pattern>",
    examples: ["'hello world' | str contains 'world'"],
  },
  {
    name: "str replace",
    description: "Replace occurrences in a string",
    usage: "<input> | str replace <find> <replace>",
    examples: ["'hello world' | str replace 'world' 'nushell'"],
  },
  {
    name: "split row",
    description: "Split string into rows",
    usage: "<input> | split row <separator>",
    examples: ["'a,b,c' | split row ','"],
  },
  {
    name: "lines",
    description: "Split string into lines",
    usage: "<input> | lines",
    examples: ["open file.txt | lines"],
  },

  // Math
  {
    name: "math sum",
    description: "Sum numbers in a list or column",
    usage: "<input> | math sum",
    examples: ["[1 2 3] | math sum", "ls | get size | math sum"],
  },
  {
    name: "math avg",
    description: "Calculate average",
    usage: "<input> | math avg",
    examples: ["[1 2 3 4 5] | math avg"],
  },

  // Date/Time
  {
    name: "date now",
    description: "Get current date and time",
    usage: "date now",
    examples: ["date now", "date now | format date '%Y-%m-%d'"],
  },

  // HTTP (sandboxed - only allowed endpoints)
  {
    name: "http get",
    description: "Make HTTP GET request (restricted to allowed endpoints)",
    usage: "http get <url>",
    examples: ["http get https://api.example.com/data"],
  },
];

/**
 * PowerHoof custom commands - domain-specific extensions.
 * These wrap Azure SDK calls and other integrations.
 */
export const POWERHOOF_COMMANDS: NushellCommand[] = [
  // Calendar / Scheduling
  {
    name: "ph calendar list",
    description: "List calendar events",
    usage: "ph calendar list [--days <n>] [--calendar <name>]",
    examples: ["ph calendar list", "ph calendar list --days 7"],
  },
  {
    name: "ph calendar add",
    description: "Add a calendar event",
    usage: "ph calendar add <title> --start <datetime> [--end <datetime>] [--location <loc>]",
    examples: ["ph calendar add 'Team Meeting' --start '2026-02-25 10:00'"],
  },

  // Email
  {
    name: "ph mail search",
    description: "Search emails",
    usage: "ph mail search <query> [--limit <n>] [--folder <name>]",
    examples: ["ph mail search 'project update' --limit 10"],
  },
  {
    name: "ph mail send",
    description: "Send an email",
    usage: "ph mail send --to <email> --subject <subj> --body <text>",
    examples: ["ph mail send --to 'user@example.com' --subject 'Hello' --body 'Message here'"],
  },

  // Files / Storage
  {
    name: "ph files list",
    description: "List files in cloud storage",
    usage: "ph files list [path] [--drive <name>]",
    examples: ["ph files list", "ph files list '/Documents'"],
  },
  {
    name: "ph files upload",
    description: "Upload a file to cloud storage",
    usage: "ph files upload <local-path> <remote-path>",
    examples: ["ph files upload ./report.pdf '/Reports/Q1'"],
  },

  // Azure Resources
  {
    name: "ph azure resources",
    description: "List Azure resources",
    usage: "ph azure resources [--type <type>] [--group <rg>]",
    examples: ["ph azure resources", "ph azure resources --type 'Microsoft.Web/sites'"],
  },
  {
    name: "ph azure costs",
    description: "Get Azure cost summary",
    usage: "ph azure costs [--days <n>] [--group <rg>]",
    examples: ["ph azure costs --days 30"],
  },

  // Memory
  {
    name: "ph remember",
    description: "Store a fact in persistent memory",
    usage: "ph remember <key> <value>",
    examples: ["ph remember 'project-deadline' '2026-03-15'"],
  },
  {
    name: "ph recall",
    description: "Recall a stored fact",
    usage: "ph recall <key>",
    examples: ["ph recall 'project-deadline'"],
  },
];

/**
 * Generate a compact command reference for the LLM system prompt.
 * This is dramatically smaller than MCP's JSON Schema tool definitions.
 */
export function generateCommandReference(): string {
  const lines = [
    "# Available Nushell Commands",
    "",
    "## Core Commands",
    ...CORE_COMMANDS.map((cmd) => `- \`${cmd.usage}\` - ${cmd.description}`),
    "",
    "## PowerHoof Commands",
    ...POWERHOOF_COMMANDS.map((cmd) => `- \`${cmd.usage}\` - ${cmd.description}`),
    "",
    "## Usage Notes",
    "- Chain commands with pipes: `ls | where size > 1mb | sort-by size`",
    "- Variables: `let x = 5; $x * 2`",
    "- Tables flow through pipelines as structured data",
    "- Output is automatically formatted based on data type",
  ];

  return lines.join("\n");
}

/**
 * Estimate token count for the command reference.
 * Useful for comparing with MCP schema overhead.
 */
export function estimateTokenCount(): { reference: number; mcpEquivalent: number; savings: string } {
  const reference = generateCommandReference();
  const referenceTokens = Math.ceil(reference.length / 4); // Rough estimate: 4 chars per token

  const allCommands = [...CORE_COMMANDS, ...POWERHOOF_COMMANDS];
  // MCP JSON Schema overhead: ~150-300 tokens per tool for schema + description
  const mcpEquivalentTokens = allCommands.length * 200;

  const savings = `${Math.round((1 - referenceTokens / mcpEquivalentTokens) * 100)}%`;

  return {
    reference: referenceTokens,
    mcpEquivalent: mcpEquivalentTokens,
    savings,
  };
}
