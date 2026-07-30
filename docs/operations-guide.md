# Operations Guide

Running Talent OS in production: cron jobs, monitoring, and incident response.

---

## Cron Jobs

Configured in `vercel.json`, executed by Vercel Cron:

| Job | Schedule | Route | Purpose |
|---|---|---|---|
| Dispatch events | `* * * * *` | `/api/cron/dispatch-events` | Process domain event outbox → trigger workflows |
| Process workflow jobs | `* * * * *` | `/api/cron/process-workflow-jobs` | Execute workflow job queue |
| Check overdue milestones | `0 8 * * *` | `/api/cron/check-overdue-milestones` | Daily overdue milestone alerts |

### Verify crons are running

1. Vercel Dashboard → Project → Settings → Cron Jobs
2. Check deployment logs for cron invocations
3. Query `domain_events` for `status = 'completed'` recent rows
4. Query `workflow_jobs` for processed jobs

---

## Health Checks

```bash
curl https://<domain>/api/health
```

Expected:

```json
{"ok": true, "service": "talent-os", "supabase": true, "timestamp": "..."}
```

---

## Monitoring

| Signal | Source |
|---|---|
| Application errors | Vercel → Functions → Logs |
| Database queries | Supabase → Logs → Postgres |
| Auth failures | Supabase → Auth → Logs |
| Workflow failures | `workflow_jobs.last_error`, `domain_events.last_error` |
| AI usage | `ai_requests` table, `analytics_ai_usage` |
| Webhook delivery | `webhook_deliveries.status` |

---

## Common Incidents

### Events stuck in `pending`

1. Check Vercel cron is enabled and `/api/cron/dispatch-events` runs
2. Verify `CRON_SECRET` is set
3. Inspect `domain_events.last_error` for failed rows
4. Retry: update `status = 'pending'`, reset `retry_count`

### Workflow jobs failing

1. Query: `SELECT * FROM workflow_jobs WHERE status = 'failed' ORDER BY created_at DESC LIMIT 20`
2. Check `last_error` column
3. For n8n failures: verify `N8N_WEBHOOK_BASE_URL` and n8n instance health
4. For AI failures: check provider API keys and `ai_requests.error_message`

### AI requests timing out

1. Check `ai_requests` for `status = 'failed'`
2. Verify `OPENAI_API_KEY` / `ANTHROPIC_API_KEY`
3. Review tenant AI limits in `tenants.settings`
4. Check `lib/ai/middleware/rate-limit.ts` logs

### WhatsApp webhook failures

1. Verify `WHATSAPP_VERIFY_TOKEN` matches Meta app config
2. Check `/api/webhooks/whatsapp` logs in Vercel
3. Review `whatsapp_messages` for delivery status

---

## Database Maintenance

```bash
# Backup (Supabase dashboard → Database → Backups)
# Migrations (zero-downtime — additive only in production)
supabase db push

# Monitor table sizes
SELECT relname, pg_size_pretty(pg_total_relation_size(relid))
FROM pg_catalog.pg_stati_user_tables ORDER BY pg_total_relation_size(relid) DESC;
```

---

## Rollback

1. Revert git commit on `main`
2. Redeploy via Vercel (auto on push)
3. Database rollback: apply down migration manually (no automated down migrations — plan ahead)

---

## Related

- [Deployment](./deployment.md)
- [Events](./events.md)
- [Workflow](./workflow.md)
- [23 Vercel Deployment](./23-vercel-deployment.md)
