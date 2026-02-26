# PowerHoof - Secure Future Initiative (SFI) Compliance

This document outlines how PowerHoof aligns with Microsoft's [Secure Future Initiative](https://learn.microsoft.com/security/zero-trust/sfi/secure-future-initiative-overview) (SFI) security principles.

## Zero Trust Principles

| Principle | Implementation |
|-----------|----------------|
| **Verify Explicitly** | All API requests validated via Zod schemas; audit logging captures every action |
| **Use Least Privilege** | Managed Identity permissions scoped per-resource; RBAC assignments are minimal |
| **Assume Breach** | Nushell sandboxed in Hyper-V; rate limiting prevents DoS; network isolation available |

---

## SFI Pillar Compliance

### 1. Protect Identities & Secrets ✅

| Requirement | Status | Implementation |
|-------------|--------|----------------|
| Managed Identity | ✅ | `DefaultAzureCredential` for all Azure services |
| Key Vault secrets | ✅ | `src/secrets/keyvault.ts` with TTL caching |
| No hardcoded credentials | ✅ | All secrets resolved at runtime |
| Standard SDKs | ✅ | Using `@azure/identity`, `@azure/openai`, `@azure/cosmos` |
| MFA enforcement | ⚠️ | Requires Azure AD configuration (not app-level) |

**Files:**
- [src/secrets/keyvault.ts](src/secrets/keyvault.ts) - Secret resolver with caching
- [src/providers/azure-openai.ts](src/providers/azure-openai.ts) - Managed Identity auth

### 2. Protect Tenants & Isolate Systems ✅

| Requirement | Status | Implementation |
|-------------|--------|----------------|
| Compute isolation | ✅ | ACA Dynamic Sessions with Hyper-V |
| Script sandboxing | ✅ | Nushell runs in isolated containers |
| Dangerous pattern blocking | ✅ | Validator rejects `rm -rf`, `sudo`, etc. |
| Resource boundaries | ✅ | Per-tenant Cosmos DB partitions |

**Files:**
- [src/nushell/validator.ts](src/nushell/validator.ts) - Script validation
- [src/nushell/executor.ts](src/nushell/executor.ts) - Sandboxed execution
- [infra/containers/nushell/Dockerfile](infra/containers/nushell/Dockerfile) - Container definition

### 3. Protect Networks ⚠️ (Optional Module)

| Requirement | Status | Implementation |
|-------------|--------|----------------|
| VNet integration | ⚠️ | Available via `infra/sfi-security.bicep` |
| Private Endpoints | ⚠️ | Available via `enablePrivateEndpoints=true` |
| Network segmentation | ⚠️ | Requires deployment configuration |
| Security headers | ✅ | CSP, HSTS, X-Frame-Options, etc. |
| CORS restrictions | ✅ | Configurable allowed origins |

**Files:**
- [infra/sfi-security.bicep](infra/sfi-security.bicep) - VNet + Private Endpoints
- [src/utils/security.ts](src/utils/security.ts) - Security middleware

**To enable Private Endpoints:**
```bash
azd env set ENABLE_PRIVATE_ENDPOINTS true
azd up
```

### 4. Protect Engineering Systems ✅

| Requirement | Status | Implementation |
|-------------|--------|----------------|
| SBOM generation | ✅ | `npm run sbom` using CycloneDX |
| Dependency scanning | ✅ | `npm audit` in CI/CD |
| Secret scanning | ✅ | TruffleHog in GitHub Actions |
| SAST scanning | ✅ | CodeQL in GitHub Actions |
| Code signing | ⚠️ | Requires GitHub/Azure DevOps configuration |

**Files:**
- [.github/workflows/ci-cd.yml](.github/workflows/ci-cd.yml) - Security-first CI/CD
- [package.json](package.json) - `sbom`, `audit`, `security` scripts

### 5. Monitor and Detect Cyberthreats ✅

| Requirement | Status | Implementation |
|-------------|--------|----------------|
| Application Insights | ✅ | OpenTelemetry integration |
| Audit logging | ✅ | Structured audit events |
| Log Analytics | ✅ | Centralized in Azure |
| Health checks | ✅ | Per-component monitoring |
| Token tracking | ✅ | Usage comparison metrics |

**Files:**
- [src/utils/telemetry.ts](src/utils/telemetry.ts) - OpenTelemetry + App Insights
- [src/utils/security.ts](src/utils/security.ts) - Audit logging
- [src/utils/health.ts](src/utils/health.ts) - Health checker
- [src/utils/token-tracking.ts](src/utils/token-tracking.ts) - Token metrics

### 6. Accelerate Response and Remediation ⚠️

| Requirement | Status | Implementation |
|-------------|--------|----------------|
| Rate limiting | ✅ | Request throttling per IP |
| Error handling | ✅ | Graceful degradation |
| Incident playbooks | ⚠️ | Document recommended |
| Automated remediation | ⚠️ | Requires Azure Policy/Defender |

---

## Security Checklist for Production

- [ ] Enable Private Endpoints (`ENABLE_PRIVATE_ENDPOINTS=true`)
- [ ] Configure Azure AD MFA for admin access
- [ ] Set up Azure Defender for Cloud
- [ ] Create incident response playbook
- [ ] Configure Azure Sentinel for SIEM
- [ ] Enable Managed HSM for Key Vault (premium tier)
- [ ] Set up Azure Policy for compliance enforcement
- [ ] Configure WAF on Application Gateway (if using custom domain)

---

## Running Security Checks

```bash
# Generate Software Bill of Materials
npm run sbom

# Run dependency audit
npm audit

# Combined security check
npm run security

# Pre-commit hook (lint + test + security)
npm run precommit
```

---

## References

- [SFI Overview](https://learn.microsoft.com/security/zero-trust/sfi/secure-future-initiative-overview)
- [SFI Adoption Guide](https://learn.microsoft.com/security/zero-trust/sfi/secure-future-initiative-adoption)
- [Zero Trust Principles](https://learn.microsoft.com/security/zero-trust/zero-trust-overview)
- [Azure Security Best Practices](https://learn.microsoft.com/azure/security/fundamentals/best-practices-and-patterns)
