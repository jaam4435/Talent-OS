# API

Talent OS exposes three API surfaces: **Route Handlers** (REST/webhooks/cron), **Server Actions** (mutations from UI), and **Supabase Direct** (reads via RSC + RLS).

> **Auto-generated catalogs:** [API Routes](./generated/api-routes.md) · [Server Actions](./generated/server-actions.md)

---

## Layers

| Layer | Location | Auth | Use case |
|---|---|---|---|
| Route Handlers | `app/api/**/route.ts` | JWT, cron secret, HMAC | REST, webhooks, cron |
| Server Actions | `app/actions/*.ts` | Supabase session | Form mutations |
| Queries | `lib/queries/*.queries.ts` | Session (via services) | Server Component reads |

---

## Route Handlers

### Authentication

| Route | Methods | Purpose |
|---|---|---|
| `/api/auth/callback` | GET | OAuth / magic link callback |
| `/api/auth/session` | GET | Current session |
| `/api/auth/signout` | POST | Sign out |
| `/api/auth/invite/:token` | GET, POST | Team invite preview / accept |

### Business

| Route | Methods | Purpose |
|---|---|---|
| `/api/talent/search` | GET | Talent roster search |
| `/api/analytics/dashboard` | GET | Dashboard KPIs |
| `/api/team/members` | GET | Tenant members |
| `/api/ai/match` | POST | Trigger AI match |
| `/api/ai/match/:opportunityId` | POST | Match for opportunity |
| `/api/ai/pm/:entityType/:entityId` | POST | AI PM features |

### Internal (service role)

| Route | Methods | Purpose |
|---|---|---|
| `/api/internal/ai/execute` | POST | Execute AI request |
| `/api/internal/ai/execute-match` | POST | Execute talent match |

### Webhooks

| Route | Methods | Purpose |
|---|---|---|
| `/api/webhooks/n8n` | POST | n8n callbacks |
| `/api/webhooks/whatsapp` | GET, POST | WhatsApp Cloud API |

### Cron (Vercel)

| Route | Schedule | Purpose |
|---|---|---|
| `/api/cron/dispatch-events` | `* * * * *` | Process domain event outbox |
| `/api/cron/process-workflow-jobs` | `* * * * *` | Execute workflow jobs |
| `/api/cron/check-overdue-milestones` | `0 8 * * *` | Daily overdue check |

### Health

| Route | Methods | Purpose |
|---|---|---|
| `/api/health` | GET | Liveness + Supabase connectivity |

Full list: [generated/api-routes.md](./generated/api-routes.md)

---

## Server Actions

Organized by domain in `app/actions/`:

| Module | Domain |
|---|---|
| `auth.ts` | Sign in/out, profile |
| `freelancers.ts`, `portfolio.ts` | Talent |
| `opportunities.ts`, `shortlists.ts`, `companies.ts` | CRM / assignment |
| `projects.ts`, `milestones.ts` | Projects |
| `ai.ts`, `ai-pm.ts` | AI features |
| `approvals.ts` | Workflow approvals |
| `knowledge.ts` | Knowledge base |
| `agents.ts` | Agent configuration |

Full export list: [generated/server-actions.md](./generated/server-actions.md)

---

## Auth Patterns

```
Session cookie (Supabase JWT)
  → middleware.ts validates
  → requireManager() / requirePermission() in actions
  → createServices() with user-scoped Supabase client
  → RLS enforces tenant isolation
```

Cron routes verify `CRON_SECRET` header. Webhooks verify HMAC / provider tokens.

---

## Response Conventions

- Route handlers return `NextResponse.json({ ok, ... })` or standard HTTP codes
- Server actions return `{ ok: true, ... } | { ok: false, error: string }`
- Errors map to domain codes via `DomainError` / `isDomainError()`

---

## Related

- [05 API Architecture (legacy)](./05-api-architecture.md) — detailed endpoint specs
- [07 Authentication Design](./07-authentication-design.md)
- [Architecture](./architecture.md)
