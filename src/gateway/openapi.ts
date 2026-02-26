/**
 * OpenAPI Specification Generator for PowerHoof
 *
 * Generates OpenAPI 3.0 spec for Power Platform custom connector integration.
 * Supports both Azure and on-premises deployment modes.
 */

export interface OpenAPISpec {
  openapi: string;
  info: {
    title: string;
    description: string;
    version: string;
    contact?: {
      name?: string;
      url?: string;
    };
  };
  servers: Array<{
    url: string;
    description: string;
  }>;
  paths: Record<string, unknown>;
  components: {
    schemas: Record<string, unknown>;
    securitySchemes?: Record<string, unknown>;
  };
  security?: Array<Record<string, string[]>>;
}

/**
 * Generate OpenAPI specification for PowerHoof API.
 * @param baseUrl - The base URL of the API (defaults to localhost for on-prem)
 */
export function generateOpenAPISpec(baseUrl?: string): OpenAPISpec {
  const servers = [];

  // Always include the provided baseUrl or default
  if (baseUrl) {
    servers.push({
      url: baseUrl,
      description: "Current deployment",
    });
  }

  // Add common deployment targets
  servers.push(
    {
      url: "http://localhost:3000",
      description: "Local development / On-premises (via gateway)",
    },
    {
      url: "https://powerhoof-api.azurecontainerapps.io",
      description: "Azure Container Apps (production)",
    }
  );

  return {
    openapi: "3.0.3",
    info: {
      title: "PowerHoof API",
      description: `PowerHoof is an AI-powered Nushell execution service that provides natural language processing 
with embedded shell script generation and execution. Use this connector to:
- Chat with the AI assistant and execute data transformations
- Run Nushell scripts directly for batch processing
- Access 40+ built-in skills for common operations
- Get health and metrics information

**Deployment Options:**
- **Azure**: Direct HTTPS connection to Azure Container Apps
- **On-Premises**: Use the On-Premises Data Gateway to connect to local PowerHoof instance`,
      version: "1.0.0",
      contact: {
        name: "PowerHoof Support",
      },
    },
    servers,
    paths: {
      "/chat": {
        post: {
          operationId: "Chat",
          summary: "Send a message to PowerHoof",
          description: `Send a natural language message to PowerHoof. The AI will process your request, 
potentially execute Nushell scripts, and return the result. Supports conversation continuity 
via conversationId for multi-turn interactions.`,
          tags: ["Chat"],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/ChatRequest",
                },
                examples: {
                  simple: {
                    summary: "Simple question",
                    value: {
                      message: "What is 25% of 200?",
                    },
                  },
                  skill: {
                    summary: "Using a skill",
                    value: {
                      message: "/calc 15% tip on $85.50",
                    },
                  },
                  continuation: {
                    summary: "Continue conversation",
                    value: {
                      conversationId: "abc-123",
                      message: "Now convert that to euros",
                    },
                  },
                },
              },
            },
          },
          responses: {
            "200": {
              description: "Successful response",
              content: {
                "application/json": {
                  schema: {
                    $ref: "#/components/schemas/ChatResponse",
                  },
                },
              },
            },
            "400": {
              description: "Invalid request",
              content: {
                "application/json": {
                  schema: {
                    $ref: "#/components/schemas/ErrorResponse",
                  },
                },
              },
            },
            "503": {
              description: "Service unavailable (circuit breaker open)",
              content: {
                "application/json": {
                  schema: {
                    $ref: "#/components/schemas/ServiceUnavailableResponse",
                  },
                },
              },
            },
          },
        },
      },
      "/execute": {
        post: {
          operationId: "Execute",
          summary: "Execute a Nushell script directly",
          description: `Execute a Nushell script without AI interpretation. Use this for batch processing 
or when you have a known script to run. The script will be validated and executed in a sandboxed environment.`,
          tags: ["Execution"],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/ExecuteRequest",
                },
                examples: {
                  simple: {
                    summary: "Simple calculation",
                    value: {
                      script: "[1, 2, 3, 4, 5] | math sum",
                    },
                  },
                  transform: {
                    summary: "Data transformation",
                    value: {
                      script:
                        '[[name, age]; [Alice, 30], [Bob, 25]] | where age > 26 | to json',
                    },
                  },
                  withInput: {
                    summary: "With input data",
                    value: {
                      script: "$input | select name email | to csv",
                      input: [
                        {
                          name: "Alice",
                          email: "alice@example.com",
                          age: 30,
                        },
                        { name: "Bob", email: "bob@example.com", age: 25 },
                      ],
                    },
                  },
                },
              },
            },
          },
          responses: {
            "200": {
              description: "Successful execution",
              content: {
                "application/json": {
                  schema: {
                    $ref: "#/components/schemas/ExecuteResponse",
                  },
                },
              },
            },
            "400": {
              description: "Invalid script or validation failed",
              content: {
                "application/json": {
                  schema: {
                    $ref: "#/components/schemas/ErrorResponse",
                  },
                },
              },
            },
          },
        },
      },
      "/skills": {
        get: {
          operationId: "ListSkills",
          summary: "List available skills",
          description:
            "Returns a list of all available skills with their names, descriptions, and tags.",
          tags: ["Skills"],
          responses: {
            "200": {
              description: "List of skills",
              content: {
                "application/json": {
                  schema: {
                    $ref: "#/components/schemas/SkillsListResponse",
                  },
                },
              },
            },
          },
        },
      },
      "/skills/{name}": {
        get: {
          operationId: "GetSkill",
          summary: "Get skill details",
          description:
            "Returns detailed information about a specific skill including examples.",
          tags: ["Skills"],
          parameters: [
            {
              name: "name",
              in: "path",
              required: true,
              description: "The skill name (e.g., 'calc', 'weather', 'sql')",
              schema: {
                type: "string",
              },
            },
          ],
          responses: {
            "200": {
              description: "Skill details",
              content: {
                "application/json": {
                  schema: {
                    $ref: "#/components/schemas/SkillDetailResponse",
                  },
                },
              },
            },
            "404": {
              description: "Skill not found",
              content: {
                "application/json": {
                  schema: {
                    $ref: "#/components/schemas/ErrorResponse",
                  },
                },
              },
            },
          },
        },
      },
      "/health": {
        get: {
          operationId: "GetHealth",
          summary: "Get service health status",
          description:
            "Returns the health status of all service components including memory, LLM, and circuit breaker.",
          tags: ["Health"],
          responses: {
            "200": {
              description: "Health status",
              content: {
                "application/json": {
                  schema: {
                    $ref: "#/components/schemas/HealthResponse",
                  },
                },
              },
            },
          },
        },
      },
    },
    components: {
      schemas: {
        ChatRequest: {
          type: "object",
          required: ["message"],
          properties: {
            message: {
              type: "string",
              description:
                "The message to send. Can be natural language or a skill command (e.g., '/calc 2+2')",
              example: "What's the weather in Seattle?",
            },
            conversationId: {
              type: "string",
              description: "Optional conversation ID for multi-turn conversations",
              example: "conv-abc-123",
            },
            metadata: {
              type: "object",
              description: "Optional metadata to attach to the message",
              additionalProperties: true,
            },
          },
        },
        ChatResponse: {
          type: "object",
          properties: {
            conversationId: {
              type: "string",
              description: "The conversation ID for continuing this conversation",
            },
            response: {
              type: "string",
              description: "The AI response text",
            },
            tokensUsed: {
              type: "object",
              properties: {
                prompt: {
                  type: "integer",
                  description: "Tokens used for the prompt",
                },
                completion: {
                  type: "integer",
                  description: "Tokens used for the completion",
                },
                total: {
                  type: "integer",
                  description: "Total tokens used",
                },
              },
            },
            nushellExecutions: {
              type: "array",
              description: "Any Nushell scripts that were executed",
              items: {
                type: "object",
                properties: {
                  script: {
                    type: "string",
                    description: "The executed script",
                  },
                  output: {
                    type: "string",
                    description: "Script output",
                  },
                  success: {
                    type: "boolean",
                    description: "Whether execution succeeded",
                  },
                  durationMs: {
                    type: "integer",
                    description: "Execution time in milliseconds",
                  },
                },
              },
            },
            reasoning: {
              type: "string",
              description: "AI reasoning about how it processed the request",
            },
          },
        },
        ExecuteRequest: {
          type: "object",
          required: ["script"],
          properties: {
            script: {
              type: "string",
              description: "The Nushell script to execute",
              example: "[1, 2, 3, 4, 5] | math sum",
            },
            input: {
              description: "Optional input data to pass to the script as $input",
              oneOf: [
                { type: "string" },
                { type: "array", items: {} },
                { type: "object", additionalProperties: true },
              ],
            },
            timeout: {
              type: "integer",
              description: "Execution timeout in milliseconds (default: 30000)",
              default: 30000,
            },
          },
        },
        ExecuteResponse: {
          type: "object",
          properties: {
            output: {
              type: "string",
              description: "Script output",
            },
            success: {
              type: "boolean",
              description: "Whether execution succeeded",
            },
            durationMs: {
              type: "integer",
              description: "Execution time in milliseconds",
            },
            error: {
              type: "string",
              description: "Error message if execution failed",
            },
          },
        },
        SkillsListResponse: {
          type: "object",
          properties: {
            skills: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  name: {
                    type: "string",
                    description: "Skill name",
                  },
                  description: {
                    type: "string",
                    description: "Skill description",
                  },
                  version: {
                    type: "string",
                    description: "Skill version",
                  },
                  permissions: {
                    type: "array",
                    items: { type: "string" },
                    description: "Required permissions",
                  },
                  tags: {
                    type: "array",
                    items: { type: "string" },
                    description: "Skill tags for categorization",
                  },
                },
              },
            },
          },
        },
        SkillDetailResponse: {
          type: "object",
          properties: {
            name: { type: "string" },
            description: { type: "string" },
            version: { type: "string" },
            author: { type: "string" },
            permissions: {
              type: "array",
              items: { type: "string" },
            },
            tags: {
              type: "array",
              items: { type: "string" },
            },
            examples: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  input: { type: "string" },
                  description: { type: "string" },
                },
              },
            },
          },
        },
        HealthResponse: {
          type: "object",
          properties: {
            status: {
              type: "string",
              enum: ["healthy", "degraded", "unhealthy"],
              description: "Overall health status",
            },
            components: {
              type: "object",
              properties: {
                memory: {
                  type: "string",
                  enum: ["up", "down"],
                },
                llm: {
                  type: "string",
                  enum: ["up", "down"],
                },
                circuitBreaker: {
                  type: "string",
                  enum: ["closed", "open", "half-open"],
                },
              },
            },
            timestamp: {
              type: "string",
              format: "date-time",
            },
          },
        },
        ErrorResponse: {
          type: "object",
          properties: {
            error: {
              type: "string",
              description: "Error message",
            },
            requestId: {
              type: "string",
              description: "Request ID for debugging",
            },
          },
        },
        ServiceUnavailableResponse: {
          type: "object",
          properties: {
            error: {
              type: "string",
              example: "Service temporarily unavailable",
            },
            message: {
              type: "string",
              example: "The AI service is experiencing issues. Please try again later.",
            },
            retryAfter: {
              type: "integer",
              description: "Seconds to wait before retrying",
              example: 30,
            },
          },
        },
      },
      securitySchemes: {
        OAuth2: {
          type: "oauth2",
          description: "OAuth 2.0 authentication with Azure AD (recommended for enterprise)",
          flows: {
            authorizationCode: {
              authorizationUrl: "https://login.microsoftonline.com/common/oauth2/v2.0/authorize",
              tokenUrl: "https://login.microsoftonline.com/common/oauth2/v2.0/token",
              scopes: {
                "api://fc75c498-60fc-436a-90e0-d2395c2bd00f/.default": "Access PowerHoof API",
              },
            },
          },
        },
        ApiKeyAuth: {
          type: "apiKey",
          in: "header",
          name: "X-API-Key",
          description: "API key authentication (for simple deployments or testing)",
        },
      },
    },
    security: [
      {
        OAuth2: ["api://fc75c498-60fc-436a-90e0-d2395c2bd00f/.default"],
      },
    ],
  };
}

