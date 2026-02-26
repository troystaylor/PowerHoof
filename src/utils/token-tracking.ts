/**
 * Token Usage Tracking & Comparison
 *
 * Tracks token usage and demonstrates efficiency gains
 * of Nushell approach vs MCP tool schemas.
 */

import { logger } from "./logger.js";

export interface TokenMetrics {
  /** Total tokens across all requests */
  totalTokens: number;
  /** Breakdown by category */
  breakdown: {
    systemPrompt: number;
    conversationHistory: number;
    userMessages: number;
    assistantResponses: number;
    nushellResults: number;
  };
  /** Request count */
  requestCount: number;
  /** Average tokens per request */
  averagePerRequest: number;
  /** Estimated cost (USD) */
  estimatedCost: number;
}

export interface TokenComparison {
  powerhoof: TokenMetrics;
  mcpEquivalent: TokenMetrics;
  savings: {
    tokens: number;
    percentage: number;
    costSavings: number;
  };
}

// Approximate token costs per million (GPT-4o pricing)
const TOKEN_COST_INPUT = 2.5;
const TOKEN_COST_OUTPUT = 10.0;

// MCP tool schema overhead estimates
const MCP_TOOL_SCHEMAS = {
  // Each MCP tool requires a JSON schema definition
  filesystem: {
    read_file: 150,
    write_file: 180,
    list_directory: 120,
    search_files: 200,
    get_file_info: 140,
  },
  web: {
    fetch: 250,
    screenshot: 180,
    click: 150,
    type: 140,
  },
  database: {
    query: 300,
    insert: 250,
    update: 280,
    delete: 200,
  },
  memory: {
    store: 120,
    retrieve: 150,
    search: 180,
    delete: 100,
  },
  azure: {
    list_resources: 350,
    get_resource: 280,
    create_resource: 400,
    delete_resource: 250,
    run_command: 320,
  },
};

// Calculate total MCP overhead
const TOTAL_MCP_SCHEMA_TOKENS = Object.values(MCP_TOOL_SCHEMAS)
  .flatMap((category) => Object.values(category))
  .reduce((sum, tokens) => sum + tokens, 0);

// PowerHoof Nushell reference is ~200-300 tokens
const NUSHELL_REFERENCE_TOKENS = 250;

class TokenTracker {
  private metrics: TokenMetrics = {
    totalTokens: 0,
    breakdown: {
      systemPrompt: 0,
      conversationHistory: 0,
      userMessages: 0,
      assistantResponses: 0,
      nushellResults: 0,
    },
    requestCount: 0,
    averagePerRequest: 0,
    estimatedCost: 0,
  };

  /**
   * Record token usage from a request.
   */
  record(usage: {
    systemPrompt?: number;
    conversationHistory?: number;
    userMessage?: number;
    assistantResponse?: number;
    nushellResult?: number;
  }): void {
    const total =
      (usage.systemPrompt || 0) +
      (usage.conversationHistory || 0) +
      (usage.userMessage || 0) +
      (usage.assistantResponse || 0) +
      (usage.nushellResult || 0);

    this.metrics.totalTokens += total;
    this.metrics.requestCount += 1;

    this.metrics.breakdown.systemPrompt += usage.systemPrompt || 0;
    this.metrics.breakdown.conversationHistory += usage.conversationHistory || 0;
    this.metrics.breakdown.userMessages += usage.userMessage || 0;
    this.metrics.breakdown.assistantResponses += usage.assistantResponse || 0;
    this.metrics.breakdown.nushellResults += usage.nushellResult || 0;

    this.metrics.averagePerRequest =
      this.metrics.totalTokens / this.metrics.requestCount;

    // Estimate cost (simplified: assume 70% input, 30% output)
    const inputTokens = total * 0.7;
    const outputTokens = total * 0.3;
    this.metrics.estimatedCost +=
      (inputTokens / 1_000_000) * TOKEN_COST_INPUT +
      (outputTokens / 1_000_000) * TOKEN_COST_OUTPUT;
  }

  /**
   * Get current metrics.
   */
  getMetrics(): TokenMetrics {
    return { ...this.metrics };
  }

