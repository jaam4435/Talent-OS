# Deployment

Talent OS deploys to **Vercel** (application) and **Supabase** (database, auth, storage).

---

## Environments

| Environment | Branch | URL |
|---|---|---|
| Production | `main` | `NEXT_PUBLIC_APP_URL` |
| Preview | PR branches | `*.vercel.app` |
| Local | any | `localhost:3000` |

---

## Vercel Configuration

File: `vercel.json`

| Setting | Value |
|---|---|
| Framework | Next.js |
| Build | `npm run build` |
| Node | 20.x+ |

### Cron Jobs

| Path | Schedule |
|---|---|
| `/api/cron/dispatch-events` | Every minute |
| `/api/cron/process-workflow-jobs` | Every minute |
| `/api/cron/check-overdue-milestones` | Daily 08:00 UTC |

Cron routes require `CRON_SECRET` header (Vercel sets automatically).

---

## Required Environment Variables

| Variable | Required | Scope |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Public |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Public |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Server only |
| `NEXT_PUBLIC_APP_URL` | Yes | Public |
| `CRON_SECRET` | Yes (prod) | Server |
| `N8N_WEBHOOK_BASE_URL` | Integrations | Server |
| `WHATSAPP_VERIFY_TOKEN` | WhatsApp | Server |
| `OPENAI_API_KEY` | AI features | Server |
| `ANTHROPIC_API_KEY` | AI fallback | Server |

---

## Database Migrations

```bash
# Link Supabase project
supabase link --project-ref <ref>

# Apply migrations
supabase db push
```

Migration files: `supabase/migrations/001` through `018` — see [generated/migrations.md](./generated/migrations.md)

---

## Deploy Checklist

1. Set all environment variables in Vercel dashboard
2. Ensure production branch is `main`
3. Run migrations against production Supabase
4. Deploy and verify `/api/health`:

```json
{"ok": true, "service": "talent-os", "supabase": true}
```

5. Confirm cron jobs appear in Vercel → Settings → Cron Jobs

---

## CI Pipeline

GitHub Actions (`.github/workflows/ci.yml`):

```
typecheck → lint → test:coverage → docs:check
```

---

## Related

- [23 Vercel Deployment (legacy)](./23-vercel-deployment.md) — troubleshooting 404s
- [21 Supabase Connection](./21-supabase-connection.md)
- [Operations Guide](./operations-guide.md)
