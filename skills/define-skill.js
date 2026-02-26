/**
 * Define Skill
 * 
 * Get dictionary definitions using the Free Dictionary API.
 */

import { definitionCache } from "./skill-cache.js";

export const skill = {
  manifest: {
    id: "define-skill",
    name: "Dictionary",
    description: "Look up word definitions, synonyms, and pronunciation",
    version: "1.0.0",
    author: "PowerHoof",
    permissions: ["read-context", "network"],
    examples: [
      "define ephemeral",
      "/dict algorithm",
      "what does recursion mean"
    ],
    tags: ["dictionary", "definition", "language", "utility"]
  },

  async canHandle(context) {
    const content = context.message.content?.toLowerCase() || "";
    const triggers = [
      "/define",
      "/dict",
      "/dictionary",
      "/meaning",
      "define ",
      "definition of",
      "what does",
      "what is the meaning of",
      "what's the meaning of"
    ];
    
    // Check for triggers, but exclude if it matches weather/time patterns
    const excluded = ["weather", "time in", "translate"];
    if (excluded.some(e => content.includes(e))) {
      return false;
    }
    
    return triggers.some(t => content.includes(t));
  },

  async execute(context) {
    const content = context.message.content || "";
    
    // Extract word
    let word = content
      .replace(/^\/?(?:define|dict|dictionary|meaning)\s*/i, "")
      .replace(/^definition of\s*/i, "")
      .replace(/^what does\s*/i, "")
      .replace(/^what is the meaning of\s*/i, "")
      .replace(/^what's the meaning of\s*/i, "")
      .replace(/\s*mean\??$/i, "")
      .trim();

    if (!word) {
      return {
        success: true,
        content: "Please specify a word to define. Example: `/define algorithm`",
        nextAction: "respond"
      };
    }

    try {
      const cacheKey = `define:${word.toLowerCase()}`;
      const cached = definitionCache.get(cacheKey);
      if (cached) {
        return {
          success: true,
          content: cached + "\n\n_📦 Cached definition_",
          data: { word },
          nextAction: "respond"
        };
      }
      
      const definition = await this.lookupWord(word);
      definitionCache.set(cacheKey, definition);
      return {
        success: true,
        content: definition,
        data: { word },
        nextAction: "respond"
      };
    } catch (error) {
      return {
        success: true,
        content: `⚠️ **Word not found: "${word}"**\n\nCheck the spelling or try a different word.`,
        nextAction: "respond"
      };
    }
  },

  async lookupWord(word) {
    const url = `https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`;
    
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    
    try {
      const response = await fetch(url, { signal: controller.signal });
      clearTimeout(timeout);
      
      if (!response.ok) {
        throw new Error(`Word not found`);
      }
      
      const data = await response.json();
      return this.formatDefinition(data[0]);
    } catch (error) {
      clearTimeout(timeout);
      if (error.name === 'AbortError') {
        throw new Error('Dictionary service timed out');
      }
      throw error;
    }
  },

  formatDefinition(entry) {
    const word = entry.word;
    const phonetic = entry.phonetic || entry.phonetics?.find(p => p.text)?.text || "";
    
    let output = `## 📖 ${word}`;
    if (phonetic) {
      output += ` *${phonetic}*`;
    }
    output += "\n\n";

    // Audio pronunciation
    const audio = entry.phonetics?.find(p => p.audio)?.audio;
    if (audio) {
      output += `🔊 [Listen to pronunciation](${audio})\n\n`;
    }

    // Meanings by part of speech
    for (const meaning of entry.meanings || []) {
      const partOfSpeech = meaning.partOfSpeech;
      output += `### ${partOfSpeech}\n`;
      
      // Show up to 3 definitions
      const definitions = meaning.definitions?.slice(0, 3) || [];
      for (let i = 0; i < definitions.length; i++) {
        const def = definitions[i];
        output += `${i + 1}. ${def.definition}\n`;
        if (def.example) {
          output += `   > *"${def.example}"*\n`;
        }
      }
      
      // Synonyms
      if (meaning.synonyms?.length > 0) {
        const syns = meaning.synonyms.slice(0, 5).join(", ");
        output += `   **Synonyms:** ${syns}\n`;
      }
      
      // Antonyms
      if (meaning.antonyms?.length > 0) {
        const ants = meaning.antonyms.slice(0, 5).join(", ");
        output += `   **Antonyms:** ${ants}\n`;
      }
      
      output += "\n";
    }

    // Origin/etymology
    if (entry.origin) {
      output += `**Origin:** ${entry.origin}\n`;
    }

    return output.trim();
  }
};

export default skill;
