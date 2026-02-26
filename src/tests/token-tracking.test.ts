/**
 * Unit Tests for Token Tracking
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  recordTokenUsage,
  getTokenMetrics,
  getTokenComparison,
  resetTokenMetrics,
  generateSavingsReport,
} from "../utils/token-tracking.js";

describe("Token Tracking", () => {
  beforeEach(() => {
    resetTokenMetrics();
  });

  describe("Recording Usage", () => {
    it("should record token usage correctly", () => {
      recordTokenUsage({
        systemPrompt: 100,
        userMessage: 50,
        assistantResponse: 75,
      });

      const metrics = getTokenMetrics();

      expect(metrics.totalTokens).toBe(225);
      expect(metrics.requestCount).toBe(1);
      expect(metrics.breakdown.systemPrompt).toBe(100);
      expect(metrics.breakdown.userMessages).toBe(50);
      expect(metrics.breakdown.assistantResponses).toBe(75);
    });

    it("should accumulate across multiple requests", () => {
      recordTokenUsage({ systemPrompt: 100, userMessage: 50 });
      recordTokenUsage({ systemPrompt: 100, userMessage: 75 });
      recordTokenUsage({ systemPrompt: 100, userMessage: 60 });

      const metrics = getTokenMetrics();

      expect(metrics.totalTokens).toBe(485);
      expect(metrics.requestCount).toBe(3);
      expect(metrics.averagePerRequest).toBeCloseTo(161.67, 1);
    });

    it("should track Nushell results separately", () => {
      recordTokenUsage({
        systemPrompt: 100,
        userMessage: 50,
        nushellResult: 200,
      });

      const metrics = getTokenMetrics();

      expect(metrics.breakdown.nushellResults).toBe(200);
    });
  });

  describe("MCP Comparison", () => {
    it("should calculate MCP overhead correctly", () => {
      recordTokenUsage({
        systemPrompt: 100,
        userMessage: 50,
        assistantResponse: 75,
      });

      const comparison = getTokenComparison();

      expect(comparison.powerhoof.totalTokens).toBe(225);
      // MCP should have more tokens due to tool schema overhead
      expect(comparison.mcpEquivalent.totalTokens).toBeGreaterThan(225);
      expect(comparison.savings.tokens).toBeGreaterThan(0);
      expect(comparison.savings.percentage).toBeGreaterThan(0);
    });

    it("should scale savings with request count", () => {
      // Single request
      recordTokenUsage({ systemPrompt: 100, userMessage: 50 });
      const single = getTokenComparison();

      // Reset and do 10 requests
      resetTokenMetrics();
      for (let i = 0; i < 10; i++) {
        recordTokenUsage({ systemPrompt: 100, userMessage: 50 });
      }
      const ten = getTokenComparison();

      // Savings should scale linearly with requests
      expect(ten.savings.tokens).toBeCloseTo(single.savings.tokens * 10, -1);
    });
  });

  describe("Cost Estimation", () => {
    it("should estimate costs", () => {
      recordTokenUsage({
        systemPrompt: 1000,
        userMessage: 500,
        assistantResponse: 750,
      });

      const metrics = getTokenMetrics();

      expect(metrics.estimatedCost).toBeGreaterThan(0);
    });

    it("should show cost savings", () => {
      recordTokenUsage({
        systemPrompt: 1000,
        userMessage: 500,
        assistantResponse: 750,
      });

      const comparison = getTokenComparison();

      expect(comparison.savings.costSavings).toBeGreaterThan(0);
    });
  });

  describe("Savings Report", () => {
    it("should generate a readable report", () => {
      recordTokenUsage({
        systemPrompt: 100,
        userMessage: 50,
        assistantResponse: 75,
      });

      const report = generateSavingsReport();

      expect(report).toContain("PowerHoof Token Efficiency Report");
      expect(report).toContain("Total Requests: 1");
      expect(report).toContain("Tokens Saved:");
      expect(report).toContain("MCP requires");
    });
  });

  describe("Reset", () => {
    it("should reset all metrics", () => {
      recordTokenUsage({ systemPrompt: 100, userMessage: 50 });
      recordTokenUsage({ systemPrompt: 100, userMessage: 50 });

      resetTokenMetrics();

      const metrics = getTokenMetrics();

      expect(metrics.totalTokens).toBe(0);
      expect(metrics.requestCount).toBe(0);
      expect(metrics.breakdown.systemPrompt).toBe(0);
    });
  });
});
