# Engineering Gaps — Resolution Tracker

**Companion to:** [CRITICAL_ANALYSIS_POST_HARDENING.md](./CRITICAL_ANALYSIS_POST_HARDENING.md)  
**Last updated:** July 31, 2026 (post-hardening)

Legend: **RESOLVED** | **PARTIAL** | **OPEN**

---

## Sprint 0 — Unblock deploy

| ID | Item | Status | Evidence |
|----|------|:------:|----------|
| B-001 | Build failure (RouteContext) | **RESOLVED** | `modules/core/api/handler.ts` |
| B-003 | Production env validation | **RESOLVED** | `lib/env.ts` |
| TST-003 | CI pipeline | **RESOLVED** | `.github/workflows/ci.yml` |
| — | Merge to main | **OPEN** | PR #41 pending |

## Security gaps

| ID | Item | Status | Evidence |
|----|------|:------:|----------|
| SEC-001 | Analytics views cross-tenant | **RESOLVED** | Migration 020 |
| SEC-002 | Observability views cross-tenant | **RESOLVED** | Migration 020 RPCs |
| SEC-003 | Analytics API auth | **RESOLVED** | `analytics/dashboard/route.ts` |
| SEC-004 | Webhook HMAC optional | **RESOLVED** | `lib/env.ts`, webhooks |
| SEC-005 | HMAC not timing-safe | **RESOLVED** | `encryption.ts` |
| SEC-007 | Middleware fail open | **RESOLVED** | `middleware.ts` |
| SEC-009 | No MFA/SSO | **OPEN** | — |
| SEC-010 | No CI security scanning | **OPEN** | — |
| SEC-011 | shortlists DELETE policy | **RESOLVED** | Migration 020 |
| SEC-012 | SECURITY.md | **RESOLVED** | `SECURITY.md` |

## API platform gaps

| ID | Item | Status | Evidence |
|----|------|:------:|----------|
| API-001 | Build failure | **RESOLVED** | handler.ts |
| API-002 | In-memory rate limits | **OPEN** | Needs Redis |
| API-003 | In-memory idempotency | **OPEN** | Needs Redis/DB |
| API-006 | Analytics auth | **RESOLVED** | route.ts |
| API-008 | n8n idempotency unstable | **PARTIAL** | Required in prod only |
| API-010 | Internal routes cron-only | **RESOLVED** | auth.ts cron check |

## Agent framework gaps

| ID | Item | Status |
|----|------|:------:|
| AF-001 | MCP tool-use broken | **OPEN** |
| AF-002 | No agent settings UI | **OPEN** |
| AF-003 | WhatsApp bypasses agent framework | **OPEN** |
| AF-007 | No agent observability | **OPEN** |

## MCP gaps

| ID | Item | Status |
|----|------|:------:|
| MCP-001 | All tool adapters stubs | **OPEN** |
| MCP-003 | No MCP transport | **OPEN** |
| MCP-006 | No MCP observability | **OPEN** |

## Observability gaps

| ID | Item | Status | Evidence |
|----|------|:------:|----------|
| OBS-001 | instrumentWorkflowRun unused | **RESOLVED** | `engine.ts` |
| OBS-002 | instrumentNotification unused | **RESOLVED** | `notification.service.ts` |
| OBS-003 | No observability UI | **OPEN** | — |
| OBS-004 | WhatsApp not instrumented | **RESOLVED** | webhook route |
| OBS-006 | Collector flush console only | **RESOLVED** | `collector.ts` |
| OBS-007 | No external exporters | **OPEN** | — |
| OBS-009 | Observability view grants | **RESOLVED** | Migration 020 |

## WhatsApp gaps

| ID | Item | Status | Evidence |
|----|------|:------:|----------|
| WA-002 | Bypasses withApiHandler | **PARTIAL** | Manual instrumentation added |
| WA-003 | HMAC skipped | **RESOLVED** | lib/env.ts |
| WA-004 | Duplicate early return | **RESOLVED** | continue fix |
| WA-005 | No rate limiting | **RESOLVED** | checkRateLimit added |
| WA-007 | Agent bypasses framework | **OPEN** | — |
| WA-012 | Missing phone index | **RESOLVED** | Migration 020 |

## Performance gaps

| ID | Item | Status | Evidence |
|----|------|:------:|----------|
| PERF-001 | Sequential cron dispatch | **RESOLVED** | Parallel batches of 5 |
| PERF-003 | Dashboard view subqueries | **OPEN** | — |
| PERF-006 | In-memory cache | **OPEN** | — |
| PERF-007 | Phone index | **RESOLVED** | Migration 020 |

## Database gaps

| ID | Item | Status | Evidence |
|----|------|:------:|----------|
| DB-001 | emit_domain_event grant | **RESOLVED** | Migration 020 |
| DB-002 | Silent emit failures | **RESOLVED** | domain-event.repository.ts |
| DB-003 | No pgvector | **OPEN** | — |
| DB-009 | PG version doc drift | **RESOLVED** | README |

## Testing gaps

| ID | Item | Status | Evidence |
|----|------|:------:|----------|
| TST-001 | Zero test files | **RESOLVED** | 21 tests |
| TST-002 | No test script | **RESOLVED** | package.json |
| TST-003 | No CI | **RESOLVED** | ci.yml |
| TST-005 | No E2E | **OPEN** | — |
| TST-007 | No RLS tests | **OPEN** | — |
| TST-009 | No agent/MCP tests | **OPEN** | — |

## Documentation gaps

| ID | Item | Status |
|----|------|:------:|
| README migrations | **RESOLVED** |
| push script comment | **RESOLVED** |
| SECURITY.md | **RESOLVED** |
| OpenAPI incomplete | **OPEN** |
| CONTRIBUTING.md | **OPEN** |

---

## Summary counts

| Status | Count |
|--------|------:|
| **RESOLVED** | 38 |
| **PARTIAL** | 4 |
| **OPEN** | 28 |

---

*See CRITICAL_ANALYSIS_POST_HARDENING.md for executive summary and remaining phases.*
