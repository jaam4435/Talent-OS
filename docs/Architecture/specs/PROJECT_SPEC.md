# Project Delivery — Implementation Specification

**Document version:** 1.0.0  
**Date:** August 2, 2026  
**Status:** Draft — awaiting approval  
**Bounded context:** Project Delivery Management  
**References:** `DOMAIN_MODEL.md`, `CONTEXT_MAP.md`, `EVENT_CATALOG.md`, `UBIQUITOUS_LANGUAGE.md`

---

## 1. Business Overview

The Project Delivery context manages **client project execution**: project lifecycle, milestones (legacy payment gates), tasks, deliverables, assets, comments, dependencies, templates, health scoring, and timeline.

**Primary actors:** Talent manager, freelancer (assigned), client (read-only)  
**Business outcome:** On-time delivery with visible health, audit trail, and milestone-driven payment triggers.

---

## 2. Responsibilities

### In scope

- Project CRUD and role-gated status workflow
- Milestone submit/review lifecycle (legacy bridge via WorkflowService)
- Task work breakdown and completion
- Deliverable submission and review
- Asset/file management and comments
- Task dependencies and project templates
- Health score computation and timeline feed
- Audit logging and domain events

### Out of scope

- Payment approval (Finance BC) — triggered by milestone approval
- Freelancer allocation (Assignment BC)
- Workflow definition (Workflow BC) — consumes events
- WhatsApp message handling (WhatsApp BC) — delegates here

---

## 3. Public APIs

Base path: `/api/projects`

| Method | Path | Permission | Description |
|--------|------|------------|-------------|
| GET/POST | `/api/projects` | `project:read` / `project:manage` | List/create |
| GET/PATCH/DELETE | `/api/projects/{id}` | read/manage | CRUD |
| PATCH | `/api/projects/{id}/status` | `project:manage` | Status transition |
| GET | `/api/projects/{id}/health` | `project:read` | Health score |
| GET | `/api/projects/{id}/timeline` | `project:read` | Activity feed |
| GET/PATCH | `/api/projects/{id}/milestones` | read/manage | Milestones |
| GET/POST/PATCH | `/api/projects/{id}/tasks` | read/manage | Tasks |
| GET/POST/PATCH | `/api/projects/{id}/deliverables` | read/manage | Deliverables |
| GET/POST/DELETE | `/api/projects/{id}/assets` | read/manage | Assets/files |
| GET/POST | `/api/projects/{id}/comments` | read/manage | Comments |
| GET/POST/DELETE | `/api/projects/{id}/dependencies` | read/manage | Dependencies |
| GET/POST | `/api/projects/templates` | `project:templates:manage` | Templates |
| POST | `/api/projects/templates/{id}/apply` | `project:templates:manage` | Apply template |
| GET | `/api/projects/audit-logs` | `project:audit:read` | Audit trail |

**Legacy:** Server Actions `app/actions/projects.ts`; milestone flows via `WorkflowService`.

---

## 4. Internal Services

| Service | Path | Role |
|---------|------|------|
| **ProjectModuleService** | `lib/services/project-module.service.ts` | Module orchestrator: delivery model, health, audit, events |
| **ProjectService** | `lib/services/project.service.ts` | Legacy: project creation RPC, assignment |
| **WorkflowService** | `lib/services/workflow.service.ts` | Milestone submit/review bridge |

**Module layer:** `modules/project/` — types, validation, `PROJECT_EVENT_TYPES`, status transition maps

**Repositories:** `ProjectRepository`, `ProjectMilestoneRepository`, `ProjectTaskRepository`, `ProjectDeliverableRepository`, `ProjectAssetRepository`, `ProjectCommentRepository`, `ProjectDependencyRepository`, `ProjectTemplateRepository`, `ProjectTimelineRepository`, `ProjectAuditRepository`

---

## 5. Database Schema

**Migration:** `026_project_module.sql`  
**Legacy:** `001_initial_schema.sql` (`projects`, `milestones`), `005_*` (payments trigger)

