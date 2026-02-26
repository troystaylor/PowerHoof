/**
 * Authentication Middleware Unit Tests
 * 
 * Tests OAuth 2.0 and API Key authentication middleware.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { Request, Response, NextFunction } from "express";

// Mock jose module before importing oauth
vi.mock("jose", () => ({
  createRemoteJWKSet: vi.fn(),
  jwtVerify: vi.fn(),
}));

import { createOAuthAuth, type OAuthConfig } from "../auth/oauth.js";
import { createApiKeyAuth, type ApiKeyAuthConfig } from "../auth/api-key.js";
import * as jose from "jose";

// Helper to create mock Express objects
interface MockRequestOptions {
  path?: string;
  ip?: string;
  method?: string;
  headers?: Record<string, string | undefined>;
}

function createMockExpress(options: MockRequestOptions = {}) {
  const req = {
    path: options.path ?? "/chat",
    method: options.method ?? "POST",
    ip: options.ip ?? "192.168.1.100",
    socket: { remoteAddress: options.ip ?? "192.168.1.100" },
    headers: options.headers ?? ({} as Record<string, string | undefined>),
  } as unknown as Request;

  const res = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
  } as unknown as Response;

  const next = vi.fn() as NextFunction;

  return { req, res, next };
}

// ============================================================================
// OAUTH MIDDLEWARE TESTS
// ============================================================================

describe("OAuth Authentication Middleware", () => {
  const baseConfig: OAuthConfig = {
    tenantId: "test-tenant-id",
    clientId: "test-client-id",
    audience: "api://test-client-id",
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Public Paths", () => {
    it("should allow /health without authentication", async () => {
      const { req, res, next } = createMockExpress({ path: "/health" });

      const middleware = createOAuthAuth(baseConfig);
      await middleware(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it("should allow /health/live without authentication", async () => {
      const { req, res, next } = createMockExpress({ path: "/health/live" });

      const middleware = createOAuthAuth(baseConfig);
      await middleware(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it("should allow /openapi.json without authentication", async () => {
      const { req, res, next } = createMockExpress({ path: "/openapi.json" });

      const middleware = createOAuthAuth(baseConfig);
      await middleware(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it("should allow custom public paths", async () => {
      const { req, res, next } = createMockExpress({ path: "/public-endpoint" });

      const middleware = createOAuthAuth({
        ...baseConfig,
        publicPaths: ["/public-endpoint"],
      });
      await middleware(req, res, next);

      expect(next).toHaveBeenCalled();
    });
  });

  describe("Bypass IPs", () => {
    it("should bypass auth for localhost (127.0.0.1)", async () => {
      const { req, res, next } = createMockExpress({ ip: "127.0.0.1" });

      const middleware = createOAuthAuth(baseConfig);
      await middleware(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it("should bypass auth for IPv6 localhost", async () => {
      const { req, res, next } = createMockExpress({ ip: "::1" });

      const middleware = createOAuthAuth(baseConfig);
      await middleware(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it("should bypass auth for custom bypass IPs", async () => {
      const { req, res, next } = createMockExpress({ ip: "10.0.0.1" });

      const middleware = createOAuthAuth({
        ...baseConfig,
        bypassIps: ["10.0.0.1"],
      });
      await middleware(req, res, next);

      expect(next).toHaveBeenCalled();
    });
  });

  describe("Missing Authorization", () => {
    it("should return 401 when no Authorization header", async () => {
      const { req, res, next } = createMockExpress();

      const middleware = createOAuthAuth(baseConfig);
      await middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: "Unauthorized",
          message: "Authorization header required",
        })
      );
      expect(next).not.toHaveBeenCalled();
    });

    it("should return 401 for invalid Authorization format", async () => {
      const { req, res, next } = createMockExpress();
      req.headers.authorization = "InvalidFormat token123";

      const middleware = createOAuthAuth(baseConfig);
      await middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: "Unauthorized",
          message: expect.stringContaining("Invalid authorization header"),
        })
      );
    });
  });

  describe("Valid Token Verification", () => {
    it("should authenticate valid Bearer token", async () => {
      const { req, res, next } = createMockExpress();
      req.headers.authorization = "Bearer valid-jwt-token";

      // Mock successful JWT verification
      const mockJWKS = vi.fn();
      (jose.createRemoteJWKSet as ReturnType<typeof vi.fn>).mockReturnValue(mockJWKS);
      (jose.jwtVerify as ReturnType<typeof vi.fn>).mockResolvedValue({
        payload: {
          iss: "https://login.microsoftonline.com/test-tenant-id/v2.0",
          sub: "user-subject-id",
          aud: "api://test-client-id",
          oid: "user-object-id",
          tid: "test-tenant-id",
          name: "Test User",
          preferred_username: "test@example.com",
          scp: "Chat.Send Chat.Read",
        },
      });

      const middleware = createOAuthAuth(baseConfig);
      await middleware(req, res, next);

      expect(jose.jwtVerify).toHaveBeenCalledWith(
        "valid-jwt-token",
        mockJWKS,
        expect.objectContaining({
          audience: "api://test-client-id",
        })
      );
      expect(next).toHaveBeenCalled();
      expect(req.user).toEqual(
        expect.objectContaining({
          id: "user-object-id",
          name: "Test User",
          email: "test@example.com",
          tenantId: "test-tenant-id",
          scopes: ["Chat.Send", "Chat.Read"],
          isAppOnly: false,
        })
      );
    });

    it("should identify app-only tokens correctly", async () => {
      const { req, res, next } = createMockExpress();
      req.headers.authorization = "Bearer app-token";

      (jose.createRemoteJWKSet as ReturnType<typeof vi.fn>).mockReturnValue(vi.fn());
      (jose.jwtVerify as ReturnType<typeof vi.fn>).mockResolvedValue({
        payload: {
          iss: "https://login.microsoftonline.com/test-tenant-id/v2.0",
          sub: "app-subject-id",
          aud: "api://test-client-id",
          oid: "app-object-id",
          tid: "test-tenant-id",
          roles: ["Chat.ReadWrite.All"],
          // No 'scp' means app-only
        },
      });

      const middleware = createOAuthAuth(baseConfig);
      await middleware(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(req.user?.isAppOnly).toBe(true);
      expect(req.user?.roles).toContain("Chat.ReadWrite.All");
    });
  });

  describe("Invalid Token Handling", () => {
    it("should return 401 for expired token", async () => {
      const { req, res, next } = createMockExpress();
      req.headers.authorization = "Bearer expired-token";

      (jose.createRemoteJWKSet as ReturnType<typeof vi.fn>).mockReturnValue(vi.fn());
      (jose.jwtVerify as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error("Token expired")
      );

      const middleware = createOAuthAuth(baseConfig);
      await middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: "Unauthorized",
          message: "Invalid or expired token",
        })
      );
      expect(next).not.toHaveBeenCalled();
    });

    it("should return 401 for invalid signature", async () => {
      const { req, res, next } = createMockExpress();
      req.headers.authorization = "Bearer invalid-signature-token";

      (jose.createRemoteJWKSet as ReturnType<typeof vi.fn>).mockReturnValue(vi.fn());
      (jose.jwtVerify as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error("Invalid signature")
      );

      const middleware = createOAuthAuth(baseConfig);
      await middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe("API Key Fallback", () => {
    it("should accept API key when OAuth fails and fallback enabled", async () => {
      const { req, res, next } = createMockExpress();
      req.headers.authorization = "Bearer invalid-token";
      req.headers["x-api-key"] = "valid-api-key";

      (jose.createRemoteJWKSet as ReturnType<typeof vi.fn>).mockReturnValue(vi.fn());
      (jose.jwtVerify as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error("Token invalid")
      );

      const middleware = createOAuthAuth({
        ...baseConfig,
        allowApiKeyFallback: true,
        apiKeys: ["valid-api-key"],
      });
      await middleware(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it("should reject invalid API key fallback", async () => {
      const { req, res, next } = createMockExpress();
      req.headers.authorization = "Bearer invalid-token";
      req.headers["x-api-key"] = "wrong-api-key";

      (jose.createRemoteJWKSet as ReturnType<typeof vi.fn>).mockReturnValue(vi.fn());
      (jose.jwtVerify as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error("Token invalid")
      );

      const middleware = createOAuthAuth({
        ...baseConfig,
        allowApiKeyFallback: true,
        apiKeys: ["valid-api-key"],
      });
      await middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(next).not.toHaveBeenCalled();
    });

    it("should accept API key when no Authorization header and fallback enabled", async () => {
      const { req, res, next } = createMockExpress();
      req.headers["x-api-key"] = "valid-api-key";

      const middleware = createOAuthAuth({
        ...baseConfig,
        allowApiKeyFallback: true,
        apiKeys: ["valid-api-key"],
      });
      await middleware(req, res, next);

      expect(next).toHaveBeenCalled();
    });
  });

  describe("Multi-tenant Support", () => {
    it("should accept tokens from any tenant when tenantId is 'common'", async () => {
      const { req, res, next } = createMockExpress();
      req.headers.authorization = "Bearer multi-tenant-token";

      (jose.createRemoteJWKSet as ReturnType<typeof vi.fn>).mockReturnValue(vi.fn());
      (jose.jwtVerify as ReturnType<typeof vi.fn>).mockResolvedValue({
        payload: {
          // Use valid UUID format for issuer (multi-tenant regex requires hex chars)
          iss: "https://login.microsoftonline.com/a1b2c3d4-e5f6-7890-abcd-ef1234567890/v2.0",
          sub: "user-subject",
          aud: "api://test-client-id",
          oid: "user-oid",
          tid: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
        },
      });

      const middleware = createOAuthAuth({
        ...baseConfig,
        tenantId: "common",
      });
      await middleware(req, res, next);

      expect(next).toHaveBeenCalled();
    });
  });
});

// ============================================================================
// API KEY MIDDLEWARE TESTS
// ============================================================================

describe("API Key Authentication Middleware", () => {
  const baseConfig: ApiKeyAuthConfig = {
    mode: "api-key",
    apiKeys: ["test-api-key-1", "test-api-key-2"],
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Mode: none", () => {
    it("should allow all requests when mode is 'none'", async () => {
      const { req, res, next } = createMockExpress();

      const middleware = createApiKeyAuth({ mode: "none" });
      await middleware(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });
  });

  describe("Mode: api-key", () => {
    it("should accept valid API key in X-API-Key header", async () => {
      const { req, res, next } = createMockExpress();
      req.headers["x-api-key"] = "test-api-key-1";

      const middleware = createApiKeyAuth(baseConfig);
      await middleware(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it("should accept second valid API key (rotation support)", async () => {
      const { req, res, next } = createMockExpress();
      req.headers["x-api-key"] = "test-api-key-2";

      const middleware = createApiKeyAuth(baseConfig);
      await middleware(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it("should reject invalid API key", async () => {
      const { req, res, next } = createMockExpress();
      req.headers["x-api-key"] = "wrong-key";

      const middleware = createApiKeyAuth(baseConfig);
      await middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(next).not.toHaveBeenCalled();
    });

    it("should reject request without API key", async () => {
      const { req, res, next } = createMockExpress();

      const middleware = createApiKeyAuth(baseConfig);
      await middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe("Mode: optional", () => {
    it("should accept valid API key", async () => {
      const { req, res, next } = createMockExpress();
      req.headers["x-api-key"] = "test-api-key-1";

      const middleware = createApiKeyAuth({ ...baseConfig, mode: "optional" });
      await middleware(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it("should allow request without API key", async () => {
      const { req, res, next } = createMockExpress();

      const middleware = createApiKeyAuth({ ...baseConfig, mode: "optional" });
      await middleware(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it("should allow request with invalid API key (optional mode allows through with warning)", async () => {
      const { req, res, next } = createMockExpress();
      req.headers["x-api-key"] = "wrong-key";

      const middleware = createApiKeyAuth({ ...baseConfig, mode: "optional" });
      await middleware(req, res, next);

      // In optional mode, invalid keys are allowed through (with warning logged)
      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });
  });

  describe("Public Paths", () => {
    it("should allow /health without API key", async () => {
      const { req, res, next } = createMockExpress({ path: "/health" });

      const middleware = createApiKeyAuth(baseConfig);
      await middleware(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it("should allow custom public paths", async () => {
      const { req, res, next } = createMockExpress({ path: "/custom-public" });

      const middleware = createApiKeyAuth({
        ...baseConfig,
        publicPaths: ["/custom-public"],
      });
      await middleware(req, res, next);

      expect(next).toHaveBeenCalled();
    });
  });

  describe("Bypass IPs", () => {
    it("should bypass for localhost", async () => {
      const { req, res, next } = createMockExpress({ ip: "127.0.0.1" });

      const middleware = createApiKeyAuth(baseConfig);
      await middleware(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it("should bypass for custom IPs", async () => {
      const { req, res, next } = createMockExpress({ ip: "10.0.0.50" });

      const middleware = createApiKeyAuth({
        ...baseConfig,
        bypassIps: ["10.0.0.50"],
      });
      await middleware(req, res, next);

      expect(next).toHaveBeenCalled();
    });
  });

  describe("Custom Header", () => {
    it("should accept API key from custom header", async () => {
      const { req, res, next } = createMockExpress();
      req.headers["x-custom-key"] = "test-api-key-1";

      const middleware = createApiKeyAuth({
        ...baseConfig,
        headerName: "X-Custom-Key",
      });
      await middleware(req, res, next);

      expect(next).toHaveBeenCalled();
    });
  });
});

// ============================================================================
// INTEGRATION-LIKE TESTS
// ============================================================================

describe("Auth Middleware Integration Scenarios", () => {
  describe("Power Platform Connector Flow", () => {
    it("should authenticate OAuth token from Power Automate", async () => {
      const { req, res, next } = createMockExpress({ path: "/chat", method: "POST" });
      req.headers.authorization = "Bearer power-automate-token";

      (jose.createRemoteJWKSet as ReturnType<typeof vi.fn>).mockReturnValue(vi.fn());
      (jose.jwtVerify as ReturnType<typeof vi.fn>).mockResolvedValue({
        payload: {
          iss: "https://login.microsoftonline.com/tenant-123/v2.0",
          sub: "power-automate-connection",
          aud: "api://fc75c498-60fc-436a-90e0-d2395c2bd00f",
          oid: "connection-oid",
          tid: "tenant-123",
          azp: "power-automate-client",
          scp: "Chat.Send",
        },
      });

      const middleware = createOAuthAuth({
        tenantId: "tenant-123",
        clientId: "fc75c498-60fc-436a-90e0-d2395c2bd00f",
        audience: "api://fc75c498-60fc-436a-90e0-d2395c2bd00f",
      });
      await middleware(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(req.user?.scopes).toContain("Chat.Send");
    });
  });

  describe("On-Premises Gateway Flow", () => {
    it("should bypass auth for on-prem gateway IP", async () => {
      const { req, res, next } = createMockExpress({ path: "/chat", ip: "192.168.1.100" });
      // No authorization header

      const middleware = createOAuthAuth({
        tenantId: "tenant-123",
        clientId: "fc75c498-60fc-436a-90e0-d2395c2bd00f",
        audience: "api://fc75c498-60fc-436a-90e0-d2395c2bd00f",
        bypassIps: ["192.168.1.100"], // Gateway IP
      });
      await middleware(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });
  });

  describe("API Key Fallback for Legacy Clients", () => {
    it("should accept API key when OAuth misconfigured", async () => {
      const { req, res, next } = createMockExpress({ path: "/chat" });
      req.headers["x-api-key"] = "legacy-api-key";

      const middleware = createOAuthAuth({
        tenantId: "tenant-123",
        clientId: "fc75c498-60fc-436a-90e0-d2395c2bd00f",
        audience: "api://fc75c498-60fc-436a-90e0-d2395c2bd00f",
        allowApiKeyFallback: true,
        apiKeys: ["legacy-api-key"],
      });
      await middleware(req, res, next);

      expect(next).toHaveBeenCalled();
    });
  });
});
