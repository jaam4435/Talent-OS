# 15 — Engineering Standards

| Field | Value |
|-------|-------|
| **Version** | 1.0.0 |
| **Status** | Draft — Awaiting Approval |
| **Owner** | Platform Architecture |
| **Related** | [02 Product Philosophy](02%20Product%20Philosophy.md) · [17 API Standards](17%20API%20Standards.md) · [docs/contribution-guide.md](../contribution-guide.md) |

---

## Purpose

Engineering standards ensure Talent OS remains **maintainable, secure, and consistent** as the team and codebase grow. These rules apply to all contributors including AI agents.

---

## Architecture Rules

| # | Rule | Enforcement |
|---|------|-------------|
| A1 | Pages never import repositories or Supabase directly | Code review |
| A2 | All mutations go through services | Code review |
| A3 | All LLM calls go through AI Gateway | Lint rule (target) |
| A4 | Side effects emit domain events | Code review |
| A5 | No business logic in webhook handlers | Code review |
| A6 | No business logic duplicated in n8n | Architecture review |
| A7 | MCP adapters call services, not repositories | Code review |
| A8 | Migrations are additive and backwards compatible | Migration review |

Layer diagram: [06 C4 Architecture](06%20C4%20Architecture.md)

---

## Layering Contract

```
Presentation   app/                     Server Components, Client Components
Read model     lib/queries/*.queries.ts  Reads via createServices()
Mutations      app/actions/*.ts          Writes via createServices()
Orchestration  lib/services/*.service.ts Business rules + events
Data access    lib/repositories/*.ts     Supabase queries + RPCs
Domain types   modules/*/types.ts        Shared types and validation
Infrastructure modules/core/utils/      Auth, Supabase clients, errors
```

### Factory Usage

| Context | Factory | Supabase Client |
|---------|---------|-----------------|
| User request | `createServices()` | User JWT (RLS) |
| Cron / webhook / internal | `createAdminServices()` | Service role |

---

## Code Style

- **TypeScript strict mode** — no `any` unless documented exception
- **Match surrounding conventions** — naming, imports, error patterns
- **Minimal scope** — focused diffs; no drive-by refactors
- **Comments** — only non-obvious business logic
- **No over-engineering** — no abstractions for one-time operations

### Service Return Pattern

```typescript
Promise<{ ok: true; data: T } | { ok: false; error: string }>
```

### Errors

Use `DomainError` + `isDomainError()` from `modules/core/utils/errors.ts`.

---

## Git & Branching

| Rule | Value |
|------|-------|
| Branch prefix | `cursor/` |
| Branch suffix | `-5fb1` |
| Example | `cursor/platform-blueprint-5fb1` |
| Base branch | `main` |
| PR default | Draft until ready |

### Commit Messages

- Complete sentences
- Describe **what** and **why**
- Reference platform doc or audit ID when fixing known issues

Example: `fix(security): add SYSTEM_ROUTES bypass in middleware (C-01)`

---

## Pull Request Process

1. Create feature branch from latest `main`
2. Implement with focused commits
3. Run quality gates:

```bash
npm run typecheck
npm run lint
npm test
npm run docs:generate
npm run docs:check
```

4. Push and open draft PR
5. Ensure CI passes
6. Update documentation (see below)
7. Request review before merge

---

## Testing Standards

### Current State

| Metric | Value |
|--------|-------|
| Tests | 79 passing |
| Coverage | ~9% lines |
| Framework | Vitest |

### Target State

| Layer | Minimum Coverage | Location |
|-------|------------------|----------|
| Unit | 60% | `tests/unit/` |
| Repository | 50% | `tests/repository/` |
| Service | 60% | `tests/service/` |
| Workflow | 70% | `tests/workflow/` |
| Integration | Critical paths | `tests/integration/` |
| RLS | All policies | `tests/integration/rls/` (target) |

### Required Tests for Changes

| Change Type | Required Test |
|-------------|---------------|
| New service method | Service unit test |
| New workflow | Registry + trigger test |
| Security fix | Regression test |
| New MCP adapter | Tool invocation test |
| Migration | Apply test + RLS verify |

See [docs/36-testing.md](../36-testing.md).

---

## Documentation Standards

### When to Update Docs

| Change | Update |
|--------|--------|
| New API route | Auto-generated + [17 API Standards](17%20API%20Standards.md) |
| New domain event | [16 Event Catalog](16%20Event%20Catalog.md) |
| Schema change | [18 Data Model](18%20Data%20Model.md) + migration comment |
| Architecture change | Relevant Platform doc + [06 C4 Architecture](06%20C4%20Architecture.md) |
| New workflow | Registry + `npm run docs:generate` |
| Security change | [13 Security Model](13%20Security%20Model.md) |
| ADR | [20 Technical Decisions](20%20Technical%20Decisions.md) |

### Auto-Generated Catalogs

```bash
npm run docs:generate   # regenerate
npm run docs:check      # CI freshness gate
```

Never hand-edit `docs/generated/*`.

---

## Database Standards

| Rule | Detail |
|------|--------|
| Migration naming | `NNN_descriptive_name.sql` |
| Dependencies | Comment header: `-- Depends on: 00X` |
| RLS | Enable on every tenant table |
| Indexes | Match query patterns; partial indexes for status filters |
| RPC security | SECURITY DEFINER requires caller validation |
| Rollback | Document manual rollback in migration notes |

See [18 Data Model](18%20Data%20Model.md).

---

## API Standards Summary

See full spec: [17 API Standards](17%20API%20Standards.md)

| Surface | Auth | Tenant |
|---------|------|--------|
| Server Actions | Session | `requireTenant()` |
| Route Handlers (user) | JWT | Header or query |
| Route Handlers (system) | CRON_SECRET / HMAC | From payload |
| MCP Tools | Session context | `context.tenantId` |

---

## Security Standards

- Never commit secrets
- Never expose service role key to client
- Fail closed in production for missing webhook secrets
- Validate tenant on every admin service call
- No SECURITY DEFINER without `auth.uid()` or service-role-only grant

See [13 Security Model](13%20Security%20Model.md).

---

## Planning Before Implementation

**No large changes without a plan.**

1. Read affected Platform docs
2. Read [FINAL Audit](../FINAL_AUDIT.md) for known issues
3. Write implementation plan (PR description or design doc)
4. Get approval for architectural changes
5. Implement in small reviewable commits
6. Update docs after each merge

---

## Code Review Checklist

- [ ] Follows layering rules (A1–A8)
- [ ] Tenant isolation verified
- [ ] Events emitted for side effects
- [ ] No AI bypass paths
- [ ] Tests added/updated
- [ ] Docs updated
- [ ] `npm run docs:check` passes
- [ ] Backwards compatible
- [ ] No secrets in diff

---

## Cross-References

| Document | Relationship |
|----------|--------------|
| [17 API Standards](17%20API%20Standards.md) | API conventions |
| [20 Technical Decisions](20%20Technical%20Decisions.md) | ADRs |
| [docs/developer-guide.md](../developer-guide.md) | Local setup |
| [docs/contribution-guide.md](../contribution-guide.md) | Contribution flow |
