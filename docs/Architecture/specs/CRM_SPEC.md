# CRM & Demand — Implementation Specification

**Document version:** 1.0.0  
**Date:** August 2, 2026  
**Status:** Draft — awaiting approval  
**Bounded context:** CRM & Demand Management  
**References:** Approved DDD documents

---

## 1. Business Overview

CRM & Demand manages **client acquisition and talent demand** for agencies through two sub-domains:

1. **Sales CRM** — leads, companies, contacts, deals, contracts, pipeline
2. **Talent Demand (legacy)** — opportunities, shortlists, broadcast to freelancers

Both share `companies` as the client anchor. Sales CRM uses namespaced events (`crm.*`); talent demand uses legacy flat events (`opportunity.*`).

---

## 2. Responsibilities

### In scope

- Lead capture, qualification, conversion
- Company and contact management
- Deal pipeline (Kanban stages)
- Contract lifecycle
- Notes, attachments, activities (polymorphic collateral)
- Talent opportunity create/broadcast/response (legacy)
- Shortlist management and AI match scores
- CRM audit logs and domain events

### Out of scope

- Freelancer profile management (Talent BC)
- Project delivery (Project BC)
- Payment processing (Finance BC)
- Workflow definition (Workflow BC) — consumes events only

---

## 3. Public APIs

### Sales CRM — `/api/crm/*`

| Method | Path | Permission | Description |
|--------|------|------------|-------------|
| GET/POST | `/api/crm/leads` | `crm:leads:manage` | List/create leads |
| GET/PATCH | `/api/crm/leads/{id}` | `crm:leads:manage` | Lead detail |
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
| GET | `/api/crm/audit-logs` | `crm:audit:read` | Audit |
| GET/POST | `/api/crm/opportunities` | `opportunities:*` | Legacy talent gigs |

### Legacy Server Actions

- `app/actions/companies.ts`, `app/actions/opportunities.ts` — unchanged

---

## 4. Internal Services

| Service | Path | Sub-domain |
|---------|------|------------|
| **CrmDemandService** | `lib/services/crm-demand.service.ts` | Sales CRM module |
| **CRMService** | `lib/services/crm.service.ts` | Legacy opportunities, WhatsApp responses |
| **AssignmentService** | `lib/services/assignment.service.ts` | Broadcast, shortlists |

**Module:** `modules/crm/` — types, validation, `CRM_EVENT_TYPES`

---

## 5. Database Schema

**Migration:** `024_crm_module.sql`  
**Legacy tables:** `opportunities`, `opportunity_recipients`, `shortlists`, `shortlist_items`, `talent_match_scores` (005)

| Table | Sub-domain |
|-------|------------|
| `crm_leads` | Sales |
| `crm_contacts` | Sales |
| `crm_deals` | Sales |
| `crm_pipeline_stages` | Sales |
| `crm_contracts` | Sales |
| `crm_notes`, `crm_attachments`, `crm_activities` | Sales collateral |
| `crm_audit_logs` | Sales audit |
| `companies` | Shared (extended) |
| `opportunities` | Talent demand |
| `opportunity_recipients` | Talent demand |
| `shortlists`, `shortlist_items` | Talent demand |
| `talent_match_scores` | AI output |

---

## 6. Aggregates

| Aggregate | Root | Invariants |
|-----------|------|------------|
| **Lead** | `crm_leads` | Status transitions: new → contacted → qualified/unqualified → converted |
| **Company** | `companies` | Unique name per tenant; status enum |
| **Contact** | `crm_contacts` | Optional company link |
| **Deal** | `crm_deals` | Must reference valid stage; value ≥ 0 |
| **Contract** | `crm_contracts` | Signed requires `signed_at` |
| **Opportunity** | `opportunities` | Status: draft → open → filled/closed/canceled |
| **OpportunityRecipient** | `opportunity_recipients` | One response per freelancer per opportunity |
| **Shortlist** | `shortlists` | Linked to opportunity |

---

## 7. Domain Events

### Sales CRM (`CRM_EVENT_TYPES`)

`crm.lead.created`, `crm.lead.status_changed`, `crm.lead.converted`, `crm.company.created/updated`, `crm.contact.created`, `crm.deal.created`, `crm.deal.stage_changed`, `crm.contract.created/signed`, `crm.note.created`, `crm.activity.logged`

### Talent demand (legacy)

`opportunity.broadcast`, `opportunity.response`, `opportunity.opened` (DB trigger on status → open)

**Workflow triggers:** `crm.lead.status_changed` (qualified) → `wf-lead-qualification`; `crm.lead.converted` → `wf-client-onboarding`

---

## 8. Commands

