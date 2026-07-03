# Blockers & Project Creation Workflow

## Current state (post-review)

| Layer | Status |
|-------|--------|
| **Supabase connection** | Live project `rzjyqjwldmdldinoxgvh`; migrations `001`–`013` deployed |
| **Core entities** | `profiles` + view `users`; `companies`; `projects`; `freelancers` + view `talent_profiles` |
| **Authentication** | Signup, login, magic link, invites, middleware RBAC |
| **Project creation** | UI → `createProject()` → `create_project_with_milestones` RPC (atomic + `company_id`) |

---

## Blockers identified (and resolution)

### Resolved in this branch

| Blocker | Impact | Fix |
|---------|--------|-----|
| `is_tenant_admin` undefined | Invite revoke fails | `013`: use `is_admin_of()` |
| Manager payment approval missing | Managers cannot approve payouts | `013`: restore `payments_update_manager_approve` |
| Client cannot read milestones/payments | Client portal incomplete | `013`: client SELECT policies |
| `users` / `talent_profiles` views bypass RLS | Data leak risk via PostgREST | `013`: `security_invoker = true` |
| Project form missing company picker | `company_id` never set on projects | Company dropdown on `/projects/new` |
| RPC lacked `company_id` | Two-step insert + race | `013`: `p_company_id` on RPC |
| Freelancer invite not linked to roster | Talent cannot see assigned projects | `013`: `accept_member_invite` calls `link_freelancer_to_user` |
| Client invites had no company | Client RBAC broken | `member_invites.company_id` + team UI |

### Remaining (non-blocking for MVP)

| Blocker | Workaround |
|---------|------------|
| **Email confirmation ON** in Supabase | Disable for dev, or confirm email before signup completes tenant |
| **No `/companies` admin page** | Use seed data or `createCompany` action; companies appear in dropdowns |
| **Password reset has no set-password UI** | User lands on dashboard after reset link |
| **Empty freelancer roster** | Add talent at `/talent/new` before creating projects |
| **n8n / WhatsApp integrations** | Optional; in-app flows work without them |
| **IPv6-only direct DB host** | Use session pooler (`scripts/push-supabase-schema.sh`) |

---

## Project creation workflow

```
Manager → /projects/new
       → Select freelancer + company + milestones
       → createProject() [server action]
       → create_project_with_milestones RPC
       → DB triggers (opportunity filled, notifications, activity log)
       → Redirect /projects/[id]
```

From opportunity path: `/opportunities/[id]/shortlist` → Create project pre-fills title, budget, company.

---

## Entity mapping

| Product | Supabase |
|---------|----------|
| users | `auth.users` + `profiles` + view `users` |
| companies | `companies` |
| projects | `projects` |
| talent_profiles | `freelancers` + view `talent_profiles` |

## Roles

| Role | DB enum | Project create |
|------|---------|----------------|
| admin | `admin` | Yes |
| talent manager | `talent_manager` | Yes |
| talent | `freelancer` | No (assigned) |
| client | `client` | No (read company projects) |
