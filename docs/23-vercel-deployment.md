# Vercel Deployment

## Fix: 404 NOT_FOUND after deploy

That Vercel error page means the **deployment failed or has no output** — not an in-app route issue.

### 1. Redeploy from `main`

Ensure Vercel is connected to **`main`** (full app was merged there).

**Vercel Dashboard → Project → Settings → Git → Production Branch = `main`**

Then: **Deployments → Redeploy** (or push a new commit).

### 2. Set required environment variables

**Project → Settings → Environment Variables** — add for **Production**, **Preview**, and **Development**:

| Variable | Required | Notes |
|----------|----------|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | `https://rzjyqjwldmdldinoxgvh.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Supabase anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Server-only; invites & events |
| `NEXT_PUBLIC_APP_URL` | Yes | Your Vercel URL, e.g. `https://talent-os.vercel.app` |

Without Supabase vars, middleware used to crash at startup (fixed in latest `main`).

### 3. Verify project settings

| Setting | Value |
|---------|-------|
| Framework Preset | **Next.js** |
| Root Directory | **.** (repo root) |
| Build Command | `npm run build` |
| Output Directory | *(leave default — Next.js)* |
| Node.js Version | **20.x** or **22.x** |

### 4. Check build logs

**Deployments → latest deployment → Building**

Look for red errors. Common failures:
- `npm install` / dependency errors
- TypeScript errors
- Missing env at build time (rare for this app)

### 5. Verify deployment works

After a successful deploy, open:

```
https://<your-domain>/api/health
```

Expected response:
```json
{"ok":true,"service":"talent-os","supabase":true,"timestamp":"..."}
```

Then open `/` — should redirect to `/login`.

### 6. Supabase Auth redirect URLs

In **Supabase Dashboard → Authentication → URL Configuration**, add:

- **Site URL:** `https://<your-vercel-domain>`
- **Redirect URLs:**
  - `https://<your-vercel-domain>/api/auth/callback`
  - `http://localhost:3000/api/auth/callback` (local dev)

---

## Quick deploy checklist

- [ ] Repo connected: `jaam4435/Talent-OS`
- [ ] Branch: `main`
- [ ] Build: green / succeeded
- [ ] Env vars set (4 required)
- [ ] `/api/health` returns `ok: true`
- [ ] `/login` loads
- [ ] Supabase redirect URLs updated
