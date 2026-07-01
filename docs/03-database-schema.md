# Talent OS — Database Schema

**Database:** PostgreSQL 15 (Supabase)  
**Multi-tenancy:** Shared database, shared schema with `tenant_id` + Row-Level Security

---

## 1. Entity Relationship Overview

```
┌─────────────┐       ┌──────────────────┐       ┌─────────────┐
│   tenants   │──1:N──│  tenant_members  │──N:1──│   profiles  │
└─────────────┘       └──────────────────┘       └─────────────┘
       │                                                    │
       │ 1:N                                                │
       ▼                                                    │
┌─────────────┐       ┌──────────────────┐                   │
│  freelancers │◄─────│  (profile link)  │───────────────────┘
└─────────────┘       └──────────────────┘
       │
       │ 1:N
       ▼
┌─────────────────┐     ┌──────────────────┐     ┌─────────────┐
│  opportunities  │──1:N│ opportunity_      │──N:1│ freelancers │
│                 │     │ recipients        │     └─────────────┘
└────────┬────────┘     └──────────────────┘
         │
         │ 1:1
         ▼
┌─────────────────┐     ┌──────────────────┐
│   shortlists    │──1:N│ shortlist_items   │
└────────┬────────┘     └──────────────────┘
         │
         │ 1:1
         ▼
┌─────────────────┐     ┌──────────────────┐     ┌─────────────┐
│    projects     │──1:N│   milestones     │──1:1│  payments   │
└────────┬────────┘     └──────────────────┘     └─────────────┘
         │
         │ 1:N
         ▼
┌─────────────────┐     ┌──────────────────┐
│ activity_logs   │     │  notifications   │
└─────────────────┘     └──────────────────┘
```

---

## 2. Core Tables

### 2.1 `tenants`

Agency workspaces. Root of multi-tenant isolation.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | `uuid` | PK, default `gen_random_uuid()` | Tenant identifier |
| `name` | `text` | NOT NULL | Agency display name |
| `slug` | `text` | UNIQUE, NOT NULL | URL-safe identifier |
| `logo_url` | `text` | | Supabase Storage path |
| `timezone` | `text` | NOT NULL, default `'UTC'` | IANA timezone |
| `currency` | `char(3)` | NOT NULL, default `'USD'` | ISO 4217 |
| `settings` | `jsonb` | default `'{}'` | Feature flags, integrations |
| `subscription_status` | `text` | default `'trialing'` | trialing, active, past_due, canceled |
| `trial_ends_at` | `timestamptz` | | Trial expiration |
| `created_at` | `timestamptz` | default `now()` | |
| `updated_at` | `timestamptz` | default `now()` | |

**Indexes:** `slug`, `subscription_status`

---

### 2.2 `profiles`

Extends `auth.users`. One profile per auth user.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | `uuid` | PK, FK → `auth.users(id)` ON DELETE CASCADE | |
| `email` | `text` | NOT NULL | Denormalized from auth |
| `full_name` | `text` | | |
| `avatar_url` | `text` | | |
| `phone` | `text` | | E.164 format for WhatsApp |
| `created_at` | `timestamptz` | default `now()` | |
| `updated_at` | `timestamptz` | default `now()` | |

---

### 2.3 `tenant_members`

Join table: users ↔ tenants with roles.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | `uuid` | PK | |
| `tenant_id` | `uuid` | FK → `tenants(id)` ON DELETE CASCADE | |
| `user_id` | `uuid` | FK → `profiles(id)` ON DELETE CASCADE | |
| `role` | `user_role` | NOT NULL | admin, talent_manager, freelancer |
| `status` | `member_status` | default `'active'` | invited, active, suspended |
| `invited_at` | `timestamptz` | | |
| `joined_at` | `timestamptz` | | |
| `created_at` | `timestamptz` | default `now()` | |

