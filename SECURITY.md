# Security Policy

## Supported Versions

| Version | Supported |
|---------|-----------|
| 0.1.x (main) | Yes |

## Reporting a Vulnerability

Report security issues privately to the repository maintainers. Do not open public GitHub issues for undisclosed vulnerabilities.

Include:

- Description of the issue and impact
- Steps to reproduce
- Affected routes, tenants, or data classes
- Suggested remediation (if known)

We aim to acknowledge reports within 5 business days.

## Security Controls

### Authentication & Authorization

- Supabase Auth (JWT sessions) with middleware session refresh
- Role-based access control: `admin`, `talent_manager`, `client`, `freelancer`
- Tenant isolation via cookie + PostgreSQL Row Level Security (RLS)
- Manager-only analytics and observability APIs

### Data Isolation

- RLS policies on all tenant-scoped tables
- Analytics and observability SQL views accessed via **SECURITY DEFINER RPCs** with tenant/manager membership checks (migration 020)
- Domain event emission via `emit_domain_event` RPC granted to authenticated users

### Webhooks

- WhatsApp: HMAC-SHA256 on raw body (`x-hub-signature-256`)
- n8n: HMAC-SHA256 on payload (`x-webhook-signature`)
- Timing-safe signature comparison (`crypto.timingSafeEqual`)
- Webhook secrets **required in production** — requests rejected when unset
- DB-backed idempotency via `webhook_deliveries`

### API Security

- Standardized error envelopes via `withApiHandler`
- Per-category rate limiting (in-memory; per-instance on serverless)
- Cron/internal routes protected by `CRON_SECRET` (min 16 chars in production)
- Production middleware fails closed when Supabase env vars are missing

### Secrets

Required in production:

| Variable | Purpose |
|----------|---------|
| `CRON_SECRET` | Cron and internal AI routes |
| `ENCRYPTION_KEY` | Integration credential encryption (64 hex chars) |
| `WHATSAPP_APP_SECRET` | Meta webhook HMAC |
| `N8N_WEBHOOK_SECRET` | n8n inbound webhook HMAC |

Validated at runtime via `lib/env.ts` on webhook and cron paths.

### Observability

- Structured logs, metrics, traces stored in tenant-scoped tables
- Manager-only observability API routes
- Alert evaluation cron (no external notification channel in MVP)

## Known Limitations

- In-memory rate limits and idempotency caches are per serverless instance (not distributed)
- No MFA/SSO in current release
- MCP tool adapters are stubs — agent tool-use is not production-functional

See `docs/Platform/ENTERPRISE_READINESS_REVIEW.md` for full gap analysis.

## Secure Development

- CI runs typecheck, lint, tests, and production build on every PR
- Run `npm test` before submitting changes
- Apply database migrations in order (`001`–`020`)
