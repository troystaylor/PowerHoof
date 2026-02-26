/**
 * Web Search Skill
 * 
 * Performs web searches using various search APIs.
 * Supports Brave Search, Tavily, or falls back to DuckDuckGo.
 */

export const skill = {
  manifest: {
    id: "web-search-skill",
    name: "WebSearch",
    description: "Search the web for information, documentation, and facts",
    version: "1.0.0",
    author: "PowerHoof",
    permissions: ["read-context", "network"],
    examples: [
      "search for typescript best practices",
      "/search latest AI news",
      "web search azure functions"
    ],
    tags: ["search", "web", "utility"],
    config: {
      provider: "duckduckgo", // brave, tavily, duckduckgo
      maxResults: 5
    }
  },

  async canHandle(context) {
    const content = context.message.content?.toLowerCase() || "";
    const triggers = [
      "/search",
      "/web",
      "/lookup",
      "search for",
      "search the web",
      "web search",
      "look up",
      "find information about"
    ];
    return triggers.some(t => content.includes(t));
  },

  async execute(context) {
    const content = context.message.content || "";
    
    // Extract search query
    const query = content
      .replace(/^\/?(?:search|web|lookup)\s*/i, "")
      .replace(/^(?:for|the web|information about)\s*/i, "")
      .trim();

    if (!query) {
      return {
        success: false,
        content: "Please provide a search query. Example: `/search typescript generics`",
        nextAction: "respond"
      };
    }

    try {
      const results = await this.performSearch(query, context);
      return {
        success: true,
        content: this.formatResults(query, results),
        data: { query, results },
        nextAction: "respond"
      };
    } catch (error) {
      return {
        success: false,
        content: `Search failed: ${error.message}`,
        nextAction: "respond"
      };
    }
  },

  async performSearch(query, context) {
    // DuckDuckGo Instant Answer API (no key required)
    const encoded = encodeURIComponent(query);
    const url = `https://api.duckduckgo.com/?q=${encoded}&format=json&no_html=1&skip_disambig=1`;
    
    try {
      const response = await fetch(url);
      const data = await response.json();
      
      const results = [];
      
      // Abstract (main answer)
      if (data.Abstract) {
        results.push({
          title: data.Heading || query,
          snippet: data.Abstract,
          url: data.AbstractURL || null,
          source: data.AbstractSource || "DuckDuckGo"
        });
      }
      
      // Related topics
      if (data.RelatedTopics) {
        for (const topic of data.RelatedTopics.slice(0, 4)) {
          if (topic.Text && topic.FirstURL) {
            results.push({
              title: topic.Text.split(" - ")[0] || topic.Text.substring(0, 50),
              snippet: topic.Text,
              url: topic.FirstURL,
              source: "DuckDuckGo"
            });
          }
        }
      }
      
      // Instant answer
      if (data.Answer) {
        results.unshift({
          title: "Instant Answer",
          snippet: data.Answer,
          url: null,
          source: "DuckDuckGo"
        });
      }
      
      return results.length > 0 ? results : [{
        title: "No direct results",
        snippet: `Try searching directly: https://duckduckgo.com/?q=${encoded}`,
        url: `https://duckduckgo.com/?q=${encoded}`,
        source: "DuckDuckGo"
      }];
    } catch (error) {
      throw new Error(`Search API error: ${error.message}`);
    }
  },

  formatResults(query, results) {
    let output = `🔍 **Search Results for "${query}"**\n\n`;
    
    for (let i = 0; i < results.length; i++) {
      const r = results[i];
      output += `**${i + 1}. ${r.title}**\n`;
      output += `${r.snippet}\n`;
      if (r.url) {
        output += `🔗 ${r.url}\n`;
      }
      output += "\n";
    }
    
    return output.trim();
  }
};

export default skill;