/**
 * Generate OpenAPI spec as YAML string (for download).
 */
export function generateOpenAPIYaml(baseUrl?: string): string {
  const spec = generateOpenAPISpec(baseUrl);
  return jsonToYaml(spec);
}

/**
 * Simple JSON to YAML converter for OpenAPI spec.
 */
function jsonToYaml(obj: unknown, indent = 0): string {
  const spaces = "  ".repeat(indent);

  if (obj === null || obj === undefined) {
    return "null";
  }

  if (typeof obj === "string") {
    // Handle multiline strings
    if (obj.includes("\n")) {
      const lines = obj.split("\n");
      return `|\n${lines.map((l) => spaces + "  " + l).join("\n")}`;
    }
    // Quote strings that need it
    if (
      obj.includes(":") ||
      obj.includes("#") ||
      obj.startsWith("*") ||
      obj.startsWith("&") ||
      /^\d/.test(obj)
    ) {
      return `"${obj.replace(/"/g, '\\"')}"`;
    }
    return obj;
  }

  if (typeof obj === "number" || typeof obj === "boolean") {
    return String(obj);
  }

  if (Array.isArray(obj)) {
    if (obj.length === 0) return "[]";
    return obj.map((item) => `\n${spaces}- ${jsonToYaml(item, indent + 1).trimStart()}`).join("");
  }

  if (typeof obj === "object") {
    const entries = Object.entries(obj);
    if (entries.length === 0) return "{}";

    return entries
      .map(([key, value]) => {
        const yamlValue = jsonToYaml(value, indent + 1);
        if (typeof value === "object" && value !== null && !Array.isArray(value)) {
          return `\n${spaces}${key}:${yamlValue}`;
        }
        if (Array.isArray(value)) {
          return `\n${spaces}${key}:${yamlValue}`;
        }
        return `\n${spaces}${key}: ${yamlValue}`;
      })
      .join("");
  }

  return String(obj);
}
