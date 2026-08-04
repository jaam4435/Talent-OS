# Supabase Connection Setup

**Project:** `rzjyqjwldmdldinoxgvh`  
**URL:** `https://rzjyqjwldmdldinoxgvh.supabase.co`

---

## 1. Local environment

Copy credentials into `.env.local` (gitignored):

```bash
NEXT_PUBLIC_SUPABASE_URL=https://rzjyqjwldmdldinoxgvh.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-key>
SUPABASE_SERVICE_ROLE_KEY=<service-role-key>
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

Start the app:

```bash
npm run dev
```

---

## 2. Push database schema (first-time)

API keys alone cannot run DDL migrations. You also need the **database password** from:

**Supabase Dashboard → Project Settings → Database → Database password**

Pooler (IPv4, required from cloud/CI environments):

```bash
SUPABASE_DB_PASSWORD='your-db-password' ./scripts/push-supabase-schema.sh
```

Uses session pooler `aws-1-ap-southeast-1.pooler.supabase.com:5432` by default.
Override with `SUPABASE_POOLER_HOST` / `SUPABASE_POOLER_PORT` if your project region differs.

Optional demo seed data (after at least one auth user exists):

```bash
SUPABASE_DB_PASSWORD='your-db-password' RUN_SEED=1 ./scripts/push-supabase-schema.sh
```

### Alternative: Supabase CLI login

```bash
npx supabase login
npx supabase link --project-ref rzjyqjwldmdldinoxgvh
npx supabase db push
```

---

## 3. Vercel / production

Add the same three Supabase variables in your hosting provider:

| Variable | Expose to browser |
|----------|-------------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes |
| `SUPABASE_SERVICE_ROLE_KEY` | **No** (server only) |

---

## 4. Verify connection

```bash
curl -s -H "apikey: $NEXT_PUBLIC_SUPABASE_ANON_KEY" \
  "https://rzjyqjwldmdldinoxgvh.supabase.co/auth/v1/health"
```

After migrations, tables like `profiles`, `companies`, and `projects` appear in the REST API.
