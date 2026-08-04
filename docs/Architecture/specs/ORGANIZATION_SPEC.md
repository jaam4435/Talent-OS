# Organization — Implementation Specification

**Document version:** 1.0.0  
**Date:** August 2, 2026  
**Status:** Draft — awaiting approval  
**Bounded context:** Organization Management  
**References:** `DOMAIN_MODEL.md`, `CONTEXT_MAP.md`, `EVENT_CATALOG.md`, `UBIQUITOUS_LANGUAGE.md`

---

## 1. Business Overview

The Organization context defines the **workspace boundary** for Talent OS. Every tenant record represents an agency organization with profile, branding, structure (departments, teams), membership, and subscription reference. All other bounded contexts conform to `tenant_id` as the isolation key.

**Primary actors:** Organization admin, talent manager  
**Business outcome:** Secure multi-tenant workspace with RBAC, audit trail, and structural hierarchy.

---

## 2. Responsibilities

### In scope

- Organization profile (name, timezone, currency, settings)
- Branding (logo, colors)
- Business hours configuration
- Department and team hierarchy
- Member lifecycle (invite, role change, suspend, remove)
- Invitation management (create, revoke)
- Subscription reference storage (external billing ID only)
- Immutable audit logging
- Domain event emission on all mutations

### Out of scope

- Authentication (Supabase Auth — shared kernel)
- Billing/subscription processing (future Billing BC)
- Permission definition (Core RBAC in `modules/core/services/permissions.ts`)
- Business operations in CRM, Talent, Project, etc.

---

## 3. Public APIs

Base path: `/api/organization`

| Method | Path | Permission | Description |
|--------|------|------------|-------------|
| GET | `/api/organization` | `tenant:read` | Organization summary |
| PATCH | `/api/organization` | `tenant:update` | Update profile |
| GET/PATCH | `/api/organization/settings` | `tenant:read` / `tenant:update` | Settings JSON |
| GET/PATCH | `/api/organization/branding` | `tenant:read` / `tenant:update` | Branding |
| GET/PATCH | `/api/organization/subscription` | `tenant:billing` / `tenant:billing` | Subscription ref |
| GET/POST | `/api/organization/departments` | `org:departments:*` | Department CRUD |
| GET/PATCH/DELETE | `/api/organization/departments/{id}` | `org:departments:*` | Single department |
| GET/POST | `/api/organization/teams` | `org:teams:*` | Team CRUD |
| GET/PATCH/DELETE | `/api/organization/teams/{id}` | `org:teams:*` | Single team |
| GET/POST/DELETE | `/api/organization/teams/{id}/members` | `org:teams:manage` | Team membership |
| GET/POST | `/api/organization/members` | `members:*` | Member list / actions |
| PATCH/DELETE | `/api/organization/members/{id}` | `members:manage` | Role, suspend, remove |
| GET/POST | `/api/organization/invitations` | `members:invite` | Invites |
| DELETE | `/api/organization/invitations/{id}` | `members:invite` | Revoke invite |
| GET | `/api/organization/audit-logs` | `org:audit:read` | Audit trail |
| GET | `/api/organization/permissions` | `tenant:read` | Effective permissions |

**Legacy (backward compatible):** `GET /api/team/members` — delegates to analytics team page data.

**Auth:** Session cookie; `auth: 'tenant'` minimum; manager-only for structural mutations.

---

## 4. Internal Services

| Service | Path | Role |
|---------|------|------|
| **OrganizationService** | `lib/services/organization.service.ts` | Primary orchestrator: validation, audit, events |
| **TenantContext resolver** | `modules/core/services/tenant-context.ts` | Session → tenant + role |
| **Permissions** | `modules/core/services/permissions.ts` | RBAC map |
| **Invites** | `modules/core/services/invites.ts` | Invite token generation/acceptance |

**Module layer:** `modules/organization/` — types, validation schemas only (no separate module service; OrganizationService is the module service).

---

## 5. Database Schema

**Migration:** `023_organization_module.sql`  
**Depends on:** `001_initial_schema.sql`, `006_complete_rls_and_integrity.sql`

| Table | Purpose |
|-------|---------|
| `tenants` | Organization aggregate root (extended) |
| `tenant_members` | Member aggregate (extended with `deleted_at`) |
| `member_invites` | Invite aggregate |
| `org_departments` | Department aggregate |
| `org_teams` | Team aggregate |
| `org_team_members` | Team ↔ member link |
| `organization_audit_logs` | Immutable audit |

