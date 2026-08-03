# Analytics Module

**Document version:** 1.0.0  
**Date:** August 2, 2026  
**Status:** Implemented  
**Migration:** `031_analytics_module.sql`

---

## Overview

The Analytics Module provides manager-facing dashboards with charts, aggregations, caching, and exports across eight business domains. It extends the existing `AnalyticsService` and `v_dashboard_summary` view (migration `004_views_analytics.sql`) without duplicating data access logic.

### Dashboards

| Dashboard | Endpoint | Key metrics |
|-----------|----------|-------------|
| **Organizations** | `GET /api/analytics/organizations` | Members, invites, departments, teams |
| **Projects** | `GET /api/analytics/projects` | Status, health, creation trends |
| **Talent** | `GET /api/analytics/talent` | Discipline, availability, ratings |
| **Utilization** | `GET /api/analytics/utilization` | Allocations, capacity, conflicts |
| **Revenue** | `GET /api/analytics/revenue` | Paid/pending totals, aging, trends |
| **Delivery** | `GET /api/analytics/delivery` | Deliverables, milestones, submissions |
| **AI Usage** | `GET /api/analytics/ai-usage` | Requests, tokens, cost by feature |
| **Workflow Performance** | `GET /api/analytics/workflows` | Runs, failures, duration, top workflows |

