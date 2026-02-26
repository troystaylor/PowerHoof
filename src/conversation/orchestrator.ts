/**
 * LLM Orchestrator
 *
 * Orchestrates the conversation loop between user, LLM, and Nushell execution.
 * This is the core PowerHoof agent loop.
 */

import { ProviderRegistry } from "../providers/index.js";
import { ConversationManager } from "./manager.js";
import {
  SessionExecutor,
  generateCommandReference,
  ExecutionResult,
} from "../nushell/index.js";
import { logger } from "../utils/logger.js";
import { skillMetrics } from "../skills/metrics.js";
import type { SkillRegistry, SkillContext } from "../skills/index.js";
import type { InboundMessage } from "../channels/types.js";

export interface OrchestratorConfig {
  /** Maximum tokens for context window */
  maxContextTokens: number;
  /** Maximum Nushell iterations per turn */
  maxNushellIterations: number;
  /** Model for main reasoning */
  reasoningModel?: string;
  /** Enable reasoning/thinking mode */
  enableReasoning?: boolean;
  /** Skill registry for handling skill-based commands */
  skillRegistry?: SkillRegistry;
}

export interface TurnResult {
  response: string;
  nushellExecutions: ExecutionResult[];
  tokenUsage: {
    prompt: number;
    completion: number;
    total: number;
  };
  reasoning?: string;
}

export interface Orchestrator {
  /**
   * Process a user message and return the agent's response.
   */
  processMessage(conversationId: string, userMessage: string): Promise<TurnResult>;

  /**
   * Start a new conversation and process the initial message.
   */
  startConversation(
    userMessage: string,
    metadata?: Record<string, unknown>
  ): Promise<{ conversationId: string; result: TurnResult }>;

  /**
   * Get the system prompt for the agent.
   */
  getSystemPrompt(): string;

  /**
   * Execute a Nushell script directly (for Power Automate integration).
   * @param script - The Nushell script to execute
   * @param input - Optional input data to pass as $input
   * @param timeout - Execution timeout in milliseconds
   */
  executeScript(
    script: string,
    input?: unknown,
    timeout?: number
  ): Promise<{ output: string; success: boolean; error?: string }>;
}

/**
 * Create the PowerHoof orchestrator.
 */
