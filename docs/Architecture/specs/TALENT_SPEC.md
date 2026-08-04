# Talent Supply — Implementation Specification

**Document version:** 1.0.0  
**Date:** August 2, 2026  
**Status:** Draft — awaiting approval  
**Bounded context:** Talent Supply Management  
**References:** `DOMAIN_MODEL.md`, `CONTEXT_MAP.md`, `EVENT_CATALOG.md`, `UBIQUITOUS_LANGUAGE.md`

---

## 1. Business Overview

The Talent Supply context manages the **freelancer supply side** of agency operations: profiles, skills, experience, documents, availability, rates, languages, portfolio, ratings, bulk import, and profile completeness scoring.

**Primary actors:** Talent manager (full roster), freelancer (self-service profile)  
**Business outcome:** Searchable, match-ready talent roster with audit trail and AI-ready profile exports.

---

## 2. Responsibilities

### In scope

- Freelancer profile CRUD (extended fields: employment type, languages, timezone, tags)
- Work history (experience entries)
- Document management (CV, certificates, references)
- Availability status and calendar slots
- Skill-based search and matching RPCs
- Bulk CSV import with batch error tracking
- Profile completeness scoring
- AI profile export (`ai_context`, `ai_summary`)
- Audit logging and domain events

### Out of scope

- Opportunity broadcast (CRM & Demand BC)
- Project assignment (Assignment BC)
- Payment processing (Finance BC)
- AI execution pipeline (AI Gateway BC) — consumes talent data only

---

## 3. Public APIs

Base path: `/api/talent`

| Method | Path | Permission | Description |
|--------|------|------------|-------------|
| GET | `/api/talent` | `talent:read` | Advanced search (filters, sort) |
| GET | `/api/talent/search` | `talent:read` | Legacy search (unchanged) |
| POST | `/api/talent` | `talent:manage` | Create talent |
| GET/PATCH/DELETE | `/api/talent/{id}` | read/manage | Profile CRUD |
| GET/POST/PATCH/DELETE | `/api/talent/{id}/experience` | read/manage | Work history |
| GET/POST/DELETE | `/api/talent/{id}/documents` | read/manage | Documents |
| GET/POST/PATCH/DELETE | `/api/talent/{id}/availability` | read/manage | Calendar slots |
| GET | `/api/talent/{id}/completeness` | `talent:read` | Completeness score |
| GET | `/api/talent/{id}/ai-profile` | `talent:read` | AI-ready export |
| POST | `/api/talent/match` | `talent:read` | Skill match RPC |
| POST | `/api/talent/import` | `talent:import` | Bulk CSV import |
| GET | `/api/talent/audit-logs` | `talent:audit:read` | Audit trail |

**Legacy:** Server Actions `app/actions/freelancers.ts`, `app/actions/portfolio.ts`.

---

## 4. Internal Services

| Service | Path | Role |
|---------|------|------|
| **TalentModuleService** | `lib/services/talent-module.service.ts` | Module orchestrator: CRUD, import, completeness, audit, events |
| **TalentService** | `lib/services/talent.service.ts` | Legacy: search, phone lookup for WhatsApp |
| **TalentService (domain)** | `lib/domains/talent/services/talent.service.ts` | Partial clean-architecture extraction (not primary) |

**Module layer:** `modules/talent/` — types, validation, `TALENT_EVENT_TYPES`, `TALENT_AI_ENTITIES`

**Repositories:** `TalentRepository`, `TalentExperienceRepository`, `TalentDocumentRepository`, `TalentAvailabilityRepository`, `TalentImportRepository`, `TalentAuditRepository`, `PortfolioRepository`, `RatingRepository`

---

## 5. Database Schema

**Migration:** `025_talent_module.sql`  
**Legacy:** `001_initial_schema.sql` (`freelancers`), `005_*` (portfolio, ratings)

| Table | Purpose |
|-------|---------|
| `freelancers` | Talent aggregate root (extended) |
| `talent_experience` | Work history entries |
| `talent_documents` | CV, certificates, references |
| `talent_availability_slots` | Calendar availability windows |
| `talent_import_batches` | Bulk import lifecycle |
| `freelancer_portfolio_items` | Legacy portfolio |
| `freelancer_rating_history` | Internal rating history |
| `talent_audit_logs` | Immutable audit |

