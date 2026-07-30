# Talent OS — Folder Structure

**Framework:** Next.js 15 (App Router)  
**Language:** TypeScript  
**Deployment:** Vercel

---

## 1. Project Tree

```
talent-os/
├── .github/
│   └── workflows/
│       ├── ci.yml                    # Lint, type-check, test
│       └── deploy-preview.yml        # Vercel preview on PR
│
├── modules/                          # Business domain modules
│   └── core/                         # Auth, RBAC, infra, shared UI
│       ├── services/
│       ├── repositories/
│       ├── schemas/
│       ├── types/
│       ├── api/
│       ├── components/
│       ├── hooks/
│       └── utils/
│
├── lib/
│   ├── ai/                           # AI Gateway — all LLM requests go here
│   │   ├── gateway.ts
│   │   ├── providers/
│   │   ├── prompt/
│   │   ├── logging/
│   │   ├── middleware/
│   │   ├── features/
│   │   └── streaming/
│   ├── mcp/                          # Model Context Protocol interfaces
│   │   ├── types.ts
│   │   ├── interfaces.ts
│   │   ├── schemas/
│   │   └── servers/                  # 10 domain MCP servers
│   ├── repositories/                 # Data access layer (all Supabase CRUD)
│   │   ├── base/
│   │   ├── factory.ts                # createRepositories / createAdminRepositories
│   │   ├── talent.repository.ts
│   │   ├── project.repository.ts
│   │   ├── task.repository.ts
│   │   ├── lead.repository.ts
│   │   ├── invoice.repository.ts
│   │   └── ...
│   ├── queries/                      # Read models for Server Components
│   │   ├── projects.queries.ts
│   │   ├── opportunities.queries.ts
│   │   └── ...
│   ├── services/                     # Business logic orchestrating repositories
│   │   ├── factory.ts                # createServices / createAdminServices
│   │   ├── project.service.ts
│   │   ├── talent.service.ts
│   │   ├── assignment.service.ts
│   │   ├── crm.service.ts
│   │   ├── workflow.service.ts
│   │   ├── finance.service.ts
│   │   ├── analytics.service.ts
│   │   ├── notification.service.ts
│   │   ├── ai.service.ts
│   │   └── integration.service.ts
│   ├── workflows/                    # Workflow engine (triggers, conditions, actions)
│   │   ├── registry.ts
│   │   ├── engine.ts
│   │   └── ...
│   ├── domains/
│
├── app/                              # Next.js App Router
│   ├── (auth)/                       # Auth layout group (no sidebar)
│   │   ├── login/
│   │   │   └── page.tsx
│   │   ├── signup/
│   │   │   └── page.tsx
│   │   ├── invite/
│   │   │   └── [token]/
│   │   │       └── page.tsx
│   │   ├── forgot-password/
│   │   │   └── page.tsx
│   │   └── layout.tsx
│   │
│   ├── (dashboard)/                # Main app layout (sidebar + header)
│   │   ├── dashboard/
│   │   │   └── page.tsx              # Operations dashboard
│   │   ├── talent/
│   │   │   ├── page.tsx              # Talent list + search
│   │   │   ├── new/
│   │   │   │   └── page.tsx
│   │   │   └── [id]/
│   │   │       └── page.tsx          # Talent profile detail
│   │   ├── opportunities/
│   │   │   ├── page.tsx              # Opportunity pipeline
│   │   │   ├── new/
│   │   │   │   └── page.tsx
│   │   │   └── [id]/
│   │   │       ├── page.tsx          # Detail + responses
│   │   │       └── shortlist/
│   │   │           └── page.tsx
│   │   ├── projects/
│   │   │   ├── page.tsx              # Kanban board
│   │   │   ├── new/
│   │   │   │   └── page.tsx
│   │   │   └── [id]/
│   │   │       └── page.tsx          # Project detail + milestones
│   │   ├── payments/
│   │   │   └── page.tsx
│   │   ├── analytics/
│   │   │   └── page.tsx
│   │   ├── notifications/
│   │   │   └── page.tsx
│   │   ├── settings/
│   │   │   ├── page.tsx              # Agency settings
│   │   │   ├── team/
│   │   │   │   └── page.tsx
│   │   │   ├── integrations/
│   │   │   │   └── page.tsx
│   │   │   └── billing/
│   │   │       └── page.tsx
│   │   └── layout.tsx                # Dashboard shell
│   │
│   ├── api/                          # Route Handlers
│   │   ├── auth/
│   │   │   ├── callback/
│   │   │   │   └── route.ts
│   │   │   ├── invite/
│   │   │   │   └── route.ts
│   │   │   └── session/
│   │   │       └── route.ts
│   │   ├── tenants/
│   │   │   ├── route.ts
│   │   │   └── [id]/
│   │   │       ├── route.ts
│   │   │       └── invite/
│   │   │           └── route.ts
│   │   ├── freelancers/
│   │   │   ├── route.ts
│   │   │   ├── import/
│   │   │   │   └── route.ts
│   │   │   ├── suggest/
│   │   │   │   └── route.ts
│   │   │   └── [id]/
│   │   │       └── route.ts
│   │   ├── opportunities/
│   │   │   ├── route.ts
│   │   │   └── [id]/
│   │   │       ├── route.ts
│   │   │       ├── broadcast/
│   │   │       │   └── route.ts
│   │   │       └── respond/
│   │   │           └── route.ts
│   │   ├── shortlists/
│   │   │   └── [opportunityId]/
│   │   │       ├── route.ts
│   │   │       └── items/
│   │   │           └── route.ts
│   │   ├── projects/
│   │   │   ├── route.ts
│   │   │   └── [id]/
│   │   │       ├── route.ts
│   │   │       ├── activity/
│   │   │       │   └── route.ts
│   │   │       └── milestones/
│   │   │           └── route.ts
│   │   ├── milestones/
│   │   │   └── [id]/
│   │   │       ├── route.ts
│   │   │       ├── submit/
│   │   │       │   └── route.ts
│   │   │       └── review/
│   │   │           └── route.ts
│   │   ├── payments/
│   │   │   ├── route.ts
│   │   │   ├── export/
│   │   │   │   └── route.ts
│   │   │   └── [id]/
│   │   │       ├── approve/
│   │   │       │   └── route.ts
│   │   │       ├── pay/
│   │   │       │   └── route.ts
│   │   │       └── dispute/
│   │   │           └── route.ts
│   │   ├── analytics/
│   │   │   ├── dashboard/
│   │   │   │   └── route.ts
│   │   │   ├── fill-rate/
│   │   │   │   └── route.ts
│   │   │   ├── utilization/
│   │   │   │   └── route.ts
│   │   │   └── payments/
│   │   │       └── route.ts
│   │   ├── notifications/
│   │   │   ├── route.ts
│   │   │   ├── read-all/
│   │   │   │   └── route.ts
│   │   │   └── [id]/
│   │   │       └── read/
│   │   │           └── route.ts
│   │   ├── integrations/
│   │   │   ├── [provider]/
│   │   │   │   └── route.ts
│   │   │   └── whatsapp/
│   │   │       └── test/
│   │   │           └── route.ts
│   │   └── webhooks/
│   │       ├── n8n/
│   │       │   └── route.ts
│   │       └── whatsapp/
│   │           └── route.ts
│   │
│   ├── actions/                      # Server Actions
│   │   ├── auth.ts
│   │   ├── tenants.ts
│   │   ├── freelancers.ts
│   │   ├── opportunities.ts
│   │   ├── shortlists.ts
│   │   ├── projects.ts
│   │   ├── milestones.ts
│   │   ├── payments.ts
│   │   └── notifications.ts
│   │
│   ├── globals.css
│   ├── layout.tsx                    # Root layout
│   ├── page.tsx                      # Landing / redirect
│   └── not-found.tsx
│
├── components/
│   ├── ui/                           # shadcn/ui primitives
│   │   ├── button.tsx
│   │   ├── card.tsx
│   │   ├── dialog.tsx
│   │   ├── dropdown-menu.tsx
│   │   ├── input.tsx
│   │   ├── select.tsx
│   │   ├── table.tsx
│   │   ├── badge.tsx
│   │   ├── avatar.tsx
│   │   ├── tabs.tsx
│   │   ├── toast.tsx
│   │   └── ...
│   ├── layout/
│   │   ├── sidebar.tsx
│   │   ├── header.tsx
│   │   ├── tenant-switcher.tsx
│   │   ├── notification-bell.tsx
│   │   └── breadcrumbs.tsx
│   ├── talent/
│   │   ├── talent-table.tsx
│   │   ├── talent-form.tsx
│   │   ├── talent-filters.tsx
│   │   ├── talent-card.tsx
│   │   └── talent-import-dialog.tsx
│   ├── opportunities/
│   │   ├── opportunity-form.tsx
│   │   ├── opportunity-card.tsx
│   │   ├── broadcast-dialog.tsx
│   │   ├── response-list.tsx
│   │   └── talent-suggestions.tsx
│   ├── shortlists/
│   │   ├── shortlist-board.tsx
│   │   ├── candidate-card.tsx
│   │   └── compare-table.tsx
│   ├── projects/
│   │   ├── project-kanban.tsx
│   │   ├── project-form.tsx
│   │   ├── project-header.tsx
│   │   ├── milestone-list.tsx
│   │   ├── milestone-timeline.tsx
│   │   ├── submit-deliverable-dialog.tsx
│   │   └── review-milestone-dialog.tsx
│   ├── payments/
│   │   ├── payment-table.tsx
│   │   ├── payment-status-badge.tsx
│   │   └── approve-payment-dialog.tsx
│   ├── analytics/
│   │   ├── dashboard-cards.tsx
│   │   ├── fill-rate-chart.tsx
│   │   ├── utilization-table.tsx
│   │   └── payment-aging-chart.tsx
│   └── shared/
│       ├── data-table.tsx
│       ├── empty-state.tsx
│       ├── loading-skeleton.tsx
│       ├── confirm-dialog.tsx
│       ├── file-upload.tsx
│       ├── status-badge.tsx
│       └── activity-feed.tsx
│
├── lib/
│   ├── core/                         # Shared domain foundation
│   │   ├── context.ts                # Supabase client + RepositoryContext
│   │   ├── errors.ts                 # DomainError, ErrorCodes
│   │   ├── result.ts                 # ActionResult helpers
│   │   ├── supabase-errors.ts        # PostgrestError mapping
│   │   └── validation.ts             # Zod parse helpers
│   ├── domains/                      # Domain-driven modules
│   │   └── talent/                   # Freelancers, portfolio, ratings
│   │       ├── factory.ts            # createTalentServices()
│   │       ├── types/
│   │       ├── validation/
│   │       ├── mappers/
│   │       ├── repositories/
│   │       └── services/
│   ├── supabase/
│   │   ├── client.ts                 # Browser client
│   │   ├── server.ts                 # Server component client
│   │   ├── middleware.ts             # Session refresh
│   │   └── admin.ts                  # Service role client (server only)
│   ├── auth/
│   │   ├── session.ts                # getSession, getUser
│   │   ├── permissions.ts            # Role checks
│   │   └── tenant-context.ts         # Resolve active tenant
│   ├── validations/
│   │   ├── freelancer.ts             # Zod schemas (legacy; talent uses lib/domains/talent)
│   │   ├── opportunity.ts
│   │   ├── project.ts
│   │   ├── milestone.ts
│   │   ├── payment.ts
│   │   └── tenant.ts
│   ├── api/
│   │   ├── response.ts               # Standard response helpers
│   │   ├── errors.ts                 # Error classes
│   │   └── pagination.ts
│   ├── integrations/
│   │   ├── whatsapp.ts               # WhatsApp Cloud API client
│   │   ├── n8n.ts                    # n8n webhook dispatcher
│   │   └── encryption.ts             # Config encryption
│   ├── analytics/
│   │   └── queries.ts                # Analytics query builders
│   └── utils/
│       ├── cn.ts                     # Tailwind merge
│       ├── format.ts                   # Currency, date formatting
│       └── constants.ts
│
├── hooks/
│   ├── use-tenant.ts
│   ├── use-notifications.ts
│   ├── use-realtime.ts
│   └── use-permissions.ts
│
├── types/
│   ├── database.ts                   # Generated from Supabase
│   ├── api.ts                        # API request/response types
│   └── enums.ts                      # Shared enum types
│
├── supabase/
│   ├── migrations/
│   │   ├── 001_initial_schema.sql
│   │   ├── 002_rls_policies.sql
│   │   ├── 003_functions_triggers.sql
│   │   └── 004_views_analytics.sql
│   ├── seed.sql                      # Dev seed data
│   └── config.toml
│
├── docs/                             # Architecture documentation
│   ├── 01-PRD.md
│   ├── 02-user-stories.md
│   ├── 03-database-schema.md
│   ├── 05-api-architecture.md
│   ├── 06-folder-structure.md
│   ├── 07-authentication-design.md
│   ├── 08-multi-tenant-architecture.md
│   ├── 09-n8n-workflows.md
│   ├── 10-whatsapp-integration.md
│   └── 25-talent-domain-refactor.md  # Architecture refactor log
│   └── 26-business-domains-refactor.md  # Business modules refactor log
│   └── 27-ai-gateway.md              # AI Gateway architecture
│   └── 28-mcp-architecture.md        # Model Context Protocol design
│
├── n8n/                              # n8n workflow exports (JSON)
│   ├── opportunity-broadcast.json
│   ├── project-assigned.json
│   ├── milestone-reminders.json
│   ├── payment-notifications.json
│   └── whatsapp-inbound.json
│
├── public/
│   ├── logo.svg
│   └── og-image.png
│
├── middleware.ts                      # Auth + tenant resolution
├── next.config.ts
├── tailwind.config.ts
├── tsconfig.json
├── package.json
├── .env.local.example
├── .eslintrc.json
└── README.md
```