**Key columns on `tenants`:** `name`, `slug`, `logo_url`, `primary_color`, `accent_color`, `timezone`, `currency`, `business_hours`, `settings`, `subscription_status`, `subscription_reference`, `deleted_at`

**Indexes:** `idx_tenants_active`, department/team slug uniqueness per tenant, audit by tenant+created_at.

**RLS:** `is_manager_of(tenant_id)` for structural writes; members read own org.

---

## 6. Aggregates

| Aggregate | Root table | Invariants |
|-----------|------------|------------|
| **Organization** | `tenants` | Unique slug; valid currency (ISO 4217); soft-delete hides from queries |
| **Department** | `org_departments` | Unique `(tenant_id, slug)`; soft delete |
| **Team** | `org_teams` | Optional `department_id`; unique slug per tenant |
| **Member** | `tenant_members` | One active membership per user per tenant; valid role enum |
| **Invite** | `member_invites` | Unique pending invite per email; expires_at enforced |

**Consistency:** Single-aggregate transactions per command. Cross-aggregate operations (e.g. add member to team) use sequential commits with audit on each.

---

## 7. Domain Events

Namespace: `organization.*` — see `ORGANIZATION_EVENT_TYPES` in `modules/organization/types.ts`.

| Event | Trigger |
|-------|---------|
| `organization.updated` | Profile/settings change |
| `organization.branding.updated` | Logo/colors change |
| `organization.member.invited` | Invite sent |
| `organization.member.role_changed` | Role update |
| `organization.member.suspended` | Member suspended |
| `organization.member.removed` | Member removed |
| `organization.invite.revoked` | Invite canceled |
| `organization.department.created/updated/deleted` | Department lifecycle |
| `organization.team.created/updated/deleted` | Team lifecycle |

**Emission:** `OrganizationService` → `WorkflowService.emitEvent()` → `domain_events` outbox.

---

## 8. Commands

| Command | Input | Handler method | Preconditions |
|---------|-------|----------------|---------------|
| UpdateOrganization | `updateOrganizationSchema` | `updateProfile()` | Manager; org not deleted |
| UpdateBranding | `updateBrandingSchema` | `updateBranding()` | Manager |
| UpdateBusinessHours | `updateBusinessHoursSchema` | `updateBusinessHours()` | Manager |
| CreateDepartment | `createDepartmentSchema` | `createDepartment()` | Manager; slug unique |
| UpdateDepartment | `updateDepartmentSchema` | `updateDepartment()` | Manager; dept exists |
| DeleteDepartment | `{ id }` | `deleteDepartment()` | Soft delete; no blocking teams |
| CreateTeam | `createTeamSchema` | `createTeam()` | Manager |
| UpdateTeam | `updateTeamSchema` | `updateTeam()` | Manager |
| DeleteTeam | `{ id }` | `deleteTeam()` | Soft delete |
| AddTeamMember | `{ member_id }` | `addTeamMember()` | Member active |
| RemoveTeamMember | `{ member_id }` | `removeTeamMember()` | — |
| InviteMember | `inviteMemberSchema` | `inviteMember()` | Valid role; email not member |
| RevokeInvite | `{ id }` | `revokeInvite()` | Invite pending |
| ChangeMemberRole | `{ role }` | `changeMemberRole()` | Cannot demote last admin |
| SuspendMember | `{ id }` | `suspendMember()` | Not self |
| RemoveMember | `{ id }` | `removeMember()` | Not last admin |

---

## 9. Queries

| Query | Handler | Returns |
|-------|---------|---------|
| GetOrganization | `getOrganization()` | `OrganizationSummary` |
| GetSettings | `getSettings()` | Settings + business hours |
| ListDepartments | `listDepartments()` | Paginated departments |
| ListTeams | `listTeams()` | Paginated teams with member count |
| ListMembers | `listMembers()` | Members with profile |
| ListInvites | `listInvites()` | Pending invites |
| ListAuditLogs | `listAuditLogs()` | Paginated audit entries |
| GetPermissions | `getPermissionsForRole()` | Permission strings for UI |

**Read models:** No separate CQRS projections; direct repository queries with RLS.

---

## 10. Validation Rules

**Source:** `modules/organization/validation.ts`

