# Developer Guide

Everything you need to run, test, and extend Talent OS locally.

---

## Prerequisites

| Tool | Version |
|---|---|
| Node.js | 20+ |
| npm | 10+ |
| Supabase CLI | Latest (optional, for migrations) |
| Git | 2.x |

---

## Quick Start

```bash
git clone <repo-url> && cd talent-os
npm install

cp .env.local.example .env.local
# Fill in Supabase URL, anon key, service role key

supabase db push          # apply migrations
npm run dev               # http://localhost:3000
```

---

## Daily Workflow

```bash
npm run dev              # development server
npm run typecheck        # TypeScript
npm run lint             # ESLint
npm test                 # Vitest (all)
npm run test:watch       # watch mode
npm run docs:generate    # refresh auto-generated docs
```

---

## Architecture Rules

1. **Pages → queries → services → repositories** — never skip layers
2. **All LLM calls** through `lib/ai/gateway.ts`
3. **Side effects** via domain events + workflow engine
4. **Tenant scope** on every data operation
5. **No prompts in UI** — agent instructions are server-side only

See [Architecture](./architecture.md)

---

## Adding a Feature

### New domain module

1. Create `modules/<name>/types.ts` + `validation.ts`
2. Add migration `supabase/migrations/NNN_<name>.sql`
3. Add repository `lib/repositories/<name>.repository.ts`
4. Add service `lib/services/<name>.service.ts`
5. Wire in `lib/repositories/factory.ts` + `lib/services/factory.ts`
6. Add queries `lib/queries/<name>.queries.ts`
7. Add actions `app/actions/<name>.ts`
8. Add tests in `tests/`
9. Run `npm run docs:generate`

### New API route

1. Create `app/api/<path>/route.ts`
2. Use `createServices()` or `createAdminServices()`
3. Run `npm run docs:generate` to update catalog

### New workflow

1. Emit domain event from service
2. Add definition to `lib/workflows/registry.ts`
3. Run `npm run docs:generate`

---

## Testing

| Layer | Command | Location |
|---|---|---|
| All | `npm test` | `tests/` |
| Unit | `npm run test:unit` | `tests/unit/` |
| Repository | `npm run test:repository` | `tests/repository/` |
| Service | `npm run test:service` | `tests/service/` |
| Workflow | `npm run test:workflow` | `tests/workflow/` |
| Integration | `npm run test:integration` | `tests/integration/` |
| Coverage | `npm run test:coverage` | → `coverage/` |

See [36 Testing](./36-testing.md)

---

## Key Files

| Purpose | Path |
|---|---|
| Service factory | `lib/services/factory.ts` |
| Repository factory | `lib/repositories/factory.ts` |
| Permissions | `modules/core/services/permissions.ts` |
| DB types | `modules/core/types/database.ts` |
| Workflow registry | `lib/workflows/registry.ts` |
| MCP tools | `lib/mcp/servers/` |
| Agent registry | `lib/ai/agent/registry.ts` |

---

## Related

- [Contribution Guide](./contribution-guide.md)
- [Testing](./36-testing.md)
- [Folder Structure](./folder-structure.md)
