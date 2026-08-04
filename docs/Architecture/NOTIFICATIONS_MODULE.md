# Notifications Module

**Document version:** 1.0.0  
**Date:** August 2, 2026  
**Status:** Implemented  
**Migration:** `034_notifications_module.sql`

---

## Overview

The Notifications Module exposes in-app notifications via REST with pagination, unread counts, mark-read actions, and per-user category preferences. Legacy `NotificationService` callers (workflows, assignment, project modules) delegate through the module service.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│  REST API  /api/notifications/*                           │
└───────────────────────────┬─────────────────────────────────┘
                            │
┌───────────────────────────▼─────────────────────────────────┐
│  NotificationModuleService                                  │
│  + legacy NotificationService (delegates)                   │
└───────────────────────────┬─────────────────────────────────┘
                            │
     notifications + notification_preferences
```

| Layer | Location |
|-------|----------|
| Types & validation | `modules/notifications/` |
| Repository | `lib/repositories/notification.repository.ts` |
| Module service | `lib/services/notification-module.service.ts` |
| REST routes | `app/api/notifications/` |
| UI | `app/(dashboard)/notifications/*`, header bell |

---

## REST Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/notifications` | List own notifications (`page`, `limit`, `unread_only`) |
| PATCH | `/api/notifications/{id}/read` | Mark single notification read |
| POST | `/api/notifications/read-all` | Mark all read |
| GET | `/api/notifications/preferences` | List category preferences |
| PATCH | `/api/notifications/preferences` | Update category toggles |

List responses include `meta.unreadCount`.

---

## Preferences

Categories: `opportunity`, `project`, `milestone`, `payment`, `system`  
Channels: `in_app` (default)

When a category is disabled, `NotificationModuleService.create()` skips the in-app row without failing the caller (workflow notify steps still succeed).

Default preferences are seeded on first access.

---

## UI

- `/notifications` — inbox with unread filter, mark read on click, load more, mark all read
- `/notifications/preferences` — category toggles
- Header bell — unread count badge via REST

---

## MCP

Notification MCP tools route through `NotificationModuleService` via `lib/mcp/adapters/notification.adapter.ts`.

---

## Related docs

- `docs/Architecture/specs/NOTIFICATIONS_SPEC.md`
- `docs/Architecture/API_SPECIFICATION.md` §13
- OpenAPI: `docs/openapi.yaml` — Notifications tag