| Rule | Schema field | Constraint |
|------|--------------|------------|
| Org name | `name` | 2–120 chars |
| Currency | `currency` | Exactly 3 uppercase letters |
| Hex colors | `primary_color`, `accent_color` | `#RGB` or `#RRGGBB` |
| Business hours | `business_hours.*` | HH:MM or closed flag |
| Department slug | `slug` | Lowercase kebab-case; auto-generated if omitted |
| Invite email | `email` | Valid email; role in enum |
| Subscription ref | `subscription_reference` | Max 256 chars |

**Business rules (service layer):**

- Cannot delete last admin member
- Expired invites rejected on accept
- Soft-deleted departments/teams excluded from default lists

---

## 11. Authorization Rules

| Permission | Roles | Operations |
|------------|-------|------------|
| `tenant:read` | all authenticated | GET org, settings |
| `tenant:update` | admin, talent_manager | PATCH profile, settings, branding |
| `tenant:billing` | admin | Subscription reference |
| `org:departments:read/manage` | admin, talent_manager | Departments |
| `org:teams:read/manage` | admin, talent_manager | Teams |
| `members:invite` | admin, talent_manager | Invitations |
| `members:manage` | admin, talent_manager | Role, suspend, remove |
| `org:audit:read` | admin, talent_manager | Audit logs |

**RLS policies:** Manager-scoped writes; authenticated read within tenant membership.

---

## 12. AI Capabilities

**Current:** None native to Organization context.

**Indirect:** Organization settings (timezone, currency) consumed by AI Gateway and Analytics for context. Agent MCP tools do not mutate organization structure.

**Future:** Executive agent may read org summary via MCP; no write tools planned.

---

## 13. Background Jobs

**Current:** None dedicated to Organization.

**Indirect:**

- Invite expiry — checked at accept time (no cron)
- Domain events processed by global `/api/cron/dispatch-events`

**Future:** Scheduled invite reminder emails via workflow on `organization.member.invited`.

---

## 14. Integrations

| Integration | Direction | Purpose |
|-------------|-----------|---------|
| **Supabase Auth** | Inbound | User identity; magic link signup |
| **Domain events outbox** | Outbound | All mutations → `domain_events` |
| **Future Stripe** | Inbound (webhook) | Update `subscription_status`, `subscription_reference` |

**Anti-corruption:** Subscription webhook handler (future) maps Stripe customer → `subscription_reference` without exposing Stripe types to domain.

---

## 15. Observability

| Signal | Source |
|--------|--------|
| Audit logs | `organization_audit_logs` — all mutations |
| Domain events | `organization.*` in `domain_events` |
| API instrumentation | `instrumentApiRequest()` on routes |
| Metrics | Member count, invite pending count (future dashboard) |

**Alerts (future):** Last admin removal attempt; mass invite failures.

---

## 16. Testing Strategy

| Layer | Scope | Location |
|-------|-------|----------|
| Unit | Validation schemas | `tests/unit/organization*.test.ts` (to add) |
| Unit | Service audit/event emission | Mock repos + assert `emitEvent` |
| Integration | RLS policies | `tests/integration/rls.test.ts` |
| Integration | API routes | Permission matrix per endpoint |
| E2E | Invite accept flow | Critical workflow spec |

**Coverage target:** 80% on `OrganizationService` mutation paths.

---

## 17. Migration Strategy

| Migration | Change |
|-----------|--------|
| `023_organization_module.sql` | Departments, teams, audit, tenant extensions |
| Future `032_*` | Stripe webhook columns; org-level feature overrides |

**Data migration:** Existing tenants backfilled with default `business_hours` JSON. No breaking API changes.

**Rollback:** Soft deletes only; hard rollback requires migration down scripts for new tables.

---

## 18. Future Enhancements

1. **Billing BC integration** — Stripe customer sync; seat-based licensing
2. **SSO/SAML** — Enterprise identity provider per organization
3. **Custom roles** — Beyond four fixed roles
4. **Org-level feature flags** — Override platform defaults per tenant
5. **Department-scoped permissions** — Restrict managers to department subtree
6. **Consolidate `tenant` vs `organization` naming** in code to match ubiquitous language

---

## Appendix — File map

| Artifact | Path |
|----------|------|
| Types | `modules/organization/types.ts` |
| Validation | `modules/organization/validation.ts` |
| Service | `lib/services/organization.service.ts` |
| Repositories | `lib/repositories/organization*.repository.ts` |
| Routes | `app/api/organization/**` |
| Architecture doc | `docs/Architecture/ORGANIZATION_MODULE.md` |
