/**
 * News Skill
 * 
 * Fetches news headlines from various RSS feeds.
 * Supports multiple categories: tech, world, business, science, sports.
 */

import { newsCache } from "./skill-cache.js";

export const skill = {
  manifest: {
    id: "news-skill",
    name: "News",
    description: "Get latest news headlines from RSS feeds",
    version: "1.0.0",
    author: "PowerHoof",
    permissions: ["network:read"],
    examples: [
      "/news",
      "/news tech",
      "/news world",
      "/headlines business",
      "latest tech news"
    ],
    tags: ["news", "headlines", "rss", "feed"]
  },

  // RSS feed sources by category
  feeds: {
    tech: [
      { name: "Hacker News", url: "https://hnrss.org/frontpage" },
      { name: "TechCrunch", url: "https://techcrunch.com/feed/" },
      { name: "Ars Technica", url: "https://feeds.arstechnica.com/arstechnica/index" }
    ],
    world: [
      { name: "BBC World", url: "https://feeds.bbci.co.uk/news/world/rss.xml" },
      { name: "NPR News", url: "https://feeds.npr.org/1001/rss.xml" },
      { name: "Reuters World", url: "https://www.reutersagency.com/feed/?best-topics=world&post_type=best" }
    ],
    business: [
      { name: "BBC Business", url: "https://feeds.bbci.co.uk/news/business/rss.xml" },
      { name: "CNBC", url: "https://www.cnbc.com/id/100003114/device/rss/rss.html" }
    ],
    science: [
      { name: "Science Daily", url: "https://www.sciencedaily.com/rss/all.xml" },
      { name: "NASA", url: "https://www.nasa.gov/rss/dyn/breaking_news.rss" },
      { name: "BBC Science", url: "https://feeds.bbci.co.uk/news/science_and_environment/rss.xml" }
    ],
    sports: [
      { name: "ESPN", url: "https://www.espn.com/espn/rss/news" },
      { name: "BBC Sport", url: "https://feeds.bbci.co.uk/sport/rss.xml" }
    ]
  },

  async canHandle(context) {
    const content = context.message.content?.toLowerCase() || "";
    const triggers = [
      "/news",
      "/headlines",
      "/rss",
      "latest news",
      "news about",
      "tech news",
      "world news",
      "top stories"
    ];
    return triggers.some(t => content.includes(t));
  },

  async execute(context) {
    const content = context.message.content?.toLowerCase() || "";
    
    // Determine category
    let category = "tech"; // Default
    
    if (content.includes("world") || content.includes("global")) {
      category = "world";
    } else if (content.includes("business") || content.includes("finance") || content.includes("economy")) {
      category = "business";
    } else if (content.includes("science") || content.includes("space") || content.includes("nasa")) {
      category = "science";
    } else if (content.includes("sport")) {
      category = "sports";
    } else if (content.includes("tech") || content.includes("technology")) {
      category = "tech";
    }
    
    // Check for help
    if (content.includes("help") || content.includes("categories")) {
      return { success: true, content: this.getHelp() };
    }
    
    try {
      const cacheKey = `news:${category}`;
      const cached = newsCache.get(cacheKey);
      if (cached) {
        return {
          success: true,
          content: cached + "\n\n_📦 Cached (refreshes every 15 min)_"
        };
      }
      
      const headlines = await this.fetchNews(category);
      const formattedOutput = this.formatHeadlines(category, headlines);
      newsCache.set(cacheKey, formattedOutput);
      return {
        success: true,
        content: formattedOutput
      };
    } catch (error) {
      return {
        success: false,
        content: `❌ Failed to fetch news: ${error.message}\n\n_Try again in a moment._`
      };
    }
  },
  
  async fetchNews(category) {
    const feedConfigs = this.feeds[category];
    if (!feedConfigs) {
      throw new Error(`Unknown category: ${category}`);
    }
    
    const allHeadlines = [];
    
    // Try to fetch from each feed
    for (const feed of feedConfigs) {
      try {
        const headlines = await this.fetchFeed(feed);
        allHeadlines.push(...headlines);
      } catch (e) {
        // Skip failed feeds silently
        console.log(`[news-skill] Failed to fetch ${feed.name}: ${e.message}`);
      }
    }
    
    if (allHeadlines.length === 0) {
      throw new Error("No feeds available");
    }
    
    // Sort by date (newest first) and return top 8
    allHeadlines.sort((a, b) => (b.date?.getTime() || 0) - (a.date?.getTime() || 0));
    return allHeadlines.slice(0, 8);
  },
  
  async fetchFeed(feed) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    
    try {
      const response = await fetch(feed.url, {
        signal: controller.signal,
        headers: {
          "User-Agent": "PowerHoof/1.0",
          "Accept": "application/rss+xml, application/xml, text/xml"
        }
      });
      clearTimeout(timeout);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      const xml = await response.text();
      return this.parseRSS(xml, feed.name);
    } catch (error) {
      clearTimeout(timeout);
      throw error;
    }
  },
  
  parseRSS(xml, sourceName) {
    const headlines = [];
    
    // Extract items (works for both RSS and Atom)
    const itemRegex = /<item[^>]*>([\s\S]*?)<\/item>|<entry[^>]*>([\s\S]*?)<\/entry>/gi;
    let match;
    
    while ((match = itemRegex.exec(xml)) !== null && headlines.length < 5) {
      const content = match[1] || match[2];
      
      // Extract title
      const titleMatch = content.match(/<title[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>/i);
      const title = titleMatch 
        ? this.cleanText(titleMatch[1]) 
        : null;
      
      // Extract link
      const linkMatch = content.match(/<link[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/link>|<link[^>]*href=["']([^"']+)["']/i);
      const link = linkMatch 
        ? (linkMatch[1] || linkMatch[2])?.trim() 
        : null;
      
      // Extract date
      const dateMatch = content.match(/<pubDate[^>]*>([\s\S]*?)<\/pubDate>|<published[^>]*>([\s\S]*?)<\/published>|<updated[^>]*>([\s\S]*?)<\/updated>/i);
      const dateStr = dateMatch ? (dateMatch[1] || dateMatch[2] || dateMatch[3]) : null;
      const date = dateStr ? new Date(dateStr.trim()) : null;
      
      // Extract description
      const descMatch = content.match(/<description[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/description>|<summary[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/summary>/i);
      let description = descMatch 
        ? this.cleanText(descMatch[1] || descMatch[2]) 
        : null;
      
      if (description && description.length > 150) {
        description = description.substring(0, 150) + "...";
      }
      
      if (title) {
        headlines.push({
          title,
          link,
          date,
          description,
          source: sourceName
        });
      }
    }
    
    return headlines;
  },
  
  cleanText(text) {
    if (!text) return null;
    return text
      .replace(/<!\[CDATA\[|\]\]>/g, "")
      .replace(/<[^>]+>/g, "") // Remove HTML tags
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&nbsp;/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  },
  
  formatHeadlines(category, headlines) {
    const categoryEmoji = {
      tech: "💻",
      world: "🌍",
      business: "💼",
      science: "🔬",
      sports: "⚽"
    };
    
    const emoji = categoryEmoji[category] || "📰";
    let output = `## ${emoji} ${category.charAt(0).toUpperCase() + category.slice(1)} News\n\n`;
    
    for (const item of headlines) {
      output += `### ${item.title}\n`;
      if (item.description) {
        output += `${item.description}\n`;
      }
      output += `_${item.source}`;
      if (item.date && !isNaN(item.date.getTime())) {
        const timeAgo = this.getTimeAgo(item.date);
        output += ` • ${timeAgo}`;
      }
      output += `_`;
      if (item.link) {
        output += ` [Read →](${item.link})`;
      }
      output += `\n\n`;
    }
    
    output += `---\n_Categories: \`/news tech\`, \`/news world\`, \`/news business\`, \`/news science\`, \`/news sports\`_`;
    
    return output;
  },
  
  getTimeAgo(date) {
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    if (diffMins < 1) return "just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  },
  
  getHelp() {
    return `## 📰 News Skill

**Get headlines by category:**
- \`/news tech\` - Technology & startups
- \`/news world\` - Global news
- \`/news business\` - Finance & economy
- \`/news science\` - Science & space
- \`/news sports\` - Sports headlines

**Quick commands:**
- \`/news\` - Tech news (default)
- \`/headlines\` - Latest headlines
- \`latest tech news\`
- \`world news\`

_Powered by RSS feeds from major news sources_`;
  }
};

export default skill;
