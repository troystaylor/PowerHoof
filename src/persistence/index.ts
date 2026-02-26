/**
 * Persistence Module
 * 
 * Data persistence layer with Cosmos DB support.
 */

export {
  CosmosPersistence,
  CosmosConfig,
  Conversation,
  ConversationMessage,
  UserPreferences,
  createCosmosPersistenceFromEnv,
  getCosmosPersistence,
} from "./cosmos-persistence.js";
