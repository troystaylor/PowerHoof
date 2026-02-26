/**
 * PowerHoof - Azure-native AI agent with Nushell execution
 *
 * Token-efficient alternative to MCP-based agents.
 * Uses structured Nushell pipelines instead of verbose tool schemas.
 */

import { startServer } from "./gateway/server.js";
import { loadConfig } from "./config/loader.js";
import { createProviderRegistry } from "./providers/index.js";
import { createConversationManager, createOrchestrator } from "./conversation/index.js";
import { createSessionExecutor, createMockExecutor, createLocalExecutor } from "./nushell/index.js";
import { createMemoryStore, createInMemoryStore } from "./memory/index.js";
import {
  createChannelRouter,
  createGraphAdapter,
  createDataverseAdapter,
  createPairingService,
} from "./channels/index.js";
import { createSkillRegistry, createSkillLoader } from "./skills/index.js";
import { logger } from "./utils/logger.js";

async function main(): Promise<void> {
  logger.info("Starting PowerHoof agent...");

  // Load configuration (with Key Vault resolution)
  const config = await loadConfig();

  // Initialize provider registry (Azure OpenAI)
  const providers = await createProviderRegistry(config);
  logger.info("Provider registry initialized");

  // Initialize conversation manager
  const conversations = createConversationManager();

  // Initialize Nushell executor based on config
  const executorType = config.nushell?.executorType || "mock";
  let executor;
  
  switch (executorType) {
    case "session":
      if (!config.nushell?.sessionPoolEndpoint) {
        throw new Error("NUSHELL_SESSION_POOL_ENDPOINT required for session executor");
      }
      executor = createSessionExecutor({
        sessionPoolEndpoint: config.nushell.sessionPoolEndpoint,
        defaultTimeoutMs: config.nushell.executionTimeoutMs,
      });
      logger.info("ACA Dynamic Sessions executor initialized");
      break;
      
    case "local":
      executor = createLocalExecutor({
        nuPath: config.nushell?.nuPath,
        defaultTimeoutMs: config.nushell?.executionTimeoutMs,
        workingDirectory: config.nushell?.workingDirectory,
      });
      logger.info("Local Nushell executor initialized");
      break;
      
    case "mock":
    default:
      executor = createMockExecutor();
      logger.info("Mock executor initialized (no real Nushell execution)");
      break;
  }

  // Initialize memory store
  const memory = config.memory?.cosmosEndpoint
    ? await createMemoryStore({
        endpoint: config.memory.cosmosEndpoint,
        databaseName: config.memory.databaseName || "powerhoof",
      })
    : createInMemoryStore();

  logger.info(
    config.memory?.cosmosEndpoint
      ? "Cosmos DB memory store initialized"
      : "Using in-memory store for local development"
  );

  // Initialize channel router and adapters
  const channelRouter = createChannelRouter();
  const pairing = createPairingService({
    codeExpirationMinutes: 15,
    onPairingRequest: (req) => logger.info(`New pairing request: ${req.senderId} - code: ${req.code}`),
  });

  // Initialize Graph adapter if configured
  if (config.channels?.graph?.enabled) {
    try {
      const graphAdapter = await createGraphAdapter(config.channels.graph);
      await graphAdapter.initialize();
      channelRouter.register(graphAdapter);
      logger.info("Graph channel adapter initialized (Teams/Outlook)");
    } catch (error) {
      logger.warn("Failed to initialize Graph adapter:", error);
    }
  }

  // Initialize Dataverse adapter if configured
  if (config.channels?.dataverse?.enabled) {
    try {
      const dataverseAdapter = await createDataverseAdapter(config.channels.dataverse);
      await dataverseAdapter.initialize();
      channelRouter.register(dataverseAdapter);
      logger.info("Dataverse channel adapter initialized (Power Platform)");
    } catch (error) {
      logger.warn("Failed to initialize Dataverse adapter:", error);
    }
  }

  // Initialize skill registry
  const skillRegistry = createSkillRegistry();
  const skillLoader = createSkillLoader({
    skillsDir: "./skills",
    watchForChanges: process.env.NODE_ENV !== "production",
  });

  // Load skills from directory
  try {
    const skills = await skillLoader.loadFromDirectory();
    for (const skill of skills) {
      skillRegistry.register(skill);
    }
    logger.info(`Loaded ${skillRegistry.list().length} skills`);
  } catch (error) {
    logger.warn("No skills directory found, continuing without skills");
  }

  // Create orchestrator
  const orchestrator = createOrchestrator(providers, conversations, executor, {
    maxContextTokens: 128_000, // GPT-4o context window
    maxNushellIterations: 5,
    enableReasoning: config.agent.compactionMode === "safeguard",
    skillRegistry,
  });

  // Start the gateway server
  const server = await startServer(config, orchestrator, memory, {
    channelRouter,
    pairing,
    skillRegistry,
  });

  const port = config.server.port;
  logger.info(`PowerHoof running on http://localhost:${port}`);
  logger.info(`Health check: http://localhost:${port}/health`);

  // Graceful shutdown
  process.on("SIGTERM", async () => {
    logger.info("Shutting down...");
    await channelRouter.shutdown();
    await server.close();
    process.exit(0);
  });
}

main().catch((error) => {
  logger.error("Fatal error:", error instanceof Error ? { message: error.message, stack: error.stack } : error);
  process.exit(1);
});
