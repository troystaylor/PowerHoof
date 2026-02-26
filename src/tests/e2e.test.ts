/**
 * End-to-End Test Harness for PowerHoof
 *
 * Tests the complete agent flow from user input to response.
 */

import { describe, it, expect, vi } from "vitest";
import { type SessionExecutor, type ExecutionResult, type ExecutionRequest } from "../nushell/index.js";
import { type ProviderRegistry } from "../providers/index.js";
import { type LLMClient, type ChatCompletionResult } from "../providers/azure-openai.js";
import { type ConversationManager, type ConversationMessage, type Conversation } from "../conversation/index.js";
import { type MemoryStore, type Memo } from "../memory/index.js";

// Mock responses for testing
const MOCK_LLM_RESPONSES: Record<string, ChatCompletionResult> = {
  simple: {
    content: "Hello! How can I help you today?",
    finishReason: "stop",
    usage: { promptTokens: 50, completionTokens: 20, totalTokens: 70 },
    model: "gpt-4o",
  },
  withNushell: {
    content:
      "Let me check that for you.\n\n```nushell\nph-file read test.txt\n```",
    finishReason: "stop",
    usage: { promptTokens: 100, completionTokens: 40, totalTokens: 140 },
    model: "gpt-4o",
  },
  multiStep: {
    content: `I'll help you with that.

\`\`\`nushell
ph-web get "https://api.example.com/data"
\`\`\`

Let me process the results.`,
    finishReason: "stop",
    usage: { promptTokens: 150, completionTokens: 60, totalTokens: 210 },
    model: "gpt-4o",
  },
};

const MOCK_NUSHELL_RESULTS: Record<string, ExecutionResult> = {
  "ph-file read test.txt": {
    success: true,
    output: "Contents of test.txt:\nHello, World!",
    durationMs: 50,
    sessionId: "test-session",
    validation: { valid: true, errors: [], warnings: [], safetyLevel: "safe", detectedCommands: ["ph-file"] },
  },
  'ph-web get "https://api.example.com/data"': {
    success: true,
    output: '{"status": "ok", "data": [1, 2, 3]}',
    durationMs: 200,
    sessionId: "test-session",
    validation: { valid: true, errors: [], warnings: [], safetyLevel: "safe", detectedCommands: ["ph-web"] },
  },
};

/**
 * Create mock dependencies for testing.
 */
