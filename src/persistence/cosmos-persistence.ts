/**
 * Cosmos DB Persistence Layer
 * 
 * Manages conversation history and data persistence using Azure Cosmos DB.
 * Uses the powerhoof-cosmos account with database "powerhoof".
 */

import { CosmosClient, Container, Database } from "@azure/cosmos";
import { createLogger } from "../utils/logger.js";

const logger = createLogger("cosmos-persistence");

export interface ConversationMessage {
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: Date;
  metadata?: Record<string, unknown>;
}

export interface Conversation {
  id: string;
  sessionId: string;
  userId?: string;
  messages: ConversationMessage[];
  createdAt: Date;
  updatedAt: Date;
  metadata?: Record<string, unknown>;
}

export interface UserPreferences {
  id: string;
  userId: string;
  preferences: Record<string, unknown>;
  updatedAt: Date;
}

export interface CosmosConfig {
  endpoint?: string;
  key?: string;
  databaseId?: string;
  connectionString?: string;
}

/**
 * Cosmos DB persistence service for conversations and user data
 */
export class CosmosPersistence {
  private client: CosmosClient;
  private database: Database | null = null;
  private containers: Map<string, Container> = new Map();
  private config: Required<Pick<CosmosConfig, "databaseId">>;

  // Container names
  static readonly CONTAINERS = {
    CONVERSATIONS: "conversations",
    USERS: "users",
    PREFERENCES: "preferences",
    MEMORY: "memory",
  };

  constructor(config: CosmosConfig = {}) {
    const endpoint = config.endpoint || process.env.COSMOS_ENDPOINT;
    const key = config.key || process.env.COSMOS_KEY;
    const connectionString = config.connectionString || process.env.COSMOS_CONNECTION_STRING;

    if (connectionString) {
      this.client = new CosmosClient(connectionString);
    } else if (endpoint && key) {
      this.client = new CosmosClient({ endpoint, key });
    } else {
      throw new Error("Cosmos DB requires either connectionString or endpoint+key");
    }

    this.config = {
      databaseId: config.databaseId || process.env.COSMOS_DATABASE || "powerhoof",
    };

    logger.info("CosmosPersistence initialized", { database: this.config.databaseId });
  }

  /**
   * Initialize database and containers
   */
  async initialize(): Promise<void> {
    // Create database if not exists
    const { database } = await this.client.databases.createIfNotExists({
      id: this.config.databaseId,
    });
    this.database = database;

    // Create containers
    await this.ensureContainer(CosmosPersistence.CONTAINERS.CONVERSATIONS, "/sessionId");
    await this.ensureContainer(CosmosPersistence.CONTAINERS.USERS, "/userId");
    await this.ensureContainer(CosmosPersistence.CONTAINERS.PREFERENCES, "/userId");
    await this.ensureContainer(CosmosPersistence.CONTAINERS.MEMORY, "/category");

    logger.info("Cosmos DB initialized with all containers");
  }

  private async ensureContainer(containerId: string, partitionKey: string): Promise<Container> {
    if (!this.database) throw new Error("Database not initialized");

    const { container } = await this.database.containers.createIfNotExists({
      id: containerId,
      partitionKey: { paths: [partitionKey] },
    });

    this.containers.set(containerId, container);
    logger.debug("Container ready", { containerId });
    return container;
  }

  private getContainer(name: string): Container {
    const container = this.containers.get(name);
    if (!container) throw new Error(`Container ${name} not initialized`);
    return container;
  }

  // ==================== Conversation Methods ====================

