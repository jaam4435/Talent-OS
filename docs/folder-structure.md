# Folder Structure

Next.js 15 App Router project with domain modules, service layer, and Supabase backend.

> **Auto-generated:** [Modules](./generated/modules.md) · [Services](./generated/services.md) · [Repositories](./generated/repositories.md)

Full tree detail: [06-folder-structure.md](./06-folder-structure.md) (maintained reference)

---

## Top-Level Layout

```
talent-os/
├── app/                    # Next.js App Router (pages, API, actions)
├── components/             # Shared UI components
├── lib/                    # Application code
│   ├── ai/                 # AI Gateway + agent framework
│   ├── mcp/                # MCP tool definitions + gateway
│   ├── repositories/       # Data access layer
│   ├── services/           # Business orchestration
│   ├── queries/            # Read models for RSC
│   ├── workflows/          # Workflow engine
│   ├── whatsapp/         # WhatsApp interface
│   ├── integrations/       # n8n, AI executors
│   └── marketplace/        # Marketplace boundaries
├── modules/                # Domain types + validation
│   ├── core/               # Auth, RBAC, shared UI
│   ├── knowledge/          # Knowledge base types
│   ├── agents/             # Agent framework types
│   └── marketplace/        # Marketplace types
├── supabase/migrations/    # SQL migrations (001–018)
├── tests/                  # Vitest test suite
├── scripts/                # Doc generator, utilities
└── docs/                   # Documentation (you are here)
```

---

## Layer Conventions

| Layer | Path | Rule |
|---|---|---|
| Pages | `app/(dashboard)/**/page.tsx` | Server Components, call queries |
| Actions | `app/actions/*.ts` | Mutations via services |
| Queries | `lib/queries/*.queries.ts` | Reads via services |
| Services | `lib/services/*.service.ts` | Business logic |
| Repositories | `lib/repositories/*.repository.ts` | Supabase CRUD |
| Types | `modules/*/types.ts` | Domain types + Zod |

---

## Naming Conventions

| Type | Convention | Example |
|---|---|---|
| Pages | `page.tsx` | `app/talent/page.tsx` |
| Components | `kebab-case.tsx` | `talent-table.tsx` |
| Services | `domain.service.ts` | `project.service.ts` |
| Repositories | `domain.repository.ts` | `talent.repository.ts` |
| Actions | `domain.ts` | `app/actions/freelancers.ts` |
| Migrations | `NNN_description.sql` | `016_knowledge_module.sql` |
| Branches | `cursor/description-5fb1` | Feature branches |
| Tests | `*.test.ts` in `tests/` | `tests/unit/core.test.ts` |

---

## Import Aliases

```json
{ "@/*": ["./*"] }
```

---

## Related

- [06 Folder Structure (full tree)](./06-folder-structure.md)
- [Architecture](./architecture.md)
- [Developer Guide](./developer-guide.md)
