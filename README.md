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
| Automation | n8n + Workflow Engine |
| AI | OpenAI / Anthropic via AI Gateway |
| Agents | MCP + configurable agent framework |
| Deployment | Vercel |

## Documentation

**Start here:** [docs/README.md](docs/README.md)

| Guide | Description |
|---|---|
| [Architecture](docs/architecture.md) | System design and layers |
| [API](docs/api.md) | Routes, actions, auth |
| [Database](docs/database.md) | Schema, migrations, RLS |
| [Events](docs/events.md) | Domain events and outbox |
| [MCP](docs/mcp.md) | AI agent tool catalog |
| [AI](docs/ai.md) | AI Gateway and features |
| [Workflow](docs/workflow.md) | Workflow engine |
| [Deployment](docs/deployment.md) | Vercel + Supabase |
| [Developer Guide](docs/developer-guide.md) | Local setup and workflow |
| [Contribution Guide](docs/contribution-guide.md) | PR standards |
| [Operations Guide](docs/operations-guide.md) | Production ops |
| [System Diagrams](docs/system-diagrams.md) | Mermaid diagrams |

Auto-generated catalogs (API routes, migrations, MCP tools, etc.) update via `npm run docs:generate`.

## Quick Start

```bash
git clone <repo-url> && cd talent-os
npm install
cp .env.local.example .env.local   # fill Supabase credentials
supabase db push
npm run dev                        # http://localhost:3000
```

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Development server |
| `npm run build` | Production build |
| `npm run typecheck` | TypeScript check |
| `npm run lint` | ESLint |
| `npm test` | Run all tests |
| `npm run test:coverage` | Tests + coverage report |
| `npm run docs:generate` | Regenerate doc catalogs from source |
| `npm run docs:check` | Verify catalogs are up to date (CI) |

## License

Proprietary. All rights reserved.
