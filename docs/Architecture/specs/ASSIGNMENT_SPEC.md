# Resource Assignment — Implementation Specification

**Document version:** 1.0.0  
**Date:** August 2, 2026  
**Status:** Draft — awaiting approval  
**Bounded context:** Resource Assignment  
**References:** `DOMAIN_MODEL.md`, `CONTEXT_MAP.md`, `EVENT_CATALOG.md`, `UBIQUITOUS_LANGUAGE.md`

---

## 1. Business Overview

The Resource Assignment context plans and tracks **freelancer allocation** to projects and opportunities: capacity limits, schedules, conflict detection, over-allocation alerts, and AI-assisted suggestions.

**Primary actors:** Talent manager (planning), freelancer (accept/reject via WhatsApp)  
**Business outcome:** Conflict-free workforce allocation with audit trail and automated suggestions.

---

## 2. Responsibilities

### In scope

- Allocation CRUD (project/opportunity link, pct, date range, status)
- Capacity management (weekly hours, max concurrent assignments)
- Schedule blocks within allocations
- Skill requirements per allocation
- Conflict detection (double-booking, over-allocation, availability gaps)
- Conflict resolution workflow
- AI-assisted freelancer suggestions
- Assignment history and audit logging
- Legacy shortlist/broadcast orchestration (AssignmentService)

### Out of scope

- Freelancer profile management (Talent BC)
- Project delivery (Project BC)
- Opportunity creation (CRM BC)
- Workflow definition (Workflow BC) — consumes `assignment.created`

---

## 3. Public APIs

Base path: `/api/assignments`

| Method | Path | Permission | Description |
|--------|------|------------|-------------|
| GET/POST | `/api/assignments` | `assignment:read` / `assignment:manage` | List/create allocations |
| GET/PATCH/DELETE | `/api/assignments/{id}` | read/manage | CRUD / cancel |
| POST | `/api/assignments/conflicts/check` | `assignment:read` | Pre-flight conflict check |
| GET | `/api/assignments/conflicts` | `assignment:read` | Open conflicts |
| PATCH | `/api/assignments/conflicts/{id}/resolve` | `assignment:manage` | Resolve conflict |
| POST | `/api/assignments/suggest` | `assignment:read` | Candidate suggestions |
| GET/POST | `/api/assignments/capacity` | read/manage | Capacity limits |
| GET/POST | `/api/assignments/{id}/schedules` | read/manage | Work schedules |
| GET/POST | `/api/assignments/{id}/requirements` | read/manage | Skill requirements |
| GET | `/api/assignments/{id}/history` | `assignment:read` | Change history |
| GET | `/api/assignments/audit-logs` | `assignment:audit:read` | Audit trail |

**Legacy:** Server Actions `app/actions/shortlists.ts`, `app/actions/opportunities.ts` (broadcast).

---

## 4. Internal Services

| Service | Path | Role |
|---------|------|------|
| **AssignmentModuleService** | `lib/services/assignment-module.service.ts` | Allocations, conflicts, suggestions, audit, events |
| **AssignmentService** | `lib/services/assignment.service.ts` | Legacy: opportunity broadcast, shortlist orchestration |

**Module layer:** `modules/assignment/` — types, validation, `ASSIGNMENT_EVENT_TYPES`

**Repositories:** `AssignmentAllocationRepository`, `AssignmentCapacityRepository`, `AssignmentScheduleRepository`, `AssignmentRequirementRepository`, `AssignmentConflictRepository`, `AssignmentHistoryRepository`, `AssignmentAuditRepository`

---

## 5. Database Schema

**Migration:** `027_assignment_module.sql`  
**Legacy:** `005_*` (shortlists, match scores)

| Table | Purpose |
|-------|---------|
| `assignment_allocations` | Core allocation aggregate |
| `assignment_capacity` | Weekly hours + max concurrent |
| `assignment_schedules` | Work blocks within allocation |
| `assignment_requirements` | Skills/hours needed |
| `assignment_conflicts` | Detected scheduling conflicts |
| `assignment_history` | Per-allocation change log |
| `assignment_audit_logs` | Module-wide audit |

**Key RPCs:** `detect_assignment_conflicts`, `suggest_assignment_candidates`

**RLS:** Manager full access; freelancer read own allocations.

---

## 6. Aggregates

| Aggregate | Root table | Invariants |
|-----------|------------|------------|
| **Allocation** | `assignment_allocations` | Valid status enum; pct 1–100; date range valid |
| **Capacity** | `assignment_capacity` | One row per freelancer per tenant |
| **Conflict** | `assignment_conflicts` | Linked to allocation; severity enum |

**Status lifecycle:** planned → confirmed → active → completed | canceled

**Consistency:** Conflict check runs on create/update unless `skip_conflict_check: true` (manager only).

---

## 7. Domain Events

Namespace: `assignment.*` — see `ASSIGNMENT_EVENT_TYPES`.

| Event | Trigger |
|-------|---------|
| `assignment.created` | New allocation |
| `assignment.updated` | Field change |
| `assignment.status_changed` | Status transition |
| `assignment.canceled` | Allocation canceled |
| `assignment.conflict.detected` | Conflict found on check |
| `assignment.conflict.resolved` | Manager resolves conflict |
| `assignment.capacity.updated` | Capacity limits changed |
| `assignment.schedule.added` | Schedule block added |
| `assignment.suggestion.generated` | Suggest RPC invoked |

**Workflow trigger:** `assignment.created` → `wf-assignment`

---

## 8. Commands

