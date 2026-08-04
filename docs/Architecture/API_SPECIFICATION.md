# Talent OS — API Specification

**Document version:** 1.0.0  
**Date:** August 2, 2026  
**Status:** Draft — awaiting approval  
**OpenAPI source:** `docs/openapi.yaml` (machine-readable subset)  
**Live spec:** `GET /api/openapi`  
**References:** Bounded context specs in `docs/Architecture/specs/`, `DOMAIN_MODEL.md`

---

## Table of contents

1. [Global conventions](#1-global-conventions)
2. [Organization Management API](#2-organization-management-api)
3. [CRM & Demand Management API](#3-crm--demand-management-api)
4. [Talent Supply Management API](#4-talent-supply-management-api)
5. [Project Delivery Management API](#5-project-delivery-management-api)
6. [Resource Assignment API](#6-resource-assignment-api)
7. [Finance & Payments API](#7-finance--payments-api)
8. [Workflow Orchestration API](#8-workflow-orchestration-api)
9. [WhatsApp Channel API](#9-whatsapp-channel-api)
10. [AI & Intelligence API](#10-ai--intelligence-api)
11. [Analytics & Reporting API](#11-analytics--reporting-api)
12. [Platform Core & System API](#12-platform-core--system-api)
13. [Notifications API](#13-notifications-api)
14. [Webhooks & Cron API](#14-webhooks--cron-api)
15. [Appendix — Error code reference](#15-appendix--error-code-reference)

**Legend:** ✅ Implemented · 📋 Planned (specified, not yet routed)

---

## 1. Global conventions

### 1.1 Base URL and versioning

| Item | Value |
|------|-------|
| Base path | `/api` |
| API version header | `X-API-Version: v1` (default) |
| Content-Type (JSON) | `application/json` |
| Trace headers (response) | `X-Request-ID`, `X-Correlation-ID` |

### 1.2 Authentication

| Auth mode | Used by | Requirement |
|-----------|---------|-------------|
| `sessionCookie` | All tenant APIs | Supabase session cookie (`sb-access-token`) |
| `manager` | Manager-only modules | Role `admin` or `talent_manager` |
| `tenant` | Mixed role endpoints | Valid tenant membership |
| `optional` | `/api/auth/session` | Cookie optional |
| `none` | `/api/health`, `/api/openapi` | No auth |
| `cronBearer` | `/api/cron/*` | `Authorization: Bearer {CRON_SECRET}` |
| Webhook HMAC | `/api/webhooks/*` | Provider-specific signature |

### 1.3 Response envelope

**Standard (all module REST APIs):**

```json
{
  "data": { },
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 142,
    "hasMore": true
  }
}
```

**Legacy envelope** (`legacyEnvelope: true` — health, some webhooks):

```json
{
  "status": "ok",
  "timestamp": "2026-08-02T12:00:00.000Z"
}
```

### 1.4 Pagination

| Parameter | Type | Default | Max | Description |
|-----------|------|---------|-----|-------------|
| `page` | integer | `1` | — | 1-based page index |
| `limit` | integer | `20` | `100` (exports: `50`) | Page size |

**Response meta:**

```json
{
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 87,
    "hasMore": true
  }
}
```

**Validation:** `page ≥ 1`, `limit ≥ 1`, `limit ≤ 100` (Zod `listQuerySchema` in each module).

### 1.5 Filtering

Common query parameters across list endpoints:

| Parameter | Type | Modules | Description |
|-----------|------|---------|-------------|
| `status` | string/enum | CRM, Project, Assignment, Workflow | Entity status filter |
| `q` | string (max 120) | Organization, CRM, Talent, Project | Full-text search |
| `company_id` | uuid | CRM, Project | Filter by client company |
| `freelancer_id` | uuid | Project, Assignment | Filter by talent |
| `from` / `to` | ISO datetime | Assignment, Workflow, Analytics | Date range |
| `period` | enum | Analytics | `7d`, `30d`, `90d`, `ytd`, `custom` |
| `refresh` | boolean | Analytics | Bypass cache when `true` |

Module-specific filters are documented per section below.

### 1.6 Sorting

| Module | Parameter | Allowed values |
|--------|-----------|----------------|
| Talent | `sort` | `rating`, `name`, `rate_asc`, `rate_desc`, `active`, `completeness` |
| Talent (legacy search) | `sort` | `rating`, `name`, `recent` |
| Other modules | — | Default sort by `created_at DESC` (no explicit param yet) |

📋 **Planned:** `sort` and `order=asc|desc` on all paginated list endpoints.

### 1.7 Search

| Endpoint | Search params | Engine |
|----------|---------------|--------|
| `GET /api/talent` | `q`, `skills`, `tags`, filters | RPC `search_talent_advanced` |
| `GET /api/talent/search` | `q`, `discipline`, `availability` | Legacy `searchRoster` |
| `POST /api/talent/match` | Body: skills array | RPC `match_talent_skills` |
| `GET /api/crm/leads` | `q` | ILIKE on title/source |
| 📋 `POST /api/knowledge/search` | Body: query | Full-text + vector RPC |

### 1.8 Validation

- **Runtime:** Zod schemas in `modules/<context>/validation.ts`
- **On failure:** HTTP `400`, code `VALIDATION_ERROR`
- **Details shape:**

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid request body",
    "details": {
      "issues": [
        { "path": ["email"], "message": "Invalid email" }
      ]
    }
  }
}
```

### 1.9 Permissions

Permissions are checked via `withApiHandler({ permissions: [...] })` against the caller's role (`modules/core/services/permissions.ts`). Missing permission → HTTP `403`, code `FORBIDDEN`.

### 1.10 Idempotency

| Header | Applies to | Behavior |
|--------|------------|----------|
| `Idempotency-Key` | Mutations with `idempotency: true` | Replay cached response; conflict → `409 IDEMPOTENCY_CONFLICT` |

Response header on replay: `X-Idempotent-Replayed: true`

### 1.11 Rate limiting

| Category | Typical endpoints | On exceed |
|----------|-------------------|-----------|
| `default` | Module CRUD | `429 RATE_LIMITED` |
| `auth` | Session, invite | `429 RATE_LIMITED` |
| `webhook` | Inbound webhooks | `429 RATE_LIMITED` |

### 1.12 Standard error responses

| HTTP | Code | When |
|------|------|------|
| 400 | `VALIDATION_ERROR` | Zod/business validation failure |
| 401 | `UNAUTHORIZED` | Missing/invalid session |
| 403 | `NO_TENANT` | Authenticated but no tenant context |
| 403 | `FORBIDDEN` | Missing permission or RLS denial |
| 403 | `AI_MATCHING_DISABLED` | Feature flag off |
| 404 | `NOT_FOUND` | Entity not found or soft-deleted |
| 409 | `DUPLICATE` | Unique constraint violation |
| 409 | `IDEMPOTENCY_CONFLICT` | Idempotency key reused with different body |
| 429 | `RATE_LIMITED` | Rate limit exceeded |
| 429 | `AI_MONTHLY_LIMIT_EXCEEDED` | AI token budget exceeded |
| 500 | `INTERNAL_ERROR` | Unhandled server error |
| 401 | `WEBHOOK_INVALID_SIGNATURE` | Webhook auth failure |
| 401 | `CRON_UNAUTHORIZED` | Invalid cron bearer token |

**Error envelope:**

```yaml
# OpenAPI — ApiError component
type: object
required: [error]
properties:
  error:
    type: object
    required: [code, message]
    properties:
      code:
        type: string
        enum: [UNAUTHORIZED, NO_TENANT, FORBIDDEN, NOT_FOUND, VALIDATION_ERROR,
               DUPLICATE, RATE_LIMITED, IDEMPOTENCY_CONFLICT, INTERNAL_ERROR,
               AI_MATCHING_DISABLED, AI_MONTHLY_LIMIT_EXCEEDED,
               WEBHOOK_INVALID_SIGNATURE, CRON_UNAUTHORIZED]
      message:
        type: string
      details:
        type: object
        additionalProperties: true
```

---

## 2. Organization Management API

**Base path:** `/api/organization`  
**Validation:** `modules/organization/validation.ts`  
**Status:** ✅ Implemented

### 2.1 Endpoints

| Method | Path | Permission | Description |
|--------|------|------------|-------------|
| GET | `/api/organization` | `tenant:read` | Organization summary |
| PATCH | `/api/organization` | `tenant:update` | Update profile |
| GET | `/api/organization/settings` | `tenant:read` | Settings + business hours |
| PATCH | `/api/organization/settings` | `tenant:update` | Update settings |
| GET | `/api/organization/branding` | `tenant:read` | Branding |
| PATCH | `/api/organization/branding` | `tenant:update` | Update branding |
| GET | `/api/organization/subscription` | `tenant:billing` | Subscription reference |
| PATCH | `/api/organization/subscription` | `tenant:billing` | Update subscription ref |
| GET | `/api/organization/departments` | `org:departments:read` | List departments |
| POST | `/api/organization/departments` | `org:departments:manage` | Create department |
| GET | `/api/organization/departments/{id}` | `org:departments:read` | Get department |
| PATCH | `/api/organization/departments/{id}` | `org:departments:manage` | Update department |
| DELETE | `/api/organization/departments/{id}` | `org:departments:manage` | Soft delete |
| GET | `/api/organization/teams` | `org:teams:read` | List teams |
| POST | `/api/organization/teams` | `org:teams:manage` | Create team |
| GET/PATCH/DELETE | `/api/organization/teams/{id}` | read/manage | Team CRUD |
| GET/POST/DELETE | `/api/organization/teams/{id}/members` | `org:teams:manage` | Team membership |
| GET | `/api/organization/members` | `members:*` | List members |
| GET/PATCH/DELETE | `/api/organization/members/{id}` | `members:manage` | Member lifecycle |
| GET/POST | `/api/organization/invitations` | `members:invite` | Invitations |
| DELETE | `/api/organization/invitations/{id}` | `members:invite` | Revoke invite |
| GET | `/api/organization/audit-logs` | `org:audit:read` | Audit trail |
| GET | `/api/organization/permissions` | `tenant:read` | Effective permissions |

### 2.2 Request models

| Operation | Schema | Key fields |
|-----------|--------|------------|
| Update org | `updateOrganizationSchema` | `name`, `timezone`, `currency`, `subscription_reference` |
| Update branding | `updateBrandingSchema` | `logo_url`, `primary_color`, `accent_color` |
| Business hours | `updateBusinessHoursSchema` | `business_hours.{day}.{open,close,closed}` |
| Create department | `createDepartmentSchema` | `name`, `slug?`, `description?` |
| Create team | `createTeamSchema` | `name`, `slug?`, `department_id?` |
| Invite member | `createInviteSchema` | `email`, `role`, `company_id?` |
| Update member | `updateMemberSchema` | `role?`, `status?` |
| List query | `listQuerySchema` | `page`, `limit`, `q?`, `status?`, `role?` |
| Audit query | `auditQuerySchema` | `page`, `limit`, `action?`, `entity_type?` |

### 2.3 Response models

**OrganizationSummary:**

```typescript
{
  id: string           // uuid
  name: string
  slug: string
  timezone: string
  currency: string     // ISO 4217
  logo_url: string | null
  primary_color: string | null
  accent_color: string | null
  subscription_status: string | null
  member_count: number
  created_at: string   // ISO datetime
}
```

**Paginated lists:** `{ data: OrganizationMember[] | OrganizationDepartment[] | ..., meta: PaginationMeta }`

**AuditEntry:**

```typescript
{
  id: string
  action: string
  entity_type: string
  entity_id: string
  actor_id: string | null
  before_state: object | null
  after_state: object | null
  created_at: string
}
```

### 2.4 OpenAPI example — Update organization

```yaml
/api/organization:
  patch:
    tags: [Organization]
    summary: Update organization profile
    security: [{ sessionCookie: [] }]
    requestBody:
      required: true
      content:
        application/json:
          example:
            name: "Acme Creative Agency"
            timezone: "Europe/Amsterdam"
            currency: "EUR"
    responses:
      '200':
        description: Updated organization
        content:
          application/json:
            example:
              data:
                id: "3fa85f64-5717-4562-b3fc-2c963f66afa6"
                name: "Acme Creative Agency"
                timezone: "Europe/Amsterdam"
                currency: "EUR"
      '400':
        content:
          application/json:
            example:
              error:
                code: VALIDATION_ERROR
                message: "Invalid request body"
                details:
                  issues:
                    - path: ["currency"]
                      message: "String must contain exactly 3 character(s)"
      '403':
        content:
          application/json:
            example:
              error:
                code: FORBIDDEN
                message: "Missing permission tenant:update"
```

---

## 3. CRM & Demand Management API

**Base path:** `/api/crm`  
**Validation:** `modules/crm/validation.ts`  
**Status:** ✅ Implemented

### 3.1 Endpoints

| Method | Path | Permission | Description |
|--------|------|------------|-------------|
| GET/POST | `/api/crm/leads` | `crm:leads:manage` | List/create leads |
| GET/PATCH | `/api/crm/leads/{id}` | `crm:leads:manage` | Lead detail/update |
| POST | `/api/crm/leads/{id}/convert` | `crm:leads:manage` | Convert lead |
| GET/POST | `/api/crm/companies` | `companies:*` | Companies |
| GET/PATCH | `/api/crm/companies/{id}` | `companies:*` | Company detail |
| GET/POST | `/api/crm/contacts` | `crm:read` | Contacts |
| GET/POST | `/api/crm/deals` | `crm:deals:manage` | Deals |
| PATCH | `/api/crm/deals/{id}/stage` | `crm:deals:manage` | Move deal stage |
| GET | `/api/crm/pipeline` | `crm:read` | Pipeline board |
| GET/POST | `/api/crm/contracts` | `crm:deals:manage` | Contracts |
| GET/POST | `/api/crm/notes` | `crm:read` | Notes |
| GET/POST | `/api/crm/attachments` | `crm:read` | Attachments |
| GET/POST | `/api/crm/activities` | `crm:leads:manage` | Activities |
| GET | `/api/crm/opportunities` | `opportunities:*` | Legacy talent gigs |
| GET | `/api/crm/audit-logs` | `crm:audit:read` | Audit trail |

### 3.2 Request models

| Operation | Schema | Key fields |
|-----------|--------|------------|
| Create lead | `createLeadSchema` | `title`, `source?`, `status?`, `company_id?`, `value_estimate?` |
| Update lead | `updateLeadSchema` | Partial + `status` includes `converted` |
| Convert lead | `convertLeadSchema` | `create_company`, `company_name?`, `create_deal`, `deal_title?` |
| Create company | `createCompanySchema` | `name`, `contact_email?`, `status?`, `industry?` |
| Create deal | `createDealSchema` | `title`, `value?`, `stage_id?`, `company_id?`, `probability?` |
| Move stage | `moveDealStageSchema` | `stage_id` |
| Create contract | `createContractSchema` | `title`, `deal_id?`, `value?`, `status?`, `starts_on?` |
| Collateral | `createNoteSchema`, `createAttachmentSchema`, `createActivitySchema` | Polymorphic `entity_type`, `entity_id` |
| List query | `listQuerySchema` | `page`, `limit`, `q?`, `status?`, `stage_id?`, `company_id?` |

### 3.3 Response models

**Lead:**

```typescript
{
  id: string
  title: string
  status: 'new' | 'contacted' | 'qualified' | 'unqualified' | 'converted'
  source: string | null
  company_id: string | null
  value_estimate: number | null
  currency: string
  created_at: string
}
```

**PipelineBoard:**

```typescript
{
  stages: Array<{
    id: string
    name: string
    sort_order: number
    deals: Deal[]
    total_value: number
  }>
}
```

**ConvertLeadResult:**

```typescript
{
  lead: Lead
  company?: Company
  deal?: Deal
}
```

### 3.4 Filtering, sorting, search

| Endpoint | Filters | Search |
|----------|---------|--------|
| `GET /leads` | `status`, `company_id` | `q` on title/source |
| `GET /deals` | `status`, `stage_id`, `company_id` | — |
| `GET /companies` | `status` | `q` on name |
| `GET /opportunities` | `status` | — |

Default sort: `created_at DESC`.

### 3.5 OpenAPI example — Convert lead

```yaml
/api/crm/leads/{id}/convert:
  post:
    tags: [CRM]
    summary: Convert qualified lead to company and deal
    security: [{ sessionCookie: [] }]
    parameters:
      - name: id
        in: path
        required: true
        schema: { type: string, format: uuid }
    requestBody:
      content:
        application/json:
          example:
            create_company: true
            company_name: "Globex Corp"
            create_deal: true
            deal_title: "Globex — Q3 Retainer"
            deal_value: 45000
            mark_client: true
    responses:
      '200':
        content:
          application/json:
            example:
              data:
                lead:
                  id: "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
                  status: "converted"
                company:
                  id: "b2c3d4e5-f6a7-8901-bcde-f12345678901"
                  name: "Globex Corp"
                  status: "client"
                deal:
                  id: "c3d4e5f6-a7b8-9012-cdef-123456789012"
                  title: "Globex — Q3 Retainer"
                  value: 45000
      '404':
        content:
          application/json:
            example:
              error:
                code: NOT_FOUND
                message: "Lead not found"
      '409':
        content:
          application/json:
            example:
              error:
                code: DUPLICATE
                message: "Lead already converted"
```

---

## 4. Talent Supply Management API

**Base path:** `/api/talent`  
**Validation:** `modules/talent/validation.ts`  
**Status:** ✅ Implemented

### 4.1 Endpoints

| Method | Path | Permission | Description |
|--------|------|------------|-------------|
| GET | `/api/talent` | `talent:read` | Advanced search/list |
| POST | `/api/talent` | `talent:manage` | Create talent |
| GET | `/api/talent/search` | `talent:read` | Legacy search |
| GET/PATCH/DELETE | `/api/talent/{id}` | read/manage | Profile CRUD |
| GET/POST/PATCH/DELETE | `/api/talent/{id}/experience` | read/manage | Work history |
| GET/POST/DELETE | `/api/talent/{id}/documents` | read/manage | Documents |
| GET/POST/PATCH/DELETE | `/api/talent/{id}/availability` | read/manage | Calendar slots |
| GET | `/api/talent/{id}/completeness` | `talent:read` | Completeness score |
| GET | `/api/talent/{id}/ai-profile` | `talent:read` | AI context export |
| POST | `/api/talent/match` | `talent:read` | Skill match |
| POST | `/api/talent/import` | `talent:import` | Bulk CSV import |
| GET | `/api/talent/audit-logs` | `talent:audit:read` | Audit trail |

### 4.2 Request models

| Operation | Schema | Key fields |
|-----------|--------|------------|
| List/search | `advancedSearchSchema` | See filtering table below |
| Create talent | `createTalentSchema` | `full_name`, `email`, `discipline`, `skills[]`, `day_rate?` |
| Update talent | `updateTalentSchema` | Partial of create |
| Experience | `createExperienceSchema` | `company`, `title`, `starts_on`, `ends_on?`, `skills?` |
| Document | `createDocumentSchema` | `doc_type`, `file_name`, `file_path` |
| Availability slot | `createAvailabilitySlotSchema` | `starts_at`, `ends_at`, `status?` |
| Skill match | `skillMatchSchema` | `skills[]`, `discipline?`, `limit?` |
| CSV import | `csvImportSchema` | `rows[]`, `file_name?` |

### 4.3 Response models

**TalentProfile:**

```typescript
{
  id: string
  full_name: string
  email: string
  phone: string | null
  discipline: string
  skills: string[]
  tags: string[]
  day_rate: number | null
  currency: string
  availability: 'available' | 'busy' | 'unavailable'
  employment_type: string | null
  timezone: string | null
  languages: Array<{ code: string; level?: string }>
  internal_rating: number | null
  completeness_score: number
  ai_summary: string | null
  created_at: string
}
```

**Completeness:**

```typescript
{
  score: number          // 0-100
  missing_sections: string[]
  last_calculated_at: string
}
```

**ImportBatch:**

```typescript
{
  id: string
  status: 'pending' | 'processing' | 'completed' | 'failed'
  total_rows: number
  success_count: number
  error_count: number
  errors: Array<{ row: number; message: string }>
}
```

### 4.4 Filtering, sorting, search

**`GET /api/talent` query parameters:**

| Param | Type | Description |
|-------|------|-------------|
| `q` | string | Text search |
| `discipline` | string | Discipline enum |
| `availability` | enum | `available`, `busy`, `unavailable` |
| `employment_type` | enum | `freelance`, `contract`, `part_time`, `full_time` |
| `timezone` | string | IANA timezone |
| `skills` | csv | Comma-separated skill tags |
| `tags` | csv | Comma-separated tags |
| `min_completeness` | int 0-100 | Minimum completeness |
| `min_rate` / `max_rate` | number | Day rate range |
| `min_rating` | number 1-5 | Internal rating floor |
| `sort` | enum | See global sorting table |
| `page`, `limit` | int | Pagination |

**`GET /api/talent/{id}/availability`:** `from`, `to` (ISO datetime) — `availabilityCalendarQuerySchema`

### 4.5 OpenAPI example — Advanced talent search

```yaml
/api/talent:
  get:
    tags: [Talent]
    summary: Advanced talent list and search
    security: [{ sessionCookie: [] }]
    parameters:
      - { name: q, in: query, schema: { type: string }, example: "react designer" }
      - { name: skills, in: query, schema: { type: string }, example: "react,typescript" }
      - { name: availability, in: query, schema: { type: string, enum: [available, busy, unavailable] } }
      - { name: sort, in: query, schema: { type: string, enum: [rating, name, rate_asc, rate_desc, active, completeness] } }
      - { name: page, in: query, schema: { type: integer, default: 1 } }
      - { name: limit, in: query, schema: { type: integer, default: 20, maximum: 100 } }
    responses:
      '200':
        content:
          application/json:
            example:
              data:
                - id: "f1a2b3c4-d5e6-7890-abcd-ef1234567890"
                  full_name: "Jane Doe"
                  discipline: "engineering"
                  skills: ["react", "typescript"]
                  day_rate: 650
                  currency: "EUR"
                  availability: "available"
                  completeness_score: 92
              meta:
                page: 1
                limit: 20
                total: 47
                hasMore: true
```

---

## 5. Project Delivery Management API

**Base path:** `/api/projects`  
**Validation:** `modules/project/validation.ts`  
**Status:** ✅ Implemented

### 5.1 Endpoints

| Method | Path | Permission | Description |
|--------|------|------------|-------------|
| GET/POST | `/api/projects` | `project:read` / `project:manage` | List/create |
| GET/PATCH/DELETE | `/api/projects/{id}` | read/manage | CRUD |
| PATCH | `/api/projects/{id}/status` | `project:manage` | Status transition |
| GET | `/api/projects/{id}/health` | `project:read` | Health score |
| GET | `/api/projects/{id}/timeline` | `project:read` | Activity feed |
| GET/PATCH | `/api/projects/{id}/milestones` | read/manage | Milestones |
| GET/POST/PATCH | `/api/projects/{id}/tasks` | read/manage | Tasks |
| GET/POST/PATCH | `/api/projects/{id}/deliverables` | read/manage | Deliverables |
| GET/POST/DELETE | `/api/projects/{id}/assets` | read/manage | Assets |
| GET/POST | `/api/projects/{id}/comments` | read/manage | Comments |
| GET/POST/DELETE | `/api/projects/{id}/dependencies` | read/manage | Dependencies |
| GET/POST | `/api/projects/templates` | `project:templates:manage` | Templates |
| POST | `/api/projects/templates/{id}/apply` | `project:templates:manage` | Apply template |
| GET | `/api/projects/audit-logs` | `project:audit:read` | Audit |

### 5.2 Request models

| Operation | Schema | Key fields |
|-----------|--------|------------|
| Create project | `createProjectSchema` | `freelancer_id`, `title`, `milestones[]`, `company_id?`, `deadline?` |
| Update project | `updateProjectSchema` | Partial (no milestones/freelancer_id) |
| Transition status | `transitionStatusSchema` | `status`, `role` (`manager` \| `freelancer`) |
| Task | `createTaskSchema` | `title`, `milestone_id?`, `status?`, `priority?`, `due_date?` |
| Deliverable | `createDeliverableSchema` | `title`, `file_path?`, `milestone_id?` |
| Template apply | `applyTemplateSchema` | `freelancer_id`, `title?`, `company_id?` |
| List query | `listQuerySchema` | `status?`, `priority?`, `health_status?`, `freelancer_id?`, `company_id?`, `q?` |

### 5.3 Response models

**Project:**

```typescript
{
  id: string
  title: string
  status: 'draft' | 'active' | 'in_review' | 'completed' | 'archived' | 'canceled'
  priority: 'low' | 'medium' | 'high' | 'urgent'
  health_status: 'on_track' | 'at_risk' | 'blocked' | 'completed'
  health_score: number
  freelancer_id: string
  company_id: string | null
  deadline: string | null
  created_at: string
}
```

**ProjectHealth:**

```typescript
{
  score: number
  status: 'on_track' | 'at_risk' | 'blocked' | 'completed'
  overdue_milestones: number
  overdue_tasks: number
  open_deliverables: number
  blocked_tasks: number
}
```

### 5.4 Filtering

| Param | Values |
|-------|--------|
| `status` | Project status enum |
| `priority` | Priority enum |
| `health_status` | Health enum |
| `freelancer_id` | UUID |
| `company_id` | UUID |
| `q` | Text search on title |

### 5.5 OpenAPI example — Status transition

```yaml
/api/projects/{id}/status:
  patch:
    tags: [Projects]
    summary: Transition project status
    requestBody:
      content:
        application/json:
          example:
            status: "in_review"
            role: "freelancer"
    responses:
      '200':
        content:
          application/json:
            example:
              data:
                id: "p1a2b3c4-d5e6-7890-abcd-ef1234567890"
                status: "in_review"
                previous_status: "active"
      '400':
        content:
          application/json:
            example:
              error:
                code: VALIDATION_ERROR
                message: "Transition from active to completed not allowed for role freelancer"
```

---

## 6. Resource Assignment API

**Base path:** `/api/assignments`  
**Validation:** `modules/assignment/validation.ts`  
**Status:** ✅ Implemented

### 6.1 Endpoints

| Method | Path | Permission | Description |
|--------|------|------------|-------------|
| GET/POST | `/api/assignments` | `assignment:read` / `assignment:manage` | List/create |
| GET/PATCH/DELETE | `/api/assignments/{id}` | read/manage | CRUD / cancel |
| POST | `/api/assignments/conflicts/check` | `assignment:read` | Pre-flight check |
| GET | `/api/assignments/conflicts` | `assignment:read` | Open conflicts |
| PATCH | `/api/assignments/conflicts/{id}/resolve` | `assignment:manage` | Resolve |
| POST | `/api/assignments/suggest` | `assignment:read` | Suggestions |
| GET/POST | `/api/assignments/capacity` | read/manage | Capacity |
| GET/POST | `/api/assignments/{id}/schedules` | read/manage | Schedules |
| GET/POST | `/api/assignments/{id}/requirements` | read/manage | Requirements |
| GET | `/api/assignments/{id}/history` | `assignment:read` | History |
| GET | `/api/assignments/audit-logs` | `assignment:audit:read` | Audit |

### 6.2 Request models

| Operation | Schema | Key fields |
|-----------|--------|------------|
| Create allocation | `createAllocationSchema` | `freelancer_id`, `starts_at`, `ends_at`, `project_id?`, `allocation_pct?`, `skip_conflict_check?` |
| Update allocation | `updateAllocationSchema` | Partial + status includes `canceled` |
| Conflict check | `conflictCheckSchema` | `freelancer_id`, `starts_at`, `ends_at`, `allocation_pct?` |
| Suggest | `suggestSchema` | `required_skills?`, `starts_at?`, `ends_at?`, `limit?` |
| Capacity | `createCapacitySchema` | `freelancer_id`, `weekly_hours?`, `max_concurrent_assignments?` |
| List query | `listQuerySchema` | `status?`, `freelancer_id?`, `project_id?`, `from?`, `to?` |

### 6.3 Response models

**Allocation:**

```typescript
{
  id: string
  freelancer_id: string
  project_id: string | null
  opportunity_id: string | null
  title: string
  status: 'planned' | 'confirmed' | 'active' | 'completed' | 'canceled'
  allocation_pct: number
  starts_at: string
  ends_at: string
  created_at: string
}
```

**ConflictCheckResult:**

```typescript
{
  has_conflicts: boolean
  conflicts: Array<{
    type: 'double_booking' | 'over_allocation' | 'availability_gap'
    severity: 'warning' | 'error'
    message: string
    allocation_id?: string
  }>
}
```

**Suggestion:**

```typescript
{
  freelancer_id: string
  full_name: string
  match_score: number
  current_load_pct: number
  skills_matched: string[]
}
```

### 6.4 OpenAPI example — Create allocation

```yaml
/api/assignments:
  post:
    tags: [Assignments]
    summary: Create talent allocation
    requestBody:
      content:
        application/json:
          example:
            freelancer_id: "f1a2b3c4-d5e6-7890-abcd-ef1234567890"
            project_id: "p1a2b3c4-d5e6-7890-abcd-ef1234567890"
            title: "Globex — Frontend Sprint"
            allocation_pct: 80
            starts_at: "2026-08-01T09:00:00.000Z"
            ends_at: "2026-08-31T17:00:00.000Z"
    responses:
      '200':
        content:
          application/json:
            example:
              data:
                id: "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
                status: "planned"
                allocation_pct: 80
      '400':
        content:
          application/json:
            example:
              error:
                code: VALIDATION_ERROR
                message: "Allocation blocked by conflicts"
                details:
                  conflicts:
                    - type: "double_booking"
                      severity: "error"
                      message: "Overlaps with allocation a2b3c4d5-..."
```

---

## 7. Finance & Payments API

**Base path:** 📋 `/api/finance` (planned)  
**Validation:** 📋 `modules/finance/validation.ts` (planned)  
**Status:** ⚠️ Legacy Server Actions only — spec defines target REST surface

### 7.1 Endpoints

| Method | Path | Permission | Status | Description |
|--------|------|------------|--------|-------------|
| GET | `/api/finance/payments` | `payments:read` | 📋 | List payments |
| GET | `/api/finance/payments/{id}` | `payments:read` | 📋 | Payment detail |
| POST | `/api/finance/payments/{id}/approve` | `payments:approve` | 📋 | Approve pending |
| POST | `/api/finance/payments/{id}/mark-paid` | `payments:pay` | 📋 | Mark paid |

**Current access:** `FinanceService` via Server Actions; role permissions `payments:read`, `payments:approve`, `payments:pay`.

### 7.2 Request models (planned)

| Operation | Fields |
|-----------|--------|
| List query | `page`, `limit`, `status?`, `freelancer_id?`, `project_id?` |
| Approve | `{}` (empty body) |
| Mark paid | `{ payment_reference: string }` — required, max 256 chars |

### 7.3 Response models

**Payment:**

```typescript
{
  id: string
  milestone_id: string
  freelancer_id: string
  amount: number
  currency: string
  status: 'pending' | 'approved' | 'processing' | 'paid' | 'disputed' | 'canceled'
  payment_reference: string | null
  approved_at: string | null
  paid_at: string | null
  created_at: string
}
```

### 7.4 Errors (planned)

| Scenario | Code |
|----------|------|
| Approve non-pending | `VALIDATION_ERROR` — "Only pending payments can be approved" |
| Mark paid non-approved | `VALIDATION_ERROR` — "Only approved payments can be marked paid" |
| Missing reference | `VALIDATION_ERROR` |

### 7.5 OpenAPI example — Approve payment

```yaml
/api/finance/payments/{id}/approve:
  post:
    tags: [Finance]
    summary: Approve pending milestone payment
    security: [{ sessionCookie: [] }]
    parameters:
      - name: id
        in: path
        required: true
        schema: { type: string, format: uuid }
    responses:
      '200':
        content:
          application/json:
            example:
              data:
                id: "pay1a2b3-c4d5-6789-abcd-ef1234567890"
                status: "approved"
                approved_at: "2026-08-02T12:00:00.000Z"
      '400':
        content:
          application/json:
            example:
              error:
                code: VALIDATION_ERROR
                message: "Only pending payments can be approved"
```

---

## 8. Workflow Orchestration API

**Base path:** `/api/workflows`  
**Validation:** `modules/workflow-engine/validation.ts`  
**Status:** ✅ Implemented

### 8.1 Endpoints

| Method | Path | Permission | Description |
|--------|------|------------|-------------|
| GET/POST | `/api/workflows/definitions` | `workflow:read` / `workflow:manage` | Definitions |
| GET | `/api/workflows/definitions/{id}` | `workflow:read` | Definition detail |
| GET | `/api/workflows/runs` | `workflow:read` | List runs |
| GET | `/api/workflows/runs/{id}` | `workflow:read` | Run detail |
| GET | `/api/workflows/jobs` | `workflow:read` | List jobs |
| GET | `/api/workflows/history` | `workflow:read` | Execution history |
| GET | `/api/workflows/compensations` | `workflow:read` | Compensation queue |
| POST | `/api/workflows/compensations/retry` | `workflow:manage` | Retry compensations |
| POST | `/api/workflows/retries/jobs` | `workflow:manage` | Retry dead-letter jobs |
| POST | `/api/workflows/retries/events` | `workflow:manage` | Retry failed events |
| POST | `/api/workflows/trigger` | `workflow:manage` | Manual trigger |
| GET | `/api/workflows/approvals` | `workflow:read` | Pending approvals |
| PATCH | `/api/workflows/approvals/{id}` | `workflow:manage` | Resolve approval |
| GET | `/api/workflows/observability` | `workflow:read` | Metrics |
| GET | `/api/workflows/audit-logs` | `workflow:audit:read` | Audit |

### 8.2 Request models

| Operation | Schema | Key fields |
|-----------|--------|------------|
| Manual trigger | `triggerWorkflowSchema` | `workflow_id`, `aggregate_type`, `aggregate_id`, `payload?` |
| Create definition | `createDefinitionSchema` | `id`, `name`, `trigger_event_type`, `steps[]` |
| Resolve approval | `resolveApprovalSchema` | `decision` (`approved` \| `rejected`), `note?` |
| Retry jobs | `retryJobsSchema` | `job_ids[]` |
| Retry events | `retryEventsSchema` | `event_ids[]` |
| Run query | `runQuerySchema` | `status?`, `workflow_id?`, `from?`, `to?`, pagination |
| Job query | `jobQuerySchema` | `run_id?`, `queue_name?`, `status?` |

### 8.3 Response models

**WorkflowRun:**

```typescript
{
  id: string
  workflow_id: string
  status: 'running' | 'completed' | 'failed' | 'canceled'
  trigger_event_type: string
  aggregate_type: string
  aggregate_id: string
  started_at: string
  completed_at: string | null
  duration_ms: number | null
}
```

**ObservabilitySummary:**

```typescript
{
  total_runs: number
  running_runs: number
  failed_runs: number
  pending_jobs: number
  dead_letter_jobs: number
  pending_compensations: number
  avg_duration_ms: number
  business_workflows: Array<{ id: string; name: string; trigger: string }>
}
```

### 8.4 Filtering

| Endpoint | Filters |
|----------|---------|
| `/runs` | `status`, `workflow_id`, `trigger_event_type`, `from`, `to` |
| `/jobs` | `status`, `run_id`, `queue_name` |
| `/history` | `run_id`, `status` |
| `/compensations` | `run_id`, `status` |

### 8.5 OpenAPI example — Manual workflow trigger

```yaml
/api/workflows/trigger:
  post:
    tags: [Workflows]
    summary: Manually trigger a workflow
    requestBody:
      content:
        application/json:
          example:
            workflow_id: "wf-assignment"
            aggregate_type: "assignment"
            aggregate_id: "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
            payload:
              notify_freelancer: true
    responses:
      '200':
        content:
          application/json:
            example:
              data:
                run_id: "r1a2b3c4-d5e6-7890-abcd-ef1234567890"
                workflow_id: "wf-assignment"
                status: "running"
```

---

## 9. WhatsApp Channel API

**Base path:** `/api/whatsapp` (+ webhook)  
**Validation:** `modules/whatsapp-platform/validation.ts`  
**Status:** ✅ Implemented

### 9.1 Endpoints

| Method | Path | Permission | Description |
|--------|------|------------|-------------|
| GET | `/api/webhooks/whatsapp` | Meta verify token | Webhook verification |
| POST | `/api/webhooks/whatsapp` | HMAC signature | Inbound messages |
| GET | `/api/whatsapp/conversations` | `whatsapp:read` | List conversations |
| GET | `/api/whatsapp/conversations/{freelancerId}` | `whatsapp:read` | Conversation + memory |
| GET | `/api/whatsapp/audit-logs` | `whatsapp:audit:read` | Audit |
| GET | `/api/whatsapp/observability` | `whatsapp:read` | Metrics |
| GET | `/api/whatsapp/approvals` | `whatsapp:read` | Pending gates |
| POST | `/api/whatsapp/approvals/{id}` | `whatsapp:manage` | Resolve gate |
| POST | `/api/whatsapp/commands` | `whatsapp:manage` | Execute command |

### 9.2 Request models

| Operation | Schema | Key fields |
|-----------|--------|------------|
| Business command | `commandSchema` | `intent`, `freelancer_id?`, `entity_type?`, `entity_id?`, `payload?` |
| Resolve approval | `resolveApprovalSchema` | `decision`, `note?` |
| Audit query | `auditQuerySchema` | `page`, `limit`, `action?`, `freelancer_id?` |

**Supported intents:** `opportunity.create`, `opportunity.interested`, `opportunity.declined`, `assignment.accept`, `assignment.reject`, `milestone.submit`, `milestone.approve`, `milestone.revision`, `deliverable.submit`, `project.approve`, `approval.approve`, `approval.reject`, `workflow.trigger`, `notification.send`, `agent.query`, `help`, `opt_out`

### 9.3 Response models

**Conversation:**

```typescript
{
  freelancer_id: string
  phone: string
  active_intent: string | null
  active_entity_type: string | null
  active_entity_id: string | null
  memory_summary: string | null
  last_message_at: string
  memory_entries: Array<{
    role: 'user' | 'assistant' | 'system'
    content: string
    created_at: string
  }>
}
```

**CommandResult:**

```typescript
{
  intent: string
  success: boolean
  message: string
  entity_type?: string
  entity_id?: string
}
```

### 9.4 OpenAPI example — Execute command

```yaml
/api/whatsapp/commands:
  post:
    tags: [WhatsApp]
    summary: Execute business command on behalf of freelancer
    requestBody:
      content:
        application/json:
          example:
            intent: "assignment.accept"
            freelancer_id: "f1a2b3c4-d5e6-7890-abcd-ef1234567890"
            entity_type: "assignment"
            entity_id: "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
    responses:
      '200':
        content:
          application/json:
            example:
              data:
                intent: "assignment.accept"
                success: true
                message: "Assignment confirmed"
                entity_type: "assignment"
                entity_id: "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
```

---

## 10. AI & Intelligence API

**Base paths:** `/api/ai`, `/api/internal/ai`, 📋 `/api/agents`, 📋 `/api/knowledge`  
**Validation:** `modules/agents/validation.ts`, `modules/knowledge/validation.ts`  
**Status:** Partial — gateway routes implemented; agents/knowledge via service layer only

### 10.1 Implemented endpoints

| Method | Path | Permission | Description |
|--------|------|------------|-------------|
| POST | `/api/ai/match` | `ai:match` + feature flag | Trigger talent match |
| GET | `/api/ai/match/{opportunityId}` | `ai:match` | Match for opportunity |
| GET | `/api/ai/pm/{entityType}/{entityId}` | `ai:status` | PM status assessment |
| POST | `/api/internal/ai/execute` | Internal/cron | Direct AI execution |
| POST | `/api/internal/ai/execute-match` | Internal/cron | Direct match execution |

### 10.2 Planned endpoints

| Method | Path | Permission | Description |
|--------|------|------------|-------------|
| GET | `/api/ai/requests` | `ai:match` | AI ledger list |
| GET | `/api/ai/requests/{id}` | `ai:match` | Request detail |
| POST | `/api/agents/{agentId}/sessions` | `agent:run` | Start session |
| GET | `/api/agents/{agentId}/sessions/{id}` | `agent:run` | Session detail |
| POST | `/api/agents/{agentId}/run` | `agent:run` | Execute agent turn |
| GET/PATCH | `/api/agents/{agentId}/config` | `agent:configure` | Agent config |
| GET/POST | `/api/knowledge/entries` | Manager | Knowledge CRUD |
| GET/PATCH/DELETE | `/api/knowledge/entries/{id}` | Manager | Entry detail |
| POST | `/api/knowledge/search` | Manager | Search entries |

### 10.3 Request models

| Operation | Schema | Key fields |
|-----------|--------|------------|
| AI match | Body: `{ opportunity_id?: string, skills?: string[] }` | Feature-gated |
| Run agent | `runAgentSchema` | `agentId`, `message`, `sessionId?`, `entityType?`, `entityId?` |
| Create session | `createAgentSessionSchema` | `agentId`, `entityType?`, `entityId?`, `context?` |
| Update agent config | `updateAgentConfigSchema` | `enabled?`, `allowedTools?`, policies |
| Create knowledge | `createKnowledgeEntrySchema` | `category`, `title`, `content?`, `links?`, `tags?` |
| Search knowledge | `knowledgeSearchSchema` | `query`, `categories?`, `limit?`, `offset?` |

**Agent IDs:** `recruiter`, `pm`, `finance`, `qa`, `executive`, `knowledge`, `support`

### 10.4 Response models

**AiRequest (ledger):**

```typescript
{
  id: string
  feature: string
  provider: string
  model: string
  status: 'pending' | 'completed' | 'failed'
  input_tokens: number
  output_tokens: number
  estimated_cost_usd: number
  latency_ms: number
  created_at: string
}
```

**AgentRunResult:**

```typescript
{
  session_id: string
  agent_id: string
  message: string
  tool_calls: Array<{ tool: string; args: object; result: unknown }>
  tokens_used: number
}
```

### 10.5 Errors

| Scenario | Code |
|----------|------|
| Feature disabled | `AI_MATCHING_DISABLED` (403) |
| Monthly limit | `AI_MONTHLY_LIMIT_EXCEEDED` (429) |

### 10.6 OpenAPI example — Agent run

```yaml
/api/agents/{agentId}/run:
  post:
    tags: [AI]
    summary: Execute agent conversation turn
    parameters:
      - name: agentId
        in: path
        required: true
        schema: { type: string, enum: [recruiter, pm, finance, qa, executive, knowledge, support] }
    requestBody:
      content:
        application/json:
          example:
            message: "Summarize open projects at risk for Globex"
            entityType: "company"
            entityId: "b2c3d4e5-f6a7-8901-bcde-f12345678901"
    responses:
      '200':
        content:
          application/json:
            example:
              data:
                session_id: "s1a2b3c4-d5e6-7890-abcd-ef1234567890"
                agent_id: "pm"
                message: "Globex has 2 projects at risk..."
                tokens_used: 1842
      '403':
        content:
          application/json:
            example:
              error:
                code: AI_MATCHING_DISABLED
                message: "AI features disabled for this organization"
```

---

## 11. Analytics & Reporting API

**Base path:** `/api/analytics`  
**Validation:** `modules/analytics/validation.ts`  
**Status:** ✅ Implemented (read-only)

### 11.1 Endpoints

| Method | Path | Permission | Description |
|--------|------|------------|-------------|
| GET | `/api/analytics/summary` | `analytics:read` | Combined overview |
| GET | `/api/analytics/dashboard` | `analytics:read` | Legacy KPIs |
| GET | `/api/analytics/organizations` | `analytics:read` | Org dashboard |
| GET | `/api/analytics/projects` | `analytics:read` | Projects dashboard |
| GET | `/api/analytics/talent` | `analytics:read` | Talent dashboard |
| GET | `/api/analytics/utilization` | `analytics:read` | Utilization dashboard |
| GET | `/api/analytics/revenue` | `analytics:read` | Revenue dashboard |
| GET | `/api/analytics/delivery` | `analytics:read` | Delivery dashboard |
| GET | `/api/analytics/ai-usage` | `analytics:read` | AI usage dashboard |
| GET | `/api/analytics/workflows` | `analytics:read` | Workflow dashboard |
| POST | `/api/analytics/exports` | `analytics:export` | Create export |
| GET | `/api/analytics/exports` | `analytics:export` | List exports |
| GET | `/api/analytics/exports/{id}` | `analytics:export` | Download export |

### 11.2 Request models

| Operation | Schema | Key fields |
|-----------|--------|------------|
| Dashboard query | `dashboardQuerySchema` | `period?`, `from?`, `to?`, `refresh?` |
| Create export | `exportSchema` | `dashboard`, `format` (`csv` \| `json`), `period?` |
| List exports | `exportListQuerySchema` | `page`, `limit` (max 50) |

**Period values:** `7d`, `30d`, `90d`, `ytd`, `custom` (requires `from`/`to`)

### 11.3 Response models

**AnalyticsDashboardPayload:**

```typescript
{
  summary: Record<string, number | string>
  charts: Record<string, Array<{ label?: string; x?: string; y?: number; value?: number }>>
  cachedAt?: string
  cacheTtlMs?: number
}
```

**AnalyticsExport:**

```typescript
{
  id: string
  dashboard: string
  format: 'csv' | 'json'
  status: 'pending' | 'completed' | 'expired'
  content?: string
  expires_at: string
  created_at: string
}
```

### 11.4 Caching

| Dashboard | TTL |
|-----------|-----|
| Summary | 60s |
| Organizations, Projects, Talent, Delivery, AI Usage, Workflows | 120s |
| Utilization, Revenue | 180s |

Pass `?refresh=true` to invalidate tenant cache before fetch.

### 11.5 OpenAPI example — Revenue dashboard

```yaml
/api/analytics/revenue:
  get:
    tags: [Analytics]
    summary: Revenue dashboard
    parameters:
      - { name: period, in: query, schema: { type: string, enum: [7d, 30d, 90d, ytd, custom], default: 30d } }
      - { name: refresh, in: query, schema: { type: boolean, default: false } }
    responses:
      '200':
        content:
          application/json:
            example:
              data:
                summary:
                  total_paid: 125000
                  total_pending: 34000
                  payment_count: 42
                charts:
                  paid_over_time:
                    - { x: "2026-07-01", y: 12000 }
                    - { x: "2026-07-15", y: 18500 }
                  aging:
                    - { label: "0-30 days", value: 22000 }
                    - { label: "31-60 days", value: 12000 }
                cachedAt: "2026-08-02T12:00:00.000Z"
                cacheTtlMs: 180000
```

---

## 12. Platform Core & System API

**Status:** ✅ Partial — health, auth, observability, openapi

### 12.1 Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/health` | none | Health check |
| GET | `/api/openapi` | none | OpenAPI spec JSON |
| GET | `/api/auth/session` | optional | Current session |
| POST | `/api/auth/signout` | session | Sign out |
| GET | `/api/auth/callback` | OAuth | Auth callback redirect |
| GET | `/api/auth/invite/{token}` | none | Invite preview |
| GET | `/api/observability/dashboard` | manager | Platform dashboard |
| GET | `/api/observability/logs` | manager | Log entries |
| GET | `/api/observability/alerts` | manager | Active alerts |
| GET | `/api/observability/traces/{correlationId}` | manager | Trace span detail |
| GET | `/api/team/members` | admin | Legacy team page data |

### 12.2 Response models

**Health (legacy envelope):**

```json
{
  "status": "ok",
  "version": "1.0.0",
  "timestamp": "2026-08-02T12:00:00.000Z"
}
```

**Session:**

```typescript
{
  user: { id: string; email: string } | null
  tenant: { id: string; name: string; role: UserRole } | null
}
```

### 12.3 Planned Platform Core endpoints

| Method | Path | Permission | Description |
|--------|------|------------|-------------|
| GET/PATCH | `/api/platform/feature-flags` | admin | Feature flag management |
| GET/PATCH | `/api/platform/config` | admin | Layered config |

---

## 13. Notifications API

**Base path:** 📋 `/api/notifications` (planned)  
**Status:** ⚠️ Server Actions + workflow `notify` action only

### 13.1 Planned endpoints

| Method | Path | Permission | Description |
|--------|------|------------|-------------|
| GET | `/api/notifications` | Authenticated | List own notifications |
| PATCH | `/api/notifications/{id}/read` | Authenticated | Mark read |
| POST | `/api/notifications/read-all` | Authenticated | Mark all read |

### 13.2 Request models (planned)

| Operation | Fields |
|-----------|--------|
| List query | `page`, `limit`, `unread_only?` (boolean) |
| Create (internal) | `{ user_id, title, body, entity_type?, entity_id?, action? }` |

### 13.3 Response models

**Notification:**

```typescript
{
  id: string
  user_id: string
  title: string
  body: string
  entity_type: string | null
  entity_id: string | null
  action: string | null
  read_at: string | null
  created_at: string
}
```

### 13.4 OpenAPI example — List notifications

```yaml
/api/notifications:
  get:
    tags: [Notifications]
    summary: List notifications for current user
    parameters:
      - { name: page, in: query, schema: { type: integer, default: 1 } }
      - { name: limit, in: query, schema: { type: integer, default: 20 } }
      - { name: unread_only, in: query, schema: { type: boolean, default: false } }
    responses:
      '200':
        content:
          application/json:
            example:
              data:
                - id: "n1a2b3c4-d5e6-7890-abcd-ef1234567890"
                  title: "Assignment conflict detected"
                  body: "Jane Doe is over-allocated for August"
                  read_at: null
                  created_at: "2026-08-02T11:30:00.000Z"
              meta:
                page: 1
                limit: 20
                total: 3
                hasMore: false
```

---

## 14. Webhooks & Cron API

### 14.1 Webhooks

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET/POST | `/api/webhooks/whatsapp` | Meta | WhatsApp Business API |
| POST | `/api/webhooks/n8n` | HMAC | n8n callback |

**WhatsApp POST:** Meta payload → `ProcessInboundMessage` — no standard envelope; returns `200` with `{ success: true }` or challenge string on GET verify.

**n8n POST:** Workflow callback payload — validated via integration secret.

### 14.2 Cron (internal)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/cron/dispatch-events` | `CRON_SECRET` | Outbox → workflow trigger |
| GET | `/api/cron/process-workflow-jobs` | `CRON_SECRET` | Execute workflow jobs |
| GET | `/api/cron/check-overdue-milestones` | `CRON_SECRET` | Milestone overdue scan |
| GET | `/api/cron/evaluate-alerts` | `CRON_SECRET` | Platform alert evaluation |

**Cron error:**

```json
{
  "error": {
    "code": "CRON_UNAUTHORIZED",
    "message": "Invalid cron secret"
  }
}
```

---

## 15. Appendix — Error code reference

| Code | HTTP | Retry? | Client action |
|------|------|--------|---------------|
| `UNAUTHORIZED` | 401 | No | Re-authenticate |
| `NO_TENANT` | 403 | No | Select/join organization |
| `FORBIDDEN` | 403 | No | Check role/permissions |
| `NOT_FOUND` | 404 | No | Verify resource ID |
| `VALIDATION_ERROR` | 400 | Yes (fix input) | Fix request body/query |
| `DUPLICATE` | 409 | No | Use existing resource or new key |
| `RATE_LIMITED` | 429 | Yes (backoff) | Wait and retry |
| `IDEMPOTENCY_CONFLICT` | 409 | No | Use new idempotency key |
| `INTERNAL_ERROR` | 500 | Yes (limited) | Report + retry |
| `AI_MATCHING_DISABLED` | 403 | No | Enable feature flag |
| `AI_MONTHLY_LIMIT_EXCEEDED` | 429 | No | Wait for next billing period |
| `WEBHOOK_INVALID_SIGNATURE` | 401 | No | Fix webhook config |
| `CRON_UNAUTHORIZED` | 401 | No | Fix bearer token |

---

## Document status

| Item | Status |
|------|--------|
| Implemented REST surface | Documented ✅ |
| Planned REST (Finance, Notifications, Agents, Knowledge, Platform) | Documented 📋 |
| OpenAPI machine-readable spec | Partial — extend `docs/openapi.yaml` on approval |
| SDK generation | Blocked until approval |

**Next step:** Review and approve this specification. On approval, extend `docs/openapi.yaml` to full parity and generate TypeScript SDK types.
