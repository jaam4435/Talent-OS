# Business Domains Refactor

**Architecture:** Modular monolith with domain modules under `modules/`  
**Rule:** One module per iteration — update docs, commit, stop.

---

## Module Structure

Each business domain lives under `modules/<name>/` with:

```
modules/<name>/
├── services/       # Business logic
├── repositories/   # Data access
├── schemas/        # Zod validation
├── types/          # Domain types
├── api/            # Server actions + HTTP helpers
├── components/     # Domain UI
├── hooks/          # Client hooks
└── utils/          # Domain utilities
```

---

## Module Map

| Module | Scope | Status |
|---|---|---|
| **Core** | Auth, RBAC, tenants, Supabase infra, shared UI, API helpers | ✅ Complete |
| **CRM** | Companies, clients | Pending |
| **Talent** | Freelancers, portfolio, ratings | Pending (partial in `lib/domains/talent/`) |
| **Projects** | Projects, milestones | Pending |
| **Assignments** | Freelancer ↔ project binding | Pending |
| **Workflow** | Events, n8n, WhatsApp, cron | Pending |
| **Finance** | Payments, billing | Pending |
| **Analytics** | Dashboard metrics, reports | Pending |
| **Notifications** | In-app notifications | Pending |
| **AI** | Matching, PM, brief parsing | Pending |
| **Marketplace** | Public talent discovery | Not implemented |

---

## Module 1: Core (Complete)

### Moved From → To

| Legacy path | New path |
|---|---|
| `lib/core/*` | `modules/core/utils/` |
| `lib/utils/*` | `modules/core/utils/` |
| `lib/supabase/*` | `modules/core/utils/supabase/` |
| `lib/api/*` | `modules/core/api/` |
| `lib/auth/*` | `modules/core/services/` |
| `types/enums.ts`, `types/api.ts`, `types/database.ts` | `modules/core/types/` |
| `hooks/*` | `modules/core/hooks/` |
| `components/auth`, `layout`, `settings`, `shared`, `ui` | `modules/core/components/` |
| `app/actions/auth.ts` | `modules/core/api/auth.actions.ts` |

### Import Conventions

```typescript
// Auth & session
import { requireTenant } from '@/modules/core/services/session'
import { isManager } from '@/modules/core/services/permissions'

// Supabase clients
import { createClient } from '@/modules/core/utils/supabase/server'

// Shared types
import type { UserRole } from '@/modules/core/types/enums'
import type { Tables } from '@/modules/core/types/database'

// UI primitives
import { Button } from '@/modules/core/components/ui/button'

// Domain utilities (errors, validation, results)
import { DomainError } from '@/modules/core/utils/errors'
import { actionOk } from '@/modules/core/utils/result'
```

### Backward Compatibility

`lib/core/*` re-exports remain as deprecated shims pointing to `modules/core/utils/*`.

`app/actions/auth.ts` re-exports from `modules/core/api/auth.actions.ts` for Next.js server action conventions.

---

## Next Module

**Talent** — migrate `lib/domains/talent/` into `modules/talent/` and move talent-specific components from `components/talent/`.
