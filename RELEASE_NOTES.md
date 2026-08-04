# Release Notes — Platform P0 Production Blockers

**Version:** 0.2.0  
**Date:** July 31, 2026  
**Branch:** `cursor/p0-production-blockers-5fb1`

## Summary

Eliminates remaining P0 production blockers from the post-hardening gap analysis: distributed state (Redis + Postgres), security scanning CI, RLS integration tests, E2E critical workflow tests, and complete OpenAPI documentation.

**No UI changes. No breaking API changes.**

---

## Distributed State

### Rate limiting (Redis)
- Replaced in-memory API rate limits with **Upstash Redis** via `@upstash/ratelimit`
- AI gateway rate limiter now uses the same distributed store
- WhatsApp webhook rate limiting uses async distributed checks
- In-memory fallback for dev/CI when Redis is not configured

### Idempotency (PostgreSQL)
- New migration `021_api_idempotency.sql` — `api_idempotency_responses` table
- API `Idempotency-Key` header persisted to Postgres (service role)
- In-memory fallback for tests (`IDEMPOTENCY_STORE=memory`)

### Distributed caching (Redis)
- `RepositoryCache` replaced with `DistributedCache` (Redis + memory fallback)
- Dashboard and other cached repository reads share state across instances

---

## Security CI

| Workflow | Purpose |
|----------|---------|
| `.github/workflows/codeql.yml` | CodeQL static analysis (JavaScript/TypeScript) |
| `.github/workflows/security.yml` | npm audit, Gitleaks secret scan, Trivy filesystem scan |
| `.github/dependabot.yml` | Weekly dependency and GitHub Actions updates |

---

## Testing

| Suite | Count | Scope |
|-------|------:|-------|
| Unit tests | 21+ | Encryption, env, permissions, pagination |
| Integration tests | 20+ | RLS migrations, idempotency, distributed state |
| E2E (Playwright) | 10 | Health, OpenAPI, auth guards, webhooks, AI/talent APIs |

New scripts: `npm run test:e2e`, `npm run test:all`

---

## Documentation

- Complete `docs/openapi.yaml` — all 24 route handlers documented
- `docs/Platform/DISTRIBUTED_STATE_ARCHITECTURE.md` — architecture diagram
- `PRODUCTION_CHECKLIST.md` — pre-deploy checklist
- `docs/Platform/PRODUCTION_READINESS_REPORT.md` — updated readiness assessment
- Updated `SECURITY.md`, `.env.local.example`, README

---

## Environment (new required in production)

```
UPSTASH_REDIS_REST_URL=https://...
UPSTASH_REDIS_REST_TOKEN=...
```

---

## Upgrade Steps

1. Merge this branch to `main`
2. Create Upstash Redis instance and set env vars in Vercel
3. Run `supabase db push` (migration 021)
4. Verify: `npm run test:all && npm run build`
5. Follow `PRODUCTION_CHECKLIST.md`

---

## Known Remaining Gaps (not P0)

- MCP tool adapters (feature work)
- SSO/MFA (feature work)
- Marketplace (not implemented)
- Observability dashboard UI
- Durable job queue replacement for crons
