# Platform Core — Implementation Specification

**Document version:** 1.0.0  
**Date:** August 2, 2026  
**Status:** Draft — awaiting approval  
**Bounded context:** Platform Core (Shared Kernel)  
**References:** `DOMAIN_MODEL.md`, `CONTEXT_MAP.md`, `EVENT_CATALOG.md`, `UBIQUITOUS_LANGUAGE.md`

---

## 1. Business Overview

Platform Core is the **cross-cutting shared kernel** for Talent OS: feature flags, layered configuration, organization context resolution, API idempotency, observability, and platform-level events. It is not a business domain — it provides infrastructure consumed by all bounded contexts.

**Primary actors:** Platform (system), all application layers  
**Business outcome:** Consistent tenant isolation, feature gating, and operational visibility across the modular monolith.

---

## 2. Responsibilities

### In scope

- Organization/tenant context resolution from session
- Feature flag MVP (env → org override → platform default)
- Layered configuration merge (global → tenant → env → request)
- Platform SDK (`createPlatformClient()`)
- RBAC permission definitions and checks
- API idempotency (request deduplication)
- Observability (health, metrics, traces, alerts)
- Platform and AI lifecycle events
- Supabase RLS helper functions (`is_manager_of`, `user_tenant_ids`)

### Out of scope

- Business entity operations (all domain BCs)
- Authentication (Supabase Auth)
- Database schema for business entities
- Workflow orchestration (Workflow BC)

---

## 3. Public APIs

Platform Core has **no dedicated REST namespace**. It is consumed internally:

| Consumer | Entry point | Purpose |
|----------|-------------|---------|
| All API routes | `resolveTenantContext()` | Session → tenant + role |
| All API routes | `requirePermission()` | RBAC enforcement |
| All API routes | `instrumentApiRequest()` | Request tracing |
| Feature-gated features | `client.featureFlags.isEnabled()` | Toggle checks |
| Config consumers | `client.config.getMerged()` | Layered config |
| Cron/health | `/api/health`, observability endpoints | Platform health |

**Health:** `GET /api/health` — platform health check

---

## 4. Internal Services

| Service | Path | Role |
|---------|------|------|
| **Platform SDK** | `modules/platform/sdk/` | `createPlatformClient()` facade |
| **Context resolver** | `modules/core/services/tenant-context.ts` | Session → TenantContext |
| **Permissions** | `modules/core/services/permissions.ts` | RBAC map and checks |
| **Feature flags** | `modules/platform/features/` | MVP flag provider |
| **Config service** | `modules/platform/config/` | Layered config merge |
| **Event emitter** | `modules/platform/events/` | Typed events → outbox |
| **ObservabilityService** | `lib/services/observability.service.ts` | Health dashboard, alerts |
| **Invites** | `modules/core/services/invites.ts` | Invite token lifecycle |

**Module structure:** `modules/platform/` — types, contracts, context, features, config, events, sdk

---

## 5. Database Schema

**Migrations:** `013_platform_core.sql` (approximate), various RLS helpers

| Table | Purpose |
|-------|---------|
| `platform_feature_flags` | Per-tenant feature toggles |
| `platform_config` | Layered configuration entries |
| `api_idempotency_responses` | Request deduplication cache |

**Observability entities (runtime/log):**

- `PlatformLogEntry`, `PlatformMetricPoint`, `PlatformTraceSpan`, `PlatformAlert`

**RLS helpers:** `is_manager_of(tenant_id)`, `user_tenant_ids()` — used by all BCs

---

## 6. Aggregates

| Aggregate | Root table | Invariants |
|-----------|------------|------------|
| **FeatureFlag** | `platform_feature_flags` | Unique `(tenant_id, key)`; boolean value |
| **PlatformConfig** | `platform_config` | Layer + key uniqueness |
| **ApiIdempotencyResponse** | `api_idempotency_responses` | TTL-based expiry |

**Value objects (not persisted):**

- `TenantContext` — tenantId, userId, role, permissions
- `SessionContext` — auth session metadata
- `Permission` — string identifiers (e.g. `project:read`)

---

## 7. Domain Events

**Platform events (`PLATFORM_EVENTS`):**

`platform.product.registered`, `platform.feature_flag.changed`, `platform.config.updated`, `platform.context.resolved`

**AI lifecycle events (`AI_EVENTS`):**

`ai.request.started`, `ai.request.completed`, `ai.request.failed`, `ai.budget.threshold`

**Emission:** `PlatformEventEmitter` → `domain_events` outbox

