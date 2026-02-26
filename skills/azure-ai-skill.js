/**
 * Azure AI Skill
 * Document Intelligence, Language, and Vision service patterns.
 */

export const skill = {
  manifest: {
    id: "azure-ai-skill",
    name: "AzureAI",
    description: "Azure AI assistant - Document Intelligence, Language, Vision",
    version: "1.0.0",
    author: "PowerHoof",
    permissions: ["read-context"],
    examples: [
      "/azureai document intelligence",
      "/docint extract invoice",
      "/azureai sentiment analysis"
    ],
    tags: ["azure-ai", "cognitive-services", "document-intelligence", "language", "vision"]
  },

  knowledge: {
    documentIntelligence: {
      models: ['prebuilt-invoice', 'prebuilt-receipt', 'prebuilt-idDocument', 'prebuilt-businessCard', 'prebuilt-layout', 'prebuilt-read'],
      example: `const client = new DocumentAnalysisClient(endpoint, new AzureKeyCredential(key));
const poller = await client.beginAnalyzeDocument("prebuilt-invoice", documentUrl);
const result = await poller.pollUntilDone();
for (const document of result.documents) {
  console.log(document.fields.VendorName?.content);
  console.log(document.fields.InvoiceTotal?.content);
}`
    },
    language: {
      features: ['Sentiment Analysis', 'Key Phrase Extraction', 'Named Entity Recognition', 'Language Detection', 'Text Summarization'],
      example: `const client = new TextAnalyticsClient(endpoint, new AzureKeyCredential(key));
const results = await client.analyzeSentiment(["I love this product!"]);
console.log(results[0].sentiment); // "positive"`
    },
    vision: {
      features: ['Image Analysis', 'OCR', 'Face Detection', 'Object Detection', 'Custom Vision'],
      example: `const client = new ComputerVisionClient(new ApiKeyCredentials({inHeader:{'Ocp-Apim-Subscription-Key':key}}), endpoint);
const result = await client.analyzeImage(imageUrl, {visualFeatures:['Tags','Description']});`
    }
  },

  async canHandle(context) {
    const content = context.message.content?.toLowerCase() || "";
    return ['/azureai', '/docint', '/cognitive', 'document intelligence', 'azure ai'].some(t => content.includes(t));
  },

  async execute(context) {
    const content = context.message.content.toLowerCase();
    
    if (content.includes('document') || content.includes('invoice') || content.includes('receipt') || content.includes('docint')) {
      return {
        success: true,
        content: `**Document Intelligence:**\n\n**Models:** ${this.knowledge.documentIntelligence.models.join(', ')}\n\n**Example:**\n\`\`\`javascript\n${this.knowledge.documentIntelligence.example}\n\`\`\``
      };
    }
    
    if (content.includes('sentiment') || content.includes('language') || content.includes('text')) {
      return {
        success: true,
        content: `**Language Service:**\n\n**Features:** ${this.knowledge.language.features.join(', ')}\n\n**Example:**\n\`\`\`javascript\n${this.knowledge.language.example}\n\`\`\``
      };
    }
    
    if (content.includes('vision') || content.includes('image') || content.includes('ocr')) {
      return {
        success: true,
        content: `**Computer Vision:**\n\n**Features:** ${this.knowledge.vision.features.join(', ')}\n\n**Example:**\n\`\`\`javascript\n${this.knowledge.vision.example}\n\`\`\``
      };
    }
    
    return {
      success: true,
      content: `**Azure AI Assistant**\n\n- Document Intelligence (invoices, receipts, IDs)\n- Language Service (sentiment, NER, summarization)\n- Computer Vision (OCR, analysis)\n\nTry: "/azureai document intelligence" or "/azureai sentiment"`
    };
  }
};
