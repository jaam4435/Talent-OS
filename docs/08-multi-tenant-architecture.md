# Talent OS — Multi-Tenant SaaS Architecture

**Model:** Shared database, shared schema with `tenant_id` isolation  
**Isolation:** PostgreSQL Row-Level Security (RLS)  
**Routing:** Subdomain-per-tenant (`{slug}.talent-os.app`)

---

## 1. Tenancy Model Comparison

| Model | Pros | Cons | Decision |
|---|---|---|---|
| **Database per tenant** | Strongest isolation | Expensive, complex migrations | ❌ |
| **Schema per tenant** | Good isolation | Migration complexity scales | ❌ |
| **Shared DB + RLS** | Cost-efficient, simple migrations | Requires rigorous RLS testing | ✅ Selected |
| **Shared DB, app-level only** | Simplest | Data leakage risk | ❌ |

---

## 2. Architecture Diagram

```
                    ┌─────────────────────────────────────┐
                    │           Vercel Edge Network        │
                    │  ┌─────────┐  ┌─────────────────┐   │
                    │  │ Middleware│  │ Tenant Resolver │   │
                    │  │ (Auth)   │  │ (subdomain)     │   │
                    │  └────┬────┘  └────────┬────────┘   │
                    └───────┼────────────────┼────────────┘
                            │                │
              ┌─────────────┼────────────────┼──────────────┐
              │             ▼                ▼              │
              │  ┌─────────────────────────────────────┐  │
              │  │         Next.js Application          │  │
              │  │  Tenant Context injected per request │  │
              │  └──────────────────┬──────────────────┘  │
              │                     │                      │
              │                     ▼                      │
              │  ┌─────────────────────────────────────┐  │
              │  │     Supabase (Single PostgreSQL)     │  │
              │  │                                      │  │
              │  │  ┌──────────┐  ┌──────────┐         │  │
              │  │  │ Tenant A │  │ Tenant B │  ...    │  │
              │  │  │ data     │  │ data     │         │  │
              │  │  └──────────┘  └──────────┘         │  │
              │  │                                      │  │
              │  │  RLS: WHERE tenant_id IN (           │  │
              │  │    SELECT auth.user_tenant_ids()     │  │
              │  │  )                                   │  │
              │  └─────────────────────────────────────┘  │
              └───────────────────────────────────────────┘
```

---

## 3. Tenant Isolation Strategy

### 3.1 Data Isolation (RLS)

Every tenant-scoped table includes a `tenant_id` column. RLS policies enforce:

```sql
-- Pattern used on all tenant-scoped tables
CREATE POLICY "tenant_isolation" ON {table} FOR SELECT
  USING (tenant_id IN (SELECT auth.user_tenant_ids()));
```

**Defense in depth:**
1. Application always sets `tenant_id` from session context (never from request body)
2. RLS policies enforce at database level
3. Service role (n8n) uses explicit `tenant_id` in queries
4. Integration tests verify cross-tenant access is blocked

### 3.2 Compute Isolation

| Resource | Isolation |
|---|---|
| Next.js requests | Tenant context in middleware; no shared state |
| Server Actions | Tenant ID from session, validated per call |
| API Routes | Tenant header validated against membership |
| n8n workflows | Per-tenant webhook URLs; payload includes `tenant_id` |
| Supabase Storage | Path prefix: `{tenant_id}/...` with storage RLS |
| Realtime channels | Filtered by RLS; client only receives own tenant events |

### 3.3 Integration Isolation

Each tenant stores their own integration credentials:

```json
// integration_configs.config (encrypted)
{
  "whatsapp": {
    "phone_number_id": "123456789",
    "access_token": "EAAx...",
    "business_account_id": "987654321"
  },
  "n8n": {
    "webhook_base_url": "https://n8n.agency.com/webhook",
    "api_key": "n8n-api-key"
  }
}
```

---

## 4. Tenant Routing

### 4.1 Subdomain Strategy

