/**
 * Cosmos DB Memory Layer
 *
 * Persistent storage for conversations, user preferences, and memos.
 * Uses Azure Cosmos DB with Managed Identity authentication.
 */

import { CosmosClient, Container } from "@azure/cosmos";
import { DefaultAzureCredential } from "@azure/identity";
import { Conversation } from "../conversation/manager.js";
import { logger } from "../utils/logger.js";

export interface MemoryConfig {
  endpoint: string;
  databaseName: string;
  /** Container names for different data types */
  containers?: {
    conversations?: string;
    memos?: string;
    preferences?: string;
  };
}

export interface Memo {
  id: string;
  userId: string;
  title: string;
  content: string;
  tags: string[];
  createdAt: number;
  updatedAt: number;
}

export interface UserPreferences {
  userId: string;
  preferences: Record<string, unknown>;
  updatedAt: number;
}

export interface MemoryStore {
  // Conversation persistence
  saveConversation(conversation: Conversation): Promise<void>;
  loadConversation(id: string): Promise<Conversation | null>;
  listConversations(userId?: string, limit?: number): Promise<Conversation[]>;
  deleteConversation(id: string): Promise<void>;

  // Memo storage
  saveMemo(memo: Memo): Promise<void>;
  getMemo(id: string): Promise<Memo | null>;
  searchMemos(userId: string, query: string): Promise<Memo[]>;
  listMemos(userId: string, limit?: number): Promise<Memo[]>;
  deleteMemo(id: string): Promise<void>;

  // User preferences
  getPreferences(userId: string): Promise<UserPreferences | null>;
  savePreferences(preferences: UserPreferences): Promise<void>;

  // Health check
  healthCheck(): Promise<boolean>;
}

/**
 * Create a Cosmos DB memory store.
 */
export async function createMemoryStore(config: MemoryConfig): Promise<MemoryStore> {
  logger.info(`Initializing Cosmos DB memory store: ${config.endpoint}`);

  const credential = new DefaultAzureCredential();

  const client = new CosmosClient({
    endpoint: config.endpoint,
    aadCredentials: credential,
  });

  // Get or create database
  const { database } = await client.databases.createIfNotExists({
    id: config.databaseName,
  });

  // Container names
  const containerNames = {
    conversations: config.containers?.conversations || "conversations",
    memos: config.containers?.memos || "memos",
    preferences: config.containers?.preferences || "preferences",
  };

  // Get or create containers
  const containers: Record<string, Container> = {};

  for (const [key, name] of Object.entries(containerNames)) {
    const { container } = await database.containers.createIfNotExists({
      id: name,
      partitionKey: { paths: ["/userId"] },
    });
    containers[key] = container;
  }

  const conversationsContainer = containers.conversations;
  const memosContainer = containers.memos;
  const preferencesContainer = containers.preferences;

  return {
    async saveConversation(conversation: Conversation): Promise<void> {
      const doc = {
        ...conversation,
        partitionKey: (conversation.metadata?.userId as string) || "anonymous",
        type: "conversation",
      };

      await conversationsContainer.items.upsert(doc);
      logger.debug(`Saved conversation ${conversation.id}`);
    },

    async loadConversation(id: string): Promise<Conversation | null> {
      try {
        // Query across all partitions (inefficient, but works for lookup-by-id)
        const { resources } = await conversationsContainer.items
          .query({
            query: "SELECT * FROM c WHERE c.id = @id AND c.type = 'conversation'",
            parameters: [{ name: "@id", value: id }],
          })
          .fetchAll();

        if (resources.length === 0) {
          return null;
        }

        const doc = resources[0];
        return {
          id: doc.id,
          messages: doc.messages,
          createdAt: doc.createdAt,
          updatedAt: doc.updatedAt,
          totalTokens: doc.totalTokens,
          metadata: doc.metadata,
        };
      } catch (error) {
        logger.error(`Failed to load conversation ${id}:`, error);
        return null;
      }
    },

    async listConversations(userId?: string, limit: number = 20): Promise<Conversation[]> {
      let query = "SELECT * FROM c WHERE c.type = 'conversation'";
      const parameters: { name: string; value: string | number }[] = [];

      if (userId) {
        query += " AND c.partitionKey = @userId";
        parameters.push({ name: "@userId", value: userId });
      }

      query += " ORDER BY c.updatedAt DESC OFFSET 0 LIMIT @limit";
      parameters.push({ name: "@limit", value: limit });

      const { resources } = await conversationsContainer.items
        .query({ query, parameters })
        .fetchAll();

      return resources.map((doc) => ({
        id: doc.id,
        messages: doc.messages,
        createdAt: doc.createdAt,
        updatedAt: doc.updatedAt,
        totalTokens: doc.totalTokens,
        metadata: doc.metadata,
      }));
    },

    async deleteConversation(id: string): Promise<void> {
      // Query to find the partition key
      const { resources } = await conversationsContainer.items
        .query({
          query: "SELECT * FROM c WHERE c.id = @id AND c.type = 'conversation'",
          parameters: [{ name: "@id", value: id }],
        })
        .fetchAll();

      if (resources.length === 0) return;

      const partitionKey = (resources[0].metadata?.userId as string) || "anonymous";
      await conversationsContainer.item(id, partitionKey).delete();
      logger.debug(`Deleted conversation ${id}`);
    },

    async saveMemo(memo: Memo): Promise<void> {
      const doc = {
        ...memo,
        type: "memo",
      };

      await memosContainer.items.upsert(doc);
      logger.debug(`Saved memo ${memo.id}`);
    },

    async getMemo(id: string): Promise<Memo | null> {
      const { resources } = await memosContainer.items
        .query({
          query: "SELECT * FROM c WHERE c.id = @id AND c.type = 'memo'",
          parameters: [{ name: "@id", value: id }],
        })
        .fetchAll();

      if (resources.length === 0) {
        return null;
      }

      return resources[0] as Memo;
    },

    async searchMemos(userId: string, query: string): Promise<Memo[]> {
      // Simple contains search - for production, use Azure Cognitive Search
      const { resources } = await memosContainer.items
        .query({
          query: `
            SELECT * FROM c 
            WHERE c.userId = @userId 
            AND c.type = 'memo'
            AND (CONTAINS(LOWER(c.title), LOWER(@query)) OR CONTAINS(LOWER(c.content), LOWER(@query)))
          `,
          parameters: [
            { name: "@userId", value: userId },
            { name: "@query", value: query },
          ],
        })
        .fetchAll();

      return resources as Memo[];
    },

    async listMemos(userId: string, limit: number = 50): Promise<Memo[]> {
      const { resources } = await memosContainer.items
        .query({
          query:
            "SELECT * FROM c WHERE c.userId = @userId AND c.type = 'memo' ORDER BY c.updatedAt DESC OFFSET 0 LIMIT @limit",
          parameters: [
            { name: "@userId", value: userId },
            { name: "@limit", value: limit },
          ],
        })
        .fetchAll();

      return resources as Memo[];
    },

    async deleteMemo(id: string): Promise<void> {
      // Query to find the memo's userId (partition key)
      const { resources } = await memosContainer.items
        .query({
          query: "SELECT * FROM c WHERE c.id = @id AND c.type = 'memo'",
          parameters: [{ name: "@id", value: id }],
        })
        .fetchAll();

      if (resources.length === 0) return;

      await memosContainer.item(id, resources[0].userId).delete();
      logger.debug(`Deleted memo ${id}`);
    },

    async getPreferences(userId: string): Promise<UserPreferences | null> {
      try {
        const { resource } = await preferencesContainer.item(userId, userId).read();
        if (!resource) return null;

        return {
          userId: resource.userId,
          preferences: resource.preferences,
          updatedAt: resource.updatedAt,
        };
      } catch (error) {
        if ((error as { code?: number }).code === 404) {
          return null;
        }
        throw error;
      }
    },

    async savePreferences(preferences: UserPreferences): Promise<void> {
      const doc = {
        id: preferences.userId,
        ...preferences,
        type: "preferences",
      };

      await preferencesContainer.items.upsert(doc);
      logger.debug(`Saved preferences for user ${preferences.userId}`);
    },

    async healthCheck(): Promise<boolean> {
      try {
        await database.read();
        return true;
      } catch (error) {
        logger.warn("Cosmos DB health check failed:", error);
        return false;
      }
    },
  };
}