**Unique:** `(tenant_id, user_id)`  
**Indexes:** `tenant_id`, `user_id`, `(tenant_id, role)`

---

### 2.4 `freelancers`

Talent profiles within a tenant. May or may not have a linked auth user.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | `uuid` | PK | |
| `tenant_id` | `uuid` | FK → `tenants(id)` ON DELETE CASCADE | |
| `user_id` | `uuid` | FK → `profiles(id)` NULL | Linked when freelancer logs in |
| `email` | `text` | NOT NULL | |
| `full_name` | `text` | NOT NULL | |
| `phone` | `text` | | WhatsApp number |
| `discipline` | `discipline_type` | NOT NULL | design, video, copy, motion, brand, other |
| `skills` | `text[]` | default `'{}'` | Skill tags |
| `day_rate` | `numeric(12,2)` | | |
| `currency` | `char(3)` | default `'USD'` | |
| `bio` | `text` | | |
| `portfolio_url` | `text` | | |
| `availability` | `availability_status` | default `'available'` | available, busy, unavailable |
| `internal_rating` | `numeric(2,1)` | CHECK 1.0–5.0 | Manager-only |
| `internal_notes` | `text` | | Manager-only |
| `tags` | `text[]` | default `'{}'` | |
| `metadata` | `jsonb` | default `'{}'` | |
| `last_active_at` | `timestamptz` | | |
| `created_at` | `timestamptz` | default `now()` | |
| `updated_at` | `timestamptz` | default `now()` | |

**Unique:** `(tenant_id, email)`  
**Indexes:** `tenant_id`, `discipline`, `availability`, GIN on `skills`, GIN on `tags`

---

### 2.5 `opportunities`

Open gigs to be broadcast to talent.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | `uuid` | PK | |
| `tenant_id` | `uuid` | FK → `tenants(id)` | |
| `created_by` | `uuid` | FK → `profiles(id)` | Talent Manager |
| `title` | `text` | NOT NULL | |
| `description` | `text` | | Brief |
| `budget` | `numeric(12,2)` | | |
| `currency` | `char(3)` | default `'USD'` | |
| `required_skills` | `text[]` | default `'{}'` | |
| `discipline` | `discipline_type` | | |
| `client_name` | `text` | | |
| `deadline` | `date` | | Project deadline |
| `response_deadline` | `timestamptz` | | Auto-close after |
| `status` | `opportunity_status` | default `'draft'` | draft, open, closed, filled, canceled |
| `created_at` | `timestamptz` | default `now()` | |
| `updated_at` | `timestamptz` | default `now()` | |

**Indexes:** `tenant_id`, `status`, `created_by`

---

### 2.6 `opportunity_recipients`

Tracks broadcast and responses per freelancer.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | `uuid` | PK | |
| `opportunity_id` | `uuid` | FK → `opportunities(id)` ON DELETE CASCADE | |
| `freelancer_id` | `uuid` | FK → `freelancers(id)` | |
| `tenant_id` | `uuid` | FK → `tenants(id)` | Denormalized for RLS |
| `response` | `response_type` | default `'pending'` | pending, interested, declined |
| `response_note` | `text` | | |
| `responded_at` | `timestamptz` | | |
| `whatsapp_sent_at` | `timestamptz` | | |
| `whatsapp_delivered` | `boolean` | default `false` | |
| `created_at` | `timestamptz` | default `now()` | |

**Unique:** `(opportunity_id, freelancer_id)`  
**Indexes:** `opportunity_id`, `freelancer_id`, `tenant_id`, `response`

---

### 2.7 `shortlists`

One shortlist per opportunity.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | `uuid` | PK | |
| `tenant_id` | `uuid` | FK → `tenants(id)` | |
| `opportunity_id` | `uuid` | FK → `opportunities(id)` UNIQUE | |
| `created_by` | `uuid` | FK → `profiles(id)` | |
| `status` | `shortlist_status` | default `'open'` | open, finalized, archived |
| `created_at` | `timestamptz` | default `now()` | |
| `updated_at` | `timestamptz` | default `now()` | |

