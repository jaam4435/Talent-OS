# Notifications — Implementation Specification

**Document version:** 1.0.0  
**Date:** August 2, 2026  
**Status:** Draft — awaiting approval  
**Bounded context:** Notifications (Supporting Subdomain)  
**References:** `DOMAIN_MODEL.md`, `CONTEXT_MAP.md`, `EVENT_CATALOG.md`, `UBIQUITOUS_LANGUAGE.md`

---

## 1. Business Overview

The Notifications context delivers **in-app notifications** to users triggered by domain services and workflow actions. It is a supporting subdomain with no independent business rules — notifications are side effects of business events.

**Primary actors:** All authenticated users (recipients), platform (creators via services/workflows)  
**Business outcome:** Timely in-app alerts for assignments, milestones, conflicts, opportunities, and workflow steps.

---

## 2. Responsibilities

### In scope

- Create notification records per user
- List unread/read notifications for current user
- Mark notifications as read (single or bulk)
- Notification metadata (entity link, action type, message)
- Instrumentation metrics via `instrumentNotification()`

### Out of scope

- Email delivery (via n8n workflows — not direct SMTP)
- Push notifications (mobile — future)
- WhatsApp outbound (WhatsApp BC via n8n)
- Notification preferences/settings — ✅ `notification_preferences` table + REST
- Template management (workflow BC / n8n)

---

## 3. Public APIs

**Current:** `/api/notifications/*` REST module (Sprint 18). Workflow `notify` action unchanged.

| Method | Path | Permission | Description |
|--------|------|------------|-------------|
| GET | `/api/notifications` | Authenticated | List own notifications |
| PATCH | `/api/notifications/{id}/read` | Authenticated | Mark read |
| POST | `/api/notifications/read-all` | Authenticated | Mark all read |
| GET/PATCH | `/api/notifications/preferences` | Authenticated | Category preferences |

**MCP:** `lib/mcp/servers/notification.server.ts` — agent create notification

**Workflow action:** `notify` step in Workflow BC

---

## 4. Internal Services

| Service | Path | Role |
|---------|------|------|
| **NotificationService** | `lib/services/notification.service.ts` | Legacy facade — delegates to module service |
| **NotificationModuleService** | `lib/services/notification-module.service.ts` | REST, preferences, instrumentation |

**Repositories:** `NotificationRepository` (notifications + preferences)

**Callers:** ProjectModuleService, AssignmentModuleService, WorkflowEngine actions, WhatsAppPlatformModuleService

---

## 5. Database Schema

**Migration:** `001_initial_schema.sql` (notifications table)

| Table | Purpose |
|-------|---------|
| `notifications` | Per-user notification records |

**Key columns:** `user_id`, `tenant_id`, `title`, `body`, `entity_type`, `entity_id`, `action`, `read_at`, `created_at`

**RLS:** Users read/update own notifications only.

---

## 6. Aggregates

| Aggregate | Root table | Invariants |
|-----------|------------|------------|
| **Notification** | `notifications` | Belongs to user; `read_at` null = unread |

**Consistency:** Single-row insert per notification. No cross-notification transactions.

---

## 7. Domain Events

**None emitted directly** by Notifications context.

**Consumed via:**

| Source | Mechanism |
|--------|-----------|
| Workflow BC | `notify` action step |
| Domain services | Direct `NotificationService.create()` call |
| WhatsApp BC | `notification.send` intent |

**Future:** `notification.created`, `notification.read` namespaced events for analytics.

---

## 8. Commands

| Command | Handler | Trigger |
|---------|---------|---------|
| CreateNotification | `NotificationService.create()` | Service/workflow caller |
| MarkRead | `NotificationService.markRead()` | User action |
| MarkAllRead | `NotificationService.markAllRead()` | User action |
| SendViaWorkflow | Workflow `notify` action | Workflow job execution |
| SendViaWhatsApp | WhatsApp handler | `notification.send` intent |

---

## 9. Queries

| Query | Returns |
|-------|---------|
| ListNotifications | Paginated user notifications (unread first) |
| GetUnreadCount | Count of unread notifications |
| ListByEntity | Notifications linked to entity_type/entity_id |

---

## 10. Validation Rules

| Rule | Field | Constraint |
|------|-------|------------|
| Title | `title` | 1–200 chars |
| Body | `body` | Max 2000 chars |
| User ID | `user_id` | Valid UUID; must be tenant member |
| Entity link | `entity_type`, `entity_id` | Optional; valid when present |

**Business rules:**

- Users can only mark their own notifications read
- Notifications are immutable after creation (no edit/delete by user)

---

## 11. Authorization Rules

| Scope | Rule |
|-------|------|
| Read | Authenticated user; own notifications only (RLS) |
| Mark read | Authenticated user; own notifications only |
| Create | System services and managers via service layer (not direct user API) |

**No dedicated permission strings** — scoped by RLS to `user_id = auth.uid()`.

---

## 12. AI Capabilities

| Feature | Trigger | Output |
|---------|---------|--------|
| **MCP notification tools** | Agent invocation | Create notification for user |
| **Agent notification** | Workflow notify step | Message composed by workflow config |

**Current:** Agents can create notifications via MCP; no AI-generated notification content pipeline.

---

## 13. Background Jobs

| Job | Trigger | Action |
|-----|---------|--------|
| Workflow notify step | Job execution | Insert notification row |
| Email delivery | n8n workflow | External — not in-app BC |

**Future:** Notification digest cron (daily summary); stale notification cleanup.

---

## 14. Integrations

| System | Direction | Purpose |
|--------|-----------|---------|
| **Workflow BC** | Inbound | `notify` action creates notifications |
| **Project BC** | Inbound | Project creation notifies freelancer |
| **Assignment BC** | Inbound | Conflict alerts notify creator |
| **WhatsApp BC** | Inbound | `notification.send` command |
| **n8n** | Outbound (via workflow) | Email delivery parallel to in-app |
| **MCP agents** | Inbound | Agent-created notifications |

---

## 15. Observability

| Signal | Source |
|--------|--------|
| Instrumentation | `instrumentNotification()` — create latency, volume |
| Unread counts | Query aggregation (future dashboard) |

**Alerts (future):** Notification creation failure rate.

---

## 16. Testing Strategy

| Test | Focus |
|------|-------|
| Unit | NotificationService create/mark read |
| Integration | RLS — user cannot read others' notifications |
| Integration | Workflow notify action → notification row |
| Integration | Assignment conflict → creator notification |
| E2E | Project create → freelancer receives notification |

**Coverage target:** 80% on NotificationService.

---

## 17. Migration Strategy

| Migration | Content |
|-----------|---------|
| `001_initial_schema.sql` | notifications table |
| Future | Notification preferences table; REST API module |

**No breaking changes planned.**

---

## 18. Future Enhancements

1. **Notification preferences** — Per-user channel and category toggles
2. **REST module API** — Dedicated `/api/notifications/*` routes
3. **Push notifications** — Mobile/web push via FCM
4. **Notification templates** — Reusable message templates
5. **Digest mode** — Batched daily/weekly summaries
6. **Namespaced events** — `notification.created` for analytics tracking

---

## Appendix — File map

| Artifact | Path |
|----------|------|
| Service | `lib/services/notification.service.ts` |
| Repository | `lib/repositories/notification.repository.ts` |
| MCP server | `lib/mcp/servers/notification.server.ts` |
| Workflow action | `lib/workflows/actions.ts` (notify step) |
