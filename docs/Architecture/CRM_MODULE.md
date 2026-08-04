# CRM Module

**Document version:** 1.0.0  
**Date:** August 2, 2026  
**Status:** Implemented  
**Migration:** `024_crm_module.sql`

---

## Overview

The CRM Module manages **demand** for Talent OS agencies: leads, accounts (companies), contacts, deals, talent opportunities, contracts, notes, attachments, and activities.

It complements the existing talent workflow (`opportunities` = gig broadcast) with a **sales pipeline** for client acquisition.

**Backward compatibility:** Existing `CRMService`, Server Actions (`app/actions/companies.ts`, `app/actions/opportunities.ts`), and talent opportunity UI remain unchanged.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│  REST API  /api/crm/*                                       │
└───────────────────────────┬─────────────────────────────────┘
                            │
┌───────────────────────────▼─────────────────────────────────┐
│  CrmDemandService  (lib/services/crm-demand.service.ts)     │
│  + existing CRMService (talent opportunities)                 │
└───────────────────────────┬─────────────────────────────────┘
                            │
     crm_* repositories + companies + opportunities (lead repo)
                            │
     crm_audit_logs + domain_events + notifications
```

| Layer | Location |
|-------|----------|
| Types & validation | `modules/crm/` |
| Repositories | `lib/repositories/crm-*.repository.ts` |
| Demand service | `lib/services/crm-demand.service.ts` |
| Talent CRM service | `lib/services/crm.service.ts` (unchanged) |
| REST routes | `app/api/crm/` |

---

## Entities

| Entity | Table | Purpose |
|--------|-------|---------|
| **Leads** | `crm_leads` | Demand capture (distinct from talent gigs) |
| **Companies** | `companies` | Accounts / end clients (extended with status) |
| **Contacts** | `crm_contacts` | People at companies |
| **Clients** | `companies.status = 'client'` | Converted accounts + `client` role invites |
| **Deals** | `crm_deals` | Sales pipeline items (Kanban) |
| **Opportunities** | `opportunities` | Talent gig broadcast (existing) |
| **Pipeline stages** | `crm_pipeline_stages` | Configurable Kanban columns |
| **Contracts** | `crm_contracts` | Signed agreements |
| **Notes** | `crm_notes` | Polymorphic notes |
| **Attachments** | `crm_attachments` | Polymorphic file metadata |
| **Activities** | `crm_activities` | Calls, emails, meetings |

---

## Lead status

| Status | Meaning |
|--------|---------|
| `new` | Captured, not contacted |
| `contacted` | Outreach started |
| `qualified` | Fit confirmed |
| `unqualified` | Disqualified |
| `converted` | Promoted to company/deal |

---

## Opportunity stages (talent gigs)

Existing enum on `opportunities.status`: `draft`, `open`, `closed`, `filled`, `canceled`.

Listed via `GET /api/crm/opportunities` for CRM visibility.

---

## Sales pipeline (Kanban)

Default stages seeded per tenant via `seed_crm_pipeline_stages()`:

1. Qualification (open)
2. Proposal (open)
3. Negotiation (open)
4. Won (won)
5. Lost (lost)

**Kanban board:** `GET /api/crm/pipeline` — deals grouped by stage.

**Move deal:** `PATCH /api/crm/deals/{id}/stage` with `{ "stage_id": "..." }`.

---

## Client conversion

`POST /api/crm/leads/{id}/convert`

Options:
- Create company from lead title
- Create deal in first open stage
- Mark company status as `client`

Emits `crm.lead.converted`, audit log, and owner notification.

---

## AI-ready architecture

Each lead, deal, company, and contact has `ai_context` JSONB for MCP/AI tool enrichment.

Entity descriptors: `CRM_AI_ENTITIES` in `modules/crm/types.ts`.

MCP stub: `lib/mcp/servers/crm.server.ts` — wire to `CrmDemandService` in Phase C.

---

## REST API

| Method | Endpoint | Permission |
|--------|----------|------------|
| GET | `/api/crm/pipeline` | `crm:read` |
| GET/POST | `/api/crm/leads` | read / `crm:leads:manage` |
| GET/PATCH | `/api/crm/leads/{id}` | read / manage |
| POST | `/api/crm/leads/{id}/convert` | `crm:leads:manage` |
| GET/POST | `/api/crm/companies` | read / `companies:create` |
| GET/PATCH | `/api/crm/companies/{id}` | read / `companies:update` |
| GET/POST | `/api/crm/contacts` | read / manage |
| GET/POST | `/api/crm/deals` | read / `crm:deals:manage` |
| PATCH | `/api/crm/deals/{id}/stage` | `crm:deals:manage` |
| GET | `/api/crm/opportunities` | `opportunities:read` |
| GET/POST | `/api/crm/contracts` | read / manage |
| GET/POST | `/api/crm/notes` | read / manage |
| GET/POST | `/api/crm/attachments` | read / manage |
| GET/POST | `/api/crm/activities` | read / manage |
| GET | `/api/crm/audit-logs` | `crm:audit:read` |

Query params: `page`, `limit`, `q`, `status`, `company_id`, `stage_id`, `entity_type`, `entity_id`.

---

## Events & notifications

| Event | Trigger |
|-------|---------|
| `crm.lead.created` | Lead created |
| `crm.lead.status_changed` | Lead updated |
| `crm.lead.converted` | Lead → company/deal |
| `crm.company.created` | Company created |
| `crm.deal.created` | Deal created |
| `crm.deal.stage_changed` | Kanban move |
| `crm.contract.created` | Contract created |
| `crm.activity.logged` | Activity logged |

All mutations write to `crm_audit_logs` (before/after state).

Lead conversion sends in-app notification to deal owner.

---

## Row Level Security

Managers: full CRM CRUD within tenant.  
Members: read via `user_tenant_ids()`.  
Companies: soft-delete filter; client read via `client_company_ids()`.

---

## Testing

| Suite | File |
|-------|------|
| Unit | `tests/unit/crm-demand.service.test.ts` |
| Integration | `tests/integration/crm-module.test.ts` |

Run: `npm test`

---

## Apply migration

```bash
supabase db push
# Applies 024_crm_module.sql
```

---

## Related documents

- [Organization Module](./ORGANIZATION_MODULE.md)
- [API Architecture](../05-api-architecture.md)
- [Multi-Tenant Architecture](../08-multi-tenant-architecture.md)
