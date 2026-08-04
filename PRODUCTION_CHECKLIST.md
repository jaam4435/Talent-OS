# Production Checklist — Talent OS

**Version:** 0.2.0  
**Last updated:** July 31, 2026  
**Branch:** `cursor/p0-production-blockers-5fb1`

Complete every item before production cutover.

---

## 1. Code & CI

- [ ] PR merged to `main`
- [ ] `npm run typecheck` passes
- [ ] `npm run lint` passes
- [ ] `npm test` passes (unit + integration)
- [ ] `npm run test:e2e` passes (Playwright)
- [ ] `npm run build` passes
- [ ] CodeQL workflow green on `main`
- [ ] Security scan workflow green on `main`

---

## 2. Database Migrations

Apply in order via `supabase db push` or `./scripts/push-supabase-schema.sh`:

- [ ] Migrations 001–019 (baseline)
- [ ] `020_enterprise_hardening.sql` — secure RPCs, view revokes, phone index
- [ ] `021_api_idempotency.sql` — distributed idempotency table

Verify:

```sql
SELECT count(*) FROM api_idempotency_responses;  -- table exists
SELECT proname FROM pg_proc WHERE proname = 'get_dashboard_summary';  -- RPC exists
```

---

## 3. Environment Variables (Vercel)

### Required in production

| Variable | Min length | Purpose |
|----------|------------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | — | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | — | Public anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | — | Server-side admin client |
| `CRON_SECRET` | 16 chars | Cron + internal routes |
| `ENCRYPTION_KEY` | 64 hex chars | Integration encryption |
| `WHATSAPP_APP_SECRET` | 8 chars | Meta webhook HMAC |
| `N8N_WEBHOOK_SECRET` | 8 chars | n8n webhook HMAC |
| `UPSTASH_REDIS_REST_URL` | valid URL | Distributed rate limit + cache |
| `UPSTASH_REDIS_REST_TOKEN` | 8 chars | Upstash auth |

### Recommended

| Variable | Purpose |
|----------|---------|
| `OPENAI_API_KEY` | AI matching |
| `WHATSAPP_VERIFY_TOKEN` | Meta webhook verify |
| `NEXT_PUBLIC_APP_URL` | App canonical URL |

---

## 4. Upstash Redis

- [ ] Upstash Redis database created (same region as Vercel when possible)
- [ ] `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` set in Vercel
- [ ] Verify rate limiting works across instances (load test or dual-region check)

---

## 5. Vercel Configuration

- [ ] Crons configured in `vercel.json`:
  - `/api/cron/dispatch-events` — every minute
  - `/api/cron/process-workflow-jobs` — every minute
  - `/api/cron/check-overdue-milestones` — daily 08:00
  - `/api/cron/evaluate-alerts` — every 5 minutes
- [ ] `CRON_SECRET` matches Vercel cron `Authorization: Bearer` header

---

## 6. Supabase Configuration

- [ ] Auth redirect URLs include production domain
- [ ] RLS enabled on all tenant tables (verify in dashboard)
- [ ] Service role key stored securely (never exposed to client)

---

## 7. Smoke Tests (production)

```bash
curl https://YOUR_DOMAIN/api/health
# Expected: {"ok":true,"service":"talent-os",...}

curl https://YOUR_DOMAIN/api/openapi
# Expected: openapi YAML content

curl https://YOUR_DOMAIN/api/analytics/dashboard
# Expected: 401 Unauthorized (no session)

curl -H "Authorization: Bearer $CRON_SECRET" https://YOUR_DOMAIN/api/cron/dispatch-events
# Expected: 200 with dispatch results
```

---

## 8. Security Verification

- [ ] Webhook secrets set — HMAC enforced (not skipped)
- [ ] Analytics API returns 403 for non-manager roles (manual test with session)
- [ ] Direct `SELECT * FROM v_dashboard_summary` fails for authenticated role
- [ ] Gitleaks / secret scan clean on latest commit
- [ ] Trivy scan reviewed (no unmitigated CRITICAL)

---

## 9. Monitoring

- [ ] `/api/observability/dashboard` accessible to managers
- [ ] Alert cron `/api/cron/evaluate-alerts` running (check Vercel logs)
- [ ] Platform logs appearing in `platform_log_entries` after traffic

---

## 10. Rollback Plan

- [ ] Previous deployment ID documented in Vercel
- [ ] Database rollback strategy documented (migrations 020–021 are additive; no down migration)
- [ ] Redis keys use TTL — safe to flush `cache:*` and `rl:*` prefixes if needed

---

## Sign-off

| Role | Name | Date | Approved |
|------|------|------|:--------:|
| Lead Platform Engineer | | | [ ] |
| Security | | | [ ] |
| DevOps | | | [ ] |

---

*See [SECURITY.md](./SECURITY.md) and [docs/Platform/DISTRIBUTED_STATE_ARCHITECTURE.md](./docs/Platform/DISTRIBUTED_STATE_ARCHITECTURE.md)*