Combined overview: `GET /api/analytics/summary`  
Legacy KPIs (backward compatible): `GET /api/analytics/dashboard`

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│  REST API  /api/analytics/*                                 │
└───────────────────────────┬─────────────────────────────────┘
                            │
┌───────────────────────────▼─────────────────────────────────┐
│  AnalyticsModuleService                                       │
│  + AnalyticsService (legacy dashboard)                        │
└───────────────────────────┬─────────────────────────────────┘
                            │
     AnalyticsModuleRepository → SECURITY DEFINER RPCs (031)
                            │
     In-process cache (BaseRepository.withCache)
     Optional analytics_cache_snapshots table
     analytics_exports for CSV/JSON downloads
```

| Layer | Location |
|-------|----------|
| Types & validation | `modules/analytics/` |
| Chart formatting | `modules/analytics/charts.ts` |
| Repositories | `lib/repositories/analytics-module.repository.ts` |
| Module service | `lib/services/analytics-module.service.ts` |
| Legacy service | `lib/services/analytics.service.ts` |
| SQL aggregations | `supabase/migrations/031_analytics_module.sql` |
| Legacy views | `supabase/migrations/004_views_analytics.sql` |
| REST routes | `app/api/analytics/` |

---

## Charts & Aggregations

Each dashboard RPC returns a JSON payload:

```json
{
  "summary": { "total": 42, "active": 12 },
  "charts": {
    "by_status": [{ "label": "active", "value": 12 }],
    "created_over_time": [{ "x": "2026-07-01", "y": 5 }]
  }
}
```

Chart types used across dashboards:

| Chart key | Type | Dashboards |
|-----------|------|------------|
| `*_by_status` | Pie/bar | Projects, Utilization, Delivery, Workflows |
| `*_over_time` | Line | Projects, Revenue, AI Usage, Workflows |
| `by_discipline` | Bar | Talent |
| `top_utilized` | Bar | Utilization |
| `aging` | Bar | Revenue |
| `cost_by_provider` | Pie | AI Usage |

The `modules/analytics/charts.ts` module normalizes RPC output and converts dashboards to CSV/JSON for exports.

---

## Caching

Two-layer caching strategy:

1. **In-process / Redis cache** — `BaseRepository.withCache()` with per-dashboard TTLs:

| Dashboard | TTL |
|-----------|-----|
| Summary | 60s |
| Organizations, Projects, Talent, Delivery, AI Usage, Workflows | 120s |
| Utilization, Revenue | 180s |

2. **Optional DB snapshots** — `analytics_cache_snapshots` table with cron refresh:

| Mechanism | Detail |
|-----------|--------|
| SQL function | `refresh_analytics_tenant_snapshots(tenant_id, ttl_minutes)` |
| Cron | `GET /api/cron/analytics-snapshot` every 15 minutes (Vercel) |
| Read path | Repository checks persisted snapshot before in-process cache / RPC |
| Slow query log | RPCs exceeding 500ms log `[analytics] slow RPC` |

Pass `?refresh=true` on any dashboard endpoint to invalidate tenant cache before fetching.

Response includes cache metadata:

```json
{
  "summary": { ... },
  "charts": { ... },
  "cachedAt": "2026-08-02T11:00:00.000Z",
  "cacheTtlMs": 120000
}
```

---

## Exports

| Method | Path | Permission | Description |
|--------|------|------------|-------------|
| POST | `/api/analytics/exports` | `analytics:export` | Generate CSV or JSON export |
| GET | `/api/analytics/exports` | `analytics:export` | List export history |
| GET | `/api/analytics/exports/{id}` | `analytics:export` | Download export content |

Export request example:

```json
POST /api/analytics/exports
{
  "dashboard": "revenue",
  "format": "csv",
  "period": "90d"
}
```

Exports are stored in `analytics_exports` with 7-day expiry. CSV format includes summary metrics plus all chart series.

---

## Permissions

| Permission | Roles | Scope |
|------------|-------|-------|
| `analytics:read` | admin, talent_manager | View all dashboards |
| `analytics:export` | admin, talent_manager | Create and download exports |

All endpoints require `auth: 'manager'`. Freelancers and clients cannot access analytics APIs.

RPCs enforce `is_manager_of(p_tenant_id)` at the database layer.

---

## Date Ranges

Query parameters on time-series dashboards:

| Param | Description |
|-------|-------------|
| `period` | `7d`, `30d` (default), `90d`, `ytd` |
| `from` | ISO 8601 start (overrides period) |
| `to` | ISO 8601 end |
| `refresh` | `true` to bypass cache |

---

## REST API Reference

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/analytics/dashboard` | Legacy + module summary |
| GET | `/api/analytics/summary` | All dashboard summaries |
| GET | `/api/analytics/organizations` | Organization dashboard |
| GET | `/api/analytics/projects` | Project dashboard |
| GET | `/api/analytics/talent` | Talent dashboard |
| GET | `/api/analytics/utilization` | Utilization dashboard |
| GET | `/api/analytics/revenue` | Revenue dashboard |
| GET | `/api/analytics/delivery` | Delivery dashboard |
| GET | `/api/analytics/ai-usage` | AI usage dashboard |
| GET | `/api/analytics/workflows` | Workflow performance dashboard |
| POST | `/api/analytics/exports` | Create export |
| GET | `/api/analytics/exports` | List exports |
| GET | `/api/analytics/exports/{id}` | Get export |

---

## Database

| Object | Purpose |
|--------|---------|
| `analytics_exports` | Export history and downloadable content |
| `analytics_cache_snapshots` | Optional persisted cache |
| `get_analytics_*` RPCs | Tenant-scoped aggregations with RLS |
| `get_analytics_module_summary` | Combined overview RPC |
| `v_dashboard_summary` | Legacy KPI view (004) |
| `v_freelancer_utilization` | Legacy utilization view (004) |
| `v_payment_aging` | Legacy payment aging (004) |

---

## MCP Integration

Existing MCP analytics tools (`lib/mcp/servers/analytics.server.ts`) map to module dashboards:

| MCP Tool | Module Dashboard |
|----------|------------------|
| `analytics_dashboard_summary` | Summary + legacy |
| `analytics_fill_rate` | Projects (opportunity metrics) |
| `analytics_talent_utilization` | Utilization |
| `analytics_payment_aging` | Revenue |
| `analytics_ai_usage` | AI Usage |
| `analytics_pipeline_health` | Delivery |

---

## Testing

Unit tests: `tests/unit/analytics-module.service.test.ts`

Coverage:
- Dashboard domain catalog
- Cache invalidation on refresh
- CSV export generation
- Chart normalization
- Permission checks

Run: `npm test -- tests/unit/analytics-module.service.test.ts`

---

## Related Documentation

- Legacy views: `supabase/migrations/004_views_analytics.sql`
- API architecture: `docs/05-api-architecture.md`
- MCP tools: `docs/28-mcp-architecture.md`
- Observability (distinct from analytics): `docs/Platform/ENTERPRISE_HARDENING.md`

---

## Backward Compatibility

- `AnalyticsService` unchanged for team roster and client/freelancer context helpers
- `GET /api/analytics/dashboard` returns both legacy summary and module overview
- `get_dashboard_summary` RPC (020) still powers legacy KPIs
- Existing MCP tool definitions remain valid