| Command | Handler | Event |
|---------|---------|-------|
| CreateAllocation | `createAllocation()` | `assignment.created` |
| UpdateAllocation | `updateAllocation()` | `assignment.updated` / `assignment.status_changed` |
| ConfirmAllocation | `updateAllocation(status: confirmed)` | `assignment.status_changed` |
| CancelAllocation | `cancelAllocation()` | `assignment.canceled` |
| UpdateCapacity | `updateCapacity()` | `assignment.capacity.updated` |
| DetectConflicts | `checkConflicts()` | `assignment.conflict.detected` |
| ResolveConflict | `resolveConflict()` | `assignment.conflict.resolved` |
| GenerateSuggestions | `suggestFreelancers()` | `assignment.suggestion.generated` |
| AddSchedule | `addSchedule()` | `assignment.schedule.added` |

---

## 9. Queries

| Query | Returns |
|-------|---------|
| ListAllocations | Paginated with filters (status, freelancer, project) |
| GetAllocation | Full allocation with schedules, requirements, conflicts |
| CheckConflicts | Ephemeral `AssignmentConflictCheck` result |
| ListOpenConflicts | Unresolved conflicts |
| GetCapacity | Freelancer capacity limits |
| GetHistory | Per-allocation change log |
| SuggestCandidates | Ranked freelancers by skill, load, rating |
| ListAuditLogs | Assignment audit entries |

---

## 10. Validation Rules

**Source:** `modules/assignment/validation.ts`

| Rule | Field | Constraint |
|------|-------|------------|
| Allocation pct | `allocation_pct` | 1–100 integer |
| Date range | `starts_at`, `ends_at` | ISO datetime; start before end |
| Status | `status` | Valid enum transition |
| Capacity hours | `weekly_hours` | Positive number |
| Max concurrent | `max_concurrent` | Positive integer |
| Required skills | `required_skills[]` | Non-empty for requirements |
| Skip conflict check | `skip_conflict_check` | Manager only |

**Business rules:**

- Conflicts with `severity: error` block allocation unless override
- Over-allocation (>100% total pct) flagged as conflict
- WhatsApp accept/reject maps to confirmed/canceled status
- Error-severity conflicts notify assignment creator

---

## 11. Authorization Rules

| Permission | Roles | Scope |
|------------|-------|-------|
| `assignment:read` | admin, talent_manager, freelancer (own) | View allocations, conflicts, suggestions |
| `assignment:manage` | admin, talent_manager | Create, update, cancel, resolve |
| `assignment:audit:read` | admin, talent_manager | Audit logs |

**RLS:** Manager full access; freelancer read own allocations via `freelancer_id` link.

---

## 12. AI Capabilities

| Feature | Trigger | Output |
|---------|---------|--------|
| **Assignment suggestions** | `POST /api/assignments/suggest` | Ranked candidates via RPC |
| **AI match integration** | `ai.match_requested` (CRM) | Complements shortlist broadcast |
| **MCP assignment tools** | Agent invocation | Read allocations via MCP |

**Entity descriptors:** `ASSIGNMENT_AI_ENTITIES` — allocation, capacity

---

## 13. Background Jobs

| Job | Trigger | Action |
|-----|---------|--------|
| Domain event dispatch | Cron | Process `assignment.*` events |
| Conflict notification | Error conflict on create | Notify assignment creator |
| Over-allocation alert | Conflict detection | In-app notification |

**Future:** Proactive conflict scan cron for upcoming allocations.

---

## 14. Integrations

| System | Usage |
|--------|-------|
| **Talent BC** | Availability slots for gap detection |
| **Project BC** | Allocation target (project_id) |
| **CRM BC** | Allocation target (opportunity_id); legacy broadcast |
| **WhatsApp BC** | Accept/reject assignment commands |
| **Workflow BC** | `wf-assignment` on create |
| **Analytics BC** | Utilization dashboard |

---

## 15. Observability

| Signal | Source |
|--------|--------|
| Audit logs | `assignment_audit_logs` |
| History | `assignment_history` |
| Domain events | `assignment.*` in `domain_events` |
| Metrics | Utilization rate, conflict count (Analytics Utilization dashboard) |

---

## 16. Testing Strategy

| Test | Focus |
|------|-------|
| Unit | Conflict detection logic |
| Integration | API permission matrix (`tests/integration/assignment-module.test.ts`) |
| Integration | Over-allocation blocked without skip flag |
| Integration | WhatsApp accept → confirmed status |
| E2E | Suggest → create allocation → conflict check |

**Coverage target:** 80% on `AssignmentModuleService` mutation paths.

---

## 17. Migration Strategy

| Migration | Content |
|-----------|---------|
| `027_assignment_module.sql` | Allocations, capacity, conflicts, audit |
| Future | Separate broadcast BC from assignment planning |

**Data migration:** No breaking changes; legacy shortlist flows preserved.

---

## 18. Future Enhancements

1. **Auto-assignment** — Workflow step to confirm top suggestion
2. **Capacity forecasting** — Predict overload from pipeline deals
3. **Team-based allocation** — Assign to org teams vs individuals
4. **Split allocation BC** — Separate opportunity broadcast from workforce planning
5. **Calendar sync** — External calendar integration for availability
6. **Utilization targets** — Org-level capacity KPIs with alerts

---

## Appendix — File map

| Artifact | Path |
|----------|------|
| Types | `modules/assignment/types.ts` |
| Validation | `modules/assignment/validation.ts` |
| Module service | `lib/services/assignment-module.service.ts` |
| Routes | `app/api/assignments/**` |
| Architecture doc | `docs/Architecture/ASSIGNMENT_MODULE.md` |
