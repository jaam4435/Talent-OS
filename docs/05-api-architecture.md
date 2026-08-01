# Talent OS — API Architecture

**Runtime:** Next.js 15 App Router on Vercel  
**Pattern:** Server Actions + Route Handlers + Supabase Client  
**Auth:** Supabase Auth JWT in cookies (SSR)

---

## 1. Architecture Overview

```
┌────────────────────────────────────────────────────────────────────┐
│                         CLIENT (Browser)                           │
│  React Server Components │ Client Components │ React Query/SWR     │
└───────────────────────────────┬────────────────────────────────────┘
                                │
              ┌─────────────────┼─────────────────┐
              ▼                 ▼                 ▼
┌──────────────────┐ ┌──────────────────┐ ┌──────────────────────┐
│  Server Actions  │ │  Route Handlers  │ │  Supabase Realtime   │
│  (mutations)     │ │  (REST + webhooks)│ │  (subscriptions)    │
└────────┬─────────┘ └────────┬─────────┘ └──────────┬───────────┘
         │                    │                       │
         └────────────────────┼───────────────────────┘
                              ▼
┌────────────────────────────────────────────────────────────────────┐
│                    SUPABASE (PostgreSQL + Auth)                    │
│  RLS Policies │ Functions │ Triggers │ Storage │ Realtime         │
└───────────────────────────────┬────────────────────────────────────┘
                                │
                                ▼
┌────────────────────────────────────────────────────────────────────┐
│                           n8n (External)                           │
│  WhatsApp │ Email │ Cron │ Webhook orchestration                   │
└────────────────────────────────────────────────────────────────────┘
```

---

## 2. API Layers

| Layer | Purpose | Auth |
|---|---|---|
| **Server Actions** | Form mutations from UI (create talent, respond to opportunity) | Supabase session cookie |
| **Route Handlers** | REST endpoints, webhooks, exports | JWT or API key |
| **Supabase Direct** | Read-heavy queries via RSC | Anon key + RLS |
| **n8n Webhooks** | Async automation (broadcast, reminders) | Service role + HMAC signature |

---

## 3. Route Handlers (`/app/api/`)

**Canonical HTTP catalog:** [`docs/openapi.yaml`](./openapi.yaml) (served at `GET /api/openapi`).

Domain CRUD (talent, opportunities, projects, milestones, payments) is implemented via **Server Actions** in `app/actions/`, not REST route handlers.

### 3.1 Implemented REST routes (24 core + 15 organization = 39 route files)

| Method | Endpoint | Auth | Notes |
|--------|----------|------|-------|
| `GET` | `/api/health` | Public | Liveness probe |
| `GET` | `/api/openapi` | Public | OpenAPI spec |
| `GET` | `/api/auth/session` | Optional session | Current user + tenant |
| `GET` | `/api/auth/callback` | Public | OAuth/magic link redirect |
| `POST` | `/api/auth/signout` | Public | Sign out + redirect |
| `GET` | `/api/auth/invite/[token]` | Public | Invite preview |
| `GET` | `/api/talent/search` | Tenant (manager) | Roster search |
| `POST` | `/api/ai/match` | Tenant + `ai:match` | Idempotent AI match |
| `GET` | `/api/ai/match/[opportunityId]` | Tenant + `ai:match` | Match status |
| `GET` | `/api/ai/pm/[entityType]/[entityId]` | Tenant | AI PM results |
| `GET` | `/api/analytics/dashboard` | Manager + `analytics:read` | Dashboard metrics |
| `GET` | `/api/team/members` | Admin | Team listing |
| `GET` | `/api/observability/dashboard` | Manager | Ops dashboard |
| `GET` | `/api/observability/alerts` | Manager | Open alerts |
| `GET` | `/api/observability/logs` | Manager | Structured logs |
| `GET` | `/api/observability/traces/[correlationId]` | Manager | Trace spans |
| `GET` | `/api/cron/dispatch-events` | Cron secret | Event dispatcher |
| `GET` | `/api/cron/process-workflow-jobs` | Cron secret | Workflow jobs |
| `GET` | `/api/cron/check-overdue-milestones` | Cron secret | Overdue milestones |
| `GET` | `/api/cron/evaluate-alerts` | Cron secret | Alert evaluation |
| `POST` | `/api/internal/ai/execute` | Cron secret | AI worker |
| `POST` | `/api/internal/ai/execute-match` | Cron secret | Match worker |
| `POST` | `/api/webhooks/n8n` | HMAC + idempotency key | n8n callbacks |
| `GET` | `/api/webhooks/whatsapp` | Meta verify token | Webhook verification |
| `POST` | `/api/webhooks/whatsapp` | HMAC signature | Inbound WhatsApp |

