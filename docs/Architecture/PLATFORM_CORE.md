# Talent OS — Platform Core

**Document version:** 1.0.0  
**Date:** July 31, 2026  
**PR:** PR-00  
**Status:** Implemented  
**Scope:** Shared platform SDK consumed by AI Platform, domain services, agents, and future products

---

## Overview

Platform Core is the **cross-product foundation** for Talent OS, Media Intelligence, and AI Ad Studio. It provides a single SDK, organization context, product registry, feature flags (MVP), configuration, events, contracts, and types — with no AI-specific logic beyond registration hooks.

```
┌─────────────────────────────────────────────────────────┐
│                    Application Layer                     │
│  API handlers · Server Actions · Agents · Workflows      │
└──────────────────────────┬──────────────────────────────┘
                           │ createPlatformClient()
┌──────────────────────────▼──────────────────────────────┐
│              @/modules/platform (SDK)                    │
│  Products · Feature Flags · Config · Events · Context    │
└──────────────────────────┬──────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────┐
│  platform_product_registry · platform_feature_flags      │
│  platform_config · domain_events (via PlatformEventEmitter)│
└─────────────────────────────────────────────────────────┘
```

---

## Module structure

```
modules/platform/
├── index.ts                 # Barrel export
├── types/                   # ProductId, OrganizationContext, etc.
├── contracts/               # DI interfaces for testing
├── context/                 # Organization context (tenantId → organizationId)
├── products/                # Product registry (talent_os, media_intel, ad_studio)
├── features/                # Feature flag MVP (env > org > platform > legacy)
├── config/                  # Layered config service
├── events/                  # Typed platform events → domain outbox
└── sdk/                     # createPlatformClient factory
```

Repositories live in `lib/repositories/platform-*.repository.ts` and are wired through `lib/repositories/factory.ts`.

---

## Key types

| Type | Description |
|------|-------------|
| `ProductId` | `'talent_os' \| 'media_intel' \| 'ad_studio'` — single source of truth |
| `OrganizationContext` | Immutable request context: `organizationId` (maps from `tenantId`), `userId`, `role`, `permissions`, `correlationId`, `requestId`, `productId` |

---

## Usage

### Create a platform client

```typescript
import { createPlatformClient } from '@/modules/platform'
import { createRequestContext, enrichContextFromSession } from '@/modules/core/api/context'

const client = createPlatformClient({
  productId: 'talent_os',
  getContext: () => apiContext, // ApiRequestContext or OrganizationContext
})

const org = await client.getContext()
const hybridEnabled = await client.featureFlags.isEnabled('talent_os', 'hybrid_search', {
  context: org,
})
const config = await client.config.getMerged('talent_os', { context: org })
```

### Emit a platform event

```typescript
import { PLATFORM_EVENTS } from '@/modules/platform'

await client.events.emit({
  eventType: PLATFORM_EVENTS.CONFIG_UPDATED,
  aggregateType: 'platform_config',
  aggregateId: configId,
  idempotencyKey: `config:${configId}`,
  context: org,
  data: { configKey: 'ai' },
})
```

Events wrap the existing domain outbox (`lib/integrations/events.ts`) and always include `productId`, `organizationId`, and `correlationId` in the payload.

---

## Feature flags (MVP)

**Precedence (highest wins):**

1. **Environment** — `PLATFORM_FLAG_<PRODUCT>_<KEY>` or `PLATFORM_FLAG_<KEY>`
2. **Organization override** — `platform_feature_flags` row with `tenant_id`
3. **Platform default** — `platform_feature_flags` row with `tenant_id IS NULL`
4. **Legacy tenant settings** — `tenant.settings.features` fallback for `ai_matching` / `ai_pm`

Wave 0c ([FEATURE_FLAGS_PLATFORM.md](./FEATURE_FLAGS_PLATFORM.md)) extends this to the full five-layer evaluation engine.

---

## Configuration service

**Merge order (later wins):**

1. Product `default_config` from registry
2. Platform-wide `platform_config` rows (`tenant_id IS NULL`)
3. Organization `platform_config` rows
4. Environment variables `PLATFORM_CONFIG_<PRODUCT>_<KEY>`
5. Request override (optional parameter)

---

## Database

Migration: `supabase/migrations/022_platform_core.sql`

| Table | Purpose |
|-------|---------|
| `platform_product_registry` | Three products seeded; only `talent_os` enabled |
| `platform_feature_flags` | MVP flags — platform and org scopes |
| `platform_config` | Layered org-scoped configuration |

RLS: authenticated read for tenant members; managers can write org-scoped rows.

---

## Downstream dependencies

| Wave | Depends on Platform Core for |
|------|------------------------------|
| AI Platform (PR-01+) | `ProductId`, test DI, `@/modules/platform/types` |
| Billing (PR-B01+) | `OrganizationContext` |
| Feature Flags (PR-FF01+) | MVP flag service extension |
| Search (PR-S01+) | `OrganizationContext`, `ProductId` |
| Audit (PR-A01+) | `correlationId`, org context |
| Workflow (PR-W01+) | Product registry, events |

PR-11 creates `@/lib/ai-platform` as the AI extension of this SDK.

---

## Testing

Unit tests: `tests/unit/platform/*.test.ts` (≥15 tests)

```bash
npm test -- tests/unit/platform
```

---

## Related documents

- [AI Implementation Roadmap](./AI_IMPLEMENTATION_ROADMAP.md) — PR-00 specification
- [Engineering Execution Plan](./ENGINEERING_EXECUTION_PLAN.md) — Sprint 1 assignment
- [Feature Flags Platform](./FEATURE_FLAGS_PLATFORM.md) — Wave 0c extension
- [Billing Platform](./BILLING_PLATFORM.md) — uses org context
- [AI Platform](./AI_PLATFORM.md) — primary consumer

---

*Platform Core v1.0.0 — PR-00*
