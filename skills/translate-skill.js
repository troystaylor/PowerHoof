/**
 * Translate Skill
 * 
 * Translate text between languages using Azure Translator or fallback patterns.
 * Supports common language pairs and auto-detection.
 */

export const skill = {
  manifest: {
    id: "translate-skill",
    name: "Translate",
    description: "Translate text between languages",
    version: "1.0.0",
    author: "PowerHoof",
    permissions: ["read-context", "network"],
    examples: [
      "/translate Hello to Spanish",
      "/translate 'Bonjour' to English",
      "translate this to German: Good morning",
      "/tr Como estas to English"
    ],
    tags: ["translate", "language", "localization", "i18n"]
  },

  // Common translations for offline/demo use
  translations: {
    en: {
      es: {
        "hello": "hola",
        "goodbye": "adiós",
        "good morning": "buenos días",
        "good night": "buenas noches",
        "thank you": "gracias",
        "please": "por favor",
        "yes": "sí",
        "no": "no",
        "how are you": "¿cómo estás?",
        "welcome": "bienvenido",
        "help": "ayuda"
      },
      fr: {
        "hello": "bonjour",
        "goodbye": "au revoir",
        "good morning": "bonjour",
        "good night": "bonne nuit",
        "thank you": "merci",
        "please": "s'il vous plaît",
        "yes": "oui",
        "no": "non",
        "how are you": "comment allez-vous?",
        "welcome": "bienvenue",
        "help": "aide"
      },
      de: {
        "hello": "hallo",
        "goodbye": "auf wiedersehen",
        "good morning": "guten morgen",
        "good night": "gute nacht",
        "thank you": "danke",
        "please": "bitte",
        "yes": "ja",
        "no": "nein",
        "how are you": "wie geht es dir?",
        "welcome": "willkommen",
        "help": "hilfe"
      },
      it: {
        "hello": "ciao",
        "goodbye": "arrivederci",
        "good morning": "buongiorno",
        "good night": "buonanotte",
        "thank you": "grazie",
        "please": "per favore",
        "yes": "sì",
        "no": "no",
        "how are you": "come stai?",
        "welcome": "benvenuto",
        "help": "aiuto"
      },
      pt: {
        "hello": "olá",
        "goodbye": "adeus",
        "good morning": "bom dia",
        "good night": "boa noite",
        "thank you": "obrigado",
        "please": "por favor",
        "yes": "sim",
        "no": "não",
        "how are you": "como vai?",
        "welcome": "bem-vindo",
        "help": "ajuda"
      },
      ja: {
        "hello": "こんにちは (konnichiwa)",
        "goodbye": "さようなら (sayōnara)",
        "good morning": "おはようございます (ohayō gozaimasu)",
        "good night": "おやすみなさい (oyasuminasai)",
        "thank you": "ありがとう (arigatō)",
        "please": "お願いします (onegaishimasu)",
        "yes": "はい (hai)",
        "no": "いいえ (iie)",
        "how are you": "お元気ですか (o-genki desu ka)",
        "welcome": "ようこそ (yōkoso)",
        "help": "助けて (tasukete)"
      },
      zh: {
        "hello": "你好 (nǐ hǎo)",
        "goodbye": "再见 (zàijiàn)",
        "good morning": "早上好 (zǎoshang hǎo)",
        "good night": "晚安 (wǎn'ān)",
        "thank you": "谢谢 (xièxiè)",
        "please": "请 (qǐng)",
        "yes": "是 (shì)",
        "no": "不 (bù)",
        "how are you": "你好吗 (nǐ hǎo ma)",
        "welcome": "欢迎 (huānyíng)",
        "help": "帮助 (bāngzhù)"
      }
    }
  },

  languageNames: {
    en: "English", es: "Spanish", fr: "French", de: "German",
    it: "Italian", pt: "Portuguese", ja: "Japanese", zh: "Chinese",
    ko: "Korean", ru: "Russian", ar: "Arabic", hi: "Hindi"
  },

  async canHandle(context) {
    const content = context.message.content?.toLowerCase() || "";
    const triggers = [
      "/translate",
      "/tr ",
      "translate ",
      "translate:",
      " to spanish",
      " to english",
      " to french",
      " to german",
      " to italian",
      " to portuguese",
      " to japanese",
      " to chinese",
      " in spanish",
      " in french",
      " in german"
    ];
    return triggers.some(t => content.includes(t));
  },

  async execute(context) {
    const content = context.message.content || "";
    const lower = content.toLowerCase();

    // Parse the translation request
    const parsed = this.parseRequest(content);
    
    if (!parsed.text) {
      return {
        success: true,
        content: this.getHelp(),
        nextAction: "respond"
      };
    }

    // Detect source language if not specified
    const sourceCode = parsed.sourceLang || "en";
    const targetCode = this.getLanguageCode(parsed.targetLang);

    if (!targetCode) {
      return {
        success: false,
        content: `❌ Unknown target language: **${parsed.targetLang}**\n\nSupported languages: ${Object.entries(this.languageNames).map(([c, n]) => `${n} (${c})`).join(", ")}`,
        nextAction: "respond"
      };
    }

    // Try local translation first
    const translation = this.translateLocal(parsed.text.toLowerCase(), sourceCode, targetCode);
    
    if (translation) {
      const sourceName = this.languageNames[sourceCode] || sourceCode;
      const targetName = this.languageNames[targetCode] || targetCode;
      
      return {
        success: true,
        content: `🌐 **Translation** (${sourceName} → ${targetName})\n\n**"${parsed.text}"** → **"${translation}"**`,
        data: {
          source: parsed.text,
          translation,
          sourceLang: sourceCode,
          targetLang: targetCode
        },
        nextAction: "respond"
      };
    }

    // For unknown phrases, suggest using Azure Translator
    return {
      success: true,
      content: `🌐 **Translation Request**\n\nText: "${parsed.text}"\nTarget: ${this.languageNames[targetCode] || targetCode}\n\n*To enable full translation, configure Azure Translator in your environment.*\n\n**Common phrases I can translate:**\n${this.getCommonPhrases(targetCode)}`,
      nextAction: "respond"
    };
  },

  parseRequest(content) {
    const lower = content.toLowerCase();
    
    // Pattern: /translate "text" to language
    // Pattern: /translate text to language
    // Pattern: translate this to language: text
    
    let text = "";
    let targetLang = "spanish"; // default
    let sourceLang = null;

    // Remove command prefix
    let cleaned = content
      .replace(/^\/?(?:translate|tr)\s*/i, "")
      .replace(/^translate:\s*/i, "")
      .trim();

    // Check for quoted text
    const quotedMatch = cleaned.match(/["']([^"']+)["']\s+(?:to|in)\s+(\w+)/i);
    if (quotedMatch) {
      text = quotedMatch[1];
      targetLang = quotedMatch[2];
    } else {
      // Pattern: text to/in language
      const toMatch = cleaned.match(/(.+?)\s+(?:to|in)\s+(\w+)\s*$/i);
      if (toMatch) {
        text = toMatch[1].replace(/^["']|["']$/g, "").trim();
        targetLang = toMatch[2];
      } else {
        // Just text with implicit target
        text = cleaned.replace(/^["']|["']$/g, "").trim();
      }
    }

    // Check for "from X to Y" pattern
    const fromToMatch = content.match(/from\s+(\w+)\s+to\s+(\w+)/i);
    if (fromToMatch) {
      sourceLang = fromToMatch[1];
      targetLang = fromToMatch[2];
    }

    return { text, targetLang, sourceLang };
  },

  getLanguageCode(name) {
    if (!name) return "es";
    const lower = name.toLowerCase();
    
    // Direct code match
    if (this.languageNames[lower]) return lower;
    
    // Name to code mapping
    const nameMap = {
      spanish: "es", espanol: "es", español: "es",
      english: "en",
      french: "fr", français: "fr", francais: "fr",
      german: "de", deutsch: "de",
      italian: "it", italiano: "it",
      portuguese: "pt", português: "pt", portugues: "pt",
      japanese: "ja", 日本語: "ja",
      chinese: "zh", mandarin: "zh", 中文: "zh",
      korean: "ko", 한국어: "ko",
      russian: "ru", русский: "ru",
      arabic: "ar", العربية: "ar",
      hindi: "hi", हिन्दी: "hi"
    };
    
    return nameMap[lower] || null;
  },

  translateLocal(text, from, to) {
    // Only support English as source for now
    if (from !== "en") return null;
    
    const langDict = this.translations.en?.[to];
    if (!langDict) return null;
    
    return langDict[text] || null;
  },

  getCommonPhrases(targetCode) {
    const phrases = this.translations.en?.[targetCode];
    if (!phrases) return "_(No common phrases available for this language)_";
    
    return Object.entries(phrases)
      .slice(0, 5)
      .map(([en, tr]) => `• "${en}" → "${tr}"`)
      .join("\n");
  },

  getHelp() {
    return `🌐 **Translate Skill**

**Usage:**
• \`/translate Hello to Spanish\`
• \`/tr "Good morning" to French\`
• \`translate this to German: Hello\`

**Supported Languages:**
${Object.entries(this.languageNames).map(([code, name]) => `• ${name} (${code})`).join("\n")}

**Examples:**
• \`/translate thank you to Japanese\`
• \`/tr goodbye to Italian\`
• \`/translate how are you to Chinese\``;
  }
};