**Key RPCs:** `search_talent_advanced`, `match_talent_skills`, `calculate_talent_completeness`

**RLS:** Managers read/write all; freelancers read/update own profile via `user_id` link.

---

## 6. Aggregates

| Aggregate | Root table | Invariants |
|-----------|------------|------------|
| **Talent** | `freelancers` | Valid discipline enum; day_rate ≥ 0; unique email per tenant |
| **Experience** | `talent_experience` | Belongs to talent; date range valid |
| **Document** | `talent_documents` | Valid document type enum; file path required for uploads |
| **AvailabilitySlot** | `talent_availability_slots` | `starts_at` < `ends_at`; status enum |
| **ImportBatch** | `talent_import_batches` | Row-level errors tracked; batch status: pending → processing → completed/failed |

**Consistency:** Single-aggregate transactions per command. Completeness recalculation triggered after material profile changes.

---

## 7. Domain Events

Namespace: `talent.*` — see `TALENT_EVENT_TYPES` in `modules/talent/types.ts`.

| Event | Trigger |
|-------|---------|
| `talent.created` | New freelancer profile |
| `talent.updated` | Profile field change |
| `talent.deleted` | Soft delete |
| `talent.experience.added` / `talent.experience.updated` | Experience CRUD |
| `talent.document.added` | Document upload |
| `talent.availability.updated` | Slot or status change |
| `talent.import.completed` | Import batch finished |
| `talent.completeness.updated` | Score recalculated |

**Emission:** `TalentModuleService` → `WorkflowService.emitEvent()` → `domain_events` outbox.

---

## 8. Commands

| Command | Input schema | Handler | Preconditions |
|---------|--------------|---------|---------------|
| CreateTalent | `createTalentSchema` | `createTalent()` | Manager; valid discipline |
| UpdateTalent | `updateTalentSchema` | `updateTalent()` | Manager or self (limited fields) |
| SoftDeleteTalent | `{ id }` | `softDeleteTalent()` | Manager; no active allocations |
| AddExperience | `createExperienceSchema` | `addExperience()` | Talent exists |
| UpdateExperience | `updateExperienceSchema` | `updateExperience()` | Experience belongs to talent |
| UploadDocument | `createDocumentSchema` | `addDocument()` | Valid type; storage path |
| UpdateAvailability | `updateAvailabilitySchema` | `updateAvailability()` | Valid slot range |
| ImportTalentBatch | `importTalentSchema` | `processImport()` | `talent:import` permission |
| RecalculateCompleteness | `{ id }` | internal | Triggered on material changes |

---

## 9. Queries

| Query | Handler | Returns |
|-------|---------|---------|
| SearchTalentAdvanced | `searchTalent()` | Paginated roster with filters |
| SearchTalentLegacy | `TalentService.searchRoster()` | Legacy search results |
| GetTalent | `getTalent()` | Full profile with relations |
| GetCompleteness | `getCompleteness()` | Score + missing sections |
| GetAiProfile | `getAiProfile()` | `ai_context` export for agents |
| MatchBySkills | `matchSkills()` | Ranked talent by skill overlap |
| ListAuditLogs | `listAuditLogs()` | Paginated audit entries |
| FindByPhone | `TalentService.findByPhone()` | Identity resolution (WhatsApp) |

**Read models:** Direct repository queries with RLS; no separate CQRS projections.

---

## 10. Validation Rules

**Source:** `modules/talent/validation.ts`

| Rule | Field | Constraint |
|------|-------|------------|
| Full name | `full_name` | 2–120 chars |
| Email | `email` | Valid email; unique per tenant |
| Day rate | `day_rate` | Non-negative number |
| Currency | `currency` | 3 uppercase letters |
| Skills | `skills[]` | Max 50 items; lowercase tags |
| Languages | `languages[]` | Valid ISO code + proficiency enum |
| Timezone | `timezone` | Valid IANA timezone |
| Employment type | `employment_type` | Enum: freelance, contract, part_time, full_time |
| Import rows | `rows[]` | Min 1 row; required name + email per row |
| Availability slot | `starts_at`, `ends_at` | ISO datetime; start before end |

**Business rules (service layer):**

- Import batches track per-row errors without partial commit of invalid rows
- Completeness score recalculated on profile, experience, document changes
- Freelancers cannot change internal rating or manager-only tags

---

## 11. Authorization Rules

