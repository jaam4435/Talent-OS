# Assignment Module

**Document version:** 1.0.0  
**Date:** August 2, 2026  
**Status:** Implemented  
**Migration:** `027_assignment_module.sql`

---

## Overview

The Assignment Module manages **resource allocation** for Talent OS agencies: talent-to-project assignments, capacity limits, schedules, requirements, conflict detection, double-booking prevention, over-allocation alerts, automatic suggestions, history, and audit logging.

It extends the existing assignment workflow (`AssignmentService` for shortlists/broadcast/match scores) with structured REST APIs for workforce planning.

**Backward compatibility:** Existing `AssignmentService`, Server Actions (`app/actions/shortlists.ts`, `app/actions/opportunities.ts`), and AI match flows remain unchanged.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│  REST API  /api/assignments/*                               │
└───────────────────────────┬─────────────────────────────────┘
                            │
┌───────────────────────────▼─────────────────────────────────┐
│  AssignmentModuleService                                    │
│  + existing AssignmentService (shortlists / broadcast)        │
└───────────────────────────┬─────────────────────────────────┘
                            │
     assignment_* repositories + talent availability + notifications
                            │
     assignment_audit_logs + assignment_history + domain_events
```

| Layer | Location |
|-------|----------|
| Types & validation | `modules/assignment/` |
| Repositories | `lib/repositories/assignment-*.repository.ts` |
| Module service | `lib/services/assignment-module.service.ts` |
| Legacy service | `lib/services/assignment.service.ts` (unchanged) |
| REST routes | `app/api/assignments/` |

---

## Entities

| Entity | Table | Purpose |
|--------|-------|---------|
| **Assignments** | `assignment_allocations` | Core talent allocation to project/opportunity |
| **Capacity** | `assignment_capacity` | Weekly hours + max concurrent assignments |
| **Schedules** | `assignment_schedules` | Work blocks within an allocation |
| **Availability** | `talent_availability_slots` (Talent Module) | Calendar availability for gap detection |
| **Allocations** | `assignment_allocations.allocation_pct` | Percent of capacity allocated |
| **Requirements** | `assignment_requirements` | Skills/hours needed per allocation |
| **Conflicts** | `assignment_conflicts` | Detected double-booking / over-allocation |
| **History** | `assignment_history` | Per-allocation change log |
| **Audit** | `assignment_audit_logs` | Module-wide immutable audit trail |

---

## Features

### Conflict detection & double-booking prevention

`POST /api/assignments/conflicts/check` — runs `detect_assignment_conflicts` RPC:

- **double_booking** (error): overlapping time ranges with active allocations
- **over_allocation** (warning/error): total allocation % exceeds 100%
- **availability_gap** (warning): no talent availability slot covers the period

Create/update allocations run conflict checks by default. Pass `skip_conflict_check: true` to override (manager only).

### Over-allocation alerts

When error-severity conflicts are detected, notifications are sent to the assignment creator.

Open conflicts: `GET /api/assignments/conflicts`  
Resolve: `PATCH /api/assignments/conflicts/{id}/resolve`

### Automatic assignment suggestions

`POST /api/assignments/suggest`

```json
{
  "required_skills": ["react", "typescript"],
  "starts_at": "2026-08-01T09:00:00.000Z",
  "ends_at": "2026-08-31T17:00:00.000Z",
  "limit": 10
}
```

Uses `suggest_assignment_candidates` RPC — ranks by skill match, current load, rating.

---

## REST API summary

| Method | Path | Permission | Description |
|--------|------|------------|-------------|
| GET | `/api/assignments` | `assignment:read` | List allocations |
| POST | `/api/assignments` | `assignment:manage` | Create allocation |
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

---

## Events

| Event type | Trigger |
|------------|---------|
| `assignment.created` | Allocation created |
| `assignment.updated` | Allocation updated |
| `assignment.status_changed` | Status transition |
| `assignment.canceled` | Allocation canceled |
| `assignment.conflict.detected` | Conflict persisted |
| `assignment.conflict.resolved` | Conflict resolved |
| `assignment.capacity.updated` | Capacity set |
| `assignment.schedule.added` | Schedule block added |
| `assignment.suggestion.generated` | Suggestions requested |

---

## Permissions

| Permission | Roles | Purpose |
|------------|-------|---------|
| `assignment:read` | admin, talent_manager | List, conflicts, suggest, history |
| `assignment:manage` | admin, talent_manager | Create/update/cancel allocations |
| `assignment:audit:read` | admin, talent_manager | Audit log access |

Legacy shortlist/broadcast permissions (`shortlists:manage`, `opportunities:broadcast`) unchanged.

---

## RLS

- Managers: full assignment management within tenant
- Freelancers: read own allocations
- Audit logs: manager read/insert via service

---

## Testing

| Test file | Coverage |
|-----------|----------|
| `tests/unit/assignment-module.service.test.ts` | Conflicts, create, suggestions |
| `tests/integration/assignment-module.test.ts` | Migration, routes, backward compat |

Run: `npm test`

---

## Migrations index

| # | File | Module |
|---|------|--------|
| 005 | `005_event_infrastructure.sql` | Match scores |
| 025 | `025_talent_module.sql` | Availability slots |
| **027** | **`027_assignment_module.sql`** | **Assignment module** |

---

## Related docs

- [Talent Module](./TALENT_MODULE.md) — availability calendar
- [Project Module](./PROJECT_MODULE.md) — delivery/projects
- OpenAPI: `docs/openapi.yaml` — Assignments tag endpoints