  /**
   * Compare with equivalent MCP usage.
   */
  compare(): TokenComparison {
    // Calculate what MCP would have used
    // MCP adds tool schema overhead to EVERY request
    const mcpSchemaOverhead = TOTAL_MCP_SCHEMA_TOKENS * this.metrics.requestCount;

    const mcpMetrics: TokenMetrics = {
      ...this.metrics,
      totalTokens: this.metrics.totalTokens + mcpSchemaOverhead,
      breakdown: {
        ...this.metrics.breakdown,
        systemPrompt: this.metrics.breakdown.systemPrompt + mcpSchemaOverhead,
      },
      averagePerRequest:
        (this.metrics.totalTokens + mcpSchemaOverhead) / this.metrics.requestCount,
      estimatedCost:
        this.metrics.estimatedCost +
        (mcpSchemaOverhead / 1_000_000) * TOKEN_COST_INPUT,
    };

    const tokenSavings = mcpSchemaOverhead;
    const percentageSavings =
      this.metrics.requestCount > 0
        ? (tokenSavings / mcpMetrics.totalTokens) * 100
        : 0;
    const costSavings = (tokenSavings / 1_000_000) * TOKEN_COST_INPUT;

    return {
      powerhoof: this.metrics,
      mcpEquivalent: mcpMetrics,
      savings: {
        tokens: tokenSavings,
        percentage: Math.round(percentageSavings * 10) / 10,
        costSavings: Math.round(costSavings * 1000) / 1000,
      },
    };
  }

  /**
   * Reset metrics.
   */
  reset(): void {
    this.metrics = {
      totalTokens: 0,
      breakdown: {
        systemPrompt: 0,
        conversationHistory: 0,
        userMessages: 0,
        assistantResponses: 0,
        nushellResults: 0,
      },
      requestCount: 0,
      averagePerRequest: 0,
      estimatedCost: 0,
    };
  }
}

// Singleton tracker instance
const tracker = new TokenTracker();

export function recordTokenUsage(usage: Parameters<TokenTracker["record"]>[0]): void {
  tracker.record(usage);
}

export function getTokenMetrics(): TokenMetrics {
  return tracker.getMetrics();
}

export function getTokenComparison(): TokenComparison {
  return tracker.compare();
}

export function resetTokenMetrics(): void {
  tracker.reset();
}

/**
 * Generate a human-readable report of token savings.
 */
export function generateSavingsReport(): string {
  const comparison = tracker.compare();

  return `
# PowerHoof Token Efficiency Report

## Current Session
- Total Requests: ${comparison.powerhoof.requestCount}
- Total Tokens: ${comparison.powerhoof.totalTokens.toLocaleString()}
- Estimated Cost: $${comparison.powerhoof.estimatedCost.toFixed(4)}

## Comparison with MCP
| Metric | PowerHoof | MCP Equivalent |
|--------|-----------|----------------|
| Total Tokens | ${comparison.powerhoof.totalTokens.toLocaleString()} | ${comparison.mcpEquivalent.totalTokens.toLocaleString()} |
| Avg per Request | ${Math.round(comparison.powerhoof.averagePerRequest)} | ${Math.round(comparison.mcpEquivalent.averagePerRequest)} |
| Estimated Cost | $${comparison.powerhoof.estimatedCost.toFixed(4)} | $${comparison.mcpEquivalent.estimatedCost.toFixed(4)} |

## Savings
- **Tokens Saved:** ${comparison.savings.tokens.toLocaleString()} (${comparison.savings.percentage}%)
- **Cost Saved:** $${comparison.savings.costSavings.toFixed(4)}

## Why PowerHoof is More Efficient
- MCP requires ${TOTAL_MCP_SCHEMA_TOKENS} tokens of tool schemas per request
- PowerHoof Nushell reference is only ~${NUSHELL_REFERENCE_TOKENS} tokens
- Structured pipelines reduce back-and-forth iterations
`.trim();
}

/**
 * Log efficiency stats periodically.
 */
export function logEfficiencyStats(): void {
  const comparison = tracker.compare();

  if (comparison.powerhoof.requestCount > 0) {
    logger.info("Token efficiency stats:", {
      requests: comparison.powerhoof.requestCount,
      tokens: comparison.powerhoof.totalTokens,
      savings: `${comparison.savings.percentage}%`,
      costSaved: `$${comparison.savings.costSavings.toFixed(4)}`,
    });
  }
}
