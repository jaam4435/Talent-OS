# Service Layer

Business logic lives in `lib/services/`. Services orchestrate repositories; pages and actions never call repositories directly.

## Architecture

```
Pages / API routes     →  lib/queries/*.queries.ts  (read models)
Server actions         →  lib/services/*             (commands)
Integrations / cron    →  createAdminServices()      (background)
                              ↓
                         lib/repositories/*
                              ↓
                         Supabase
```

Integrations (`lib/integrations/*`), webhooks, and AI executors call `createAdminServices()` — never repositories directly.

## Services

| Service | Responsibility |
|---|---|
| `ProjectService` | Project CRUD, status transitions, project page data |
| `TalentService` | Freelancer roster CRUD, search, profile reads |
| `AssignmentService` | Shortlists, broadcasts, talent-to-opportunity assignment |
| `CRMService` | Companies, opportunities/leads, responses |
| `WorkflowService` | Milestones, domain events, delivery workflow |
| `FinanceService` | Payments / invoices |
| `AnalyticsService` | Dashboard summaries, team roster reads |
| `NotificationService` | In-app notifications |
| `AIService` | AI governance, requests, match, brief parse, summaries, status assessment |
| `IntegrationService` | n8n/WhatsApp webhooks, webhook delivery audit |

## Factory

```typescript
import { createServices, createAdminServices } from '@/lib/services'

const services = await createServices()       // session-scoped
const admin = await createAdminServices()     // service role
```

Services are wired with shared repository instances. Cross-service calls use constructor injection (e.g. `ProjectService` → `WorkflowService` for events).

## Query layer

`lib/queries/` provides read-only functions for Server Components. Each query delegates to the appropriate service:

- `projects.queries.ts` → `ProjectService`
- `opportunities.queries.ts` → `CRMService`
- `companies.queries.ts` → `CRMService` + `AssignmentService`
- `talent.queries.ts` → `TalentService`
- `ai.queries.ts` → `AIService`
- etc.

Pages import from `lib/queries/*`, never from `lib/repositories/*` or `lib/services/*` directly (except via actions).

## Server actions

Actions handle auth, validation, revalidation, and delegate to services:

```typescript
const services = await createServices()
const result = await services.project.createProject({ ... })
```

## Domain compatibility

`lib/domains/talent/factory.ts` delegates to `createServices()` for talent operations. Portfolio uploads remain in `PortfolioService` (uses repositories via domain repos).

## Adding a feature

1. Add repository method(s) if needed
2. Add service method with business rules
3. Call service from action or query
4. Never import `createRepositories()` from pages or actions — use `createServices()` instead