  /**
   * Create new conversation
   */
  async createConversation(sessionId: string, userId?: string): Promise<Conversation> {
    const conversation: Conversation = {
      id: `conv_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
      sessionId,
      userId,
      messages: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await this.getContainer(CosmosPersistence.CONTAINERS.CONVERSATIONS)
      .items.create(conversation);

    logger.info("Conversation created", { id: conversation.id, sessionId });
    return conversation;
  }

  /**
   * Get conversation by ID
   */
  async getConversation(id: string, sessionId: string): Promise<Conversation | null> {
    try {
      const { resource } = await this.getContainer(CosmosPersistence.CONTAINERS.CONVERSATIONS)
        .item(id, sessionId)
        .read<Conversation>();
      return resource || null;
    } catch (error: any) {
      if (error.code === 404) return null;
      throw error;
    }
  }

  /**
   * Get conversations by session
   */
  async getConversationsBySession(sessionId: string): Promise<Conversation[]> {
    const { resources } = await this.getContainer(CosmosPersistence.CONTAINERS.CONVERSATIONS)
      .items.query({
        query: "SELECT * FROM c WHERE c.sessionId = @sessionId ORDER BY c.createdAt DESC",
        parameters: [{ name: "@sessionId", value: sessionId }],
      })
      .fetchAll();

    return resources;
  }

  /**
   * Add message to conversation
   */
  async addMessage(
    conversationId: string,
    sessionId: string,
    message: Omit<ConversationMessage, "timestamp">
  ): Promise<Conversation> {
    const container = this.getContainer(CosmosPersistence.CONTAINERS.CONVERSATIONS);
    
    const newMessage: ConversationMessage = {
      ...message,
      timestamp: new Date(),
    };

    // Use patch operation to append message
    const { resource } = await container.item(conversationId, sessionId).patch([
      { op: "add", path: "/messages/-", value: newMessage },
      { op: "set", path: "/updatedAt", value: new Date().toISOString() },
    ]);

    logger.debug("Message added", { conversationId, role: message.role });
    return resource as Conversation;
  }

  /**
   * Get recent messages from conversation
   */
  async getRecentMessages(
    conversationId: string,
    sessionId: string,
    limit: number = 10
  ): Promise<ConversationMessage[]> {
    const conversation = await this.getConversation(conversationId, sessionId);
    if (!conversation) return [];
    
    return conversation.messages.slice(-limit);
  }

  /**
   * Delete conversation
   */
  async deleteConversation(id: string, sessionId: string): Promise<void> {
    await this.getContainer(CosmosPersistence.CONTAINERS.CONVERSATIONS)
      .item(id, sessionId)
      .delete();
    logger.info("Conversation deleted", { id });
  }

  // ==================== User Preferences Methods ====================

  /**
   * Get or create user preferences
   */
  async getUserPreferences(userId: string): Promise<UserPreferences> {
    const container = this.getContainer(CosmosPersistence.CONTAINERS.PREFERENCES);

    try {
      const { resource } = await container.item(userId, userId).read<UserPreferences>();
      if (resource) return resource;
    } catch (error: any) {
      if (error.code !== 404) throw error;
    }

    // Create default preferences
    const prefs: UserPreferences = {
      id: userId,
      userId,
      preferences: {},
      updatedAt: new Date(),
    };
    await container.items.create(prefs);
    return prefs;
  }

  /**
   * Update user preferences
   */
  async updateUserPreferences(
    userId: string,
    preferences: Record<string, unknown>
  ): Promise<UserPreferences> {
    const container = this.getContainer(CosmosPersistence.CONTAINERS.PREFERENCES);

    const { resource } = await container.item(userId, userId).patch([
      { op: "set", path: "/preferences", value: preferences },
      { op: "set", path: "/updatedAt", value: new Date().toISOString() },
    ]);

    logger.debug("Preferences updated", { userId });
    return resource as UserPreferences;
  }

  // ==================== Memory/Knowledge Methods ====================

  /**
   * Store memory item
   */
  async storeMemory(
    category: string,
    key: string,
    value: unknown,
    metadata?: Record<string, unknown>
  ): Promise<void> {
    const container = this.getContainer(CosmosPersistence.CONTAINERS.MEMORY);

    const item = {
      id: `${category}_${key}`,
      category,
      key,
      value,
      metadata,
      updatedAt: new Date(),
    };

    await container.items.upsert(item);
    logger.debug("Memory stored", { category, key });
  }

  /**
   * Retrieve memory item
   */
  async getMemory(category: string, key: string): Promise<unknown | null> {
    const container = this.getContainer(CosmosPersistence.CONTAINERS.MEMORY);

    try {
      const { resource } = await container.item(`${category}_${key}`, category).read();
      return resource?.value || null;
    } catch (error: any) {
      if (error.code === 404) return null;
      throw error;
    }
  }

  /**
   * Get all memory items in category
   */
  async getMemoryCategory(category: string): Promise<Array<{ key: string; value: unknown }>> {
    const container = this.getContainer(CosmosPersistence.CONTAINERS.MEMORY);

    const { resources } = await container.items.query({
      query: "SELECT c.key, c.value FROM c WHERE c.category = @category",
      parameters: [{ name: "@category", value: category }],
    }).fetchAll();

    return resources;
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<{ status: string; database: string; containers: string[] }> {
    const dbInfo = await this.database?.read();
    return {
      status: dbInfo ? "healthy" : "unhealthy",
      database: this.config.databaseId,
      containers: Array.from(this.containers.keys()),
    };
  }
}

/**
 * Create Cosmos persistence from environment
 */
export function createCosmosPersistenceFromEnv(): CosmosPersistence {
  return new CosmosPersistence({
    connectionString: process.env.COSMOS_CONNECTION_STRING,
    endpoint: process.env.COSMOS_ENDPOINT,
    key: process.env.COSMOS_KEY,
    databaseId: process.env.COSMOS_DATABASE || "powerhoof",
  });
}

// Singleton instance
let persistenceInstance: CosmosPersistence | null = null;

export async function getCosmosPersistence(): Promise<CosmosPersistence> {
  if (!persistenceInstance) {
    persistenceInstance = createCosmosPersistenceFromEnv();
    await persistenceInstance.initialize();
  }
  return persistenceInstance;
}
