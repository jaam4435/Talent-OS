# Module Standard

| Field | Value |
|-------|-------|
| **Version** | 1.0.0 |
| **Phase** | 2 — Platform Foundation |
| **Status** | Active |

---

## Purpose

Every business domain in TalentOS follows a **standard module layout** under `modules/<domain>/`. This ensures predictable structure, testability, and clear separation of concerns.

---

## Required Layers

Each module **must** contain:

| Layer | Folder | Responsibility |
|-------|--------|----------------|
| **API** | `api/` | Server actions and HTTP route handlers (thin — delegate to services) |
| **Service** | `services/` | Business logic, orchestration, validation entry points |
| **Repository** | `repositories/` | Persistence only — Supabase queries, RPC calls |
| **Types** | `types/` | Domain types, interfaces, DTOs |
| **Schemas** | `schemas/` | Zod validators (input/output contracts) |
| **Events** | `events/` | Domain event type constants and emit helpers |
| **Tests** | `tests/` | Module test index; implementations in `tests/service/` |
| **Documentation** | `README.md` | Module purpose, boundaries, dependencies |

---

## Architecture Rules

```
Pages / Components
       ↓
   lib/queries/*     (read model — calls services)
   app/actions/*     (writes — calls services)
       ↓
   Service layer     (business logic)
       ↓
   Repository layer  (persistence)
       ↓
   Supabase
```

### Hard rules

1. **No page or component imports Supabase directly.**
2. **Repositories own persistence** — only repositories call `supabase.from()` or RPCs.
3. **Services own business logic** — validation, authorization checks, orchestration.
4. **Events own communication** — cross-domain async messaging via domain events (outbox).
5. **API layer is thin** — parse input, call service, return result.

### Exceptions (allowed Supabase access)

| Location | Reason |
|----------|--------|
| `lib/repositories/**` | Data access layer |
| `modules/core/utils/supabase/**` | Infrastructure clients |
| `middleware.ts` | Session refresh |
| `app/api/auth/callback` | OAuth code exchange |

---

## Module Index

| Module | Path | Status |
|--------|------|--------|
| Core | `modules/core/` | Complete |
| Talent | `modules/talent/` | Standardized (Phase 2) |
| CRM | `modules/crm/` | Standardized (Phase 2) |
| Projects | `modules/projects/` | Standardized (Phase 2) |
| Assignment | `modules/assignment/` | Standardized (Phase 2) |
| Finance | `modules/finance/` | Standardized (Phase 2) |
| Workflow | `modules/workflow/` | Standardized (Phase 2) |
| AI | `modules/ai/` | Standardized (Phase 2) |
| Knowledge | `modules/knowledge/` | Extended (Phase 2) |
| Agents | `modules/agents/` | Extended (Phase 2) |
| WhatsApp | `modules/whatsapp/` | Standardized (Phase 2) |
| Integrations | `modules/integrations/` | Standardized (Phase 2) |
| Notifications | `modules/notifications/` | Standardized (Phase 2) |
| Analytics | `modules/analytics/` | Standardized (Phase 2) |
| Marketplace | `modules/marketplace/` | Extended (Phase 2) |

---

## Barrel Export

Each module exposes a single entry point:

```typescript
// modules/talent/index.ts
export * from './api'
export * from './services'
export * from './repositories'
export * from './types'
export * from './schemas'
export * from './events'
```

Import from modules in new code:

```typescript
import { TalentEvents } from '@/modules/talent'
import { FinanceEvents } from '@/modules/finance'
```

---

## Backwards Compatibility

During migration, legacy paths remain as re-exports:

| Legacy | Canonical |
|--------|-----------|
| `lib/talent/queries.ts` | `lib/queries/talent.queries.ts` |
| `lib/domains/talent/factory.ts` | `createServices().portfolio` |
| `lib/services/*.service.ts` | `modules/*/services/` (re-export) |

Deprecated paths log no runtime warnings but are marked `@deprecated` in JSDoc.

---

## Event Naming

Events use `{domain}.{action}` format:

```typescript
export const FinanceEvents = {
  PAYMENT_APPROVED: 'payment.approved',
  PAYMENT_PAID: 'payment.paid',
} as const
```

Emit via `WorkflowService.emitEvent()` — never insert into `domain_events` from pages.

---

## Testing Requirements

Each module should have:

- **Service tests** in `tests/service/<domain>.service.test.ts`
- **Repository tests** for non-trivial persistence logic
- **RLS integration tests** for multi-tenant isolation (see `tests/integration/rls-fixture.test.ts`)

Target: ≥30% line coverage on `lib/services/` and `lib/workflows/`.

---

## Scaffolding

Generate module boilerplate:

```bash
node scripts/scaffold-modules.mjs
```

---

## Related Documents

- [03 Business Domains](./03%20Business%20Domains.md)
- [15 Engineering Standards](./15%20Engineering%20Standards.md)
- [16 Event Catalog](./16%20Event%20Catalog.md)
- [Engineering Roadmap](./Engineering%20Roadmap.md) — Phase 2
