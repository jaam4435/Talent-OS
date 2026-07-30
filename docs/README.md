# Talent OS Documentation

Central documentation hub for Talent OS. Guides are maintained manually; reference catalogs are **auto-generated** from source on every CI run.

**Last catalog sync:** see [generated/manifest.json](./generated/manifest.json)

---

## Platform Blueprint

**Authoritative architecture for platform evolution** — read before large implementations.

→ **[Platform Blueprint Index](./Platform/README.md)** (20 documents)

| Start here | Document |
|------------|----------|
| North star | [01 Vision](./Platform/01%20Vision.md) |
| Architecture | [06 C4 Architecture](./Platform/06%20C4%20Architecture.md) |
| Roadmap | [19 Roadmap](./Platform/19%20Roadmap.md) |
| Security | [13 Security Model](./Platform/13%20Security%20Model.md) |
| Staff audit | [FINAL Audit](./FINAL_AUDIT.md) |
| Gap analysis | [Architecture Gap Analysis](./Platform/Architecture%20Gap%20Analysis.md) |

---

## Guides

| Guide | Description |
|---|---|
| [Architecture](./architecture.md) | System design, layers, bounded contexts |
| [API](./api.md) | Routes, server actions, auth patterns |
| [Database](./database.md) | Schema, migrations, RLS |
| [Events](./events.md) | Domain events, outbox, webhooks |
| [MCP](./mcp.md) | Model Context Protocol tool catalog |
| [AI](./ai.md) | AI Gateway, features, agents |
| [Workflow](./workflow.md) | Workflow engine, jobs, approvals |
| [Deployment](./deployment.md) | Vercel, Supabase, environment |
| [Folder Structure](./folder-structure.md) | Project tree and conventions |
| [Developer Guide](./developer-guide.md) | Local setup, workflow, testing |
| [Contribution Guide](./contribution-guide.md) | PRs, branches, code standards |
| [Operations Guide](./operations-guide.md) | Cron, monitoring, incidents |
| [System Diagrams](./system-diagrams.md) | Mermaid architecture diagrams |

---

## Auto-Generated Reference

Regenerate locally: `npm run docs:generate`

| Catalog | Source |
|---|---|
| [API Routes](./generated/api-routes.md) | `app/api/**/route.ts` |
| [Server Actions](./generated/server-actions.md) | `app/actions/*.ts` |
| [Migrations](./generated/migrations.md) | `supabase/migrations/*.sql` |
| [MCP Tools](./generated/mcp-tools.md) | `lib/mcp/servers/*.ts` |
| [Workflows](./generated/workflows.md) | `lib/workflows/registry.ts` |
| [Services](./generated/services.md) | `lib/services/*.ts` |
| [Repositories](./generated/repositories.md) | `lib/repositories/*.ts` |
| [Modules](./generated/modules.md) | `modules/*/` |

---

## Deep-Dive Documents (Legacy Numbered)

| Doc | Topic |
|---|---|
| [01 PRD](./01-PRD.md) | Product requirements |
| [08 Multi-Tenant](./08-multi-tenant-architecture.md) | Tenant isolation |
| [11 Enterprise Architecture](./11-enterprise-system-architecture.md) | Full HLD |
| [24 Technical Audit](./24-technical-audit.md) | Initial codebase audit |
| [FINAL Audit](./FINAL_AUDIT.md) | Staff engineer audit (Jul 2026) |
| [30 Service Layer](./30-service-layer.md) | Service patterns |
| [31 Workflow Engine](./31-workflow-engine.md) | Workflow detail |
| [32 WhatsApp Interface](./32-whatsapp-interface.md) | WhatsApp pipeline |
| [33 Knowledge Module](./33-knowledge-module.md) | Knowledge base |
| [34 Agent Framework](./34-agent-framework.md) | AI agents |
| [35 Marketplace Architecture](./35-marketplace-architecture.md) | Marketplace blueprint |
| [36 Testing](./36-testing.md) | Vitest suite |

---

## Keeping Docs Updated

1. **Reference catalogs** — auto-synced via `npm run docs:generate` (runs in CI)
2. **Guides** — update when architecture or conventions change
3. **CI check** — `npm run docs:check` fails if generated docs are stale (`git diff`)

```bash
npm run docs:generate   # regenerate catalogs
npm run docs:check      # verify catalogs match codebase (CI)
```
