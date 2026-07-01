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

### 3.1 Authentication

| Method | Endpoint | Description | Auth |
|---|---|---|---|
| `POST` | `/api/auth/callback` | OAuth/magic link callback | Public |
| `POST` | `/api/auth/invite` | Accept team invite | Invite token |
| `GET` | `/api/auth/session` | Current session + tenant context | Session |

### 3.2 Tenants

| Method | Endpoint | Description | Role |
|---|---|---|---|
| `POST` | `/api/tenants` | Create agency workspace | Public (signup) |
| `GET` | `/api/tenants/[slug]` | Get tenant by slug | Member |
| `PATCH` | `/api/tenants/[id]` | Update settings | Admin |
| `POST` | `/api/tenants/[id]/invite` | Invite team member | Admin |

### 3.3 Freelancers (Talent)

| Method | Endpoint | Description | Role |
|---|---|---|---|
| `GET` | `/api/freelancers` | List/search talent | Manager |
| `POST` | `/api/freelancers` | Create profile | Manager |
| `GET` | `/api/freelancers/[id]` | Get profile | Manager, Self |
| `PATCH` | `/api/freelancers/[id]` | Update profile | Manager, Self* |
| `DELETE` | `/api/freelancers/[id]` | Remove talent | Manager |
| `POST` | `/api/freelancers/import` | CSV bulk import | Manager |
| `GET` | `/api/freelancers/suggest` | Suggest for opportunity | Manager |

*Self: cannot update `internal_rating`, `internal_notes`

### 3.4 Opportunities

| Method | Endpoint | Description | Role |
|---|---|---|---|
| `GET` | `/api/opportunities` | List opportunities | Manager, Freelancer* |
| `POST` | `/api/opportunities` | Create opportunity | Manager |
| `GET` | `/api/opportunities/[id]` | Get detail + recipients | Manager, Freelancer* |
| `PATCH` | `/api/opportunities/[id]` | Update opportunity | Manager |
| `POST` | `/api/opportunities/[id]/broadcast` | Broadcast to talent | Manager |
| `POST` | `/api/opportunities/[id]/respond` | Freelancer response | Freelancer |

*Freelancer: only own recipients

### 3.5 Shortlists

| Method | Endpoint | Description | Role |
|---|---|---|---|
| `GET` | `/api/shortlists/[opportunityId]` | Get shortlist | Manager |
| `POST` | `/api/shortlists/[opportunityId]/items` | Add to shortlist | Manager |
| `PATCH` | `/api/shortlists/items/[id]` | Update rank/notes | Manager |
| `DELETE` | `/api/shortlists/items/[id]` | Remove/reject | Manager |

### 3.6 Projects

| Method | Endpoint | Description | Role |
|---|---|---|---|
| `GET` | `/api/projects` | List projects | Manager, Freelancer* |
| `POST` | `/api/projects` | Assign from shortlist | Manager |
| `GET` | `/api/projects/[id]` | Project detail | Manager, Freelancer* |
| `PATCH` | `/api/projects/[id]` | Update status | Manager |
| `GET` | `/api/projects/[id]/activity` | Activity log | Manager, Freelancer* |

### 3.7 Milestones

| Method | Endpoint | Description | Role |
|---|---|---|---|
| `POST` | `/api/projects/[id]/milestones` | Add milestone | Manager |
| `PATCH` | `/api/milestones/[id]` | Update milestone | Manager, Freelancer* |
| `POST` | `/api/milestones/[id]/submit` | Submit deliverable | Freelancer |
| `POST` | `/api/milestones/[id]/review` | Approve/revision | Manager |

*Freelancer: submit only; cannot approve

### 3.8 Payments

| Method | Endpoint | Description | Role |
|---|---|---|---|
| `GET` | `/api/payments` | List payments | Admin, Manager, Freelancer* |
| `PATCH` | `/api/payments/[id]/approve` | Approve payment | Admin |
| `PATCH` | `/api/payments/[id]/pay` | Mark as paid | Admin |
| `PATCH` | `/api/payments/[id]/dispute` | Dispute payment | Admin, Freelancer |
| `GET` | `/api/payments/export` | CSV export | Admin |

*Freelancer: own payments only

### 3.9 Analytics

| Method | Endpoint | Description | Role |
|---|---|---|---|
| `GET` | `/api/analytics/dashboard` | Summary metrics | Admin, Manager |
| `GET` | `/api/analytics/fill-rate` | Fill rate over time | Admin, Manager |
| `GET` | `/api/analytics/utilization` | Talent utilization | Admin, Manager |
| `GET` | `/api/analytics/payments` | Payment aging | Admin |

### 3.10 Integrations (Webhooks)

| Method | Endpoint | Description | Auth |
|---|---|---|---|
| `POST` | `/api/webhooks/n8n` | n8n callback events | HMAC signature |
| `POST` | `/api/webhooks/whatsapp` | WhatsApp inbound messages | Meta verify token |
| `GET` | `/api/webhooks/whatsapp` | WhatsApp webhook verification | Meta challenge |
| `POST` | `/api/integrations/whatsapp/test` | Send test message | Admin |
| `PATCH` | `/api/integrations/[provider]` | Save integration config | Admin |

### 3.11 Notifications

| Method | Endpoint | Description | Role |
|---|---|---|---|
| `GET` | `/api/notifications` | List notifications | Authenticated |
| `PATCH` | `/api/notifications/[id]/read` | Mark as read | Authenticated |
| `POST` | `/api/notifications/read-all` | Mark all read | Authenticated |

---

## 4. Server Actions

Server Actions handle form-based mutations with automatic revalidation.

```typescript
// app/actions/freelancers.ts
'use server'

export async function createFreelancer(formData: FormData) { ... }
export async function updateFreelancer(id: string, data: UpdateFreelancerInput) { ... }
export async function deleteFreelancer(id: string) { ... }

// app/actions/opportunities.ts
export async function createOpportunity(data: CreateOpportunityInput) { ... }
export async function broadcastOpportunity(id: string, freelancerIds: string[]) { ... }
export async function respondToOpportunity(recipientId: string, response: 'interested' | 'declined', note?: string) { ... }

// app/actions/projects.ts
export async function assignProject(data: AssignProjectInput) { ... }
export async function updateProjectStatus(id: string, status: ProjectStatus) { ... }

// app/actions/milestones.ts
export async function submitMilestone(id: string, files: File[], note?: string) { ... }
export async function reviewMilestone(id: string, action: 'approve' | 'revision', note?: string) { ... }

// app/actions/payments.ts
export async function approvePayment(id: string) { ... }
export async function markPaymentPaid(id: string, reference: string) { ... }
```

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
| `FORBIDDEN` | 403 | Insufficient role |
| `NOT_FOUND` | 404 | Resource not found or not in tenant |
| `VALIDATION_ERROR` | 422 | Invalid input |
| `CONFLICT` | 409 | Duplicate or state conflict |
| `RATE_LIMITED` | 429 | Too many requests |
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
