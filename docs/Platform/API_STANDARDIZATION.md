# API Standardization

Talent OS HTTP APIs follow a unified platform standard for errors, validation, pagination, authentication, authorization, versioning, idempotency, and rate limiting. Server Actions retain their `{ ok: true/false }` contract with optional error codes via the action adapter.

## Standard Response Envelope

**Success:**
```json
{
  "data": { ... },
  "meta": { "page": 1, "limit": 20, "total": 100 }
}
```

**Error:**
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "opportunity_id is required",
    "details": {}
  }
}
```

**Legacy endpoints** (health, webhooks, cron) return their original body shape with standard headers added.

## Standard Headers

| Header | Purpose |
|--------|---------|
| `X-API-Version` | API version (default `v1`) |
| `X-Request-ID` | Unique request identifier |
| `X-Correlation-ID` | Client-supplied correlation (optional) |
| `Idempotency-Key` | Idempotent mutation key (optional) |
| `X-Idempotent-Replayed` | Set when cached idempotent response returned |

## Platform Modules

```
modules/core/api/
  errors.ts           — Standard error codes
  error-mapper.ts     — Map DomainError/session errors → AppError
  context.ts          — Request context (version, idempotency, correlation)
  validation.ts       — Zod body/query validation
  pagination.ts       — Page/limit/offset/sort parsing
  auth.ts             — authenticateRequest (session, tenant, admin, cron)
  rate-limit.ts       — Per-category rate limits
  idempotency.ts      — Idempotency-Key caching
  handler.ts          — withApiHandler wrapper
  action-adapter.ts   — Server action compatibility layer
  response.ts         — success/error/legacySuccess
```

## Authentication Modes

| Mode | Used by |
|------|---------|
| `none` | Health, webhooks, OpenAPI |
| `optional` | Session endpoint |
| `session` | Authenticated, tenant optional |
| `tenant` | Most user APIs |
| `admin` | Team management |
| `manager` | Manager-only APIs |
| `cron` | Cron + internal (`Bearer CRON_SECRET`) |

## Rate Limits (per minute)

| Category | Limit |
|----------|-------|
| default | 120 |
| auth | 10 |
| ai | 30 |
| search | 60 |
| webhook | 300 |
| cron | 10 |

## SDK

```typescript
import { createTalentOsClient } from '@/lib/api/client'

const client = createTalentOsClient({ baseUrl: 'https://app.example.com' })
const health = await client.health()
const matches = await client.getTalentMatchResults(opportunityId)
```

## OpenAPI

- Spec: `docs/openapi.yaml`
- Live: `GET /api/openapi`

## Backwards Compatibility

| Endpoint | Compatibility |
|----------|---------------|
| `/api/health` | Legacy `{ ok, service, ... }` body preserved |
| Webhooks | Legacy `{ status: 'duplicate' }` preserved |
| Cron | Legacy response bodies preserved; auth errors now use standard envelope |
| Server Actions | `{ ok: true/false }` unchanged; optional `code` via adapter |
| Middleware | API routes return JSON 401/403 instead of redirects |

## Migration Guide

Replace manual try/catch routes:

```typescript
// Before
export async function GET() {
  try {
    const { tenant } = await requireTenant()
    return success(data)
  } catch (err) {
    return handleApiError(err)
  }
}

// After
export const GET = withApiHandler({ auth: 'tenant' }, async ({ ctx }) => {
  return fetchData(ctx.tenant!.id)
})
```