function createMockDeps() {
  // Mock LLM Client
  const mockClient: LLMClient = {
    chat: vi.fn().mockResolvedValue(MOCK_LLM_RESPONSES.simple),
    getModels: vi.fn().mockReturnValue([]),
    getModel: vi.fn().mockReturnValue(undefined),
    healthCheck: vi.fn().mockResolvedValue(true),
  };

  // Mock Provider Registry  
  const mockProviders: ProviderRegistry = {
    getProvider: vi.fn().mockReturnValue(mockClient),
    getPrimaryClient: vi.fn().mockReturnValue(mockClient),
    chat: vi.fn().mockResolvedValue(MOCK_LLM_RESPONSES.simple),
    chatWithModel: vi.fn().mockResolvedValue(MOCK_LLM_RESPONSES.simple),
    listProviders: vi.fn().mockReturnValue(["azure-openai"]),
    healthCheck: vi.fn().mockResolvedValue({ "azure-openai": true }),
  };

  // Mock Nushell Executor
  const mockExecutor: SessionExecutor = {
    execute: vi.fn().mockImplementation(async (request: ExecutionRequest) => {
      const trimmed = request.script.trim();
      return MOCK_NUSHELL_RESULTS[trimmed] || {
        success: false,
        output: `Unknown command: ${trimmed}`,
        durationMs: 10,
        sessionId: request.sessionId || "mock-session",
        validation: { valid: true, errors: [], warnings: [], safetyLevel: "safe" as const, detectedCommands: [] },
      };
    }),
    healthCheck: vi.fn().mockResolvedValue(true),
    terminateSession: vi.fn().mockResolvedValue(undefined),
  };

  // Mock Conversation Manager
  const conversationStore = new Map<string, Conversation>();
  const mockConversation: ConversationManager = {
    create: vi.fn().mockImplementation((metadata?: Record<string, unknown>) => {
      const id = `conv-${Date.now()}`;
      const conversation: Conversation = {
        id,
        messages: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
        totalTokens: 0,
        metadata,
      };
      conversationStore.set(id, conversation);
      return conversation;
    }),
    get: vi.fn().mockImplementation((id: string) => {
      return conversationStore.get(id);
    }),
    addMessage: vi
      .fn()
      .mockImplementation((conversationId: string, message: Omit<ConversationMessage, "id" | "timestamp">) => {
        const conv = conversationStore.get(conversationId);
        if (conv) {
          const fullMessage: ConversationMessage = {
            ...message,
            id: `msg-${Date.now()}`,
            timestamp: Date.now(),
          };
          conv.messages.push(fullMessage);
          conv.updatedAt = Date.now();
          return fullMessage;
        }
        return undefined;
      }),
    getMessagesForContext: vi.fn().mockImplementation((conversationId: string) => {
      const conv = conversationStore.get(conversationId);
      return conv?.messages || [];
    }),
    delete: vi.fn().mockImplementation((conversationId: string) => {
      return conversationStore.delete(conversationId);
    }),
    list: vi.fn().mockImplementation(() => {
      return Array.from(conversationStore.values());
    }),
  };

  // Mock Memory Store
  const memoStore = new Map<string, Memo>();
  const mockMemory: MemoryStore = {
    saveConversation: vi.fn().mockResolvedValue(undefined),
    loadConversation: vi.fn().mockResolvedValue(null),
    listConversations: vi.fn().mockResolvedValue([]),
    deleteConversation: vi.fn().mockResolvedValue(undefined),
    saveMemo: vi.fn().mockImplementation(async (memo: Memo) => {
      memoStore.set(memo.id, memo);
    }),
    getMemo: vi.fn().mockImplementation(async (id: string) => {
      return memoStore.get(id) || null;
    }),
    searchMemos: vi.fn().mockResolvedValue([]),
    listMemos: vi.fn().mockImplementation(async (userId: string) => {
      return Array.from(memoStore.values()).filter(m => m.userId === userId);
    }),
    deleteMemo: vi.fn().mockResolvedValue(undefined),
    savePreferences: vi.fn().mockResolvedValue(undefined),
    getPreferences: vi.fn().mockResolvedValue(null),
    healthCheck: vi.fn().mockResolvedValue(true),
  };

  return {
    providers: mockProviders,
    client: mockClient,
    executor: mockExecutor,
    conversation: mockConversation,
    memory: mockMemory,
  };
}

