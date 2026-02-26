/**
 * Summarize Skill
 * 
 * Summarize URLs, text content, or files.
 * Uses the LLM to generate summaries.
 */

export const skill = {
  manifest: {
    id: "summarize-skill",
    name: "Summarize",
    description: "Summarize URLs, text, or file contents",
    version: "1.0.0",
    author: "PowerHoof",
    permissions: ["read-context", "network", "llm"],
    examples: [
      "/summarize https://example.com/article",
      "summarize this text: ...",
      "/tldr https://docs.microsoft.com/..."
    ],
    tags: ["summarize", "utility", "text", "web"]
  },

  async canHandle(context) {
    const content = context.message.content?.toLowerCase() || "";
    const triggers = [
      "/summarize",
      "/summary",
      "/tldr",
      "summarize this",
      "summarize the",
      "give me a summary",
      "can you summarize"
    ];
    return triggers.some(t => content.includes(t));
  },

  async execute(context) {
    const content = context.message.content || "";
    
    // Extract content to summarize
    let input = content
      .replace(/^\/?(?:summarize|summary|tldr)\s*/i, "")
      .replace(/^(?:this|the|a)\s*/i, "")
      .replace(/^(?:text|content|article|page|url):\s*/i, "")
      .trim();

    if (!input) {
      return {
        success: false,
        content: "Please provide content to summarize. Examples:\n" +
                 "- `/summarize https://example.com/article`\n" +
                 "- `/summarize text: Your long text here...`",
        nextAction: "respond"
      };
    }

    try {
      // Check if it's a URL
      const urlMatch = input.match(/https?:\/\/[^\s]+/);
      
      if (urlMatch) {
        const url = urlMatch[0];
        const pageContent = await this.fetchUrl(url);
        return {
          success: true,
          content: this.formatSummaryRequest(url, pageContent),
          data: { 
            type: "url", 
            url,
            contentToSummarize: pageContent,
            instruction: "Please summarize the following content:"
          },
          nextAction: "summarize-with-llm"
        };
      } else {
        // Direct text to summarize
        return {
          success: true,
          content: this.formatTextSummary(input),
          data: {
            type: "text",
            contentToSummarize: input,
            instruction: "Please provide a concise summary:"
          },
          nextAction: "summarize-with-llm"
        };
      }
    } catch (error) {
      return {
        success: false,
        content: `Summarization failed: ${error.message}`,
        nextAction: "respond"
      };
    }
  },

  async fetchUrl(url) {
    try {
      const response = await fetch(url, {
        headers: {
          "User-Agent": "PowerHoof/1.0 (Summarizer)",
          "Accept": "text/html,application/xhtml+xml,text/plain"
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const html = await response.text();
      
      // Basic HTML to text conversion
      return this.htmlToText(html);
    } catch (error) {
      throw new Error(`Could not fetch URL: ${error.message}`);
    }
  },

  htmlToText(html) {
    // Remove scripts, styles, and comments
    let text = html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
      .replace(/<!--[\s\S]*?-->/g, "")
      .replace(/<header[^>]*>[\s\S]*?<\/header>/gi, "")
      .replace(/<footer[^>]*>[\s\S]*?<\/footer>/gi, "")
      .replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, "");
    
    // Convert common elements
    text = text
      .replace(/<h[1-6][^>]*>/gi, "\n\n## ")
      .replace(/<\/h[1-6]>/gi, "\n")
      .replace(/<p[^>]*>/gi, "\n")
      .replace(/<\/p>/gi, "\n")
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<li[^>]*>/gi, "\n• ")
      .replace(/<\/li>/gi, "");
    
    // Remove remaining tags
    text = text.replace(/<[^>]+>/g, " ");
    
    // Clean up whitespace
    text = text
      .replace(/&nbsp;/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/\s+/g, " ")
      .replace(/\n\s*\n/g, "\n\n")
      .trim();
    
    // Limit length for LLM context
    const maxLength = 10000;
    if (text.length > maxLength) {
      text = text.substring(0, maxLength) + "\n\n[Content truncated...]";
    }
    
    return text;
  },

  formatSummaryRequest(url, content) {
    return `📄 **Summarizing:** ${url}\n\n` +
           `**Content Preview:**\n${content.substring(0, 500)}...\n\n` +
           `*Generating summary...*`;
  },

  formatTextSummary(text) {
    const preview = text.length > 200 ? text.substring(0, 200) + "..." : text;
    return `📝 **Summarizing text:**\n"${preview}"\n\n*Generating summary...*`;
  }
};

export default skill;
