/**
 * Search Skill
 * 
 * Web search using DuckDuckGo Instant Answer API.
 * Returns quick answers, definitions, and related topics.
 */

import { searchCache } from "./skill-cache.js";

export const skill = {
  manifest: {
    id: "search-skill",
    name: "Search",
    description: "Web search using DuckDuckGo",
    version: "1.0.0",
    author: "PowerHoof",
    permissions: ["network:read"],
    examples: [
      "/search JavaScript array methods",
      "/google Albert Einstein",
      "/ddg population of France",
      "search for React hooks"
    ],
    tags: ["search", "web", "lookup", "information"]
  },

  async canHandle(context) {
    const content = context.message.content?.toLowerCase() || "";
    const triggers = [
      "/search",
      "/google",
      "/ddg",
      "/lookup",
      "/find",
      "search for",
      "look up",
      "what is a ",
      "who is ",
      "who was "
    ];
    return triggers.some(t => content.includes(t));
  },

  async execute(context) {
    const content = context.message.content || "";
    
    // Extract search query
    let query = content
      .replace(/^\/?(?:search|google|ddg|lookup|find)\s*/i, "")
      .replace(/^(?:for|about)\s*/i, "")
      .replace(/^(?:search for|look up)\s*/i, "")
      .replace(/^(?:what is a|who is|who was)\s*/i, "")
      .trim();
    
    if (!query) {
      return {
        success: true,
        content: this.getHelp()
      };
    }
    
    try {
      const cacheKey = `search:${query.toLowerCase()}`;
      const cached = searchCache.get(cacheKey);
      if (cached) {
        return {
          success: true,
          content: cached + "\n\n_📦 Cached result_"
        };
      }
      
      const result = await this.searchDuckDuckGo(query);
      searchCache.set(cacheKey, result);
      return {
        success: true,
        content: result
      };
    } catch (error) {
      return {
        success: false,
        content: `❌ Search failed: ${error.message}`
      };
    }
  },
  
  async searchDuckDuckGo(query) {
    const encodedQuery = encodeURIComponent(query);
    const url = `https://api.duckduckgo.com/?q=${encodedQuery}&format=json&no_html=1&skip_disambig=1`;
    
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);
    
    try {
      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          "User-Agent": "PowerHoof/1.0"
        }
      });
      clearTimeout(timeout);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      const data = await response.json();
      return this.formatResults(query, data);
    } catch (error) {
      clearTimeout(timeout);
      if (error.name === 'AbortError') {
        throw new Error('Search timed out');
      }
      throw error;
    }
  },
  
  formatResults(query, data) {
    let output = `## 🔍 Search: "${query}"\n\n`;
    
    // Abstract (main answer)
    if (data.Abstract) {
      output += `### ${data.AbstractSource || 'Summary'}\n`;
      output += `${data.Abstract}\n`;
      if (data.AbstractURL) {
        output += `\n🔗 [Read more](${data.AbstractURL})\n`;
      }
      output += `\n`;
    }
    
    // Definition
    if (data.Definition) {
      output += `### Definition\n`;
      output += `${data.Definition}\n`;
      if (data.DefinitionSource) {
        output += `_Source: ${data.DefinitionSource}_\n`;
      }
      output += `\n`;
    }
    
    // Answer (for calculations, conversions, etc.)
    if (data.Answer) {
      output += `### Answer\n`;
      output += `${data.Answer}\n\n`;
    }
    
    // Related Topics
    if (data.RelatedTopics && data.RelatedTopics.length > 0) {
      output += `### Related Topics\n`;
      let count = 0;
      for (const topic of data.RelatedTopics) {
        if (count >= 5) break;
        if (topic.Text) {
          const text = topic.Text.length > 150 
            ? topic.Text.substring(0, 150) + "..."
            : topic.Text;
          output += `- ${text}\n`;
          count++;
        } else if (topic.Topics) {
          // Nested topics group
          for (const subtopic of topic.Topics.slice(0, 2)) {
            if (subtopic.Text && count < 5) {
              const text = subtopic.Text.length > 150
                ? subtopic.Text.substring(0, 150) + "..."
                : subtopic.Text;
              output += `- ${text}\n`;
              count++;
            }
          }
        }
      }
      output += `\n`;
    }
    
    // Results (external links)
    if (data.Results && data.Results.length > 0) {
      output += `### Top Results\n`;
      for (const result of data.Results.slice(0, 3)) {
        if (result.Text && result.FirstURL) {
          output += `- [${result.Text}](${result.FirstURL})\n`;
        }
      }
      output += `\n`;
    }
    
    // Infobox (structured data)
    if (data.Infobox && data.Infobox.content && data.Infobox.content.length > 0) {
      output += `### Quick Facts\n`;
      for (const item of data.Infobox.content.slice(0, 6)) {
        if (item.label && item.value) {
          output += `- **${item.label}:** ${item.value}\n`;
        }
      }
      output += `\n`;
    }
    
    // No results found
    if (!data.Abstract && !data.Definition && !data.Answer && 
        (!data.RelatedTopics || data.RelatedTopics.length === 0)) {
      output += `_No instant answer found. Try a more specific query or rephrase._\n\n`;
      output += `💡 **Tips:**\n`;
      output += `- For definitions: \`/search define [word]\`\n`;
      output += `- For people: \`/search [name] biography\`\n`;
      output += `- For topics: \`/search [topic] overview\`\n`;
    }
    
    return output;
  },
  
  getHelp() {
    return `## 🔍 Search Skill

**Search the web:**
- \`/search JavaScript promises\`
- \`/google Albert Einstein\`
- \`/ddg capital of France\`

**Quick lookups:**
- \`what is a quasar\`
- \`who is Ada Lovelace\`
- \`/lookup Python list comprehension\`

_Powered by DuckDuckGo Instant Answer API_`;
  }
};

export default skill;