---

### 2.8 `shortlist_items`

Ranked candidates on a shortlist.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | `uuid` | PK | |
| `shortlist_id` | `uuid` | FK → `shortlists(id)` ON DELETE CASCADE | |
| `freelancer_id` | `uuid` | FK → `freelancers(id)` | |
| `tenant_id` | `uuid` | FK → `tenants(id)` | |
| `rank` | `integer` | NOT NULL, default 0 | Lower = higher priority |
| `notes` | `text` | | |
| `status` | `shortlist_item_status` | default `'active'` | active, selected, rejected |
| `rejection_reason` | `text` | | |
| `created_at` | `timestamptz` | default `now()` | |
| `updated_at` | `timestamptz` | default `now()` | |

**Unique:** `(shortlist_id, freelancer_id)`

---

### 2.9 `projects`

Assigned engagements.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | `uuid` | PK | |
| `tenant_id` | `uuid` | FK → `tenants(id)` | |
| `opportunity_id` | `uuid` | FK → `opportunities(id)` NULL | |
| `shortlist_id` | `uuid` | FK → `shortlists(id)` NULL | |
| `freelancer_id` | `uuid` | FK → `freelancers(id)` | Assigned talent |
| `assigned_by` | `uuid` | FK → `profiles(id)` | |
| `title` | `text` | NOT NULL | |
| `description` | `text` | | |
| `client_name` | `text` | | |
| `budget` | `numeric(12,2)` | | |
| `currency` | `char(3)` | default `'USD'` | |
| `status` | `project_status` | default `'draft'` | draft, active, in_review, completed, archived, canceled |
| `started_at` | `timestamptz` | | |
| `completed_at` | `timestamptz` | | |
| `created_at` | `timestamptz` | default `now()` | |
| `updated_at` | `timestamptz` | default `now()` | |

**Indexes:** `tenant_id`, `freelancer_id`, `status`, `opportunity_id`

---

### 2.10 `milestones`

Deliverable checkpoints within a project.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | `uuid` | PK | |
| `project_id` | `uuid` | FK → `projects(id)` ON DELETE CASCADE | |
| `tenant_id` | `uuid` | FK → `tenants(id)` | |
| `title` | `text` | NOT NULL | |
| `description` | `text` | | |
| `amount` | `numeric(12,2)` | NOT NULL | Payment amount |
| `due_date` | `date` | | |
| `sort_order` | `integer` | default 0 | |
| `status` | `milestone_status` | default `'pending'` | pending, in_progress, submitted, approved, revision, canceled |
| `submission_note` | `text` | | |
| `submission_files` | `jsonb` | default `'[]'` | Storage paths |
| `submitted_at` | `timestamptz` | | |
| `reviewed_at` | `timestamptz` | | |
| `reviewed_by` | `uuid` | FK → `profiles(id)` | |
| `review_note` | `text` | | |
| `created_at` | `timestamptz` | default `now()` | |
| `updated_at` | `timestamptz` | default `now()` | |

**Indexes:** `project_id`, `tenant_id`, `status`, `due_date`

---

### 2.11 `payments`

Payment records linked to milestones.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | `uuid` | PK | |
| `tenant_id` | `uuid` | FK → `tenants(id)` | |
| `project_id` | `uuid` | FK → `projects(id)` | |
| `milestone_id` | `uuid` | FK → `milestones(id)` UNIQUE | One payment per milestone |
| `freelancer_id` | `uuid` | FK → `freelancers(id)` | |
| `amount` | `numeric(12,2)` | NOT NULL | |
| `currency` | `char(3)` | default `'USD'` | |
| `status` | `payment_status` | default `'pending'` | pending, approved, processing, paid, disputed, canceled |
| `approved_by` | `uuid` | FK → `profiles(id)` | |
| `approved_at` | `timestamptz` | | |
| `paid_at` | `timestamptz` | | |
| `payment_reference` | `text` | | Bank/Stripe ref |
| `dispute_reason` | `text` | | |
| `notes` | `text` | | |
| `created_at` | `timestamptz` | default `now()` | |
| `updated_at` | `timestamptz` | default `now()` | |

