# Talent OS

A multi-tenant Talent Operating System for creative agencies. Manage freelance talent, broadcast opportunities, shortlist candidates, assign projects, track delivery, process payments, and analyze performance — all in one platform.

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 15, TypeScript, React 19, Tailwind CSS |
| Backend | Next.js Server Actions + Route Handlers |
| Database | Supabase (PostgreSQL 15) |
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
| 4 | [Supabase SQL](supabase/migrations/) | Migration files (schema, RLS, triggers, analytics) |
| 5 | [API Architecture](docs/05-api-architecture.md) | REST endpoints, server actions, event contracts |
| 6 | [Folder Structure](docs/06-folder-structure.md) | Next.js project tree and conventions |
| 7 | [Authentication Design](docs/07-authentication-design.md) | Auth flows, RBAC, session management |
| 8 | [Multi-Tenant Architecture](docs/08-multi-tenant-architecture.md) | RLS isolation, subdomain routing, scaling |
| 9 | [n8n Workflows](docs/09-n8n-workflows.md) | 12 workflow specifications with payloads |
| 10 | [WhatsApp Integration](docs/10-whatsapp-integration.md) | Templates, webhooks, inbound parsing |
| 11 | [Enterprise System Architecture](docs/11-enterprise-system-architecture.md) | HLD, components, events, webhooks, security, scale |

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

Run in order against your Supabase project:

```bash
supabase db push
# or manually:
psql -f supabase/migrations/001_initial_schema.sql
psql -f supabase/migrations/002_rls_policies.sql
psql -f supabase/migrations/003_functions_triggers.sql
psql -f supabase/migrations/004_views_analytics.sql
psql -f supabase/migrations/005_event_infrastructure.sql
```

## Quick Start (Development)

```bash
# Clone and install
git clone <repo-url> && cd talent-os
npm install

# Configure environment
cp .env.local.example .env.local
# Fill in Supabase URL, anon key, service role key

# Run migrations
supabase db push

# Start dev server
npm run dev
```

## License

Proprietary. All rights reserved.
