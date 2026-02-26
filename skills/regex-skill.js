/**
 * Regex Skill
 * Regular expression pattern builder and expression tester.
 */

export const skill = {
  manifest: {
    id: "regex-skill",
    name: "Regex",
    description: "Regex assistant - Pattern builder, expression tester",
    version: "1.0.0",
    author: "PowerHoof",
    permissions: ["read-context"],
    examples: [
      "/regex email pattern",
      "/pattern phone number",
      "/regex explain ^[a-z]+$"
    ],
    tags: ["regex", "pattern", "validation", "text-processing"]
  },

  knowledge: {
    patterns: {
      email: { pattern: '^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$', desc: 'Basic email validation' },
      phone: { pattern: '^\\+?[1-9]\\d{1,14}$', desc: 'E.164 phone format' },
      url: { pattern: '^https?:\\/\\/[\\w.-]+(?:\\.[\\w.-]+)+[\\w\\-._~:/?#[\\]@!$&\'()*+,;=%]*$', desc: 'URL with http/https' },
      ip: { pattern: '^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$', desc: 'IPv4 address' },
      guid: { pattern: '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$', desc: 'GUID/UUID format' },
      date: { pattern: '^\\d{4}-\\d{2}-\\d{2}$', desc: 'ISO date YYYY-MM-DD' }
    },
    syntax: {
      anchors: ['^start', '$end', '\\bword boundary'],
      quantifiers: ['*zero+', '+one+', '?optional', '{n}exact', '{n,m}range'],
      groups: ['(...)capture', '(?:...)non-capture', '(?=...)lookahead', '(?<=...)lookbehind'],
      classes: ['[abc]set', '[^abc]negated', '[a-z]range', '\\d digit', '\\w word', '\\s space']
    }
  },

  async canHandle(context) {
    const content = context.message.content?.toLowerCase() || "";
    return ['/regex', '/pattern', '/regexp', 'regular expression', 'regex pattern'].some(t => content.includes(t));
  },

  async execute(context) {
    const content = context.message.content.toLowerCase();
    
    if (content.includes('email')) {
      const p = this.knowledge.patterns.email;
      return { success: true, content: `**Email Pattern:**\n\`${p.pattern}\`\n\n${p.desc}` };
    }
    
    if (content.includes('phone')) {
      const p = this.knowledge.patterns.phone;
      return { success: true, content: `**Phone Pattern:**\n\`${p.pattern}\`\n\n${p.desc}` };
    }
    
    if (content.includes('url')) {
      const p = this.knowledge.patterns.url;
      return { success: true, content: `**URL Pattern:**\n\`${p.pattern}\`\n\n${p.desc}` };
    }
    
    if (content.includes('guid') || content.includes('uuid')) {
      const p = this.knowledge.patterns.guid;
      return { success: true, content: `**GUID Pattern:**\n\`${p.pattern}\`\n\n${p.desc}` };
    }
    
    if (content.includes('syntax') || content.includes('cheat')) {
      const s = this.knowledge.syntax;
      return {
        success: true,
        content: `**Regex Syntax:**\n\n**Anchors:** ${s.anchors.join(', ')}\n**Quantifiers:** ${s.quantifiers.join(', ')}\n**Groups:** ${s.groups.join(', ')}\n**Classes:** ${s.classes.join(', ')}`
      };
    }
    
    return {
      success: true,
      content: `**Regex Assistant**\n\n**Common Patterns:**\n${Object.entries(this.knowledge.patterns).map(([k,v]) => `- ${k}: \`${v.pattern.substring(0,40)}...\``).join('\n')}\n\nTry: "/regex email" or "/pattern syntax cheatsheet"`
    };
  }
};