/**
 * Create an in-memory store for local development.
 */
export function createInMemoryStore(): MemoryStore {
  const conversations = new Map<string, Conversation>();
  const memos = new Map<string, Memo>();
  const preferences = new Map<string, UserPreferences>();

  return {
    async saveConversation(conversation: Conversation): Promise<void> {
      conversations.set(conversation.id, conversation);
    },

    async loadConversation(id: string): Promise<Conversation | null> {
      return conversations.get(id) || null;
    },

    async listConversations(userId?: string, limit: number = 20): Promise<Conversation[]> {
      let result = Array.from(conversations.values());

      if (userId) {
        result = result.filter((c) => c.metadata?.userId === userId);
      }

      return result.sort((a, b) => b.updatedAt - a.updatedAt).slice(0, limit);
    },

    async deleteConversation(id: string): Promise<void> {
      conversations.delete(id);
    },

    async saveMemo(memo: Memo): Promise<void> {
      memos.set(memo.id, memo);
    },

    async getMemo(id: string): Promise<Memo | null> {
      return memos.get(id) || null;
    },

    async searchMemos(userId: string, query: string): Promise<Memo[]> {
      const lowerQuery = query.toLowerCase();
      return Array.from(memos.values()).filter(
        (m) =>
          m.userId === userId &&
          (m.title.toLowerCase().includes(lowerQuery) ||
            m.content.toLowerCase().includes(lowerQuery))
      );
    },

    async listMemos(userId: string, limit: number = 50): Promise<Memo[]> {
      return Array.from(memos.values())
        .filter((m) => m.userId === userId)
        .sort((a, b) => b.updatedAt - a.updatedAt)
        .slice(0, limit);
    },

    async deleteMemo(id: string): Promise<void> {
      memos.delete(id);
    },

    async getPreferences(userId: string): Promise<UserPreferences | null> {
      return preferences.get(userId) || null;
    },

    async savePreferences(prefs: UserPreferences): Promise<void> {
      preferences.set(prefs.userId, prefs);
    },

    async healthCheck(): Promise<boolean> {
      return true;
    },
  };
}