**Indexes:** `tenant_id`, `freelancer_id`, `status`, `project_id`

---

### 2.12 `activity_logs`

Immutable audit trail.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | `uuid` | PK | |
| `tenant_id` | `uuid` | FK → `tenants(id)` | |
| `actor_id` | `uuid` | FK → `profiles(id)` NULL | NULL for system actions |
| `entity_type` | `text` | NOT NULL | project, milestone, opportunity, payment, etc. |
| `entity_id` | `uuid` | NOT NULL | |
| `action` | `text` | NOT NULL | created, updated, status_changed, etc. |
| `metadata` | `jsonb` | default `'{}'` | Before/after values |
| `created_at` | `timestamptz` | default `now()` | |

**Indexes:** `tenant_id`, `(entity_type, entity_id)`, `created_at DESC`

---

### 2.13 `notifications`

In-app notifications.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | `uuid` | PK | |
| `tenant_id` | `uuid` | FK → `tenants(id)` | |
| `user_id` | `uuid` | FK → `profiles(id)` | |
| `type` | `notification_type` | NOT NULL | |
| `title` | `text` | NOT NULL | |
| `body` | `text` | | |
| `data` | `jsonb` | default `'{}'` | Deep link payload |
| `read_at` | `timestamptz` | | |
| `created_at` | `timestamptz` | default `now()` | |

**Indexes:** `user_id`, `(user_id, read_at)`, `tenant_id`

---

### 2.14 `whatsapp_messages`

Outbound/inbound WhatsApp message log.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | `uuid` | PK | |
| `tenant_id` | `uuid` | FK → `tenants(id)` | |
| `freelancer_id` | `uuid` | FK → `freelancers(id)` NULL | |
| `direction` | `text` | NOT NULL | outbound, inbound |
| `wa_message_id` | `text` | | Meta message ID |
| `phone` | `text` | NOT NULL | |
| `template_name` | `text` | | |
| `body` | `text` | | |
| `status` | `text` | default `'queued'` | queued, sent, delivered, read, failed |
| `entity_type` | `text` | | opportunity, project, payment |
| `entity_id` | `uuid` | | |
| `metadata` | `jsonb` | default `'{}'` | |
| `created_at` | `timestamptz` | default `now()` | |

**Indexes:** `tenant_id`, `wa_message_id`, `freelancer_id`

---

### 2.15 `domain_events`

Transactional outbox for event-driven architecture. See [Enterprise System Architecture](11-enterprise-system-architecture.md).

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | `uuid` | PK | |
| `tenant_id` | `uuid` | FK → `tenants(id)` | |
| `event_type` | `text` | NOT NULL | e.g. `opportunity.broadcast` |
| `aggregate_type` | `text` | NOT NULL | e.g. `opportunity` |
| `aggregate_id` | `uuid` | NOT NULL | |
| `idempotency_key` | `text` | UNIQUE per tenant | Dedup key |
| `correlation_id` | `uuid` | NOT NULL | Trace chain |
| `payload` | `jsonb` | | Event data |
| `status` | `event_status` | default `'pending'` | pending → delivered / dead_letter |
| `retry_count` | `integer` | default 0 | |
| `scheduled_at` | `timestamptz` | | Delayed dispatch |

---

### 2.16 `ai_requests`

AI governance and cost tracking for OpenAI and Claude.

| Column | Type | Description |
|---|---|---|
| `provider` | `ai_provider` | openai, claude |
| `request_type` | `text` | talent_match, brief_parse, shortlist_summary |
| `prompt_hash` | `text` | SHA-256 (no raw prompts stored) |
| `result` | `jsonb` | Structured AI output |
| `estimated_cost` | `numeric` | Per-request cost |

