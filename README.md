# 🐑 PowerHoof

> An Azure-native AI agent that uses Nushell for token-efficient task execution.

PowerHoof is an alternative to bash-based agents like OpenClaw, designed to run securely locally or in Azure while minimizing token usage through structured Nushell pipelines.

## Why PowerHoof?

### The Problem with OpenClaw

OpenClaw and similar bash-based agents execute shell commands directly, which presents challenges:
- **Security risks** - Arbitrary bash execution can be dangerous, especially in production
- **Platform inconsistency** - Bash scripts behave differently across Linux, macOS, and Windows
- **Unstructured output** - Text parsing is fragile and token-expensive
- **Limited composability** - Complex pipelines require multiple round-trips to the LLM

### The Problem with MCP

Model Context Protocol (MCP) solves tool discovery, but creates new problems:

- **Schema bloat** - Full JSON schemas sent with every request. 20+ tools = **5,000+ tokens** of overhead per turn
- **No pipelining** - Each tool call is isolated; chaining requires multiple LLM round-trips  
- **Stateless execution** - No shared context between tool invocations
- **Verbose error handling** - Errors return as JSON, requiring LLM interpretation

Example: A simple "list files and filter by date" operation requires 3 separate MCP calls, 3 LLM responses, and ~15,000 tokens.

### The Nushell Solution

