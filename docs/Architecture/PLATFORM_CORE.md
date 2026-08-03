# Talent OS — Platform Core

**Document version:** 1.1.0  
**Date:** July 31, 2026  
**PR:** T-02 (simplified PR-00)  
**Status:** Implemented — **Talent OS single product**  
**Scope:** Shared kernel for org context, feature flags MVP, config, and events

---

## Overview

Platform Core is the **internal shared kernel** for Talent OS. It provides organization context, feature flags (MVP), layered configuration, and platform events — without multi-product abstractions.

**This repository implements one product only: Talent OS.**

```
┌─────────────────────────────────────────────────────────┐
│              Talent OS Application Layer                 │
│  API handlers · Server Actions · Agents · Workflows      │
└──────────────────────────┬──────────────────────────────┘
                           │ createPlatformClient()
┌──────────────────────────▼──────────────────────────────┐
│              @/modules/platform (SDK)                    │
│  Context · Feature Flags · Config · Events               │
└──────────────────────────┬──────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────┐
│  platform_feature_flags · platform_config                │
│  domain_events (via PlatformEventEmitter)                │
└─────────────────────────────────────────────────────────┘
```

---

## Module structure

```
modules/platform/
├── index.ts
├── types/           # OrganizationContext, TALENT_OS_DEFAULT_CONFIG
├── contracts/       # DI interfaces
├── context/         # tenantId → organizationId
├── features/        # Feature flag MVP
├── config/          # Layered config service
├── events/          # Typed events → domain outbox
└── sdk/             # createPlatformClient()
```

---

## Usage

```typescript
import { createPlatformClient } from '@/modules/platform'

const client = createPlatformClient({
  getContext: () => apiContext,
})

const org = await client.getContext()
const enabled = await client.featureFlags.isEnabled('ai_matching', { context: org })
const config = await client.config.getMerged({ context: org })
```

No `productId` parameter — Talent OS is implicit.

---

## Feature flags (MVP)

**Precedence:** env → org override → platform default → legacy `tenant.settings.features`

Environment: `PLATFORM_FLAG_<KEY>` (e.g. `PLATFORM_FLAG_AI_MATCHING=false`)

---

## Configuration

**Merge order:** `TALENT_OS_DEFAULT_CONFIG` → platform `platform_config` rows → org rows → env `PLATFORM_CONFIG_*` → request override

---

## Database

Migration: `supabase/migrations/022_platform_core.sql`

| Table | Purpose |
|-------|---------|
| `platform_feature_flags` | Org and platform-scoped flags |
| `platform_config` | Layered config (seed: AI defaults) |

**Removed from v1.0 multi-product design:** `platform_product_registry`, `product_id` columns.

---

## Search & observability UI (Sprint 22)

| Feature | Route / component | Notes |
|---------|-------------------|-------|
| Federated search | `GET /api/search?q=` | Talent, projects, companies, deals — tenant-scoped, 60 req/min |
| Command palette | `CommandPalette` — ⌘K / Ctrl+K | Recent items in `localStorage` |
| Mobile nav | `MobileNav` — 5 tabs | Hidden `md+`; sidebar on desktop |
| Observability | `/settings/observability` | Admin-only; logs, alerts, trace lookup |

---

## Related documents

- [Talent OS Implementation Roadmap](./TALENT_OS_IMPLEMENTATION_ROADMAP.md) — active plan
- [Talent OS Scope Review](./TALENT_OS_SCOPE_REVIEW.md) — approved scope
- [Archived multi-product roadmap](../Archive/README.md)

---

*Platform Core v1.1.0 — Talent OS single product*