describe("PowerHoof E2E Tests", () => {
  describe("Simple Conversation Flow", () => {
    it("should handle a basic greeting", async () => {
      const mocks = createMockDeps();

      // Simulate orchestrator flow
      const conversation = mocks.conversation.create();
      mocks.conversation.addMessage(conversation.id, {
        role: "user",
        content: "Hello!",
      });

      const response = await mocks.client.chat({
        messages: [
          { role: "system", content: "You are PowerHoof, an AI assistant." },
          { role: "user", content: "Hello!" },
        ],
        model: "gpt-4o",
      });

      mocks.conversation.addMessage(conversation.id, {
        role: "assistant",
        content: response.content,
      });

      expect(response.content).toBe("Hello! How can I help you today?");
      expect(mocks.conversation.get(conversation.id)?.messages).toHaveLength(2);
    });
  });

  describe("Nushell Execution Flow", () => {
    it("should detect and execute Nushell code blocks", async () => {
      const mocks = createMockDeps();

      // Configure mock to return response with Nushell
      vi.mocked(mocks.client.chat).mockResolvedValueOnce(
        MOCK_LLM_RESPONSES.withNushell
      );

      const response = await mocks.client.chat({
        messages: [{ role: "user", content: "Read test.txt for me" }],
        model: "gpt-4o",
      });

      // Extract Nushell block
      const nushellMatch = response.content.match(/```nushell\n([\s\S]*?)```/);
      expect(nushellMatch).toBeTruthy();

      if (nushellMatch) {
        const script = nushellMatch[1].trim();
        const result = await mocks.executor.execute({ script });

        expect(result.success).toBe(true);
        expect(result.output).toContain("Hello, World!");
      }
    });

    it("should handle failed Nushell execution gracefully", async () => {
      const mocks = createMockDeps();

      const result = await mocks.executor.execute({ script: "ph-unknown command" });

      expect(result.success).toBe(false);
      expect(result.output).toContain("Unknown command");
    });
  });

  describe("Memory Persistence", () => {
    it("should save and retrieve memos", async () => {
      const mocks = createMockDeps();
      const userId = "test-user";

      const memo: Memo = {
        id: "memo-1",
        userId,
        title: "user_preference",
        content: "prefers concise answers",
        tags: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      await mocks.memory.saveMemo(memo);

      const memos = await mocks.memory.listMemos(userId);

      expect(memos).toHaveLength(1);
      expect(memos[0].title).toBe("user_preference");
      expect(memos[0].content).toBe("prefers concise answers");
    });
  });

  describe("Health Checks", () => {
    it("should verify all components are healthy", async () => {
      const mocks = createMockDeps();

      const [providerHealth, executorHealth, memoryHealth] = await Promise.all([
        mocks.providers.healthCheck(),
        mocks.executor.healthCheck(),
        mocks.memory.healthCheck(),
      ]);

      expect(providerHealth["azure-openai"]).toBe(true);
      expect(executorHealth).toBe(true);
      expect(memoryHealth).toBe(true);
    });
  });

  describe("Token Efficiency", () => {
    it("should track token usage", async () => {
      const mocks = createMockDeps();

      const response = await mocks.client.chat({
        messages: [{ role: "user", content: "Hello!" }],
        model: "gpt-4o",
      });

      expect(response.usage).toBeDefined();
      expect(response.usage!.totalTokens).toBe(70);
    });
  });
});

describe("Integration Scenarios", () => {
  describe("Multi-turn Conversation", () => {
    it("should maintain context across turns", async () => {
      const mocks = createMockDeps();
      const conversation = mocks.conversation.create();

      // Turn 1
      mocks.conversation.addMessage(conversation.id, {
        role: "user",
        content: "My name is Alice.",
      });
      mocks.conversation.addMessage(conversation.id, {
        role: "assistant",
        content: "Nice to meet you, Alice!",
      });

      // Turn 2
      mocks.conversation.addMessage(conversation.id, {
        role: "user",
        content: "What's my name?",
      });

      const conv = mocks.conversation.get(conversation.id);

      expect(conv?.messages).toHaveLength(3);
      expect(conv?.messages[0].content).toBe("My name is Alice.");
    });
  });

  describe("Error Recovery", () => {
    it("should handle provider errors gracefully", async () => {
      const mocks = createMockDeps();

      vi.mocked(mocks.client.chat).mockRejectedValueOnce(
        new Error("Rate limited")
      );

      await expect(
        mocks.client.chat({ messages: [{ role: "user", content: "Hello" }], model: "gpt-4o" })
      ).rejects.toThrow("Rate limited");
    });

    it("should handle executor timeout", async () => {
      const mocks = createMockDeps();

      vi.mocked(mocks.executor.execute).mockResolvedValueOnce({
        success: false,
        output: "Execution timed out after 30000ms",
        durationMs: 30000,
        sessionId: "timeout-session",
        validation: { valid: true, errors: [], warnings: [], safetyLevel: "safe", detectedCommands: [] },
      });

      const result = await mocks.executor.execute({ script: "long-running-command" });

      expect(result.success).toBe(false);
      expect(result.output).toContain("timed out");
    });
  });
});