**Organization module** (`/api/organization/*`) — see [ORGANIZATION_MODULE.md](./Architecture/ORGANIZATION_MODULE.md):

| Method | Endpoint | Auth | Notes |
|--------|----------|------|-------|
| `GET` / `PATCH` | `/api/organization` | Tenant / Admin | Profile + settings |
| `GET` / `PATCH` | `/api/organization/branding` | Tenant / Admin | Logo + colors |
| `GET` / `PATCH` | `/api/organization/settings` | Tenant / Admin | Business hours |
| `GET` | `/api/organization/subscription` | Admin + billing | External billing ref |
| `GET` | `/api/organization/permissions` | Tenant | Role → permission map |
| `GET` / `POST` | `/api/organization/departments` | Manager | Paginated CRUD |
| `GET` / `PATCH` / `DELETE` | `/api/organization/departments/[id]` | Manager | Soft delete |
| `GET` / `POST` | `/api/organization/teams` | Manager | Paginated CRUD |
| `GET` / `PATCH` / `DELETE` | `/api/organization/teams/[id]` | Manager | Soft delete |
| `GET` / `POST` / `DELETE` | `/api/organization/teams/[id]/members` | Manager | Team membership |
| `GET` | `/api/organization/members` | Admin | Paginated, filter, search |
| `GET` / `PATCH` / `DELETE` | `/api/organization/members/[id]` | Admin | Role, suspend, remove |
| `GET` / `POST` | `/api/organization/invitations` | Admin | Idempotent create |
| `DELETE` | `/api/organization/invitations/[id]` | Admin | Revoke |
| `GET` | `/api/organization/audit-logs` | Admin | Before/after audit trail |

### 3.2 Planned REST (not implemented)

The sections below describe a **future public API surface**. Today these operations use Server Actions:

- Tenants, freelancers CRUD, opportunities, shortlists, projects, milestones
- Payment approve/pay → `app/actions/payments.ts` (admin Server Actions)
- Analytics sub-routes (fill-rate, utilization, payment aging)
- Integration config routes, notification REST API

---

## 4. Server Actions

Server Actions handle form-based mutations with automatic revalidation.

**Implemented modules** (`app/actions/`):

| File | Domain |
|------|--------|
| `auth.ts` | Sign up, login, invite acceptance |
| `freelancers.ts` | Talent CRUD |
| `opportunities.ts` | Opportunities + broadcast |
| `shortlists.ts` | Shortlist management |
| `projects.ts` | Project assignment + status |
| `milestones.ts` | Submit + review milestones |
| `payments.ts` | Approve + mark paid (admin) |
| `companies.ts` | CRM companies |
| `portfolio.ts` | Talent portfolio |
| `approvals.ts` | Workflow approvals |
| `ai.ts` / `ai-pm.ts` | AI matching + PM |
| `knowledge.ts` | Knowledge base |
| `agents.ts` | Agent runs |

Platform patterns (auth modes, rate limits, error codes): see [`docs/Platform/API_STANDARDIZATION.md`](./Platform/API_STANDARDIZATION.md).

---

## 5. Request/Response Conventions

### 5.1 Standard Response Envelope

```typescript
// Success
{
  "data": T,
  "meta": { "page": 1, "limit": 20, "total": 150 }
}

// Error
{
  "error": {
    "code": "FORBIDDEN",
    "message": "You do not have permission to perform this action",
    "details": {}
  }
}
```

### 5.2 Error Codes

