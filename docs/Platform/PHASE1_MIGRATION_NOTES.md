# Phase 1 Migration Notes

| Field | Value |
|-------|-------|
| **Version** | Phase 1 — Platform Stabilization |
| **Date** | 2026-07-30 |
| **Branch** | `cursor/phase-1-stabilization-5fb1` |
| **Migration file** | `supabase/migrations/019_phase1_security_fixes.sql` |

---

## Overview

Phase 1 resolves all **critical** findings from [FINAL Audit](../FINAL_AUDIT.md) (C-01 through C-05). This document describes deployment steps, environment changes, and behavioral differences operators must account for.

**No new product features** are introduced. Existing flows remain backwards-compatible when configuration is updated as described below.

---

## 1. Database Migration

### Apply migration

```bash
# Local Supabase
supabase db push

# Or run against remote via your standard migration pipeline
psql "$DATABASE_URL" -f supabase/migrations/019_phase1_security_fixes.sql
```

### What changes

| RPC | Before | After |
|-----|--------|-------|
| `create_tenant_with_admin(name, slug, user_id)` | Any authenticated user could pass any `user_id` | Requires `auth.uid() = p_user_id` |
| `link_freelancer_to_user(freelancer_id, user_id)` | Any authenticated user could link any freelancer | Requires `auth.uid() = p_user_id` |

### Verification

After migration, confirm:

1. **Agency signup** (`/signup` → `signUpAgency`) still creates tenant + admin membership.
2. **Freelancer invite accept** still links roster row when email matches.
3. **Negative test:** Authenticated user calling RPC with another user's ID receives an exception.

Internal calls from `accept_member_invite` continue to work because the accepting user's session matches `p_user_id`.

---

## 2. Environment Variables

### New variable (recommended)

| Variable | Required | Description |
|----------|----------|-------------|
| `INTERNAL_API_SECRET` | Recommended (prod) | Bearer token for `/api/internal/*` routes |

### Existing variables (unchanged names, stricter enforcement)

| Variable | Routes | Notes |
|----------|--------|-------|
| `CRON_SECRET` | `/api/cron/*` | Required in all deployed environments |
| `N8N_WEBHOOK_SECRET` | `/api/webhooks/n8n` | **Required in production** (`NODE_ENV=production`) |
| `WHATSAPP_APP_SECRET` | `/api/webhooks/whatsapp` | **Required in production** |

### Backwards compatibility

- If `INTERNAL_API_SECRET` is **unset**, internal routes fall back to `CRON_SECRET` (same behavior as before).
- Setting `INTERNAL_API_SECRET` to a distinct value **breaks** n8n workflows that still send `CRON_SECRET` to internal routes — update n8n HTTP nodes accordingly.

### Deployment checklist

1. Set `CRON_SECRET` in Vercel (cron jobs inject this automatically when configured).
2. Set `INTERNAL_API_SECRET` (optional but recommended for production).
3. Confirm `N8N_WEBHOOK_SECRET` and `WHATSAPP_APP_SECRET` are set before promoting to production.
4. Redeploy application after env changes.

---

## 3. Middleware Behavior

### Before

`/api/cron/*`, `/api/internal/*`, and `/api/health` required a Supabase session cookie. Vercel Cron received **302 → /login**.

### After

These routes bypass session middleware (`SYSTEM_ROUTES`). Route handlers enforce bearer authentication independently.

### Action required

- No cookie or session configuration changes needed.
- Verify cron jobs return **200/401/503** (not **302**) after deploy:

```bash
curl -i -H "Authorization: Bearer $CRON_SECRET" \
  "$APP_URL/api/cron/dispatch-events"
```

---

## 4. Webhook Fail-Closed (Production)

### Before

If `N8N_WEBHOOK_SECRET` or `WHATSAPP_APP_SECRET` was empty, signature verification was **skipped**.

### After

When `NODE_ENV=production`:

- Missing webhook secret → **503** (`Webhook verification is not configured`)
- Invalid signature → **401**

Development/local environments without secrets continue to accept webhooks (unchanged developer experience).

---

## 5. Workflow Approvals

### Before

When `approver_id` was `null`, any authenticated user could approve/reject.

### After

| Scenario | Behavior |
|----------|----------|
| `approver_id` set | Only that user may decide |
| `approver_id` null + `approver_role = tenant_admin` | Tenant **admin** members may decide |
| `approver_id` null + `project_manager` / `assigned_by` | **Rejected** (fail closed) |
| Wrong tenant (server action) | **Forbidden** before engine runs |

### Action required

Ensure workflow definitions resolve approvers where possible. Approvals with null approver and user-specific roles will remain pending until manually reassigned or workflow is updated in a future phase.

---

## 6. AI Request Execution

### Before

Concurrent calls to execute the same `ai_request_id` could both set `status = processing` and run duplicate LLM calls.

### After

- `AiRequestRepository.claim()` atomically transitions `pending → processing`.
- Duplicate callers receive **skipped** (executors) or **409 Conflict** (internal HTTP routes).
- Completed requests remain idempotent (skipped).

### n8n retry semantics

- **409** on internal routes indicates another worker is processing — safe to retry later.
- **200** with `skipped: true` means already completed — do not retry.

---

## 7. Rollback

| Component | Rollback |
|-----------|----------|
| Application code | Redeploy previous release |
| Migration 019 | Restore prior function bodies from `003_functions_triggers.sql` (not recommended — re-opens C-02/C-03) |
| `INTERNAL_API_SECRET` | Unset to restore CRON_SECRET fallback |

**Recommendation:** Do not roll back migration 019 in production. Fix forward if signup/onboarding regressions appear.

---

## 8. Related Documents

- [FINAL Audit](../FINAL_AUDIT.md) — C-01 through C-05
- [Engineering Roadmap](./Engineering%20Roadmap.md) — Phase 1 acceptance criteria
- [PHASE1_RELEASE_NOTES](./PHASE1_RELEASE_NOTES.md) — user-facing summary
