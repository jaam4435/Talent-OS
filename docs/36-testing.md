# Testing

Talent OS uses [Vitest](https://vitest.dev/) for unit, repository, service, workflow, and integration tests.

## Commands

| Command | Description |
|---|---|
| `npm test` | Run all tests |
| `npm run test:watch` | Watch mode |
| `npm run test:unit` | Unit tests only |
| `npm run test:repository` | Repository tests (mocked Supabase) |
| `npm run test:service` | Service tests (mocked repositories) |
| `npm run test:workflow` | Workflow engine tests |
| `npm run test:integration` | Cross-layer integration tests |
| `npm run test:coverage` | Full suite + V8 coverage report |

Coverage output: `coverage/` (HTML, LCOV, text summary).

## Structure

```
tests/
├── setup.ts                 # Global mocks (Supabase clients)
├── helpers/
│   ├── mock-supabase.ts     # Chainable Supabase query mock
│   └── mock-repositories.ts # Service-layer repo mocks
├── unit/                    # Pure functions, validation, permissions
├── repository/              # Repository CRUD with mocked Supabase
├── service/                 # Business logic with mocked repos
├── workflow/                # Conditions + registry
└── integration/             # Multi-layer flows (mocked I/O)
```

## Conventions

- Tests live outside `lib/` and `modules/` — no co-located test files
- Repository tests mock Supabase via `createMockSupabase()`
- Service tests mock repositories via `createMockRepositories()`
- Integration tests combine layers with mocked external I/O only
- No live database or network calls in CI

## CI

`.github/workflows/ci.yml` runs typecheck, lint, and `test:coverage` on push/PR to `main`.