---

## 2. Key Conventions

### 2.1 File Naming

| Type | Convention | Example |
|---|---|---|
| Pages | `page.tsx` | `app/talent/page.tsx` |
| Layouts | `layout.tsx` | `app/(dashboard)/layout.tsx` |
| API routes | `route.ts` | `app/api/freelancers/route.ts` |
| Components | `kebab-case.tsx` | `talent-table.tsx` |
| Server actions | `kebab-case.ts` | `freelancers.ts` |
| Hooks | `use-*.ts` | `use-tenant.ts` |
| Types | `kebab-case.ts` | `database.ts` |
| Validations | `kebab-case.ts` | `freelancer.ts` |

### 2.2 Import Aliases (`tsconfig.json`)

```json
{
  "compilerOptions": {
    "paths": {
      "@/*": ["./*"],
      "@/components/*": ["./components/*"],
      "@/lib/*": ["./lib/*"],
      "@/types/*": ["./types/*"],
      "@/hooks/*": ["./hooks/*"]
    }
  }
}
```

### 2.3 Component Organization

- **Server Components** by default (data fetching in pages)
- **Client Components** only when needed (interactivity, hooks, browser APIs)
- Mark with `'use client'` directive at top of file
- Co-locate component-specific types in the same file or adjacent `.types.ts`