| Permission | Roles | Operations |
|------------|-------|------------|
| `talent:read` | admin, talent_manager, freelancer (own) | Search, get profile |
| `talent:manage` | admin, talent_manager, freelancer (own limited) | CRUD profile, experience, documents |
| `talent:import` | admin, talent_manager | Bulk import |
| `talent:audit:read` | admin, talent_manager | Audit logs |

**RLS:** `is_manager_of(tenant_id)` for manager writes; freelancer scoped to `freelancers.user_id = auth.uid()`.

---

## 12. AI Capabilities

| Feature | Trigger | Output |
|---------|---------|--------|
| **Talent match input** | `ai.match_requested` | Freelancer profiles scored for opportunities |
| **AI profile export** | `GET /api/talent/{id}/ai-profile` | Structured `ai_context` for agents |
| **MCP talent tools** | Agent invocation | Read/write via `lib/mcp/servers/talent.server.ts` |

**Entity descriptors:** `TALENT_AI_ENTITIES` — talent, experience, document

**Indirect:** WhatsApp identity resolution via phone lookup feeds agent context.

---

## 13. Background Jobs

| Job | Trigger | Action |
|-----|---------|--------|
| Domain event dispatch | Cron `/api/cron/dispatch-events` | Process `talent.*` events |
| Import batch processing | `POST /api/talent/import` | Synchronous row processing with batch status |
| Completeness recalculation | Profile mutation | Inline after commit |

**Future:** Scheduled stale-profile reminder; import retry queue for failed batches.

---

## 14. Integrations

| System | Direction | Purpose |
|--------|-----------|---------|
| **Supabase Storage** | Outbound | CV/document file paths |
| **WhatsApp** | Inbound | Phone → talent identity resolution |
| **AI Gateway** | Outbound | Match scoring input; profile context |
| **Assignment BC** | Outbound | Availability slots consumed for conflict detection |
| **Analytics BC** | Outbound | Talent dashboard aggregations |
| **Domain events outbox** | Outbound | All mutations → `domain_events` |

---

## 15. Observability

| Signal | Source |
|--------|--------|
| Audit logs | `talent_audit_logs` — all mutations |
| Domain events | `talent.*` in `domain_events` |
| API instrumentation | `instrumentApiRequest()` on routes |
| Metrics | Roster size, completeness distribution, import success rate (Analytics BC) |

**Alerts (future):** Import batch failure rate; profiles below completeness threshold.

---

## 16. Testing Strategy

| Layer | Scope | Location |
|-------|-------|----------|
| Unit | Validation schemas | `tests/unit/talent*.test.ts` |
| Unit | Completeness calculation | Mock repos + assert score |
| Integration | API permission matrix | `tests/integration/talent-module.test.ts` |
| Integration | RLS freelancer self-service | `tests/integration/rls.test.ts` |
| Integration | Import batch error handling | Row-level failure cases |
| E2E | Search → match → assignment suggest | Critical workflow spec |

**Coverage target:** 80% on `TalentModuleService` mutation paths.

---

## 17. Migration Strategy

| Migration | Change |
|-----------|--------|
| `025_talent_module.sql` | Experience, documents, availability, import, audit tables |
| Future `032_*` | External portfolio sync; certification verification |

**Data migration:** Existing `freelancers` rows backfilled with default completeness scores. Legacy search RPC unchanged.

**Rollback:** Soft deletes only; import batches retain error history for audit.

---

## 18. Future Enhancements

1. **External portfolio sync** — Behance, Dribbble, GitHub profile import
2. **Certification verification** — Third-party credential validation
3. **Talent marketplace** — ✅ Sprint 24 read-only public discovery (`/marketplace`, feature-flagged)
4. **Skill taxonomy** — Controlled vocabulary vs free-form tags
5. **Availability forecasting** — Predict capacity from historical patterns
6. **Consolidate legacy TalentService** — Single module service path

---

## Appendix — File map

| Artifact | Path |
|----------|------|
| Types | `modules/talent/types.ts` |
| Validation | `modules/talent/validation.ts` |
| Module service | `lib/services/talent-module.service.ts` |
| Legacy service | `lib/services/talent.service.ts` |
| Repositories | `lib/repositories/talent*.repository.ts` |
| Routes | `app/api/talent/**` |
| Architecture doc | `docs/Architecture/TALENT_MODULE.md` |
