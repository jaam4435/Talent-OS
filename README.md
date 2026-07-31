# Talent OS

A multi-tenant Talent Operating System for creative agencies. Manage freelance talent, broadcast opportunities, shortlist candidates, assign projects, track delivery, process payments, and analyze performance — all in one platform.

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 15, TypeScript, React 19, Tailwind CSS |
| Backend | Next.js Server Actions + Route Handlers |
| Database | Supabase (PostgreSQL 17) |
| Auth | Supabase Auth (JWT, magic links) |
| Storage | Supabase Storage |
| Automation | n8n |
| Messaging | WhatsApp Cloud API |
| Deployment | Vercel |

## Users

- **Admin** — Agency owner; full access, billing, integrations
- **Talent Manager** — Producers; talent roster, opportunities, projects
- **Freelancer** — Contractors; respond to gigs, submit work, track payments

## Core Modules

- Talent database with search, skills, and ratings
- Opportunity broadcasting (in-app + WhatsApp)
- Shortlisting and candidate comparison
- Project assignment with milestones
- Status tracking (Kanban + activity log)
- Payment workflow (pending → approved → paid)
- Analytics dashboards (fill rate, utilization, payment aging)

## Architecture Documentation

| # | Document | Description |
|---|---|---|
| 1 | [PRD](docs/01-PRD.md) | Product requirements, scope, KPIs, release plan |
| 2 | [User Stories](docs/02-user-stories.md) | 36 stories across 9 epics with acceptance criteria |
| 3 | [Database Schema](docs/03-database-schema.md) | ERD, tables, enums, views, storage buckets |
| 4 | [**Complete Supabase Schema**](docs/04-supabase-complete-schema.md) | Tables, FKs, RLS matrix, triggers, migrations |
| 5 | [Supabase SQL](supabase/migrations/) | Migration files 001–021 |
| 6 | [API Architecture](docs/05-api-architecture.md) | REST endpoints, server actions, event contracts |
| 7 | [Folder Structure](docs/06-folder-structure.md) | Next.js project tree and conventions |
| 8 | [Authentication Design](docs/07-authentication-design.md) | Auth flows, RBAC, session management |
| 9 | [Multi-Tenant Architecture](docs/08-multi-tenant-architecture.md) | RLS isolation, subdomain routing, scaling |
| 10 | [n8n Workflows](docs/09-n8n-workflows.md) | 12 workflow specifications with payloads |
| 11 | [WhatsApp Integration](docs/10-whatsapp-integration.md) | Templates, webhooks, inbound parsing |
| 12 | [Enterprise System Architecture](docs/11-enterprise-system-architecture.md) | HLD, components, events, webhooks, security, scale |
| 13 | [**WhatsApp + n8n Integration**](docs/12-whatsapp-n8n-integration-architecture.md) | **Unified messaging orchestration architecture** |
| 24 | [**Technical Audit**](docs/24-technical-audit.md) | Codebase audit: architecture, schema, debt, AI roadmap |
| — | [**Enterprise Readiness Review**](docs/Platform/ENTERPRISE_READINESS_REVIEW.md) | Production readiness assessment |
| — | [**Gap Analysis Study Pack**](docs/Platform/GAP_ANALYSIS_STUDY_PACK.md) | Curated docs + code index for gap review |
| — | [**Production Readiness Report**](docs/Platform/PRODUCTION_READINESS_REPORT.md) | Post-P0 readiness assessment (v3) |
| — | [**Distributed State Architecture**](docs/Platform/DISTRIBUTED_STATE_ARCHITECTURE.md) | Redis + Postgres distributed state |
| — | [SECURITY.md](SECURITY.md) | Security policy and controls |

### Platform Architecture (design)

| Document | Description |
|----------|-------------|
| [AI Platform](docs/Architecture/AI_PLATFORM.md) | Shared AI gateway, prompts, embeddings, cost, observability |
| [AI Gap Analysis](docs/Architecture/AI_GAP_ANALYSIS.md) | Implementation maturity vs target (~38%) |
| [AI Implementation Roadmap](docs/Architecture/AI_IMPLEMENTATION_ROADMAP.md) | 83 PRs: Platform Core + 6 platform waves + AI |
| [Platform Core](docs/Architecture/PLATFORM_CORE.md) | Shared SDK: org context, products, flags MVP, config, events |
| [Engineering Execution Plan](docs/Architecture/ENGINEERING_EXECUTION_PLAN.md) | 5 sprints × 3 weeks — PR assignment, release, and demo plan |
| [Billing Platform](docs/Architecture/BILLING_PLATFORM.md) | SaaS billing: org → subscription → plan → seats → usage → invoice → payments |
| [Feature Flags Platform](docs/Architecture/FEATURE_FLAGS_PLATFORM.md) | Feature → environment → org → rollout → experiment |
| [Search Platform](docs/Architecture/SEARCH_PLATFORM.md) | Search → keyword → semantic → hybrid → filters → saved search |
| [Audit Platform](docs/Architecture/AUDIT_PLATFORM.md) | Actor → action → object → before → after → timestamp → source |
| [Workflow Platform](docs/Architecture/WORKFLOW_PLATFORM.md) | Lead → opportunity → proposal → project → assignment → QA → delivery → invoice |

## Enterprise Architecture Highlights

The [enterprise architecture document](docs/11-enterprise-system-architecture.md) covers:

1. **High-Level Architecture** — C4 context, layered design, bounded contexts
2. **Component Diagram** — Next.js, Supabase, n8n, AI gateway, shadcn/ui
3. **Service Diagram** — Vercel, Supabase, n8n cluster, external providers
4. **Database Architecture** — Schema layers, indexing, read/write separation
5. **Event-Driven Architecture** — Transactional outbox, 16-event catalog, retry policy
6. **Webhook Architecture** — Inbound gateway, HMAC verification, idempotency
7. **Workflow Engine Design** — 14 n8n workflows, AI + email orchestration
8. **Multi-Tenant Design** — RLS isolation, subdomain routing, tier enforcement
9. **Security Model** — STRIDE threat model, RBAC, compliance, encryption
10. **Scalability Model** — Capacity planning, caching, DR, cost model

## Database Migrations

Run all migrations in order against your Supabase project:

```bash
supabase db push
# Migrations 001–021 (see supabase/migrations/)
```

## Quick Start (Development)

```bash
# Clone and install
git clone <repo-url> && cd talent-os
npm install

# Configure environment
cp .env.local.example .env.local
# Fill in Supabase URL, anon key, service role key

# Run Supabase migrations
supabase db push

# Start dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) — redirects to `/login` or `/dashboard`.

### Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Production build |
| `npm run lint` | ESLint |
| `npm run typecheck` | TypeScript check |
| `npm test` | Unit + integration tests (Vitest) |
| `npm run test:e2e` | E2E tests (Playwright) |
| `npm run test:all` | Run all test suites |

## License

Proprietary. All rights reserved.
