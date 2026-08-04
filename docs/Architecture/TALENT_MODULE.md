# Talent Module

**Document version:** 1.0.0  
**Date:** August 2, 2026  
**Status:** Implemented  
**Migration:** `025_talent_module.sql`

---

## Overview

The Talent Module manages **supply** for Talent OS agencies: freelancer profiles, skills, experience, availability, rates, languages, timezones, employment type, portfolio, CV/documents, AI summary, ratings, performance signals, tags, bulk import, and profile completeness.

It extends the existing freelancer stack (`freelancers`, portfolio, ratings, search RPC) with structured REST APIs, audit logging, domain events, and AI-ready profile exports.

**Backward compatibility:** Existing `TalentService`, Server Actions (`app/actions/freelancers.ts`, `app/actions/portfolio.ts`), and `GET /api/talent/search` remain unchanged.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│  REST API  /api/talent/*                                    │
│  (existing GET /api/talent/search unchanged)                │
└───────────────────────────┬─────────────────────────────────┘
                            │
┌───────────────────────────▼─────────────────────────────────┐
│  TalentModuleService  (lib/services/talent-module.service.ts)│
│  + existing TalentService (server actions / legacy flows)     │
└───────────────────────────┬─────────────────────────────────┘
                            │
     talent_* repositories + freelancers + portfolio + ratings
                            │
     talent_audit_logs + domain_events
```

| Layer | Location |
|-------|----------|
| Types & validation | `modules/talent/` |
| Repositories | `lib/repositories/talent*.repository.ts` |
| Module service | `lib/services/talent-module.service.ts` |
| Legacy service | `lib/services/talent.service.ts` (unchanged) |
| REST routes | `app/api/talent/` |

---

## Entities

| Entity | Table / Field | Purpose |
|--------|---------------|---------|
| **Talent** | `freelancers` | Core profile (extended) |
| **Skills** | `freelancers.skills[]` | Skill tags for matching |
| **Experience** | `talent_experience` | Work history entries |
| **Availability** | `freelancers.availability` + `talent_availability_slots` | Status enum + calendar slots |
| **Rates** | `freelancers.day_rate`, `currency` | Day rate pricing |
| **Languages** | `freelancers.languages` (JSONB) | Spoken languages |
| **Timezones** | `freelancers.timezone` | IANA timezone |
| **Employment Type** | `freelancers.employment_type` | freelance, contract, part_time, full_time |
| **Portfolio** | `freelancer_portfolio_items` | Existing portfolio (unchanged) |
| **CV / Documents** | `talent_documents`, `cv_file_path` | CV and supporting files |
| **AI Summary** | `freelancers.ai_summary`, `ai_context` | AI-ready narrative + context |
| **Ratings** | `freelancers.internal_rating`, `freelancer_rating_history` | Internal ratings (existing) |
| **Performance** | `freelancers.last_active_at`, projects | Activity signals (existing) |
| **Tags** | `freelancers.tags[]` | Classification tags |
| **Import batches** | `talent_import_batches` | CSV/bulk import tracking |

---

## Features

### Advanced search

`GET /api/talent` — filters via `search_talent_advanced` RPC:

- Text query (`q`)
- Discipline, availability, employment type, timezone
- Skills (`skills=react,typescript`), tags
- Rate range, min rating, min completeness
- Sort: `rating`, `name`, `rate_asc`, `rate_desc`, `active`, `completeness`

Legacy search: `GET /api/talent/search` (unchanged).

### Availability calendar

`GET/POST/PATCH/DELETE /api/talent/{id}/availability`

Calendar slots with `starts_at`, `ends_at`, `status` (`available`, `busy`, `unavailable`, `booked`).

Range filter: `?from=...&to=...`

### Skill matching

`POST /api/talent/match`

```json
{ "skills": ["react", "typescript"], "discipline": "engineering", "limit": 20 }
```

Uses `match_talent_skills` RPC. Complements existing AI match (`suggest_talent_for_opportunity`).

### Bulk / CSV import

`POST /api/talent/import`

```json
{
  "file_name": "roster.csv",
  "rows": [
    {
      "full_name": "Jane Doe",
      "email": "jane@example.com",
      "discipline": "engineering",
      "skills": ["react"]
    }
  ]
}
```

Returns import batch with per-row errors.

### Profile completeness

`GET /api/talent/{id}/completeness`

Scores 0–100 across sections: basics, skills, profile, rates, location, employment, documents, experience, AI.

Auto-updated on profile/experience/document changes.

### AI-ready profile

`GET /api/talent/{id}/ai-profile`

Structured export: summary, `ai_context`, skills, rates, experience/document counts, completeness — for MCP/AI tools.

Entity descriptors: `TALENT_AI_ENTITIES` in `modules/talent/types.ts`.

---

## REST API summary

| Method | Path | Permission | Description |
|--------|------|------------|-------------|
| GET | `/api/talent` | `talent:read` | Advanced list/search |
| POST | `/api/talent` | `talent:manage` | Create talent |
| GET | `/api/talent/{id}` | `talent:read` | Get profile |
| PATCH | `/api/talent/{id}` | `talent:manage` | Update profile |
| DELETE | `/api/talent/{id}` | `talent:manage` | Soft delete |
| GET/POST | `/api/talent/{id}/experience` | read/manage | Work history |
| GET/POST/DELETE | `/api/talent/{id}/documents` | read/manage | CV & documents |
| GET/POST/PATCH/DELETE | `/api/talent/{id}/availability` | read/manage | Calendar slots |
| GET | `/api/talent/{id}/completeness` | `talent:read` | Completeness score |
| GET | `/api/talent/{id}/ai-profile` | `talent:read` | AI-ready export |
| POST | `/api/talent/match` | `talent:read` | Skill matching |
| POST | `/api/talent/import` | `talent:import` | Bulk CSV import |
| GET | `/api/talent/audit-logs` | `talent:audit:read` | Audit trail |
| GET | `/api/talent/search` | manager | Legacy search (unchanged) |

---

## Events

| Event type | Trigger |
|------------|---------|
| `talent.created` | Profile created |
| `talent.updated` | Profile updated |
| `talent.deleted` | Soft delete |
| `talent.experience.added` | Experience added |
| `talent.experience.updated` | Experience updated |
| `talent.document.added` | Document uploaded |
| `talent.availability.updated` | Calendar slot changed |
| `talent.import.completed` | Bulk import finished |
| `talent.completeness.updated` | Score recalculated |

Events emitted via `domain_events` + recorded in `talent_audit_logs`.

---

## Permissions

| Permission | Roles | Purpose |
|------------|-------|---------|
| `talent:read` | admin, talent_manager | List, search, match, completeness, AI profile |
| `talent:manage` | admin, talent_manager | CRUD profiles, experience, documents, availability |
| `talent:import` | admin, talent_manager | Bulk CSV import |
| `talent:audit:read` | admin, talent_manager | Audit log access |

Legacy `freelancers:*` permissions remain for server actions.

---

## RLS

All new tables use tenant-scoped RLS:

- Managers: full access within tenant
- Freelancers: self-service on own experience, documents, availability
- Audit logs: manager read, manager insert (via service)

Soft deletes via `deleted_at` on `freelancers` and child tables.

---

## Testing

| Test file | Coverage |
|-----------|----------|
| `tests/unit/talent-module.service.test.ts` | Completeness, create, match, update errors |
| `tests/integration/talent-module.test.ts` | Migration, routes, permissions, backward compat |

Run: `npm test`

---

## Migrations index

| # | File | Module |
|---|------|--------|
| 001 | `001_initial_schema.sql` | Core + freelancers |
| 009 | `009_talent_portfolio_system.sql` | Portfolio, ratings, search |
| 023 | `023_organization_module.sql` | Organization |
| 024 | `024_crm_module.sql` | CRM |
| **025** | **`025_talent_module.sql`** | **Talent module** |

---

## Observability

- Audit logs: `GET /api/talent/audit-logs`
- Domain events: `talent.*` event types in event pipeline
- Import batches track success/error counts per job

---

## Related docs

- [CRM Module](./CRM_MODULE.md) — demand/sales pipeline
- [Organization Module](./ORGANIZATION_MODULE.md) — tenant structure
- OpenAPI: `docs/openapi.yaml` — Talent tag endpoints