### 2.4 Data Fetching Pattern

```typescript
// Server Component (page.tsx) — fetch data
export default async function TalentPage() {
  const supabase = createServerClient()
  const { data: freelancers } = await supabase.from('freelancers').select('*')
  return <TalentTable data={freelancers} />
}

// Client Component — interactivity only
'use client'
export function TalentTable({ data }: { data: Freelancer[] }) { ... }

// Server Action — mutations
'use server'
export async function createFreelancer(input: CreateFreelancerInput) { ... }
```

---

## 3. Environment Variables

```bash
# .env.local.example

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...        # Server only, never expose

# App
NEXT_PUBLIC_APP_URL=https://app.talent-os.com
NEXT_PUBLIC_APP_DOMAIN=talent-os.com

# Integrations (defaults, per-tenant overrides in DB)
N8N_WEBHOOK_BASE_URL=https://n8n.talent-os.com/webhook
WHATSAPP_VERIFY_TOKEN=your-verify-token
ENCRYPTION_KEY=32-byte-hex-key            # For integration config encryption

# Vercel (auto-set)
# VERCEL_URL
# VERCEL_ENV
```

---

## 4. Dependencies

```json
{
  "dependencies": {
    "next": "^15.0.0",
    "@supabase/supabase-js": "^2.45.0",
    "@supabase/ssr": "^0.5.0",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "zod": "^3.23.0",
    "date-fns": "^3.6.0",
    "lucide-react": "^0.400.0",
    "recharts": "^2.12.0",
    "class-variance-authority": "^0.7.0",
    "clsx": "^2.1.0",
    "tailwind-merge": "^2.3.0"
  },
  "devDependencies": {
    "typescript": "^5.5.0",
    "@types/react": "^19.0.0",
    "tailwindcss": "^3.4.0",
    "eslint": "^8.57.0",
    "eslint-config-next": "^15.0.0",
    "supabase": "^1.200.0"
  }
}
```