```
Production:
  app.talent-os.com          → Landing / marketing
  {slug}.talent-os.com       → Tenant workspace
  api.talent-os.com          → API (optional)

Development:
  localhost:3000             → Default dev tenant
  {slug}.localhost:3000      → Tenant dev (via /etc/hosts)
```

### 4.2 DNS Configuration (Vercel)

```
*.talent-os.com  →  CNAME  cname.vercel-dns.com
```

```typescript
// next.config.ts
const nextConfig = {
  async rewrites() {
    return []
  },
  // Vercel automatically handles wildcard subdomains
}
```

### 4.3 Tenant Resolution Flow

```
Request: https://acme-creative.talent-os.com/dashboard
    │
    ▼
Middleware extracts subdomain: "acme-creative"
    │
    ▼
Query: SELECT id, name, slug FROM tenants WHERE slug = 'acme-creative'
    │
    ▼
Verify: user is member of tenant (tenant_members check)
    │
    ▼
Inject tenant context into request headers
    │
    ▼
Page/API handler uses tenant_id for all queries
```

---

## 5. Tenant Lifecycle

### 5.1 Provisioning

```
Signup → create_tenant_with_admin() → Seed defaults:
  - timezone: UTC
  - currency: USD
  - subscription_status: trialing
  - trial_ends_at: now() + 14 days
  - settings: { features: { whatsapp: true, analytics: true } }
```

### 5.2 Subscription States

| Status | Access | Behavior |
|---|---|---|
| `trialing` | Full | 14-day trial; upgrade prompts after day 10 |
| `active` | Full | Paid subscription |
| `past_due` | Read-only | Payment failed; 7-day grace period |
| `canceled` | Read-only | Subscription ended; data retained 30 days |
| `suspended` | Blocked | Admin action or ToS violation |

```typescript
// middleware.ts — subscription check
if (tenant.subscription_status === 'suspended') {
  return NextResponse.redirect(new URL('/suspended', request.url))
}
if (['past_due', 'canceled'].includes(tenant.subscription_status)) {
  // Allow read, block writes
  if (isWriteOperation(request)) {
    return NextResponse.redirect(new URL('/billing', request.url))
  }
}
```

### 5.3 Deprovisioning

```
Admin requests deletion
  → 30-day grace period (status: canceled)
  → Export data offered
  → After 30 days: hard delete cascade
    → All tenant data deleted (ON DELETE CASCADE)
    → Storage files purged
    → Integration configs removed
    → auth.users unlinked (not deleted unless sole tenant)
```

---

## 6. Multi-Tenant Data Patterns

### 6.1 Always Include tenant_id

```typescript
// ✅ Correct — tenant_id from session
const { data } = await supabase
  .from('freelancers')
  .insert({
    ...input,
    tenant_id: session.tenant.id,  // From session, never from client
  })

// ❌ Wrong — tenant_id from request body
const { data } = await supabase
  .from('freelancers')
  .insert({
    ...input,
    tenant_id: body.tenant_id,  // NEVER trust client
  })
```

### 6.2 Denormalized tenant_id

Some child tables denormalize `tenant_id` for efficient RLS:

```
opportunity_recipients.tenant_id  (from opportunity)
shortlist_items.tenant_id         (from shortlist)
milestones.tenant_id              (from project)
```

Set via trigger or application logic on insert. Avoids expensive JOINs in RLS policies.

### 6.3 Cross-Tenant Freelancer Identity (Phase 2)

MVP: One freelancer record per tenant (same person = duplicate profiles).

Phase 2: Global `freelancer_identities` table:

```
freelancer_identities (global)
  └── freelancer_profiles (per-tenant, links to identity)
```

Enables: single login across agencies, portable ratings, network effects.

---

## 7. Tenant Settings & Feature Flags

```typescript
interface TenantSettings {
  features: {
    whatsapp: boolean
    analytics: boolean
    bulk_import: boolean
    stripe_payouts: boolean
  }
  notifications: {
    email_enabled: boolean
    whatsapp_enabled: boolean
    overdue_reminder_days: number  // default: 1
  }
  defaults: {
    currency: string
    response_deadline_hours: number  // default: 48
  }
  branding: {
    primary_color: string
    logo_url: string
  }
}
```