export function createOrchestrator(
  providers: ProviderRegistry,
  conversations: ConversationManager,
  executor: SessionExecutor,
  config: OrchestratorConfig
): Orchestrator {
  // Build Nushell command reference once
  const nushellReference = generateCommandReference();

  const systemPrompt = buildSystemPrompt(nushellReference);

  return {
    async processMessage(conversationId: string, userMessage: string): Promise<TurnResult> {
      const conversation = conversations.get(conversationId);
      if (!conversation) {
        throw new Error(`Conversation ${conversationId} not found`);
      }

      // Add user message
      conversations.addMessage(conversationId, {
        role: "user",
        content: userMessage,
      });

      // Check for skill matches if skillRegistry is available
      if (config.skillRegistry) {
        const skillContext: SkillContext = {
          message: {
            id: `msg-${Date.now()}`,
            channel: "rest",
            conversationId,
            sender: { id: "api-user", name: "User" },
            content: userMessage,
            isGroup: false,
            mentioned: true,
            timestamp: new Date(),
          } as InboundMessage,
          history: conversations.getMessagesForContext(conversationId, 10000).map((m, i) => ({
            id: `hist-${i}`,
            channel: "rest",
            conversationId,
            sender: { id: m.role === "user" ? "api-user" : "assistant", name: m.role === "user" ? "User" : "Assistant" },
            content: m.content,
            isGroup: false,
            mentioned: false,
            timestamp: new Date(),
          } as InboundMessage)),
          session: {
            id: conversationId,
            userId: "api-user",
            channel: "rest",
            metadata: conversation.metadata,
          },
        };

        const matchedSkills = await config.skillRegistry.match(skillContext);
        
        if (matchedSkills.length > 0) {
          // Use the first matching skill
          const skill = matchedSkills[0];
          logger.info(`Skill matched: ${skill.manifest.id} for message starting with "${userMessage.substring(0, 30)}..."`);
          
          const startTime = Date.now();
          
          try {
            const skillResult = await skill.execute(skillContext);
            
            // Handle skill chaining (delegate to another skill)
            if (skillResult.nextAction === "delegate" && skillResult.delegateTo) {
              const delegateSkill = config.skillRegistry.get(skillResult.delegateTo);
              if (delegateSkill) {
                logger.info(`Skill ${skill.manifest.id} delegating to ${skillResult.delegateTo}`);
                
                // Record original skill invocation
                skillMetrics.record({
                  skillId: skill.manifest.id,
                  skillName: skill.manifest.name,
                  timestamp: new Date(),
                  success: true,
                  durationMs: Date.now() - startTime,
                  channel: "rest",
                });
                
                const delegateStartTime = Date.now();
                
                // Update context message if delegateMessage is provided
                const delegateContext: SkillContext = {
                  ...skillContext,
                  message: skillResult.delegateMessage 
                    ? { ...skillContext.message, content: skillResult.delegateMessage }
                    : skillContext.message,
                };
                
                const delegateResult = await delegateSkill.execute(delegateContext);
                
                // Record delegated skill invocation
                skillMetrics.record({
                  skillId: delegateSkill.manifest.id,
                  skillName: delegateSkill.manifest.name,
                  timestamp: new Date(),
                  success: delegateResult.success,
                  durationMs: Date.now() - delegateStartTime,
                  channel: "rest",
                  delegatedFrom: skill.manifest.id,
                });
                
                if (delegateResult.success && delegateResult.content) {
                  conversations.addMessage(conversationId, {
                    role: "assistant",
                    content: delegateResult.content,
                    tokens: 0,
                  });

                  return {
                    response: delegateResult.content,
                    nushellExecutions: [],
                    tokenUsage: { prompt: 0, completion: 0, total: 0 },
                    reasoning: `Answered using skill: ${delegateSkill.manifest.name} (delegated from ${skill.manifest.name})`,
                  };
                }
              } else {
                logger.warn(`Delegate skill ${skillResult.delegateTo} not found, falling through to LLM`);
              }
            }
            
            // Handle explicit fallthrough to LLM
            if (skillResult.nextAction === "fallthrough") {
              logger.info(`Skill ${skill.manifest.id} requesting fallthrough to LLM`);
              // Record skill invocation even though it's passing through
              skillMetrics.record({
                skillId: skill.manifest.id,
                skillName: skill.manifest.name,
                timestamp: new Date(),
                success: true,
                durationMs: Date.now() - startTime,
                channel: "rest",
              });
              // Continue to LLM processing below
              // Note: delegateMessage currently not used - would require ConversationManager update
              // Fall through to LLM by not returning here
            } else if (skillResult.success && skillResult.content) {
              // Record successful skill invocation
              skillMetrics.record({
                skillId: skill.manifest.id,
                skillName: skill.manifest.name,
                timestamp: new Date(),
                success: true,
                durationMs: Date.now() - startTime,
                channel: "rest",
              });
              
              // Normal skill response
              conversations.addMessage(conversationId, {
                role: "assistant",
                content: skillResult.content,
                tokens: 0,
              });

              return {
                response: skillResult.content,
                nushellExecutions: [],
                tokenUsage: { prompt: 0, completion: 0, total: 0 },
                reasoning: `Answered using skill: ${skill.manifest.name}`,
              };
            }
          } catch (error) {
            logger.error(`Skill execution error for ${skill.manifest.id}:`, error);
            // Record failed skill invocation
            skillMetrics.record({
              skillId: skill.manifest.id,
              skillName: skill.manifest.name,
              timestamp: new Date(),
              success: false,
              durationMs: Date.now() - startTime,
              channel: "rest",
            });
            // Fall through to LLM if skill fails
          }
        }
      }

      const nushellExecutions: ExecutionResult[] = [];
      let totalPromptTokens = 0;
      let totalCompletionTokens = 0;
      let finalResponse = "";
      let reasoning: string | undefined;

      // Agent loop - may iterate if LLM returns Nushell to execute
      for (let iteration = 0; iteration < config.maxNushellIterations; iteration++) {
        // Build messages for context
        const contextMessages = conversations.getMessagesForContext(
          conversationId,
          config.maxContextTokens - estimateTokens(systemPrompt)
        );

        // Call LLM
        const llmResult = await providers.chat({
          messages: [{ role: "system", content: systemPrompt }, ...contextMessages],
          reasoning: config.enableReasoning,
          reasoningEffort: "medium",
        });

        totalPromptTokens += llmResult.usage.promptTokens;
        totalCompletionTokens += llmResult.usage.completionTokens;

        if (llmResult.reasoning) {
          reasoning = llmResult.reasoning;
        }

        const assistantContent = llmResult.content;

        // Check if response contains Nushell code to execute
        const nushellBlock = extractNushellBlock(assistantContent);

        if (nushellBlock) {
          // Execute the Nushell script
          const execResult = await executor.execute({
            script: nushellBlock,
            sessionId: conversationId,
            timeoutMs: 30_000,
          });

          nushellExecutions.push(execResult);

          // Add assistant message with Nushell
          conversations.addMessage(conversationId, {
            role: "assistant",
            content: assistantContent,
            tokens: llmResult.usage.completionTokens,
          });

          // Add execution result as a synthetic message
          const resultContent = formatExecutionResult(execResult);
          conversations.addMessage(conversationId, {
            role: "user",
            content: `[Nushell Result]\n${resultContent}`,
            nushellResult: {
              script: nushellBlock,
              output: execResult.output,
              success: execResult.success,
              durationMs: execResult.durationMs,
            },
          });

          // If execution failed, break the loop - LLM can explain the error
          if (!execResult.success) {
            logger.warn(`Nushell execution failed: ${execResult.error}`);
          }

          // Continue loop to let LLM process the result
          continue;
        }

        // No Nushell block - this is the final response
        finalResponse = assistantContent;

        conversations.addMessage(conversationId, {
          role: "assistant",
          content: assistantContent,
          tokens: llmResult.usage.completionTokens,
        });

        break;
      }

      return {
        response: finalResponse,
        nushellExecutions,
        tokenUsage: {
          prompt: totalPromptTokens,
          completion: totalCompletionTokens,
          total: totalPromptTokens + totalCompletionTokens,
        },
        reasoning,
      };
    },

    async startConversation(
      userMessage: string,
      metadata?: Record<string, unknown>
    ): Promise<{ conversationId: string; result: TurnResult }> {
      const conversation = conversations.create(metadata);

      const result = await this.processMessage(conversation.id, userMessage);

      return {
        conversationId: conversation.id,
        result,
      };
    },

    async executeScript(
      script: string,
      input?: unknown,
      timeout?: number
    ): Promise<{ output: string; success: boolean; error?: string }> {
      logger.info("Direct script execution request", { scriptLength: script.length, hasInput: !!input });

      try {
        // Build the full script with input if provided
        let fullScript = script;
        if (input !== undefined) {
          const inputJson = JSON.stringify(input);
          fullScript = `let input = (${inputJson} | from json)\n${script}`;
        }

        const result: ExecutionResult = await executor.execute({
          sessionId: `direct-${Date.now()}`,
          script: fullScript,
          timeoutMs: timeout ?? 30000,
        });

        return {
          output: result.output,
          success: result.success,
          error: result.error,
        };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Execution failed";
        logger.error("Direct script execution error:", error);
        return {
          output: "",
          success: false,
          error: errorMessage,
        };
      }
    },

    getSystemPrompt(): string {
      return systemPrompt;
    },
  };
}