| Command | Service | Event |
|---------|---------|-------|
| CreateLead | CrmDemandService | `crm.lead.created` |
| UpdateLeadStatus | CrmDemandService | `crm.lead.status_changed` |
| ConvertLead | CrmDemandService | `crm.lead.converted` |
| CreateDeal / MoveDealStage | CrmDemandService | `crm.deal.*` |
| SignContract | CrmDemandService | `crm.contract.signed` |
| CreateOpportunity | CRMService | — |
| BroadcastOpportunity | AssignmentService | `opportunity.broadcast` |
| RespondToOpportunity | CRMService | `opportunity.response` |
| CreateOpportunity (WhatsApp) | WhatsAppPlatform → CRMService | via command API |

---

## 9. Queries

| Query | Returns |
|-------|---------|
| ListLeads | Paginated leads with filters |
| GetPipelineBoard | Stages + deals + totals |
| ListCompanies / GetCompany | Company records |
| ListDeals | Filter by stage, company |
| GetOpportunityDetail | Opportunity + recipients + match scores |
| ListAuditLogs | CRM audit entries |
| findPendingRecipient | Active invite for freelancer (WhatsApp) |

---

## 10. Validation Rules

**Source:** `modules/crm/validation.ts`

- Lead title: 2–200 chars; status enum
- Convert lead: optional company/deal creation flags
- Deal value: non-negative; currency 3 chars
- Company name: 2–120 chars
- Contact email: valid email when present
- Opportunity: required skills array; budget optional positive

**Business rules:**

- Converted leads cannot revert status
- Only invited freelancers can respond to opportunities
- Deal stage must exist in tenant pipeline

---

## 11. Authorization Rules

| Permission | Roles | Scope |
|------------|-------|-------|
| `crm:read` | admin, talent_manager | Read pipeline, contacts |
| `crm:leads:manage` | admin, talent_manager | Leads, activities |
| `crm:deals:manage` | admin, talent_manager | Deals, contracts |
| `crm:audit:read` | admin, talent_manager | Audit logs |
| `opportunities:*` | admin, talent_manager, freelancer (read/respond) | Talent gigs |
| `companies:*` | admin, talent_manager, client (read) | Companies |

**RLS:** Manager full access; freelancer read/respond own recipients; client read company-linked data.

---

## 12. AI Capabilities

| Feature | Trigger | Output |
|---------|---------|--------|
| **Talent match** | `ai.match_requested` | `talent_match_scores` rows |
| **Brief parse** | `ai.brief_parse_requested` | Structured opportunity fields |
| **MCP CRM tools** | Agent invocation | Read/write leads, deals via `lib/mcp/servers/crm.server.ts` |

**Entity descriptors:** `CRM_AI_ENTITIES` — lead, deal, company, contact

---

## 13. Background Jobs

| Job | Trigger | Action |
|-----|---------|--------|
| Domain event dispatch | Cron | Process `crm.*`, `opportunity.*` events |
| AI match workflow | `ai.match_requested` | Score freelancers, upsert match scores |
| Opportunity opened | DB trigger | Emit `opportunity.opened` on status change |

**Future:** Stale deal reminder cron; lead SLA escalation.

---

## 14. Integrations

| System | Usage |
|--------|-------|
| **WhatsApp** | Opportunity YES/NO via CRMService |
| **n8n** | Broadcast notifications, response handling |
| **AI Gateway** | Match, brief parse |
| **Workflow Engine** | Lead qualification, client onboarding |
| **Notifications** | Opportunity response to creator |

---

## 15. Observability

- `crm_audit_logs` — all module mutations
- Analytics: fill rate (`v_opportunity_fill_rate`), pipeline metrics (future RPC)
- MCP tool invocation logged in agent sessions

---

## 16. Testing Strategy

| Test | Focus |
|------|-------|
| Unit | CrmDemandService event + audit emission |
| Unit | Lead conversion creates company/deal |
| Integration | Pipeline stage transitions |
| Integration | Opportunity response RLS |
| E2E | Broadcast → WhatsApp response → workflow |

---

## 17. Migration Strategy

| Migration | Content |
|-----------|---------|
| `024_crm_module.sql` | Sales CRM tables |
| `012_core_schema_companies_clients.sql` | Companies, client role |
| Future split | Separate `TalentDemand` tables from sales CRM |

**Consolidation path:** Deprecate duplicate company create paths; unify on CrmDemandService.

---

## 18. Future Enhancements

1. **Split bounded contexts** — Sales CRM vs Talent Demand with explicit ACL
2. **Link deal ↔ opportunity** — Single demand object model
3. **Email integration** — Activity sync from email provider
4. **Pipeline automation** — Stage SLA workflows
5. **Unified event naming** — Migrate `opportunity.*` to `demand.opportunity.*`
6. **CRM analytics dashboard** — Dedicated RPC (partially in Analytics BC)
