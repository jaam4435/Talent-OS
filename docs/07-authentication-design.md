# Talent OS — Authentication Design

**Provider:** Supabase Auth  
**Session:** JWT in HTTP-only cookies (SSR-compatible)  
**MFA:** Optional TOTP (Phase 2)

---

## 1. Authentication Overview

```
┌──────────────┐     ┌──────────────┐     ┌──────────────────┐
│   Sign Up    │────▶│ Supabase Auth│────▶│  profiles table  │
│  (Admin)     │     │  auth.users  │     │  (auto-created)  │
└──────────────┘     └──────┬───────┘     └──────────────────┘
                              │
┌──────────────┐              │
│ Magic Link   │──────────────┤
│ (Freelancer) │              │
└──────────────┘              │
                              ▼
                     ┌──────────────────┐
                     │  tenant_members  │
                     │  (role assigned) │
                     └──────────────────┘
```

---

## 2. Authentication Methods

| Method | Users | Flow |
|---|---|---|
| **Email + Password** | Admin, Talent Manager | Standard signup/login |
| **Magic Link** | Freelancer | Email link → auto session |
| **Invite Link** | All roles | Admin invites → set password or magic link |
| **OAuth (Google)** | Admin, Talent Manager | Phase 2 |

---

## 3. User Lifecycle Flows

### 3.1 Admin Signup (Agency Creation)

```
1. User visits /signup
2. Enters: email, password, agency name
3. Supabase Auth creates auth.users record
4. Trigger creates profiles record
5. Server Action calls create_tenant_with_admin()
   → tenants row created
   → tenant_members row (role: admin)
6. Redirect to /dashboard
7. n8n event: tenant.created → welcome email
```

```typescript
// app/actions/auth.ts
export async function signUpAgency(input: {
  email: string
  password: string
  agencyName: string
}) {
  const supabase = createServerClient()

  // 1. Create auth user
  const { data: authData, error } = await supabase.auth.signUp({
    email: input.email,
    password: input.password,
    options: {
      data: { full_name: input.agencyName }
    }
  })
  if (error) throw error

  // 2. Create tenant
  const slug = slugify(input.agencyName)
  const { data: tenantId } = await supabase.rpc('create_tenant_with_admin', {
    p_name: input.agencyName,
    p_slug: slug,
    p_user_id: authData.user!.id
  })

  return { tenantId, slug }
}
```

### 3.2 Team Invite (Talent Manager)

```
1. Admin visits /settings/team → clicks "Invite"
2. Enters email + role (talent_manager)
3. API creates tenant_members (status: invited)
4. Generates invite token (JWT, 7-day expiry)
5. n8n sends invite email with link: /invite/[token]
6. Invitee clicks link → /invite/[token] page
7. If no account: set password form
8. If existing account: accept invite
9. tenant_members status → active, joined_at set
10. Redirect to /dashboard
```

```typescript
// Invite token payload
interface InviteToken {
  tenant_id: string
  email: string
  role: 'talent_manager' | 'freelancer'
  member_id: string
  exp: number  // 7 days
}
```

### 3.3 Freelancer Onboarding

Freelancers are typically created by Talent Managers first (no auth account), then linked when they first log in.

```
Path A — Manager creates profile, freelancer self-registers:
1. Manager creates freelancer (email, name, skills) — no user_id
2. Manager broadcasts opportunity → WhatsApp with magic link
3. Freelancer clicks link → /login?email=xxx&redirect=/opportunities/yyy
4. Magic link sent to email
5. Freelancer clicks → session created
6. link_freelancer_to_user() called → user_id set on freelancer row
7. tenant_members created (role: freelancer)

Path B — Manager invites freelancer directly:
1. Manager creates freelancer + sends invite
2. Same as team invite flow with role: freelancer
```

---

## 4. Session Management

### 4.1 Cookie Configuration

```typescript
// lib/supabase/middleware.ts
import { createServerClient } from '@supabase/ssr'

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookies) => {
          cookies.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, {
              ...options,
              httpOnly: true,
              secure: process.env.NODE_ENV === 'production',
              sameSite: 'lax',
              path: '/',
            })
          })
        },
      },
    }
  )

  // Refresh session if expired
  await supabase.auth.getUser()
  return response
}
```