---

### 2.17 `integration_configs`

Per-tenant integration credentials (encrypted at app layer).

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | `uuid` | PK | |
| `tenant_id` | `uuid` | FK → `tenants(id)` UNIQUE per provider | |
| `provider` | `text` | NOT NULL | whatsapp, n8n, stripe |
| `config` | `jsonb` | NOT NULL | Encrypted credentials |
| `is_active` | `boolean` | default `true` | |
| `last_verified_at` | `timestamptz` | | |
| `created_at` | `timestamptz` | default `now()` | |
| `updated_at` | `timestamptz` | default `now()` | |

**Unique:** `(tenant_id, provider)`

---

## 3. Enums

```sql
user_role:            admin | talent_manager | freelancer
member_status:        invited | active | suspended
discipline_type:      design | video | copy | motion | brand | other
availability_status:  available | busy | unavailable
opportunity_status:   draft | open | closed | filled | canceled
response_type:        pending | interested | declined
shortlist_status:     open | finalized | archived
shortlist_item_status: active | selected | rejected
project_status:       draft | active | in_review | completed | archived | canceled
milestone_status:     pending | in_progress | submitted | approved | revision | canceled
payment_status:       pending | approved | processing | paid | disputed | canceled
notification_type:    opportunity_broadcast | opportunity_response | project_assigned |
                      milestone_submitted | milestone_approved | milestone_revision |
                      payment_pending | payment_approved | payment_paid | system
```

---

## 4. Views (Analytics)

### 4.1 `v_opportunity_fill_rate`

```sql
-- Per tenant, per month: opportunities created vs filled
SELECT tenant_id, date_trunc('month', created_at), 
       count(*) FILTER (WHERE status = 'filled') * 100.0 / count(*) AS fill_rate_pct
FROM opportunities GROUP BY 1, 2;
```

### 4.2 `v_freelancer_utilization`

```sql
-- Projects per freelancer in last 90 days
SELECT f.tenant_id, f.id, f.full_name, count(p.id) AS project_count,
       coalesce(sum(pay.amount) FILTER (WHERE pay.status = 'paid'), 0) AS total_paid
FROM freelancers f
LEFT JOIN projects p ON p.freelancer_id = f.id AND p.created_at > now() - interval '90 days'
LEFT JOIN payments pay ON pay.freelancer_id = f.id
GROUP BY f.tenant_id, f.id, f.full_name;
```

### 4.3 `v_payment_aging`

```sql
-- Average days in each payment status
SELECT tenant_id, status, avg(extract(epoch FROM (now() - created_at)) / 86400) AS avg_days
FROM payments WHERE status IN ('pending', 'approved', 'processing')
GROUP BY tenant_id, status;
```

---

## 5. Storage Buckets

| Bucket | Access | Purpose |
|---|---|---|
| `tenant-logos` | Public read, tenant admin write | Agency branding |
| `deliverables` | Private, RLS via project membership | Milestone files |
| `avatars` | Public read, owner write | Profile photos |

---

## 6. Realtime Subscriptions

| Table | Events | Subscribers |
|---|---|---|
| `notifications` | INSERT | Authenticated user (own rows) |
| `opportunity_recipients` | UPDATE | Talent Managers (tenant) |
| `milestones` | UPDATE | Project freelancer + managers |
| `projects` | UPDATE | Tenant members |

---

## 7. Data Retention

| Data Type | Retention | Notes |
|---|---|---|
| Activity logs | 7 years | Compliance |
| WhatsApp messages | 2 years | Cost optimization |
| Archived projects | Indefinite | Tenant can delete |
| Notifications (read) | 90 days | Auto-purge via cron |
| Soft-deleted tenants | 30 days | Hard delete after grace period |
