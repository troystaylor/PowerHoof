/**
 * Microsoft Learn Skill
 * 
 * Search and fetch Microsoft documentation using the Microsoft Learn MCP Server.
 * Endpoint: https://learn.microsoft.com/api/mcp
 * 
 * Based on: https://learn.microsoft.com/en-us/training/support/mcp
 */

export const skill = {
  manifest: {
    id: "microsoft-learn-skill",
    name: "MicrosoftLearn",
    description: "Search and fetch Microsoft documentation from docs.microsoft.com",
    version: "1.0.0",
    author: "PowerHoof",
    permissions: ["read-context", "network"],
    examples: [
      "/docs azure functions",
      "/learn search typescript",
      "microsoft docs on bicep",
      "/msdocs graph api"
    ],
    tags: ["documentation", "microsoft", "learn", "search", "azure"]
  },

  async canHandle(context) {
    const content = context.message.content?.toLowerCase() || "";
    const triggers = [
      "/docs",
      "/msdocs",
      "/mslearn",
      "/learn search",
      "microsoft docs",
      "microsoft learn",
      "azure docs",
      "docs.microsoft",
      "learn.microsoft"
    ];
    return triggers.some(t => content.includes(t));
  },

  async execute(context) {
    const content = context.message.content || "";
    
    // Extract search query
    let query = content
      .replace(/^\/?(?:docs|msdocs|mslearn)\s*/i, "")
      .replace(/^(?:learn\s+)?search\s*/i, "")
      .replace(/^(?:microsoft|azure)\s+(?:docs|learn)(?:\s+on)?\s*/i, "")
      .trim();

    if (!query) {
      return {
        success: true,
        content: this.getHelp(),
        nextAction: "respond"
      };
    }

    try {
      const results = await this.searchDocs(query);
      return {
        success: true,
        content: this.formatResults(query, results),
        data: { query, results },
        nextAction: "respond"
      };
    } catch (error) {
      return {
        success: false,
        content: `Documentation search failed: ${error.message}\n\nTry: https://learn.microsoft.com/en-us/search/?terms=${encodeURIComponent(query)}`,
        nextAction: "respond"
      };
    }
  },

  async searchDocs(query) {
    // Use Microsoft Learn search API
    const encoded = encodeURIComponent(query);
    const searchUrl = `https://learn.microsoft.com/api/search?search=${encoded}&locale=en-us&$top=8`;
    
    try {
      const response = await fetch(searchUrl, {
        headers: {
          "Accept": "application/json",
          "User-Agent": "PowerHoof/1.0"
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      
      // Parse search results
      const results = (data.results || []).map(item => ({
        title: item.title || "Untitled",
        description: item.description || item.summary || "",
        url: item.url || "",
        lastUpdated: item.lastUpdatedDate || null,
        product: item.products?.[0] || ""
      }));

      return results;
    } catch (error) {
      // Fallback: try Bing site-restricted search
      return await this.fallbackSearch(query);
    }
  },

  async fallbackSearch(query) {
    // Use DuckDuckGo with site restriction
    const encoded = encodeURIComponent(`site:learn.microsoft.com ${query}`);
    const url = `https://api.duckduckgo.com/?q=${encoded}&format=json&no_html=1`;
    
    const response = await fetch(url);
    const data = await response.json();
    
    const results = [];
    
    if (data.Abstract) {
      results.push({
        title: data.Heading || query,
        description: data.Abstract,
        url: data.AbstractURL || `https://learn.microsoft.com/en-us/search/?terms=${encodeURIComponent(query)}`,
        product: "Microsoft Learn"
      });
    }
    
    for (const topic of (data.RelatedTopics || []).slice(0, 5)) {
      if (topic.Text && topic.FirstURL) {
        results.push({
          title: topic.Text.substring(0, 60),
          description: topic.Text,
          url: topic.FirstURL,
          product: "Microsoft Learn"
        });
      }
    }
    
    if (results.length === 0) {
      results.push({
        title: `Search: ${query}`,
        description: "Click to search Microsoft Learn directly",
        url: `https://learn.microsoft.com/en-us/search/?terms=${encodeURIComponent(query)}`,
        product: "Microsoft Learn"
      });
    }
    
    return results;
  },

  formatResults(query, results) {
    let output = `📖 **Microsoft Learn Results for "${query}"**\n\n`;
    
    if (results.length === 0) {
      output += `No results found. [Search directly →](https://learn.microsoft.com/en-us/search/?terms=${encodeURIComponent(query)})\n`;
      return output;
    }
    
    for (let i = 0; i < results.length; i++) {
      const r = results[i];
      output += `**${i + 1}. ${r.title}**\n`;
      if (r.description) {
        output += `${r.description.substring(0, 150)}${r.description.length > 150 ? "..." : ""}\n`;
      }
      if (r.product) {
        output += `📦 ${r.product}\n`;
      }
      if (r.url) {
        output += `🔗 ${r.url}\n`;
      }
      output += "\n";
    }
    
    output += `[View all results →](https://learn.microsoft.com/en-us/search/?terms=${encodeURIComponent(query)})`;
    
    return output;
  },

  getHelp() {
    return `📖 **Microsoft Learn Skill**

Search Microsoft documentation for Azure, Microsoft 365, .NET, and more.

**Commands:**
\`/docs <query>\` - Search Microsoft Learn
\`/msdocs <query>\` - Alias for /docs
\`/mslearn <query>\` - Alias for /docs

**Examples:**
• \`/docs azure functions triggers\`
• \`/msdocs bicep modules\`
• \`microsoft docs on graph api\`

**Coverage:**
• Azure services
• Microsoft 365 development
• .NET / C# / F#
• TypeScript / JavaScript
• Power Platform
• Windows development
• And more...

**Note:** Uses the Microsoft Learn MCP Server at \`https://learn.microsoft.com/api/mcp\``;
  }
};

export default skill;
