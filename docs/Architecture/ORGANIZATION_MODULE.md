# Organization Module

**Document version:** 1.0.0  
**Date:** August 1, 2026  
**Status:** Implemented  
**Migration:** `023_organization_module.sql`

---

## Overview

Talent OS is a **multi-tenant SaaS**. Every record belongs to an **Organization**.

In this codebase, the workspace organization is stored in the **`tenants`** table. The Platform Core maps `tenantId` → `organizationId` for cross-cutting services.

The Organization Module provides:

- Organization profile, settings, branding, timezone, currency, business hours
- Departments and teams
- Roles and permissions (application-level RBAC)
- Member management and invitations
- Subscription reference (external billing provider id)
- Immutable audit logs with before/after state
- Domain events on all mutating operations

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│  REST API  /api/organization/*                              │
└───────────────────────────┬─────────────────────────────────┘
                            │
┌───────────────────────────▼─────────────────────────────────┐
│  OrganizationService  (lib/services/organization.service.ts)│
│  - validation guards, audit, domain events                    │
└───────────────────────────┬─────────────────────────────────┘
                            │
        ┌───────────────────┼───────────────────┐
        ▼                   ▼                   ▼
 OrganizationRepository   Department/Team/     OrganizationAudit
 (tenants)                Member/Invite repos   + DomainEvent
```

**Module boundary:**

| Layer | Location |
|-------|----------|
| Types & validation | `modules/organization/` |
| Repositories | `lib/repositories/organization*.repository.ts` |
| Service | `lib/services/organization.service.ts` |
| REST routes | `app/api/organization/` |

**Backward compatibility:**

- Existing `tenants`, `tenant_members`, `member_invites` tables and RPCs remain
- `GET /api/team/members` unchanged (delegates to analytics service)
- Server Actions in `modules/core/api/auth.actions.ts` still work for signup/invite accept

---

## Data model

### Organization (`tenants`)

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID | Primary key |
| `name`, `slug` | TEXT | Workspace identity |
| `logo_url` | TEXT | Branding |
| `primary_color`, `accent_color` | TEXT | Hex colors (#RRGGBB) |
| `timezone` | TEXT | IANA timezone (default UTC) |
| `currency` | CHAR(3) | ISO 4217 (default USD) |
| `business_hours` | JSONB | Weekly schedule |
| `settings` | JSONB | Tier, features, limits |
| `subscription_status` | TEXT | trialing, active, past_due, canceled, suspended |
| `subscription_reference` | TEXT | External billing id (e.g. Stripe customer) |
| `deleted_at` | TIMESTAMPTZ | Soft delete |

### Departments (`org_departments`)

Scoped by `tenant_id`. Unique slug per organization. Soft delete via `deleted_at`.

### Teams (`org_teams`)

Optional `department_id`. Unique slug per organization. Soft delete.

### Team members (`org_team_members`)

Links `tenant_members` to `org_teams`.

### Audit logs (`organization_audit_logs`)

Append-only. Admin read. Captures `before_state`, `after_state`, `actor_id`.

---

## Business hours JSON

```json
{
  "monday": { "open": "09:00", "close": "17:00", "closed": false },
  "tuesday": { "open": "09:00", "close": "17:00", "closed": false },
  "wednesday": { "open": "09:00", "close": "17:00", "closed": false },
  "thursday": { "open": "09:00", "close": "17:00", "closed": false },
  "friday": { "open": "09:00", "close": "17:00", "closed": false },
  "saturday": { "open": null, "close": null, "closed": true },
  "sunday": { "open": null, "close": null, "closed": true }
}
```

---

## Roles & permissions

Roles are stored on `tenant_members.role` (enum: `admin`, `talent_manager`, `freelancer`, `client`).

Permissions are application-level (`modules/core/services/permissions.ts`).

| Permission | Admin | Manager | Freelancer | Client |
|------------|:-----:|:-------:|:----------:|:------:|
| `tenant:read` | ✓ | ✓ | ✓ | ✓ |
| `tenant:update` | ✓ | | | |
| `tenant:billing` | ✓ | | | |
| `org:departments:read` | ✓ | ✓ | | |
| `org:departments:manage` | ✓ | ✓ | | |
| `org:teams:read` | ✓ | ✓ | | |
| `org:teams:manage` | ✓ | ✓ | | |
| `org:audit:read` | ✓ | | | |
| `members:invite` | ✓ | | | |
| `members:manage` | ✓ | | | |

Use `GET /api/organization/permissions` for the full role → permission map.

---

## REST API

All endpoints use session cookie auth and standard `{ data, meta? }` envelope.

| Method | Endpoint | Permission | Description |
|--------|----------|------------|-------------|
| GET | `/api/organization` | `tenant:read` | Organization summary |
| PATCH | `/api/organization` | `tenant:update` | Update name, timezone, currency, subscription ref |
| GET | `/api/organization/branding` | `tenant:read` | Logo + colors |
| PATCH | `/api/organization/branding` | `tenant:update` | Update branding |
| GET | `/api/organization/settings` | `tenant:read` | Timezone, currency, business hours |
| PATCH | `/api/organization/settings` | `tenant:update` | Update business hours |
| GET | `/api/organization/subscription` | `tenant:billing` | Subscription reference |
| GET | `/api/organization/permissions` | `tenant:read` | Role permission map |
| GET/POST | `/api/organization/departments` | read / manage | List (paginated, search) / create |
| GET/PATCH/DELETE | `/api/organization/departments/{id}` | read / manage | CRUD |
| GET/POST | `/api/organization/teams` | read / manage | List / create |
| GET/PATCH/DELETE | `/api/organization/teams/{id}` | read / manage | CRUD |
| GET/POST/DELETE | `/api/organization/teams/{id}/members` | read / manage | Team membership |
| GET | `/api/organization/members` | `members:manage` | Paginated member list |
| GET/PATCH/DELETE | `/api/organization/members/{id}` | `members:manage` | Role change, suspend, remove |
| GET/POST | `/api/organization/invitations` | `members:invite` | List / create (idempotent) |
| DELETE | `/api/organization/invitations/{id}` | `members:invite` | Revoke |
| GET | `/api/organization/audit-logs` | `org:audit:read` | Paginated audit trail |

**Pagination query params:** `page`, `limit` (max 100), `q` (search)

**Filtering:** members support `status`, `role`; audit logs support `action`, `entity_type`

OpenAPI: `docs/openapi.yaml` tag **Organization**

---

## Row Level Security

Migration `023_organization_module.sql` enables RLS on all new tables:

| Table | SELECT | MUTATE |
|-------|--------|--------|
| `org_departments` | Members | Managers |
| `org_teams` | Members | Managers |
| `org_team_members` | Members | Managers |
| `organization_audit_logs` | Admins | Admins (insert only) |
| `tenants` | Active members (`deleted_at IS NULL`) | Admins (existing) |
| `tenant_members` | Active members (`deleted_at IS NULL`) | Admins (existing) |

Helper functions: `user_tenant_ids()`, `manager_tenant_ids()`, `admin_tenant_ids()`.

---

## Events

All mutations emit:

1. **`organization_audit_logs`** row (before/after)
2. **`domain_events`** via `emit_domain_event` RPC

| Event type | Trigger |
|------------|---------|
| `organization.updated` | Org settings / business hours |
| `organization.branding.updated` | Branding change |
| `organization.member.invited` | Invite created |
| `organization.member.role_changed` | Role update |
| `organization.member.suspended` | Status → suspended |
| `organization.member.removed` | Soft delete member |
| `organization.invite.revoked` | Invite revoked |
| `organization.department.*` | Department CRUD |
| `organization.team.*` | Team CRUD / membership |

---

## Observability

- All REST routes use `withApiHandler` (rate limit + request tracing)
- Domain events include `actorId` and correlation via outbox
- Audit logs queryable at `GET /api/organization/audit-logs`

---

## Testing

| Suite | File | Coverage |
|-------|------|----------|
| Unit | `tests/unit/organization.service.test.ts` | Service guards, invite, permissions |
| Integration | `tests/integration/organization-module.test.ts` | Migration RLS, route auth, repo scoping |

Run: `npm test`

---

## Apply migration

```bash
supabase db push
# Applies 023_organization_module.sql
```

---

## Related documents

- [Multi-Tenant Architecture](../08-multi-tenant-architecture.md)
- [API Architecture](../05-api-architecture.md)
- [Platform Core](./PLATFORM_CORE.md)