```typescript
// lib/auth/tenant-context.ts
export function hasFeature(tenant: Tenant, feature: string): boolean {
  return tenant.settings?.features?.[feature] ?? false
}
```

---

## 8. Scaling Considerations

### 8.1 Database

| Scale | Strategy |
|---|---|
| 0–100 tenants | Single Supabase project, default compute |
| 100–500 tenants | Upgrade Supabase compute; add read replicas |
| 500+ tenants | Connection pooling (PgBouncer); partition large tables |
| 1000+ tenants | Evaluate dedicated Supabase project per tier |

### 8.2 Indexing

All tenant-scoped queries use composite indexes starting with `tenant_id`:

```sql
CREATE INDEX idx_freelancers_tenant_discipline ON freelancers(tenant_id, discipline);
CREATE INDEX idx_projects_tenant_status ON projects(tenant_id, status);
CREATE INDEX idx_payments_tenant_status ON payments(tenant_id, status);
```

### 8.3 Caching

| Data | Cache Key | Invalidation |
|---|---|---|
| Tenant settings | `tenant:{id}:settings` | On settings update |
| Dashboard metrics | `tenant:{id}:dashboard` | 60s TTL + on mutation |
| Freelancer count | `tenant:{id}:freelancer_count` | On freelancer CRUD |

Use Vercel KV or Upstash Redis with tenant-prefixed keys.

### 8.4 Noisy Neighbor Prevention

- Per-tenant rate limiting (API calls, WhatsApp messages)
- Query timeouts on analytics endpoints
- Background jobs (n8n) process per-tenant sequentially
- Storage quotas per subscription tier

---

## 9. Tenant Tiers (Pricing Model)

| Feature | Starter | Pro | Enterprise |
|---|---|---|---|
| Talent profiles | 50 | 200 | Unlimited |
| Team members | 2 | 10 | Unlimited |
| WhatsApp messages/mo | 500 | 2,000 | Custom |
| Analytics | Basic | Advanced | Custom |
| Storage | 5 GB | 25 GB | 100 GB |
| API access | ❌ | ❌ | ✅ |
| Custom branding | ❌ | ✅ | ✅ |
| SSO | ❌ | ❌ | ✅ |
| Price | $49/mo | $149/mo | Custom |

Enforced via `tenant.settings` and middleware checks.

---

## 10. Security Testing Checklist

- [ ] User A cannot read User B's tenant data (any table)
- [ ] Freelancer cannot access manager-only fields via direct API
- [ ] Subdomain spoofing blocked (membership verified)
- [ ] Service role queries always include explicit `tenant_id`
- [ ] Storage paths cannot access other tenant's files
- [ ] Realtime subscriptions respect RLS
- [ ] n8n webhook payloads cannot inject cross-tenant data
- [ ] Deleted tenant data is fully purged (no orphaned records)
- [ ] RLS policies tested with `SET ROLE authenticated; SET request.jwt.claims`

```sql
-- RLS test example
SET request.jwt.claims = '{"sub": "user-a-uuid"}';
SELECT * FROM freelancers;  -- Should only return User A's tenant data

SET request.jwt.claims = '{"sub": "user-b-uuid"}';
SELECT * FROM freelancers;  -- Should only return User B's tenant data
-- Verify zero overlap
```

---

## 11. Disaster Recovery

| Scenario | Recovery |
|---|---|
| Tenant accidental deletion | 30-day soft delete; restore from backup |
| Database corruption | Supabase point-in-time recovery (PITR) |
| RLS policy bug | Emergency: disable policy, fix, re-enable; audit access logs |
| Integration credential leak | Rotate per-tenant; notify admin; audit message log |

**Backup schedule:** Supabase daily backups (Pro plan); PITR with 7-day window.
