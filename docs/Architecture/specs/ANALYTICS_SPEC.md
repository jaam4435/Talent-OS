# Analytics & Reporting — Implementation Specification

**Document version:** 1.0.0  
**Date:** August 2, 2026  
**Status:** Draft — awaiting approval  
**Bounded context:** Analytics & Reporting  
**References:** `DOMAIN_MODEL.md`, `CONTEXT_MAP.md`, `EVENT_CATALOG.md`, `UBIQUITOUS_LANGUAGE.md`

---

## 1. Business Overview

The Analytics & Reporting context provides **read-only cross-context reporting** for managers: 8 dashboards, chart aggregations, caching, and CSV/JSON exports. No domain mutations occur in this context.

**Primary actors:** Organization admin, talent manager  
**Business outcome:** Unified operational visibility across organization, projects, talent, utilization, revenue, delivery, AI usage, and workflow performance.

---

## 2. Responsibilities

### In scope

- 8 domain dashboards with summary metrics and charts
- Combined overview (`/api/analytics/summary`)
- Legacy KPI dashboard (backward compatible)
- In-process caching with per-dashboard TTL
- CSV/JSON export generation with expiry
- SECURITY DEFINER RPC aggregations
- Permission-gated read access

### Out of scope

- Domain entity mutations (all owning contexts)
- Real-time streaming analytics
- Custom report builder (future)
- Data warehouse / ETL pipeline

---

## 3. Public APIs

Base path: `/api/analytics`

| Method | Path | Permission | Description |
|--------|------|------------|-------------|
| GET | `/api/analytics/summary` | `analytics:read` | Combined overview |
| GET | `/api/analytics/dashboard` | `analytics:read` | Legacy KPIs (backward compatible) |
| GET | `/api/analytics/organizations` | `analytics:read` | Org dashboard |
| GET | `/api/analytics/projects` | `analytics:read` | Projects dashboard |
| GET | `/api/analytics/talent` | `analytics:read` | Talent dashboard |
| GET | `/api/analytics/utilization` | `analytics:read` | Utilization dashboard |
| GET | `/api/analytics/revenue` | `analytics:read` | Revenue dashboard |
| GET | `/api/analytics/delivery` | `analytics:read` | Delivery dashboard |
| GET | `/api/analytics/ai-usage` | `analytics:read` | AI Usage dashboard |
| GET | `/api/analytics/workflows` | `analytics:read` | Workflow Performance dashboard |
| POST | `/api/analytics/exports` | `analytics:export` | Generate export |
| GET | `/api/analytics/exports` | `analytics:export` | List exports |
| GET | `/api/analytics/exports/{id}` | `analytics:export` | Download export |

**Query params:** `?period=30d|90d|365d`, `?refresh=true` (cache invalidation)

---

## 4. Internal Services

| Service | Path | Role |
|---------|------|------|
| **AnalyticsModuleService** | `lib/services/analytics-module.service.ts` | Dashboard orchestration, cache, exports |
| **AnalyticsService** | `lib/services/analytics.service.ts` | Legacy dashboard context, team page |

**Module layer:** `modules/analytics/` — types, validation, chart formatting (`charts.ts`)

**Repositories:** `AnalyticsModuleRepository`, `AnalyticsExportRepository`, `DashboardRepository` (legacy `v_dashboard_summary`)

---

## 5. Database Schema

**Migration:** `031_analytics_module.sql`  
**Legacy:** `004_views_analytics.sql` (`v_dashboard_summary`, `v_freelancer_utilization`, etc.)

| Table / Object | Purpose |
|----------------|---------|
| `analytics_exports` | Export job with content + expiry |
| `analytics_cache_snapshots` | Optional persisted cache (schema ready) |
| `get_analytics_*` RPCs | SECURITY DEFINER aggregation functions (8 dashboards) |
| Legacy views | `v_dashboard_summary`, utilization views |

**RLS:** RPCs enforce `is_manager_of(tenant_id)` internally.

---

## 6. Aggregates

| Aggregate | Root table | Invariants |
|-----------|------------|------------|
| **AnalyticsExport** | `analytics_exports` | Status: pending → completed/expired; 7-day expiry |

**Supporting entity:** `AnalyticsCacheSnapshot` — optional persisted cache (not transactional aggregate).

**Read-only context:** No mutation aggregates beyond export jobs.

---

## 7. Domain Events

**None emitted.** Analytics is a read-only context.

**Consumed indirectly:** Dashboard data reflects domain events from other contexts (no event subscription).

---

## 8. Commands

| Command | Handler | Side effect |
|---------|---------|-------------|
| GetDashboard | `getDashboard(dashboardId)` | Cache read/write |
| GetSummary | `getSummary()` | Aggregates all dashboards |
| CreateExport | `createExport()` | Inserts `analytics_exports` row |
| InvalidateCache | `?refresh=true` param | Clears tenant cache key |

---

## 9. Queries