---

## 8. Commands

| Command | Handler | Context |
|---------|---------|---------|
| SetFeatureFlag | Feature flag provider | Admin/platform |
| SetConfig | Config service | Admin/platform |
| ResolveContext | Tenant context resolver | Every API request |
| RecordIdempotency | Idempotency middleware | Mutating API requests |
| EmitPlatformEvent | Platform event emitter | Flag/config changes |

---

## 9. Queries

| Query | Returns |
|-------|---------|
| GetContext | `TenantContext` for current session |
| GetPermissionsForRole | Permission string array |
| IsFeatureEnabled | Boolean for flag key |
| GetMergedConfig | Layered config object |
| GetHealth | Platform health status |
| GetObservabilityDashboard | Metrics, traces, alerts |

---

## 10. Validation Rules

| Rule | Field | Constraint |
|------|-------|------------|
| Feature flag key | `key` | Lowercase snake_case |
| Config key | `key` | Valid namespace.key format |
| Idempotency key | header | Max 256 chars; UUID recommended |
| Tenant ID | `tenantId` | Valid UUID; user must be member |

**Precedence rules:**

- Feature flags: env → org override → platform default → legacy `tenant.settings.features`
- Config: default → platform → org → env → request override

---

## 11. Authorization Rules

Platform Core **defines** permissions consumed by all BCs. Permission map in `modules/core/services/permissions.ts`:

| Role | Scope |
|------|-------|
| `admin` | Full platform permissions |
| `talent_manager` | Business operations (no billing) |
| `freelancer` | Self-service scoped |
| `client` | Company-linked read |

**RLS helpers:** `is_manager_of(tenant_id)` — admin or talent_manager check used across all BC migrations.

---

## 12. AI Capabilities

| Feature | Role |
|---------|------|
| **Feature gating** | `ai_matching`, `ai_agents` flags control AI BC access |
| **Budget events** | `ai.budget.threshold` platform event |
| **Config** | AI provider defaults in layered config |

Platform Core does not execute AI — it governs access and emits lifecycle events.

---

## 13. Background Jobs

| Job | Trigger | Action |
|-----|---------|--------|
| Idempotency cleanup | Future cron | Expire stale idempotency keys |
| Observability aggregation | Future cron | Roll up metrics |

**Current:** No dedicated platform cron; observability is on-demand.

---

## 14. Integrations

| System | Direction | Purpose |
|--------|-----------|---------|
| **Supabase Auth** | Inbound | Session identity |
| **Redis** | Optional | Distributed cache, rate limiting |
| **All BCs** | Outbound | Context, permissions, flags, config |
| **Domain events outbox** | Outbound | Platform + AI lifecycle events |

---

## 15. Observability

| Signal | Source |
|--------|--------|
| API instrumentation | `instrumentApiRequest()` on all routes |
| Workflow instrumentation | `instrumentWorkflowRun()` |
| Notification instrumentation | `instrumentNotification()` |
| Health endpoint | `/api/health` |
| Observability service | Metrics, traces, alerts dashboard |

---

## 16. Testing Strategy

| Test | Focus |
|------|-------|
| Unit | Feature flag precedence chain |
| Unit | Config merge order |
| Unit | Permission matrix completeness |
| Integration | Context resolution with valid/invalid session |
| Integration | Idempotency duplicate request rejection |
| Integration | RLS helper functions |

**Coverage target:** 90% on permissions and context resolver (critical path).

---

## 17. Migration Strategy

| Migration | Content |
|-----------|---------|
| `013_*` (platform core) | Feature flags, config tables |
| Future | Custom roles; org-level feature overrides |

**No breaking changes:** Platform SDK is additive; BCs consume incrementally.

---

## 18. Future Enhancements

1. **Custom roles** — Beyond four fixed roles
2. **Org-level feature overrides** — Per-tenant flag management UI
3. **Rate limiting** — Redis-backed API throttling
4. **Distributed tracing** — OpenTelemetry export
5. **Multi-region config** — Geo-specific defaults
6. **API versioning** — Platform-level version negotiation

---

## Appendix — File map

| Artifact | Path |
|----------|------|
| Platform SDK | `modules/platform/` |
| Permissions | `modules/core/services/permissions.ts` |
| Tenant context | `modules/core/services/tenant-context.ts` |
| Event catalog | `modules/platform/events/catalog.ts` |
| Observability | `lib/services/observability.service.ts` |
| Architecture doc | `docs/Architecture/PLATFORM_CORE.md` |
