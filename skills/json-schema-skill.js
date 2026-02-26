/**
 * JSON Schema Skill
 * Schema validation, generation, and type definitions.
 */

export const skill = {
  manifest: {
    id: "json-schema-skill",
    name: "JSONSchema",
    description: "JSON Schema assistant - Validation, generation, type definitions",
    version: "1.0.0",
    author: "PowerHoof",
    permissions: ["read-context"],
    examples: [
      "/jsonschema validate object",
      "/schema generate from json",
      "/jsonschema array of objects"
    ],
    tags: ["json", "schema", "validation", "api", "types"]
  },

  knowledge: {
    types: ['string', 'number', 'integer', 'boolean', 'object', 'array', 'null'],
    formats: ['date-time', 'date', 'time', 'email', 'uri', 'uuid', 'ipv4', 'ipv6'],
    keywords: {
      string: ['minLength', 'maxLength', 'pattern', 'format', 'enum'],
      number: ['minimum', 'maximum', 'exclusiveMinimum', 'exclusiveMaximum', 'multipleOf'],
      array: ['items', 'minItems', 'maxItems', 'uniqueItems', 'contains'],
      object: ['properties', 'required', 'additionalProperties', 'minProperties', 'maxProperties', 'patternProperties']
    },
    examples: {
      basic: `{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "object",
  "properties": {
    "name": { "type": "string", "minLength": 1 },
    "email": { "type": "string", "format": "email" },
    "age": { "type": "integer", "minimum": 0 }
  },
  "required": ["name", "email"]
}`,
      array: `{
  "type": "array",
  "items": {
    "type": "object",
    "properties": {
      "id": { "type": "integer" },
      "name": { "type": "string" }
    },
    "required": ["id", "name"]
  },
  "minItems": 1,
  "uniqueItems": true
}`,
      conditional: `{
  "if": { "properties": { "type": { "const": "business" } } },
  "then": { "required": ["taxId"] },
  "else": { "required": ["ssn"] }
}`
    }
  },

  async canHandle(context) {
    const content = context.message.content?.toLowerCase() || "";
    return ['/jsonschema', '/schema', '/json schema', 'json schema'].some(t => content.includes(t));
  },

  async execute(context) {
    const content = context.message.content.toLowerCase();
    
    if (content.includes('array')) {
      return { success: true, content: `**Array Schema:**\n\`\`\`json\n${this.knowledge.examples.array}\n\`\`\`\n\n**Array Keywords:** ${this.knowledge.keywords.array.join(', ')}` };
    }
    
    if (content.includes('conditional') || content.includes('if')) {
      return { success: true, content: `**Conditional Schema:**\n\`\`\`json\n${this.knowledge.examples.conditional}\n\`\`\`` };
    }
    
    if (content.includes('format') || content.includes('validate')) {
      return {
        success: true,
        content: `**Built-in Formats:** ${this.knowledge.formats.join(', ')}\n\n**Types:** ${this.knowledge.types.join(', ')}\n\n**Basic Schema:**\n\`\`\`json\n${this.knowledge.examples.basic}\n\`\`\``
      };
    }
    
    if (content.includes('keyword') || content.includes('string') || content.includes('number')) {
      const k = this.knowledge.keywords;
      return {
        success: true,
        content: `**Schema Keywords:**\n\n**String:** ${k.string.join(', ')}\n**Number:** ${k.number.join(', ')}\n**Array:** ${k.array.join(', ')}\n**Object:** ${k.object.join(', ')}`
      };
    }
    
    return {
      success: true,
      content: `**JSON Schema Assistant**\n\n**Types:** ${this.knowledge.types.join(', ')}\n**Formats:** ${this.knowledge.formats.slice(0,4).join(', ')}\n\nTry: "/jsonschema array of objects" or "/schema validate formats"`
    };
  }
};