| Table | Purpose |
|-------|---------|
| `projects` | Project aggregate root (extended with health, priority, deadline) |
| `milestones` | Payment/review gates |
| `project_tasks` | Work breakdown items |
| `project_deliverables` | Client-facing outputs |
| `project_assets` | Files, links, images |
| `project_comments` | Polymorphic discussion |
| `project_dependencies` | Predecessor/successor links |
| `project_templates` | Reusable blueprints |
| `project_timeline_events` | Chronological activity feed |
| `project_audit_logs` | Immutable audit |

**Key RPCs:** `compute_project_health()`, `create_project_from_template()`

**RLS:** Managers full access; freelancers scoped to assigned projects; clients read company-linked projects.

---

## 6. Aggregates

| Aggregate | Root table | Invariants |
|-----------|------------|------------|
| **Project** | `projects` | Valid status enum; role-gated transitions |
| **Milestone** | `milestones` | Must be `submitted` before manager review; 1:1 payment link |
| **Task** | `project_tasks` | Belongs to project; valid status enum |
| **Deliverable** | `project_deliverables` | Submission refreshes project health |
| **Template** | `project_templates` | Valid JSON blueprint structure |

**Status transitions:**

| Role | Allowed |
|------|---------|
| Manager | draft → active → in_review → completed → archived; cancel |
| Freelancer | active → in_review only |

**Consistency:** Single-aggregate transactions per command. Health refreshed after task/milestone/deliverable changes.

---

## 7. Domain Events

### Module (`PROJECT_EVENT_TYPES`)

`project.created`, `project.updated`, `project.status_changed`, `project.deleted`, `project.milestone.updated`, `project.task.created`, `project.task.completed`, `project.deliverable.submitted`, `project.comment.added`, `project.dependency.added`, `project.health.updated`, `project.template.applied`

### Legacy (flat)

`project.assigned`, `milestone.submitted`, `milestone.approved`, `milestone.revision_requested`, `milestone.overdue`, `project.closed`

**Workflow triggers:** `project.created` → `wf-project-creation`; `project.deliverable.submitted` → `wf-qa`; `project.status_changed` (completed) → `wf-project-closure`

---

## 8. Commands

| Command | Handler | Event |
|---------|---------|-------|
| CreateProject | `ProjectModuleService.createProject()` | `project.created` |
| UpdateProject | `ProjectModuleService.updateProject()` | `project.updated` |
| TransitionStatus | `ProjectModuleService.transitionStatus()` | `project.status_changed` |
| SubmitMilestone | `WorkflowService.submitMilestone()` | `milestone.submitted` |
| ReviewMilestone | `WorkflowService.reviewMilestone()` | `milestone.approved` / `milestone.revision_requested` |
| CreateTask / CompleteTask | `ProjectModuleService` | `project.task.*` |
| SubmitDeliverable | `ProjectModuleService` | `project.deliverable.submitted` |
| ApplyTemplate | `ProjectModuleService.applyTemplate()` | `project.template.applied` |
| RefreshHealth | internal | `project.health.updated` |

---

## 9. Queries

| Query | Returns |
|-------|---------|
| ListProjects | Paginated projects with filters (status, company, freelancer) |
| GetProject | Full project with milestones, tasks, deliverables |
| GetHealth | Score 0–100, status (on_track, at_risk, blocked, completed) |
| GetTimeline | Chronological feed of status, completions, comments |
| ListMilestones | Milestones with payment status |
| ListTasks | Tasks with dependency info |
| ListTemplates | Reusable project blueprints |
| ListAuditLogs | Project audit entries |

---

## 10. Validation Rules

**Source:** `modules/project/validation.ts`

| Rule | Field | Constraint |
|------|-------|------------|
| Project title | `title` | 2–200 chars |
| Status | `status` | Valid enum; transition must be allowed for role |
| Priority | `priority` | low, medium, high, urgent |
| Deadline | `deadline` | ISO datetime; optional |
| Milestone amount | `amount` | Non-negative |
| Task title | `title` | 2–200 chars |
| Deliverable | `title`, `file_path` | Title required; path for file submissions |
| Template | `name`, `blueprint` | Valid JSON structure |