PowerHoof replaces MCP with [Nushell](https://www.nushell.sh/), a modern shell with structured data and pipelines:

| Capability | MCP | Nushell |
|------------|-----|---------|
| Schema overhead | ~5,000 tokens | ~250 tokens |
| Multi-step operations | 3+ LLM round-trips | 1 pipeline |
| Error handling | JSON parsing | Native exceptions |
| Data format | Unstructured text | Typed tables/records |

**The same "list and filter files" operation:**
```nushell
ls | where modified > (date now) - 7day | sort-by size
```
One call. One response. ~500 tokens total.

**Why Nushell works for agents:**
- **Pipelines are composable** - LLM generates one command, runtime handles data flow
- **Structured output** - Tables and records, not strings to parse
- **Fail-fast semantics** - Errors surface immediately with clear messages
- **Cross-platform** - Same commands on Windows, Linux, macOS

## Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                      PowerHoof Agent                         │
├──────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐   │
│  │ Gateway     │  │ Orchestrator│  │ Conversation Manager│   │
│  │ (HTTP/WS)   │→ │ (Agent Loop)│→ │ (State Tracking)    │   │
│  └─────────────┘  └─────────────┘  └─────────────────────┘   │
│         ↓               ↓                    ↓               │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐   │
│  │ LLM Provider│  │ Nushell     │  │ Memory Store        │   │
│  │ (see below) │  │ Executor    │  │ (Cosmos/In-Memory)  │   │
│  └─────────────┘  └─────────────┘  └─────────────────────┘   │
└──────────────────────────────────────────────────────────────┘
```

### LLM Providers

| Provider | Description | Use Case |
|----------|-------------|----------|
| **Azure OpenAI** | Cloud-hosted GPT-4o, o1, etc. | Production deployments |
| **Foundry Local** | On-device inference (phi-4-mini, phi-3.5-mini) | Local dev, offline, privacy-sensitive |
| **Foundry Local + NPU** | NPU-accelerated inference for Copilot+ PCs | Low-power, background AI |
| **Mock** | Canned responses | Unit testing |

### Channel Adapters

PowerHoof supports multiple inbound/outbound channels:

| Channel | Description | Use Case |
|---------|-------------|----------|
| **Power Platform** | Custom connector via OpenAPI | Power Automate, Copilot Studio |
| **Microsoft Graph** | Teams messages, Outlook mail, SharePoint | Enterprise messaging |
| **Dataverse** | Power Platform table integration | Power Apps, Power Automate |
| **REST API** | HTTP endpoints | Web applications |
| **WebSocket** | Real-time bidirectional | Chat interfaces |

### Security Features

| Feature | Description |
|---------|-------------|
| **OAuth 2.0 / Azure AD** | Enterprise SSO with Microsoft Entra ID (recommended) |
| **API Key** | Simple header-based auth for testing |
| **DM Pairing** | Untrusted senders must verify with a pairing code |
| **Allow Lists** | Restrict who can message the agent |
| **Group Policies** | Control behavior in Teams channels |
                           ↓
┌──────────────────────────────────────────────────────────────┐
│            Azure Container Apps Dynamic Sessions             │
│  ┌────────────────────────────────────────────────────────┐  │
│  │                   Nushell Sandbox                      │  │
│  │  • Hyper-V isolation    • Network restrictions         │  │
│  │  • Read-only filesystem • Execution timeout            │  │
│  └────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────┘
```

## Quick Start

### Prerequisites

- Node.js 20+
- Azure CLI (`az`)
- Azure Developer CLI (`azd`)
- Docker (for local development)

### Installation

```bash
# Clone the repository
git clone https://github.com/your-org/powerhoof.git
cd powerhoof

# Install dependencies
npm install

# Build
npm run build
```

### Local Development

**Option 1: Mock Mode (No AI)**
```bash
# Uses mock LLM responses - great for UI/integration work
npm start
```

**Option 2: Foundry Local (Real AI, No Cloud)**
```bash
# Install Foundry Local CLI first
winget install Microsoft.AI.Foundry.Local

# Start PowerHoof with local AI
cp config.foundry-local.json config.dev.json
npm start
```

Foundry Local automatically downloads models on first use (~2GB for phi-3.5-mini).

**NPU Support (Copilot+ PCs)**
```bash
# For Copilot+ laptops with NPU, use NPU-optimized models
foundry model download phi-4-mini-instruct-openvino-npu:2
```

Then in `config.json`:
```json
{
  "providers": {
    "local": {
      "type": "foundry-local",
      "modelAlias": "phi-4-mini"
    }
  }
}
```

NPU models offer ~5-10W power consumption vs 65W+ for GPU, enabling background AI while you work.

**Option 3: Azure OpenAI**
```bash
# Set up environment variables
cp .env.example .env
# Edit .env with your Azure credentials
npm start
```

### Deploy to Azure

**Option 1: Quick deployment with PowerShell script**
```powershell
# Creates ACR, Azure OpenAI, and Container App
./deploy-azure.ps1 -ResourceGroup powerhoof-rg -Location eastus2 -CreateOpenAI
```

This script automatically:
- Creates an Azure Container Registry
- Builds and pushes the Docker image
- Deploys a GPT-4o model to Azure OpenAI
- Creates an Azure Container Apps environment
- Deploys the app with all environment variables configured

**Option 2: Manual deployment with Azure CLI**
```bash
# Login to Azure
az login

# Create resource group
az group create --name powerhoof-rg --location eastus2

# Create Container Registry
az acr create --name powerhoofacr --resource-group powerhoof-rg --sku Basic

# Build and push image
az acr build --registry powerhoofacr --image powerhoof:latest .

# Create Container Apps environment
az containerapp env create --name powerhoof-env --resource-group powerhoof-rg

# Deploy the app
az containerapp create \
  --name powerhoof-api \
  --resource-group powerhoof-rg \
  --environment powerhoof-env \
  --image powerhoofacr.azurecr.io/powerhoof:latest \
  --target-port 3000 \
  --ingress external \
  --env-vars \
    "AZURE_OPENAI_ENDPOINT=https://your-openai.openai.azure.com" \
    "AZURE_OPENAI_API_KEY=your-key" \
    "PRIMARY_MODEL=azure-openai/gpt-4o"
```

**Option 3: Azure Developer CLI (full infrastructure)**
```bash
# Login to Azure
az login
azd auth login

# Initialize environment
azd init

# Deploy everything
azd up
```

## Configuration

PowerHoof uses environment variables for configuration:

| Variable | Description | Required |
|----------|-------------|----------|
| `AZURE_OPENAI_ENDPOINT` | Azure OpenAI endpoint URL | Yes |
| `AZURE_OPENAI_KEY` | API key (or use Managed Identity) | No |
| `AZURE_OPENAI_MODEL` | Model deployment name | Yes |
| `COSMOS_ENDPOINT` | Cosmos DB endpoint | Yes |
| `COSMOS_DATABASE` | Database name | Yes |
| `SESSION_POOL_ENDPOINT` | ACA Dynamic Sessions endpoint | Yes |
| `KEYVAULT_URL` | Key Vault URL for secrets | No |

## Channel Configuration

Configure channel adapters in `config.json`:

### Microsoft Graph (Teams/Outlook)
```json
{
  "channels": {
    "graph": {
      "enabled": true,
      "dmPolicy": "pairing",
      "clientId": "your-app-id",
      "tenantId": "your-tenant-id",
      "useManagedIdentity": true,
      "subscriptions": ["teams-messages", "outlook-mail"]
    }
  }
}
```

### Dataverse (Power Platform)
```json
{
  "channels": {
    "dataverse": {
      "enabled": true,
      "dmPolicy": "open",
      "environmentUrl": "https://yourorg.crm.dynamics.com",
      "clientId": "your-app-id",
      "tenantId": "your-tenant-id",
      "messageTable": "powerhoof_messages",
      "responseTable": "powerhoof_responses"
    }
  }
}
```

### Power Platform Custom Connector

PowerHoof exposes an OpenAPI spec for easy import into Power Platform:

1. **Get the OpenAPI spec**: `GET /openapi.json` or `/openapi.yaml`
2. **Create Custom Connector** in Power Platform:
   - Go to **make.powerapps.com** → **Custom connectors** → **New**
   - Import from URL: `https://your-api.azurecontainerapps.io/openapi.json`
   
3. **Configure OAuth Authentication**:
   ```json
   {
     "auth": {
       "mode": "oauth",
       "oauth": {
         "tenantId": "your-tenant-id",
         "clientId": "fc75c498-60fc-436a-90e0-d2395c2bd00f",
         "audience": "api://fc75c498-60fc-436a-90e0-d2395c2bd00f"
       }
     }
   }
   ```

4. **On-Premises Gateway** (for local deployment):
   - Install On-Premises Data Gateway
   - Configure connector to use gateway for `http://localhost:3000`

### OAuth Dynamic Discovery (for Copilot Studio)

PowerHoof supports OAuth 2.0 Dynamic Discovery (RFC 8414), enabling Copilot Studio to auto-configure authentication:

| Endpoint | Purpose |
|----------|---------|
| `/.well-known/oauth-authorization-server` | OAuth 2.0 Authorization Server Metadata |
| `/.well-known/openid-configuration` | OpenID Connect Discovery |

**Copilot Studio Setup:**
1. In Copilot Studio, add PowerHoof as an **MCP Server** or **Custom Action**
2. Select **Dynamic Discovery** as the OAuth 2.0 type
3. Enter the discovery URL: `https://your-api.azurecontainerapps.io/.well-known/oauth-authorization-server`
4. Copilot Studio auto-discovers authorization/token endpoints

**Live Deployment:**
- API: `https://powerhoof-api.wonderfulground-029e77e9.eastus2.azurecontainerapps.io`
- Discovery: `https://powerhoof-api.wonderfulground-029e77e9.eastus2.azurecontainerapps.io/.well-known/oauth-authorization-server`
- OpenAPI: `https://powerhoof-api.wonderfulground-029e77e9.eastus2.azurecontainerapps.io/openapi.json`

## Nushell Commands

PowerHoof provides custom Nushell commands for common operations:

### `ph-web`
HTTP requests with automatic response parsing.
```nushell
ph-web get "https://api.example.com/users" | from json | select name email
```

### `ph-file`
Safe file operations within the sandbox.
```nushell
ph-file read data.json | from json | where status == "active"
```

### `ph-azure`
Azure CLI wrapper for resource management.
```nushell
ph-azure resource list --resource-group myRG
```

### `ph-memo`
Save information to persistent memory.
```nushell
ph-memo save "user_preference" "prefers dark mode"
```

### `ph-ask`
Query a sub-agent for additional information.
```nushell
ph-ask "What's the current weather in Seattle?"
```

## Token Efficiency

Track token savings with the built-in comparison tool:

```typescript
import { generateSavingsReport } from './utils/token-tracking';

console.log(generateSavingsReport());
```

Example output:
```
# PowerHoof Token Efficiency Report

## Current Session
- Total Requests: 50
- Total Tokens: 35,000
- Estimated Cost: $0.12

## Savings vs MCP
- Tokens Saved: 250,000 (87%)
- Cost Saved: $0.63
```

## API Reference

### POST /chat
Send a message to the agent.

```json
{
  "sessionId": "optional-session-id",
  "message": "List my Azure resources"
}
```

### GET /health
Health check endpoint.

### GET /history/:sessionId
Get conversation history.

### DELETE /session/:sessionId  
Clear session data.

### WebSocket /ws
Real-time bidirectional communication.

## Testing

```bash
# Run all tests
npm test

# Run with coverage
npm run test:run -- --coverage

# Run specific test file
npm test src/tests/validator.test.ts
```

## Security

PowerHoof uses multiple layers of security:

1. **Script Validation** - All LLM-generated scripts are validated before execution
2. **Hyper-V Isolation** - Nushell runs in isolated containers
3. **Network Restrictions** - Limited outbound network access
4. **Managed Identity** - No secrets in code, Azure AD authentication
5. **Key Vault** - Secrets stored securely and resolved at runtime
6. **DM Pairing** - Untrusted senders verify with a 6-digit code before messaging

### DM Pairing Flow

When `dmPolicy: "pairing"` is configured, new senders must verify:

1. Sender sends first message
2. Agent responds with a 6-digit pairing code
3. Sender confirms code through trusted channel (web UI, admin approval)
4. Sender is approved and messages flow through

```typescript
import { createPairingService, generatePairingMessage } from "./channels/pairing.js";

const pairing = createPairingService({
  codeExpirationMinutes: 15,
  onPairingRequest: (req) => console.log(`New pairing: ${req.code}`),
});

// Check if sender is approved
if (!pairing.isApproved(senderId, "graph")) {
  const request = pairing.createPairingRequest(senderId, "graph", {
    senderName: "John Doe",
    initialMessage: message.content,
  });
  return generatePairingMessage(request);
}
```

## Skills Platform

Skills are pluggable capabilities that extend the agent without modifying core code.

### Built-in Skills

#### Weather Skill (`/weather`)
Get current weather, forecasts, UV index, and air quality for any location.

```
/weather Seattle
/weather Tokyo, Japan
weather in London
```

**Features:**
- Current temperature (°C/°F) with "feels like"
- Weather conditions with emoji icons
- Humidity, wind speed
- UV Index with safety level (Low/Moderate/High/Very High/Extreme)
- Air Quality Index (AQI) with PM2.5/PM10 levels
- 3-day forecast with precipitation probability

#### Translate Skill (`/translate`, `/tr`)
Translate common phrases between languages (offline, no API needed).

```
/tr hello to Spanish      → "hola"
/translate goodbye to Japanese → "さようなら"
/tr thank you to French   → "merci"
```

**Supported Languages:** Spanish, French, German, Italian, Japanese, Chinese, Korean, Portuguese, Russian, Arabic, Hindi, Dutch

**Available Phrases:** Greetings, farewells, polite expressions, questions, emergencies, and common responses (~180 phrases).

#### Time Skill (`/time`, `/timezone`)
Get current time in cities and timezones worldwide.

```
/time Tokyo           → "It's 3:45 PM (15:45) in Tokyo, Japan (UTC+9)"
/time New York        → "It's 1:45 AM (-0500) in New York, USA"
what time is it in London
```

**Supported Cities:** New York, Los Angeles, Chicago, London, Paris, Berlin, Tokyo, Sydney, Dubai, Singapore, Hong Kong, Mumbai, and 30+ more.

#### Define Skill (`/define`, `/dict`)
Look up word definitions from the Free Dictionary API.

```
/define serendipity
/dict ephemeral
define ubiquitous
what does "mellifluous" mean
```

**Returns:** Part of speech, definitions, phonetic pronunciation, example sentences, and synonyms.

#### Random Skill (`/random`, `/quote`, `/fact`, `/joke`)
Get random quotes, facts, or jokes.

```
/random           → Random quote or fact
/quote            → Inspirational quote
/fact             → Random interesting fact
/joke             → Dad joke
/inspire          → Motivational quote
```

**Content:** 50+ quotes from famous people, 30+ random facts, and classic jokes.

### Creating Custom Skills

```typescript
// skills/my-skill.ts
export const skill: Skill = {
  manifest: {
    id: "my-skill",
    name: "My Custom Skill",
    description: "Does something useful",
    version: "1.0.0",
    permissions: ["network:read"],
  },
  
  canHandle(context) {
    return context.message.content.includes("my-skill");
  },
  
  async execute(context) {
    return {
      success: true,
      output: "Skill executed!",
    };
  },
};
```

Skills are loaded from the `skills/` directory with hot-reload support.

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing`)
5. Open a Pull Request

## License

MIT License - see [LICENSE](LICENSE) for details.

## Acknowledgments

- Inspired by [OpenClaw](https://github.com/codeverlan/openclaw)
- Built with [Nushell](https://www.nushell.sh/)
- Powered by [Azure OpenAI](https://azure.microsoft.com/en-us/products/ai-services/openai-service) and [Foundry Local](https://learn.microsoft.com/azure/ai-foundry/foundry-local/)