| Code | HTTP Status | Description |
|---|---|---|
| `UNAUTHORIZED` | 401 | No valid session |
| `FORBIDDEN` | 403 | Insufficient role or permission |
| `NOT_FOUND` | 404 | Resource not found or not in tenant |
| `VALIDATION_ERROR` | 400 | Invalid input |
| `DUPLICATE` | 409 | Duplicate resource |
| `IDEMPOTENCY_CONFLICT` | 409 | Idempotency key reuse with different body |
| `RATE_LIMITED` | 429 | Too many requests |
| `WEBHOOK_INVALID_SIGNATURE` | 401 | Webhook HMAC failed |
| `INTERNAL_ERROR` | 500 | Unexpected server error |

### 5.3 Pagination

```
GET /api/freelancers?page=1&limit=20&sort=rating&order=desc
```

### 5.4 Tenant Context

All authenticated requests include tenant context via:

1. **Subdomain:** `acme.talent-os.app` → resolve tenant by slug
2. **Header:** `X-Tenant-ID: uuid` (for API clients)
3. **Session:** Active tenant stored in session metadata

Middleware validates user is a member of the resolved tenant.

---

## 6. Middleware Stack

```typescript
// middleware.ts execution order:
1. Resolve tenant from subdomain/header
2. Verify Supabase session (refresh if needed)
3. Check tenant membership
4. Enforce role-based route access
5. Set tenant context headers for downstream
```

### Route Protection Matrix

| Route Pattern | Admin | Talent Manager | Freelancer |
|---|---|---|---|
| `/dashboard/*` | ✅ | ✅ | ✅ (limited) |
| `/talent/*` | ✅ | ✅ | ❌ |
| `/opportunities/*` | ✅ | ✅ | ✅ (own only) |
| `/projects/*` | ✅ | ✅ | ✅ (assigned) |
| `/payments/*` | ✅ | ✅ (read) | ✅ (own) |
| `/analytics/*` | ✅ | ✅ | ❌ |
| `/settings/*` | ✅ | ❌ | ❌ |
| `/settings/integrations` | ✅ | ❌ | ❌ |

---

## 7. n8n Event Contract

Events emitted to n8n via Supabase Database Webhooks or explicit API calls:

```typescript
interface N8nEvent {
  event: string;           // e.g. 'opportunity.broadcast'
  tenant_id: string;
  timestamp: string;       // ISO 8601
  payload: Record<string, unknown>;
  webhook_url: string;     // Per-tenant n8n webhook
}
```

| Event | Trigger | n8n Action |
|---|---|---|
| `tenant.created` | New signup | Welcome email |
| `opportunity.broadcast` | Broadcast API | WhatsApp to recipients |
| `opportunity.response` | Freelancer responds | Notify manager |
| `project.assigned` | Project created | WhatsApp to freelancer |
| `milestone.submitted` | Freelancer submits | Notify manager |
| `milestone.approved` | Manager approves | Payment created (DB trigger) |
| `payment.pending` | Payment created | Notify admin |
| `payment.paid` | Admin marks paid | WhatsApp to freelancer |
| `milestone.overdue` | Cron check | Alert manager |
| `opportunity.expired` | Cron check | Close + notify |

---

## 8. Rate Limiting

| Endpoint Category | Limit | Window |
|---|---|---|
| Auth endpoints | 10 req | 1 min |
| API reads | 100 req | 1 min |
| API writes | 30 req | 1 min |
| Webhook endpoints | 50 req | 1 min |
| CSV export | 5 req | 1 min |

Implementation: Vercel Edge Middleware + Upstash Redis (or Vercel KV).

---

## 9. Caching Strategy

| Data | Strategy | TTL |
|---|---|---|
| Dashboard metrics | ISR + on-demand revalidation | 60s |
| Freelancer list | React Query stale-while-revalidate | 30s |
| Project detail | No cache (realtime) | — |
| Analytics views | ISR | 5 min |
| Tenant settings | Static at build + on change | — |

---

## 10. API Security Checklist

- [ ] All Route Handlers validate Supabase session
- [ ] Tenant ID validated on every request (never trust client-only)
- [ ] RLS is the last line of defense (never bypass with anon key for writes)
- [ ] Service role key used only in server-side code and n8n
- [ ] Webhook endpoints verify HMAC signatures
- [ ] WhatsApp webhook verifies Meta challenge token
- [ ] Input validated with Zod schemas
- [ ] File uploads scanned and size-limited
- [ ] CORS restricted to app domain
- [ ] Sensitive integration configs encrypted at rest
