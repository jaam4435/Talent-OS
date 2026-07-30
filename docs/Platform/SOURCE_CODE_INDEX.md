# Source Code Index — Gap Verification Checklist

Use with [GAP_ANALYSIS_STUDY_PACK.md](./GAP_ANALYSIS_STUDY_PACK.md) Tier 4.

Repository root: `/workspace` (or your local clone root).

## Critical — Fix Before Production

- [ ] `modules/core/api/handler.ts` — B-001 build blocker
- [ ] `package.json` — no test script
- [ ] `.github/workflows/` — **directory missing** (CI)
- [ ] `lib/mcp/gateway.ts` — MCP stubs block agents
- [ ] `app/api/analytics/dashboard/route.ts` — auth gap
- [ ] `app/api/webhooks/whatsapp/route.ts` — HMAC + rate limit + batch bug
- [ ] `app/api/webhooks/n8n/route.ts` — HMAC + idempotency
- [ ] `lib/repositories/domain-event.repository.ts` — silent failures
- [ ] `supabase/migrations/004_views_analytics.sql` — SEC-001
- [ ] `supabase/migrations/019_platform_observability.sql` — SEC-002

## Platform Core

```
modules/core/api/
  handler.ts          ← withApiHandler (build issue)
  auth.ts             ← auth modes
  rate-limit.ts       ← in-memory limits
  idempotency.ts      ← in-memory store
  error-mapper.ts
  validation.ts
  response.ts
  action-adapter.ts   ← server actions bridge

modules/core/services/
  permissions.ts      ← RBAC matrix
  session.ts          ← tenant resolution

modules/core/utils/
  constants.ts        ← route guards, API_PUBLIC_ROUTES
  supabase/middleware.ts
  supabase/admin.ts   ← service role client

middleware.ts         ← edge auth + RBAC
```

## Services & Repositories

```
lib/services/
  factory.ts          ← DI composition
  agent.service.ts    ← agent runs
  whatsapp.service.ts ← WA pipeline + agent bypass
  observability.service.ts
  integration.service.ts ← webhook idempotency
  knowledge.service.ts  ← embedding stubs

lib/repositories/
  domain-event.repository.ts
  dashboard.repository.ts
  base/cache.ts       ← in-memory cache
  observability.repository.ts
```

## AI / Agents / MCP

```
lib/ai/
  gateway.ts
  config.ts
  agent/
    registry.ts
    reasoning.ts      ← tool-use loop
    executor.ts
    tool-filter.ts
  streaming/handler.ts ← unused

lib/mcp/
  gateway.ts          ← **stubs**
  types.ts
  interfaces.ts
  servers/            ← 10 servers, schemas only

lib/integrations/ai/
  openai.ts
  matching.ts
  executor.ts
  openai-client.ts    ← deprecated
```

## API Routes (24 total)

```
app/api/
  health/route.ts
  openapi/route.ts
  analytics/dashboard/route.ts     ← SEC-003
  ai/match/route.ts
  ai/match/[opportunityId]/route.ts ← build fail
  ai/pm/[entityType]/[entityId]/route.ts
  webhooks/whatsapp/route.ts       ← bypasses handler
  webhooks/n8n/route.ts
  cron/dispatch-events/route.ts
  cron/process-workflow-jobs/route.ts
  cron/evaluate-alerts/route.ts
  cron/check-overdue-milestones/route.ts
  observability/dashboard/route.ts
  observability/alerts/route.ts
  observability/logs/route.ts
  observability/traces/[correlationId]/route.ts
  internal/ai/execute/route.ts
  internal/ai/execute-match/route.ts
  auth/callback/route.ts
  auth/signout/route.ts
  auth/session/route.ts
  auth/invite/[token]/route.ts
  talent/search/route.ts
  team/members/route.ts
```

## WhatsApp

```
lib/whatsapp/
  parser.ts
  intents.ts
  intents-legacy.ts   ← remove if unused
  handlers.ts

lib/integrations/
  whatsapp.ts         ← deprecated
  encryption.ts       ← HMAC helpers
  n8n.ts              ← outbound dispatch
```

## Observability

```
lib/observability/
  instrumentation.ts  ← unused workflow/notification hooks
  collector.ts
  logger.ts
  metrics.ts
  tracing.ts
  alerts.ts
```

## Workflows

```
lib/workflows/
  engine.ts           ← no instrumentation wired

app/actions/          ← 13 modules, no rate limits
  agents.ts           ← revalidates missing page
  (no payments.ts)    ← UI-001
```

## Config

```
vercel.json
.env.local.example
supabase/config.toml
scripts/push-supabase-schema.sh
docs/openapi.yaml
```
