# Talent OS

Multi-tenant "Talent Operating System" for creative agencies. Single Next.js 15 (App Router, React 19, TypeScript) app backed by Supabase (Postgres + Auth + Storage). See `README.md` for the product overview, tech stack, and standard scripts (`npm run dev|build|lint|typecheck`).

## Cursor Cloud specific instructions

### Repository layout caveat
- The `main` branch contains only `README.md`. All application code lives on unmerged `cursor/*` feature branches. `cursor/project-workflow-blockers-ce99` is the most complete. Check out a feature branch before doing any work — there is nothing to build/run on `main`.

### Services
| Service | Command | Port | Required |
|---|---|---|---|
| Next.js dev server | `npm run dev` | 3000 | Yes |
| Local Supabase (Postgres/Auth/Storage/Studio) | `supabase start` | 54321 (API), 54322 (DB), 54323 (Studio) | Yes — nothing works without it |

Supabase CLI and Docker are preinstalled in the VM image; the startup update script only refreshes npm deps. OpenAI / n8n / WhatsApp / Vercel Cron are optional integrations and are not needed for local end-to-end use (`AI_EXECUTION_MODE=direct` avoids needing n8n).

### Starting the environment (non-obvious startup order)
1. Docker must be running before Supabase. The daemon is not auto-started: run `sudo dockerd` (e.g. in a tmux session). If the CLI reports a permission error on `/var/run/docker.sock`, run `sudo chmod 666 /var/run/docker.sock`.
2. `supabase start` (first run pulls images; subsequent runs are fast). It applies `supabase/migrations/*` and `supabase/seed.sql`. Use `supabase db reset` to re-apply migrations after changing SQL.
3. Create `.env.local` from `.env.local.example` and fill the three Supabase values with the local ones printed by `supabase start` (or `supabase status`): `NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321`, plus the local `anon` and `service_role` keys. Set `AI_EXECUTION_MODE=direct`. `.env.local` is gitignored.
4. `npm run dev` → http://localhost:3000 (redirects to `/login`).

### Auth / data gotchas
- `supabase/config.toml` sets `enable_confirmations = false`, so signing up via `/signup` ("Create agency") logs the user straight into `/dashboard` with the `admin` role and a new tenant — this is the simplest way to get a working session.
- The demo accounts named in `supabase/seed.sql` (e.g. `admin@demo.agency`) exist only as application table rows, NOT as Supabase Auth users. You cannot log in as them; create an account through the signup UI instead.
- Outbound email (magic links, password reset) is captured locally by Mailpit at http://localhost:54324, not actually sent.
- The Supabase CLI ships as two co-located binaries (`supabase` + `supabase-go`); both must be on `PATH` (installed in `/usr/local/bin`).