### 4.2 Session Duration

| Setting | Value |
|---|---|
| Access token TTL | 1 hour (auto-refresh) |
| Refresh token TTL | 30 days |
| Magic link TTL | 24 hours |
| Invite token TTL | 7 days |
| Idle timeout | None (rely on refresh token) |

### 4.3 Session Data

```typescript
interface SessionContext {
  user: {
    id: string
    email: string
    full_name: string
  }
  tenant: {
    id: string
    slug: string
    name: string
    role: 'admin' | 'talent_manager' | 'freelancer'
  }
  permissions: string[]  // Computed from role
}
```

---

## 5. Role-Based Access Control (RBAC)

### 5.1 Permission Matrix

| Permission | Admin | Talent Manager | Freelancer |
|---|---|---|---|
| `tenant:read` | ✅ | ✅ | ✅ |
| `tenant:update` | ✅ | ❌ | ❌ |
| `tenant:billing` | ✅ | ❌ | ❌ |
| `members:invite` | ✅ | ❌ | ❌ |
| `members:manage` | ✅ | ❌ | ❌ |
| `integrations:manage` | ✅ | ❌ | ❌ |
| `freelancers:create` | ✅ | ✅ | ❌ |
| `freelancers:read` | ✅ | ✅ | Self |
| `freelancers:update` | ✅ | ✅ | Self* |
| `freelancers:delete` | ✅ | ✅ | ❌ |
| `freelancers:rate` | ✅ | ✅ | ❌ |
| `opportunities:create` | ✅ | ✅ | ❌ |
| `opportunities:read` | ✅ | ✅ | Assigned |
| `opportunities:broadcast` | ✅ | ✅ | ❌ |
| `opportunities:respond` | ❌ | ❌ | ✅ |
| `shortlists:manage` | ✅ | ✅ | ❌ |
| `projects:create` | ✅ | ✅ | ❌ |
| `projects:read` | ✅ | ✅ | Assigned |
| `projects:update` | ✅ | ✅ | Limited** |
| `milestones:submit` | ❌ | ❌ | ✅ |
| `milestones:review` | ✅ | ✅ | ❌ |
| `payments:read` | ✅ | ✅ | Own |
| `payments:approve` | ✅ | ❌ | ❌ |
| `payments:pay` | ✅ | ❌ | ❌ |
| `analytics:read` | ✅ | ✅ | ❌ |

*Self: cannot edit `internal_rating`, `internal_notes`  
**Limited: freelancer can update project status to `in_review` only

### 5.2 Permission Enforcement Layers

```
Layer 1: Middleware (route-level)
  → Block unauthorized routes before page render

Layer 2: Server Actions / API (application-level)
  → Check permissions before mutation
  → Validate tenant context

Layer 3: Supabase RLS (database-level)
  → Final enforcement; prevents data leakage even if app layer fails
```

```typescript
// lib/auth/permissions.ts
export function hasPermission(role: UserRole, permission: string): boolean {
  return PERMISSION_MAP[role]?.includes(permission) ?? false
}

export function requirePermission(role: UserRole, permission: string) {
  if (!hasPermission(role, permission)) {
    throw new ForbiddenError(`Missing permission: ${permission}`)
  }
}

// Usage in Server Action
export async function createFreelancer(input: CreateFreelancerInput) {
  const session = await getSession()
  requirePermission(session.tenant.role, 'freelancers:create')
  // ... proceed
}
```

---

## 6. Middleware Route Protection

