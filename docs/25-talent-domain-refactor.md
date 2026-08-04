# Talent Domain Architecture Refactor

**Module:** Talent (freelancers, portfolio, ratings)  
**Branch:** `cursor/refactor-talent-domain-5fb1`  
**Status:** Complete  
**Scope:** Architecture only — no UI, schema, or feature changes

---

## Summary

The Talent module was refactored from inline Supabase calls in server actions into a layered domain architecture with repositories, services, mappers, and shared core utilities.

Existing import paths (`@/lib/talent/*`) and server action return shapes (`{ ok, error }`) are preserved for backward compatibility.

---

## New Structure

```
lib/
├── core/                              # Shared foundation (all domains)
│   ├── context.ts                     # Supabase client typing + RepositoryContext
│   ├── errors.ts                      # DomainError + ErrorCodes
│   ├── result.ts                      # ActionResult helpers for server actions
│   ├── supabase-errors.ts             # PostgrestError → DomainError mapping
│   └── validation.ts                  # Zod parseSchema / safeParseSchema
│
└── domains/
    └── talent/
        ├── factory.ts                 # createTalentServices() — simple DI
        ├── types/
        │   └── index.ts               # Domain input/output types
        ├── validation/
        │   └── index.ts               # Zod schemas + skill helpers
        ├── mappers/
        │   ├── freelancer.mapper.ts   # Input → DB row mapping
        │   └── portfolio.mapper.ts    # DB row → domain model mapping
        ├── repositories/
        │   ├── freelancer.repository.ts
        │   ├── portfolio.repository.ts
        │   └── rating.repository.ts
        └── services/
            ├── talent.service.ts      # Freelancer CRUD + search
            └── portfolio.service.ts   # Portfolio CRUD + uploads + access
```

---

## Layer Responsibilities

| Layer | Responsibility |
|---|---|
| **Server Actions** (`app/actions/freelancers.ts`, `portfolio.ts`) | Auth guards, cache revalidation, delegate to services |
| **Services** | Business logic, validation orchestration, ActionResult mapping |
| **Repositories** | Supabase queries, RPC calls, storage operations |
| **Mappers** | Transform between domain inputs and database row shapes |
| **Core** | Shared errors, validation, result types, Supabase error mapping |

---

## Dependency Injection

Services are composed via a factory function rather than a heavy DI container:

```typescript
import { createTalentServices } from '@/lib/domains/talent/factory'

const { talent, portfolio, queries } = await createTalentServices()
```

This keeps wiring explicit and test-friendly while avoiding global singletons.

---

## Error Handling

- **Repositories** throw `DomainError` on database failures (including duplicate email `23505`).
- **Services** catch errors and return `ActionResult` (`{ ok: true }` or `{ ok: false, error }`).
- **Server actions** handle auth/permissions and `revalidatePath`; they pass through service results unchanged.
- **Portfolio access** throws `DomainError(FORBIDDEN)` which maps to `{ ok: false, error: 'FORBIDDEN' }`.

---

## Backward Compatibility

These paths remain valid and re-export from the new domain layer:

| Legacy path | New source |
|---|---|
| `@/lib/talent/types` | `@/lib/domains/talent/types` |
| `@/lib/talent/validation` | `@/lib/domains/talent/validation` |
| `@/lib/talent/queries` | Delegates to `createTalentServices()` |

UI components and pages require no changes.

---

## Files Changed

| File | Change |
|---|---|
| `app/actions/freelancers.ts` | Thin wrapper around `TalentService` |
| `app/actions/portfolio.ts` | Thin wrapper around `PortfolioService` |
| `app/api/talent/search/route.ts` | Uses `TalentService.searchRoster()` |
| `lib/talent/*` | Re-exports / delegates to domain layer |
| `lib/core/*` | New shared foundation |
| `lib/domains/talent/*` | New domain implementation |

---

## Next Modules (planned)

Apply the same pattern to:

1. Auth (`app/actions/auth.ts`)
2. Opportunities + Shortlists
3. Projects + Milestones
4. Companies
5. AI integrations

Each module will add its own `lib/domains/<name>/` folder and extend `lib/core/` only when shared abstractions emerge.
