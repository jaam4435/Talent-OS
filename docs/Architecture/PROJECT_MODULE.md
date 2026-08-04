# Project Module

**Document version:** 1.0.0  
**Date:** August 2, 2026  
**Status:** Implemented  
**Migration:** `026_project_module.sql`

---

## Overview

The Project Module manages **delivery** for Talent OS agencies: projects, milestones, tasks, deliverables, assets/files, comments, dependencies, templates, status workflow, deadlines, priority, project health, timeline, and notifications.

It extends the existing project stack (`projects`, `milestones`, payments, workflow events) with structured REST APIs, audit logging, domain events, and health scoring.

**Backward compatibility:** Existing `ProjectService`, Server Actions (`app/actions/projects.ts`), and milestone review flows remain unchanged.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│  REST API  /api/projects/*                                  │
└───────────────────────────┬─────────────────────────────────┘
                            │
┌───────────────────────────▼─────────────────────────────────┐
│  ProjectModuleService  (lib/services/project-module.service.ts)│
│  + existing ProjectService (server actions / legacy flows)    │
└───────────────────────────┬─────────────────────────────────┘
                            │
     project_* repositories + projects + milestones + notifications
                            │
     project_audit_logs + project_timeline_events + domain_events
```

| Layer | Location |
|-------|----------|
| Types & validation | `modules/project/` |
| Repositories | `lib/repositories/project*.repository.ts` |
| Module service | `lib/services/project-module.service.ts` |
| Legacy service | `lib/services/project.service.ts` (unchanged) |
| REST routes | `app/api/projects/` |

---

## Entities

| Entity | Table | Purpose |
|--------|-------|---------|
| **Projects** | `projects` | Core delivery record (extended) |
| **Milestones** | `milestones` | Payment/review gates (extended with priority) |
| **Deliverables** | `project_deliverables` | Client-facing outputs |
| **Tasks** | `project_tasks` | Actionable work items (distinct from milestones) |
| **Assets / Files** | `project_assets` | Files, links, images, documents |
| **Comments** | `project_comments` | Polymorphic discussion threads |
| **Requirements** | `projects.requirements` | Structured kickoff requirements (existing) |
| **Dependencies** | `project_dependencies` | Predecessor/successor links |
| **Templates** | `project_templates` | Reusable kickoff blueprints |
| **Timeline** | `project_timeline_events` | Chronological activity feed |
| **Health** | `projects.health_*` + RPC | Computed delivery health |

---

## Status workflow

Existing project statuses: `draft`, `active`, `in_review`, `completed`, `archived`, `canceled`.

Transition maps preserved from `lib/projects/types.ts`:

| Role | Allowed transitions |
|------|---------------------|
| Manager | Full workflow (draft→active→in_review→completed→archived) |
| Freelancer | active→in_review only |

**API:** `PATCH /api/projects/{id}/status` with `{ "status": "...", "role": "manager" }`

---

## Features

### Deadlines & priority

Projects and milestones support `priority` (`low`, `medium`, `high`, `urgent`) and project-level `deadline`.

### Project health

`GET /api/projects/{id}/health` — computed via `compute_project_health()` RPC:

- Score 0–100 based on overdue milestones/tasks, blocked tasks, open deliverables
- Status: `on_track`, `at_risk`, `blocked`, `completed`

Auto-refreshed on task/milestone/deliverable changes.

### Timeline

`GET /api/projects/{id}/timeline` — chronological feed of status changes, completions, comments, dependencies.

### Templates

- `GET/POST /api/projects/templates` — manage templates
- `POST /api/projects/templates/{id}/apply` — instantiate project from template

### Notifications

Project creation notifies assigned freelancer via `NotificationService`.

---

## REST API summary

| Method | Path | Permission | Description |
|--------|------|------------|-------------|
| GET | `/api/projects` | `project:read` | List projects |
| POST | `/api/projects` | `project:manage` | Create project |
| GET/PATCH/DELETE | `/api/projects/{id}` | read/manage | CRUD |
| PATCH | `/api/projects/{id}/status` | `project:manage` | Status workflow |
| GET | `/api/projects/{id}/health` | `project:read` | Health score |
| GET | `/api/projects/{id}/timeline` | `project:read` | Activity timeline |
| GET/PATCH | `/api/projects/{id}/milestones` | read/manage | Milestones |
| GET/POST/PATCH | `/api/projects/{id}/tasks` | read/manage | Tasks |
| GET/POST/PATCH | `/api/projects/{id}/deliverables` | read/manage | Deliverables |
| GET/POST | `/api/projects/{id}/assets` | read/manage | Assets/files |
| GET/POST | `/api/projects/{id}/comments` | read/manage | Comments |
| GET/POST | `/api/projects/{id}/dependencies` | read/manage | Dependencies |
| GET/POST | `/api/projects/templates` | read/templates:manage | Templates |
| POST | `/api/projects/templates/{id}/apply` | `project:manage` | Apply template |
| GET | `/api/projects/audit-logs` | `project:audit:read` | Audit trail |

---

## Events

| Event type | Trigger |
|------------|---------|
| `project.created` | Project created |
| `project.updated` | Profile updated |
| `project.status_changed` | Workflow transition |
| `project.deleted` | Soft delete |
| `project.milestone.updated` | Milestone changed |
| `project.task.created` | Task added |
| `project.task.completed` | Task done |
| `project.deliverable.submitted` | Deliverable submitted |
| `project.comment.added` | Comment posted |
| `project.dependency.added` | Dependency linked |
| `project.template.applied` | Template instantiated |

---

## Permissions

| Permission | Roles | Purpose |
|------------|-------|---------|
| `project:read` | admin, talent_manager | List, health, timeline |
| `project:manage` | admin, talent_manager | CRUD, status, sub-entities |
| `project:templates:manage` | admin, talent_manager | Template CRUD |
| `project:audit:read` | admin, talent_manager | Audit log access |

Legacy `projects:*` permissions remain for server actions.

---

## RLS

All new tables use tenant-scoped RLS:

- Managers: full access within tenant
- Freelancers: self-service on assigned project tasks/deliverables
- Assets/comments: all tenant members
- Audit logs: manager read/insert (via service)

Soft deletes via `deleted_at`.

---

## Testing

| Test file | Coverage |
|-----------|----------|
| `tests/unit/project-module.service.test.ts` | Mapping, transitions, health, tasks |
| `tests/integration/project-module.test.ts` | Migration, routes, permissions, backward compat |

Run: `npm test`

---

## Migrations index

| # | File | Module |
|---|------|--------|
| 001 | `001_initial_schema.sql` | Core + projects/milestones |
| 010 | `010_ai_pm_system.sql` | Requirements, AI summary |
| **026** | **`026_project_module.sql`** | **Project module** |

---

## Related docs

- [Talent Module](./TALENT_MODULE.md) — supply/freelancers
- [CRM Module](./CRM_MODULE.md) — demand/sales
- OpenAPI: `docs/openapi.yaml` — Projects tag endpoints
