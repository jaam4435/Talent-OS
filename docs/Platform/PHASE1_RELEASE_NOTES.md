# Phase 1 Release Notes — Platform Stabilization

| Field | Value |
|-------|-------|
| **Version** | Phase 1 |
| **Date** | 2026-07-30 |
| **Type** | Security & reliability patch |
| **Breaking changes** | None when env vars are configured; see migration notes |

---

## Summary

Phase 1 eliminates all **critical** audit findings and restores production automation (cron, internal AI routes, health checks). No new product features were added.

---

## Security Fixes

### C-01 — Middleware no longer blocks system routes

Cron, internal API, and health endpoints bypass session authentication. Bearer secrets are validated in route handlers.

**Impact:** Scheduled jobs and n8n internal callbacks work in deployed environments.

### C-02 / C-03 — RPC privilege escalation closed

`create_tenant_with_admin` and `link_freelancer_to_user` now require `auth.uid() = p_user_id`.

**Impact:** Users cannot create tenants or hijack freelancer accounts on behalf of others.

### C-04 — Webhook signature enforcement (production)

n8n and WhatsApp webhooks reject unsigned requests when `NODE_ENV=production` and secrets are configured.

**Impact:** Forged webhook payloads are rejected in production.

### PRJ-01 / PRJ-02 — Approval authorization hardened

- Null approver no longer allows any user to decide (fail closed).
- `tenant_admin` role fallback for admin members.
- Cross-tenant approval attempts return forbidden.

**Impact:** Workflow approval gates enforce intended authorization.

---

## Reliability Fixes

### C-05 — AI execution race condition resolved

Atomic `claim()` prevents duplicate processing of the same AI request.

**Impact:** No double LLM billing or inconsistent match results from concurrent workers.

### CORE-06 — Separated system secrets

New optional `INTERNAL_API_SECRET` for `/api/internal/*` routes. Falls back to `CRON_SECRET` when unset.

**Impact:** Reduced blast radius if one secret is compromised.

---

## Operational Improvements

| Area | Change |
|------|--------|
| **Error handling** | Invalid JSON on webhooks/internal routes returns 400 |
| **Logging** | Structured JSON logs for auth failures and missing secrets |
| **Testing** | New unit tests for middleware routes, system auth, approvals, AI claim |
| **Documentation** | Migration notes and updated `.env.local.example` |

---

## Upgrade Steps

1. Apply migration `019_phase1_security_fixes.sql`
2. Set `CRON_SECRET` (required)
3. Set `INTERNAL_API_SECRET` (recommended for production)
4. Confirm webhook secrets are set before production deploy
5. Verify cron smoke test: `GET /api/cron/dispatch-events` returns non-302

See [PHASE1_MIGRATION_NOTES](./PHASE1_MIGRATION_NOTES.md) for full details.

---

## Resolved Audit Items

| ID | Status |
|----|--------|
| C-01 | Resolved |
| C-02 | Resolved |
| C-03 | Resolved |
| C-04 | Resolved |
| C-05 | Resolved |
| CORE-01 | Resolved |
| CORE-02 | Resolved |
| CORE-03 | Resolved |
| CORE-06 | Resolved |
| INT-01 | Resolved |
| PRJ-01 | Resolved |
| PRJ-02 | Resolved |
| AI-01 | Resolved |

---

## Known Limitations (unchanged in Phase 1)

- Test coverage remains below target (~30% is Phase 2 goal)
- `approval_requests.expires_at` not yet enforced (Phase 2+)
- Integration config encryption at rest (Phase 2)

---

## Files Changed (high level)

- `middleware.ts`, `modules/core/utils/constants.ts`
- `supabase/migrations/019_phase1_security_fixes.sql`
- `lib/integrations/system-auth.ts`, `lib/utils/logger.ts`
- `lib/workflows/engine.ts`, `app/actions/approvals.ts`
- `lib/repositories/ai-request.repository.ts`, AI executors
- `app/api/cron/*`, `app/api/internal/*`, `app/api/webhooks/*`
- `tests/unit/system-routes.test.ts`, `tests/unit/system-auth.test.ts`
- `tests/workflow/approval-authorization.test.ts`
- `tests/repository/ai-request.repository.test.ts`