```typescript
// middleware.ts
import { updateSession } from '@/lib/supabase/middleware'
import { resolveTenant } from '@/lib/auth/tenant-context'

const PUBLIC_ROUTES = ['/login', '/signup', '/invite', '/forgot-password', '/api/webhooks']
const ADMIN_ONLY = ['/settings', '/settings/team', '/settings/billing', '/settings/integrations']
const MANAGER_ONLY = ['/talent', '/analytics']

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // 1. Refresh session
  const response = await updateSession(request)

  // 2. Public routes — pass through
  if (PUBLIC_ROUTES.some(r => pathname.startsWith(r))) {
    return response
  }

  // 3. Get session
  const session = await getSessionFromRequest(request)
  if (!session) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // 4. Resolve tenant from subdomain
  const tenant = await resolveTenant(request, session)
  if (!tenant) {
    return NextResponse.redirect(new URL('/signup', request.url))
  }

  // 5. Role-based route guards
  if (ADMIN_ONLY.some(r => pathname.startsWith(r)) && tenant.role !== 'admin') {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  if (MANAGER_ONLY.some(r => pathname.startsWith(r)) && tenant.role === 'freelancer') {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  // 6. Set tenant context header
  response.headers.set('X-Tenant-ID', tenant.id)
  return response
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|public).*)'],
}
```

---

## 7. Multi-Tenant Session Context

Users can belong to multiple tenants (e.g., freelancer working with two agencies). Active tenant is resolved via:

1. **Subdomain:** `acme.talent-os.app` → tenant slug `acme-creative`
2. **Cookie:** `active-tenant-id` set on tenant switch
3. **Fallback:** First active tenant_members row

```typescript
// lib/auth/tenant-context.ts
export async function resolveTenant(
  request: NextRequest,
  session: Session
): Promise<TenantContext | null> {
  const hostname = request.headers.get('host') ?? ''
  const subdomain = hostname.split('.')[0]

  // Try subdomain first
  if (subdomain && subdomain !== 'app' && subdomain !== 'www') {
    const tenant = await getTenantBySlug(subdomain)
    if (tenant && await isMember(session.user.id, tenant.id)) {
      return { ...tenant, role: await getMemberRole(session.user.id, tenant.id) }
    }
  }

  // Try cookie
  const tenantId = request.cookies.get('active-tenant-id')?.value
  if (tenantId && await isMember(session.user.id, tenantId)) {
    const tenant = await getTenantById(tenantId)
    return { ...tenant, role: await getMemberRole(session.user.id, tenantId) }
  }

  // Fallback to first membership
  return getFirstTenantMembership(session.user.id)
}
```

---

## 8. Security Measures

| Measure | Implementation |
|---|---|
| Password policy | Min 8 chars, Supabase default strength check |
| Brute force protection | Supabase built-in rate limiting on auth endpoints |
| CSRF | SameSite cookies + Server Actions built-in protection |
| XSS | React auto-escaping; CSP headers via Vercel |
| Session fixation | New session on login; old refresh token invalidated |
| Invite token security | Signed JWT with short expiry; single-use |
| Service role isolation | `SUPABASE_SERVICE_ROLE_KEY` never in client bundle |
| Audit logging | All auth events logged to `activity_logs` |

---

## 9. Auth Event Logging

| Event | Logged To | Data |
|---|---|---|
| `auth.signup` | activity_logs | email, tenant_id |
| `auth.login` | Supabase Auth logs | IP, user agent |
| `auth.logout` | activity_logs | user_id |
| `auth.invite_sent` | activity_logs | invitee_email, role |
| `auth.invite_accepted` | activity_logs | user_id, tenant_id |
| `auth.password_reset` | Supabase Auth logs | email |
| `auth.magic_link_sent` | activity_logs | email |
| `auth.freelancer_linked` | activity_logs | freelancer_id, user_id |

---

## 10. Supabase Auth Configuration

```toml
# supabase/config.toml (relevant sections)
[auth]
site_url = "https://app.talent-os.com"
additional_redirect_urls = ["http://localhost:3000/api/auth/callback"]
jwt_expiry = 3600
enable_signup = true

[auth.email]
enable_signup = true
double_confirm_changes = true
enable_confirmations = true  # Require email verification for admins

[auth.email.template.magic_link]
subject = "Sign in to Talent OS"
content_path = "./supabase/templates/magic-link.html"

[auth.email.template.invite]
subject = "You've been invited to Talent OS"
content_path = "./supabase/templates/invite.html"
```
