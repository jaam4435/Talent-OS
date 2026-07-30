# Contribution Guide

Guidelines for contributing to Talent OS.

---

## Branch Naming

```
cursor/<descriptive-name>-5fb1
```

Examples: `cursor/knowledge-module-5fb1`, `cursor/testing-improvements-5fb1`

- Always use `cursor/` prefix
- Always append `-5fb1` suffix
- Lowercase, hyphen-separated

---

## Pull Request Process

1. Create feature branch from latest base
2. Implement with focused, minimal diffs
3. Run quality checks:

```bash
npm run typecheck
npm run lint
npm test
npm run docs:generate
npm run docs:check
```

4. Commit with descriptive messages (complete sentences)
5. Push and open **draft PR**
6. Ensure CI passes (typecheck, lint, test, docs)

---

## Code Standards

### Layering

```
Pages      → lib/queries/*     (reads)
Actions    → createServices()  (writes)
Services   → repositories      (orchestration)
```

Never access Supabase or repositories from pages.

### Style

- Match surrounding code conventions (naming, imports, error handling)
- Use existing abstractions — don't reimplement similar logic
- Minimize scope — focused diffs only
- Comments only for non-obvious business logic
- TypeScript strict mode — no `any` unless unavoidable

### Services return pattern

```typescript
Promise<{ ok: true; data: T } | { ok: false; error: string }>
```

### Errors

Use `DomainError` + `isDomainError()` from `modules/core/utils/errors.ts`

---

## Documentation

When your change affects architecture, API, schema, or conventions:

1. Update the relevant guide in `docs/`
2. Run `npm run docs:generate` for catalog updates
3. CI will fail if generated docs are stale

| Change type | Update |
|---|---|
| New API route | Auto-generated (run docs:generate) |
| New migration | Auto-generated |
| New MCP tool | Auto-generated |
| New workflow | Auto-generated + update `lib/workflows/registry.ts` |
| Architecture change | Update `docs/architecture.md` |
| New convention | Update `docs/developer-guide.md` |

---

## Testing Requirements

- Add tests for new business logic (service, workflow, validation)
- Repository tests use mocked Supabase (`tests/helpers/mock-supabase.ts`)
- Service tests use mocked repos (`tests/helpers/mock-repositories.ts`)
- All tests must pass before merge

---

## Commit Messages

```
feat: add Knowledge module with vector search preparation

Introduce tenant-scoped knowledge base for meeting notes, SOPs, …
- Migration 016: knowledge_entries, knowledge_embeddings
- KnowledgeService with CRUD and full-text search
```

Use conventional prefixes: `feat:`, `fix:`, `docs:`, `test:`, `refactor:`, `chore:`

---

## Related

- [Developer Guide](./developer-guide.md)
- [Architecture](./architecture.md)
- [Testing](./36-testing.md)