/**
 * Build the system prompt with Nushell reference.
 */
function buildSystemPrompt(nushellReference: string): string {
  return `You are PowerHoof, an AI assistant that helps users by executing tasks using Nushell commands.

## Capabilities

You can execute Nushell scripts to:
- Work with files and directories
- Process structured data (JSON, CSV, tables)
- Make web requests
- Manage Azure resources
- Search the web
- Store and recall information

## Nushell Command Reference

${nushellReference}

## Usage

When you need to perform an action, write the Nushell script in a fenced code block:

\`\`\`nushell
# Your Nushell script here
ls | where size > 1mb | sort-by size -r
\`\`\`

The script will be executed and you'll receive the results. You can then explain the results to the user or perform additional actions.

## Guidelines

1. **Prefer Nushell over text responses** when actions can accomplish the user's goal
2. **Chain pipelines** to process data efficiently
3. **Use structured output** (tables, JSON) for data
4. **Explain results** after execution in natural language
5. **Handle errors gracefully** and offer alternatives
6. **Use PowerHoof commands** (ph-*) for enhanced capabilities

## Safety

- You cannot modify system files or environment
- Network access is sandboxed
- Dangerous commands are blocked
- The sandbox has Hyper-V isolation`;
}

/**
 * Extract a Nushell code block from LLM response.
 */
function extractNushellBlock(content: string): string | null {
  // Match ```nushell or ```nu code blocks
  const nushellMatch = content.match(/```(?:nushell|nu)\n([\s\S]*?)```/);
  if (nushellMatch) {
    return nushellMatch[1].trim();
  }

  return null;
}

/**
 * Format execution result for feeding back to LLM.
 */
function formatExecutionResult(result: ExecutionResult): string {
  if (result.success) {
    if (result.data) {
      return JSON.stringify(result.data, null, 2);
    }
    return result.output || "(No output)";
  }

  return `Error: ${result.error || "Unknown error"}\n\nOutput:\n${result.output}`;
}

/**
 * Simple token estimation.
 */
function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}
