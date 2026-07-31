# Platform Observability Architecture

End-to-end observability for Talent OS covering metrics, tracing, structured logs, AI costs, workflow health, queue depth, notification delivery, latency, failures, dashboards, and alerts.

## Pillars

| Pillar | Storage | Collection | Query |
|--------|---------|------------|-------|
| **Logs** | `platform_log_entries` | `platformLogger` | `GET /api/observability/logs` |
| **Metrics** | `platform_metric_points` | `recordMetric()` / instrumentation | Dashboard aggregates |
| **Tracing** | `platform_trace_spans` | `startTrace()` / API handler | `GET /api/observability/traces/:correlationId` |
| **AI Costs** | `ai_requests` + `v_ai_usage` | AI Gateway token logger | Dashboard `aiCosts` |
| **Workflow** | `workflow_runs` + view | Workflow engine | Dashboard `workflow` |
| **Queues** | `domain_events`, `workflow_jobs` + views | Cron instrumentation | Dashboard `queues` |
| **Notifications** | `notifications`, `email_logs`, `whatsapp_messages` | Notification actions | Dashboard `notifications` |
| **Latency** | `platform_metric_points`, `ai_requests` | API + AI instrumentation | Dashboard `latency` |
| **Failures** | Multiple sources + view | Error logging | Dashboard `failures` |
| **Alerts** | `platform_alerts` | Cron evaluator | `GET /api/observability/alerts` |

## Architecture

```
Request / Cron / AI Gateway / Workflow
         │
         ▼
┌─────────────────────────────────────────┐
│  lib/observability/                      │
│  logger · metrics · tracing · collector  │
│  instrumentation · alerts                │
└─────────────────┬───────────────────────┘
                  │ async flush
                  ▼
┌─────────────────────────────────────────┐
│  platform_log_entries                    │
│  platform_metric_points                  │
│  platform_trace_spans                    │
│  platform_alerts                         │
└─────────────────┬───────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────┐
│  ObservabilityService.getDashboard()     │
│  SQL views (workflow, queue, AI, etc.)   │
└─────────────────────────────────────────┘
```

## Code Layout

```
lib/observability/
  types.ts           — Domain types
  context.ts         — Trace/request context propagation
  logger.ts          — Structured JSON logging
  metrics.ts         — Metric names + record helpers
  tracing.ts         — Span start/end
  collector.ts       — Async buffer → DB flush
  instrumentation.ts — API, AI, workflow, queue hooks
  alerts.ts          — Alert rule definitions

lib/repositories/observability.repository.ts
lib/services/observability.service.ts

app/api/observability/
  dashboard/route.ts
  alerts/route.ts
  logs/route.ts
  traces/[correlationId]/route.ts

app/api/cron/evaluate-alerts/route.ts
```

## Structured Logging

All logs emit JSON to stdout and persist to `platform_log_entries`:

```typescript
import { platformLogger } from '@/lib/observability'

platformLogger.info('Operation completed', 'workflow', { runId }, { tenantId })
platformLogger.error('Dispatch failed', 'queue', { eventId }, { tenantId }, 'DISPATCH_FAILED')
```

Fields: `level`, `message`, `category`, `correlationId`, `requestId`, `traceId`, `metadata`.

## Metrics

Standard metric names in `MetricNames`:

| Metric | Type | Description |
|--------|------|-------------|
| `api.request.duration_ms` | histogram | HTTP request latency |
| `api.request.total` | counter | Request count |
| `api.request.errors` | counter | Failed requests |
| `ai.request.duration_ms` | histogram | AI call latency |
| `ai.request.cost_usd` | histogram | Estimated AI cost |
| `ai.request.errors` | counter | Failed AI requests |
| `workflow.run.duration_ms` | histogram | Workflow run duration |
| `workflow.run.failures` | counter | Failed workflow runs |
| `queue.depth` | gauge | Queue backlog |
| `queue.processed` | counter | Items processed by cron |
| `notification.sent` | counter | Notifications sent |
| `notification.failed` | counter | Notification failures |
| `cron.run.duration_ms` | histogram | Cron job duration |

## Tracing

Every API request gets a `traceId` and `spanId` via `withApiHandler`. Spans are persisted to `platform_trace_spans` and linked by `correlation_id`.

```typescript
import { withTrace } from '@/lib/observability'

await withTrace('workflow.dispatch', async () => {
  // ...
}, { tenantId, correlationId })
```

## AI Cost Tracking

- **Gateway success path**: logs tokens, cost, latency to `ai_requests`
- **Gateway failure path**: logs failed status with error message
- **Dashboard**: monthly total, utilization %, breakdown by request type, P95 latency
- **Alert**: fires at 80% of tenant monthly AI limit

## Workflow & Queue Metrics

SQL views aggregate operational health:

| View | Purpose |
|------|---------|
| `v_observability_workflow_health` | Running/completed/failed runs, avg duration |
| `v_observability_queue_depth` | Pending items by queue and status |
| `v_event_pipeline_health` | 24h event pipeline (existing) |
| `v_observability_ai_latency` | AI P95 latency and cost by type |
| `v_observability_notification_delivery` | Channel delivery rates |
| `v_observability_failures_24h` | Failures across events, workflows, AI |

Cron jobs instrument queue processing:

- `/api/cron/dispatch-events` — domain event outbox
- `/api/cron/process-workflow-jobs` — workflow job queue
- `/api/cron/evaluate-alerts` — alert evaluation (every 5 min)

## Alert Rules

| Rule ID | Severity | Threshold | Condition |
|---------|----------|-----------|-----------|
| `outbox_pending_high` | warning | 100 | Pending domain events |
| `dead_letter_threshold` | critical | 10 | Dead letter events |
| `workflow_failures_spike` | warning | 5 | Failed runs in 24h |
| `ai_cost_budget` | warning | 80% | AI spend vs monthly limit |
| `queue_stale` | critical | 30 min | Oldest pending event age |
| `ai_failures_spike` | warning | 10 | Failed AI requests in 24h |

Alerts deduplicate while status is `open`. Lifecycle: `open` → `acknowledged` → `resolved`.

## Dashboard API

```typescript
GET /api/observability/dashboard
// Returns: aiCosts, workflow, queues, notifications, latency, failures, alerts, traces, logs
```

Manager-only. Uses existing session auth.

## Other APIs

| Endpoint | Purpose |
|----------|---------|
| `GET /api/observability/alerts?status=open` | List alerts |
| `GET /api/observability/logs?level=error&category=api` | Structured logs |
| `GET /api/observability/traces/:correlationId` | Trace spans by correlation |

## Instrumentation Points

| Component | What's recorded |
|-----------|-----------------|
| `withApiHandler` | Latency, status, errors, trace IDs |
| `AiGateway.execute` | Success + failure costs, latency |
| Cron dispatch/process | Queue processed/failed counts |
| Alert evaluator | Alert firing events |

## Migration

`supabase/migrations/019_platform_observability.sql` — tables, views, RLS.

## Environment

No additional env vars required. Uses existing Supabase connection and cron auth (`CRON_SECRET`).

## Future Extensions

- OpenTelemetry export adapter
- Prometheus `/metrics` endpoint
- Slack/webhook alert delivery
- Grafana dashboard templates
- Real-time alert streaming via Supabase Realtime