**Business rules:**

- Milestone must be `submitted` before manager can approve/revise
- Revision requires review note
- Deliverable submission triggers health refresh
- Client role: read-only on company-linked projects

---

## 11. Authorization Rules

| Permission | Roles | Scope |
|------------|-------|-------|
| `project:read` | admin, talent_manager, freelancer (assigned), client (company) | View projects |
| `project:manage` | admin, talent_manager, freelancer (limited) | CRUD, status, milestones |
| `project:templates:manage` | admin, talent_manager | Template CRUD |
| `project:audit:read` | admin, talent_manager | Audit logs |

**RLS:** Manager full access; freelancer write on assigned projects; client read via company link.

---

## 12. AI Capabilities

| Feature | Trigger | Output |
|---------|---------|--------|
| **Status assessment** | `ai.status_assessment_requested` | Project health narrative |
| **MCP project tools** | Agent invocation | Read/write via `lib/mcp/servers/projects.server.ts` |

**Entity descriptors:** `PROJECT_AI_ENTITIES` — project, milestone, task

**Indirect:** WhatsApp milestone/deliverable commands delegate to this context.

---

## 13. Background Jobs

| Job | Trigger | Action |
|-----|---------|--------|
| Domain event dispatch | Cron | Process `project.*`, `milestone.*` events |
| Health refresh | Task/milestone/deliverable mutation | Inline RPC `compute_project_health()` |
| Milestone overdue | Scheduled check (future) | Emit `milestone.overdue` |

**Future:** Deadline reminder cron; blocked-task escalation workflow.

---

## 14. Integrations

| System | Usage |
|--------|-------|
| **Finance BC** | Milestone approval unlocks payment creation (001 schema) |
| **WhatsApp BC** | Milestone submit/approve, deliverable submit, project status |
| **Workflow BC** | QA on deliverable; delivery on milestone approval |
| **Storage** | Deliverable/asset file paths in Supabase Storage |
| **Notifications** | Project creation notifies assigned freelancer |
| **Analytics BC** | Delivery dashboard aggregations |

---

## 15. Observability

| Signal | Source |
|--------|--------|
| Audit logs | `project_audit_logs` |
| Timeline | `project_timeline_events` |
| Domain events | `project.*`, `milestone.*` in `domain_events` |
| Health metrics | Overdue counts, blocked tasks (Analytics Delivery dashboard) |

---

## 16. Testing Strategy

| Test | Focus |
|------|-------|
| Unit | Status transition enforcement by role |
| Unit | Health score computation |
| Integration | API permission matrix (`tests/integration/project-module.test.ts`) |
| Integration | Milestone submit → review → payment trigger |
| E2E | Template apply → task completion → deliverable submit |

**Coverage target:** 80% on `ProjectModuleService` mutation paths.

---

## 17. Migration Strategy

| Migration | Content |
|-----------|---------|
| `026_project_module.sql` | Tasks, deliverables, assets, templates, timeline, audit |
| Future | Separate milestone BC from project aggregate |

**Data migration:** Existing projects backfilled with default health fields. Legacy milestone flows preserved via WorkflowService bridge.

---

## 18. Future Enhancements

1. **Gantt/timeline view** — Visual dependency scheduling
2. **Client portal** — Direct deliverable review and sign-off
3. **Time tracking** — Hours logged against tasks
4. **Budget tracking** — Actual vs planned spend per project
5. **Unified milestone model** — Deprecate legacy flat events
6. **Automated health alerts** — Workflow on `project.health.updated` (at_risk)

---

## Appendix — File map

| Artifact | Path |
|----------|------|
| Types | `modules/project/types.ts` |
| Validation | `modules/project/validation.ts` |
| Module service | `lib/services/project-module.service.ts` |
| Routes | `app/api/projects/**` |
| Architecture doc | `docs/Architecture/PROJECT_MODULE.md` |