| Query | RPC / Source | Returns |
|-------|--------------|---------|
| GetOrganizationsDashboard | `get_analytics_organizations` | Members, invites, departments, teams |
| GetProjectsDashboard | `get_analytics_projects` | Status, health, creation trends |
| GetTalentDashboard | `get_analytics_talent` | Discipline, availability, ratings |
| GetUtilizationDashboard | `get_analytics_utilization` | Allocations, capacity, conflicts |
| GetRevenueDashboard | `get_analytics_revenue` | Paid/pending totals, aging |
| GetDeliveryDashboard | `get_analytics_delivery` | Deliverables, milestones |
| GetAiUsageDashboard | `get_analytics_ai_usage` | Requests, tokens, cost |
| GetWorkflowsDashboard | `get_analytics_workflows` | Runs, failures, duration |
| GetLegacyDashboard | `v_dashboard_summary` | Backward compatible KPIs |
| ListExports | `analytics_exports` table | Export history |
| DownloadExport | `analytics_exports.content` | CSV or JSON payload |

---

## 10. Validation Rules

**Source:** `modules/analytics/validation.ts`

| Rule | Field | Constraint |
|------|-------|------------|
| Dashboard ID | `dashboard` | Valid enum (8 dashboards + summary) |
| Period | `period` | 30d, 90d, 365d |
| Export format | `format` | csv or json |
| Refresh flag | `refresh` | Boolean query param |

**Business rules:**

- Manager-only access enforced at API and RPC level
- Export content expires after 7 days
- Cache TTL varies by dashboard (60–180s)

---

## 11. Authorization Rules

| Permission | Roles | Operations |
|------------|-------|------------|
| `analytics:read` | admin, talent_manager | View all dashboards |
| `analytics:export` | admin, talent_manager | Create and download exports |

**RLS:** SECURITY DEFINER RPCs call `is_manager_of(tenant_id)`. Freelancers and clients have no analytics access.

---

## 12. AI Capabilities

**Current:** None native. AI Usage dashboard reports on AI Gateway ledger (`ai_requests`).

**MCP:** Analytics read tools via `lib/mcp/servers/analytics.server.ts` for executive agent.

**Future:** Natural language query → dashboard parameter generation.

---

## 13. Background Jobs

| Job | Trigger | Action |
|-----|---------|--------|
| Export expiry | Future cron | Mark expired exports |
| Cache snapshot | Future | Persist `analytics_cache_snapshots` |

**Current:** Cache is in-process via `BaseRepository.withCache()`; no dedicated cron.

---

## 14. Integrations

| System | Direction | Purpose |
|--------|-----------|---------|
| **All business BCs** | Read-only | Source tables for aggregations |
| **Supabase RPCs** | Internal | SECURITY DEFINER aggregations |
| **Legacy views** | Internal | Backward compatible dashboard |
| **Redis (optional)** | Cache layer | Distributed cache (via BaseRepository) |
| **MCP agents** | Outbound | Executive agent dashboard reads |

---

## 15. Observability

| Signal | Source |
|--------|--------|
| Cache metadata | Response `cachedAt`, `cacheTtlMs` |
| Export audit | `analytics_exports` — created_at, format, dashboard |
| API instrumentation | `instrumentApiRequest()` on routes |
| RPC performance | Query duration logged (future) |

**Alerts (future):** RPC timeout; cache miss rate threshold.

---

## 16. Testing Strategy

| Test | Focus |
|------|-------|
| Unit | Chart formatting (`charts.ts`) |
| Unit | CSV export generation |
| Integration | Permission matrix (401 without session) |
| Integration | Cache invalidation with `?refresh=true` |
| Integration | Export create → download lifecycle |
| E2E | Dashboard load with period filter |

**Coverage target:** 80% on `AnalyticsModuleService` and chart utilities.

---

## 17. Migration Strategy

| Migration | Content |
|-----------|---------|
| `031_analytics_module.sql` | RPCs, exports, cache snapshots |
| `004_views_analytics.sql` | Legacy views (preserved) |
| Future | Materialized views for heavy aggregations |

**Data migration:** No breaking changes; legacy `/api/analytics/dashboard` preserved.

---

## 18. Future Enhancements

1. **Custom report builder** — User-defined metrics and filters
2. **Scheduled exports** — Email delivery of weekly reports
3. **Materialized views** — Pre-computed aggregations for scale
4. **Real-time dashboards** — WebSocket push for live metrics
5. **Client-facing analytics** — Read-only project dashboards for clients
6. **Benchmark comparisons** — Cross-tenant anonymized benchmarks (marketplace)

---

## Appendix — File map

| Artifact | Path |
|----------|------|
| Types | `modules/analytics/types.ts` |
| Charts | `modules/analytics/charts.ts` |
| Validation | `modules/analytics/validation.ts` |
| Module service | `lib/services/analytics-module.service.ts` |
| Repository | `lib/repositories/analytics-module.repository.ts` |
| Routes | `app/api/analytics/**` |
| Architecture doc | `docs/Architecture/ANALYTICS_MODULE.md` |
