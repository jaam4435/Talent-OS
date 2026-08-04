# Talent OS — Ubiquitous Language

**Document version:** 1.0.0  
**Date:** August 2, 2026  
**Status:** Draft — awaiting approval

---

## Purpose

This glossary defines the **shared vocabulary** used consistently across Talent OS code, documentation, UI, events, and conversations. Terms are grouped by bounded context. Where legacy and module terms coexist, both are documented with the preferred term marked.

**Rule:** New code and documentation should use **preferred terms**. Legacy terms are listed for migration clarity.

---

## Core platform terms

| Term | Definition | Context | Notes |
|------|------------|---------|-------|
| **Organization** | A tenant workspace; the root isolation boundary for all data | Organization | Implemented as `tenants` table. Preferred over "tenant" in domain speech. |
| **Tenant** | Technical synonym for Organization | Platform | Used in code (`tenant_id`, RLS). Acceptable in infrastructure docs. |
| **Member** | A user belonging to an organization with a role | Organization | `tenant_members` row linking `user_id` ↔ organization. |
| **Invite** | Pending membership offer sent by email | Organization | Expires; distinct from CRM lead. |
| **Role** | Permission bundle: `admin`, `talent_manager`, `freelancer`, `client` | Identity & Access | Drives RBAC via `permissions.ts`. |
| **Manager** | `admin` or `talent_manager` role | Identity & Access | Can access analytics, approve payments, manage workflows. |
| **Profile** | Authenticated user identity (email, name) | Identity | Supabase `profiles`; not the same as Talent profile. |
| **Domain Event** | Immutable fact that something happened in the domain | Workflow | Stored in `domain_events` outbox. |
| **Outbox** | `domain_events` table; reliable event publication | Workflow | Processed by cron dispatcher. |
| **Workflow Run** | Single execution instance of a workflow definition | Workflow | `workflow_runs` row. |
| **Workflow Job** | Single step execution within a run | Workflow | `workflow_jobs` row; retriable. |
| **Approval Gate** | Human decision point blocking a workflow run | Workflow | `approval_requests`; may link to WhatsApp gate. |
| **Compensation** | Saga rollback action after step failure | Workflow | `workflow_compensations`. |
| **Idempotency Key** | Deduplication identifier for events and webhooks | Platform | Prevents double-processing. |
| **Correlation ID** | Trace identifier linking related events/runs | Platform | UUID propagated across workflow. |

---

## Organization context

| Term | Definition | Code reference |
|------|------------|----------------|
| **Department** | Organizational unit within an organization | `org_departments` |
| **Team** | Group of members, optionally under a department | `org_teams`, `org_team_members` |
| **Branding** | Logo and color configuration for the organization | `OrganizationBranding` |
| **Business Hours** | Weekly schedule defining operating windows | `BusinessHoursSchedule` |
| **Subscription Reference** | External billing provider ID (e.g. future Stripe customer) | `tenants.subscription_reference` |
| **Soft Delete** | Mark deleted without physical removal | `deleted_at` column |

---

## CRM & demand context

### Sales pipeline (preferred module terms)

| Term | Definition | Code reference |
|------|------------|----------------|
| **Lead** | Prospective client opportunity in sales pipeline | `crm_leads` |
| **Qualified Lead** | Lead that passed qualification criteria | status = `qualified`; triggers `wf-lead-qualification` |
| **Converted Lead** | Lead that became a client | status = `converted`; triggers `wf-client-onboarding` |
| **Company** | Client organization (end customer of the agency) | `companies` |
| **Contact** | Person at a company | `crm_contacts` |
| **Deal** | Sales opportunity with value and pipeline stage | `crm_deals` |
| **Pipeline Stage** | Step in the sales funnel | `crm_pipeline_stages` |
| **Contract** | Signed agreement linked to a deal | `crm_contracts` |
| **Activity** | Logged interaction (call, email, meeting) | `crm_activities` |
| **Note** | Free-text annotation on any CRM entity | `crm_notes` |

### Talent demand (legacy terms — still active)

| Term | Definition | Code reference | Preferred future term |
|------|------------|----------------|----------------------|
| **Opportunity** | Gig/work broadcast to freelancers | `opportunities` | **Work Opportunity** (to distinguish from Deal) |
| **Broadcast** | Sending opportunity invites to freelancers | `opportunity.broadcast` event | Opportunity Broadcast |
| **Shortlist** | Curated set of freelancers for an opportunity | `shortlists`, `shortlist_items` | Shortlist |
| **Recipient** | Freelancer invited to respond to an opportunity | `opportunity_recipients` | Opportunity Recipient |
| **Response** | Freelancer answer: interested or declined | `response` field | Opportunity Response |
| **Fill Rate** | Percentage of opportunities that reach filled status | Analytics view | Fill Rate |
| **Discipline** | Freelancer specialty category (design, video, copy, …) | `DisciplineType` enum | Discipline |

---

## Talent supply context

| Term | Definition | Code reference |
|------|------------|----------------|
| **Talent** | Preferred term for a freelancer in the supply pool | `freelancers` table |
| **Freelancer** | Legacy/code term synonymous with Talent | `freelancers` — use "Talent" in new docs |
| **Day Rate** | Daily billing rate for a talent | `freelancers.day_rate` |
| **Internal Rating** | Manager-assigned quality score (1–5) | `freelancers.internal_rating` |
| **Availability** | Current capacity status: available, busy, unavailable | `AvailabilityStatus` |
| **Availability Slot** | Specific time window of availability | `talent_availability_slots` |
| **Experience** | Work history entry on talent profile | `talent_experience` |
| **Document** | Uploaded file (CV, certificate, reference) | `talent_documents` |
| **Import Batch** | Bulk CSV import job with row-level results | `talent_import_batches` |
| **Profile Completeness** | Percentage score of filled profile sections | `profile_completeness` |
| **Portfolio Item** | Work sample linked to talent | `freelancer_portfolio_items` |
| **Match Score** | AI-generated fit score for opportunity ↔ talent | `talent_match_scores` |
| **Roster** | List of talent in the organization pool | UI term |

---

## Project delivery context

| Term | Definition | Code reference |
|------|------------|----------------|
| **Project** | Client delivery engagement assigned to a talent | `projects` |
| **Milestone** | Legacy payment/delivery gate within a project | `milestones` |
| **Task** | Granular work item within a project | `project_tasks` |
| **Deliverable** | Client-facing submission artifact | `project_deliverables` |
| **Asset** | Supporting file or link on a project | `project_assets` |
| **Dependency** | Predecessor/successor link between entities | `project_dependencies` |
| **Template** | Reusable project blueprint with default milestones/tasks | `project_templates` |
| **Health Score** | Computed 0–100 delivery health metric | `projects.health_score` |
| **Health Status** | Qualitative health: on_track, at_risk, blocked, completed | `ProjectHealthStatus` |
| **Timeline Event** | Audit entry on project activity stream | `project_timeline_events` |
| **Status Transition** | Allowed project status change for a role | `MANAGER_STATUS_TRANSITIONS` |
| **Submit** | Freelancer marks milestone/deliverable ready for review | `milestone.submitted` |
| **Review** | Manager approves or requests revision | `reviewMilestone()` |
| **Revision** | Manager feedback requiring freelancer rework | status = `revision` |

### Project statuses

| Status | Meaning |
|--------|---------|
| `draft` | Not yet started |
| `active` | Work in progress |
| `in_review` | Awaiting manager/client review |
| `completed` | Delivery finished |
| `archived` | Closed and archived |
| `canceled` | Terminated |

---

## Assignment context

| Term | Definition | Code reference |
|------|------------|----------------|
| **Allocation** | Assignment of a talent to a project/opportunity for a date range | `assignment_allocations` |
| **Allocation Percentage** | Portion of talent capacity allocated (0–100+) | `allocation_pct` |
| **Capacity** | Talent's declared weekly hours and max concurrent assignments | `assignment_capacity` |
| **Schedule** | Time blocks within an allocation | `assignment_schedules` |
| **Requirement** | Skill/hour requirements on an allocation | `assignment_requirements` |
| **Conflict** | Detected scheduling overlap or over-allocation | `assignment_conflicts` |
| **Double Booking** | Two allocations overlap in time | `conflict_type: double_booking` |
| **Over-allocation** | Total allocation pct exceeds 100% | `conflict_type: over_allocation` |
| **Suggestion** | AI-ranked talent recommendation for an allocation | `AssignmentSuggestion` (read model) |
| **Planned** | Allocation created but not yet confirmed by talent | status = `planned` |
| **Confirmed** | Talent accepted the allocation | status = `confirmed` |

---

## Finance context

| Term | Definition | Code reference |
|------|------------|----------------|
| **Payment** | Milestone-linked payment record | `payments` |
| **Approve Payment** | Manager authorizes pending payment | `FinanceService.approvePayment()` |
| **Mark Paid** | Record external payment with reference | `FinanceService.markPaymentPaid()` |
| **Payment Reference** | External transaction ID | `payments.payment_reference` |
| **Pending Payments Amount** | Sum of unpaid approved/pending payments | Analytics / dashboard |
| **Aging** | Days payment has been in current status | `v_payment_aging` |

### Payment statuses

| Status | Meaning |
|--------|---------|
| `pending` | Awaiting manager approval |
| `approved` | Approved, ready to pay |
| `processing` | Payment in progress |
| `paid` | Completed |
| `disputed` | Under dispute |
| `canceled` | Voided |

---

## Workflow context

| Term | Definition | Code reference |
|------|------------|----------------|
| **Workflow Definition** | Declarative process: trigger + steps + compensation | `workflow_definitions`, registry |
| **Business Workflow** | One of nine built-in end-to-end business processes | `BUSINESS_WORKFLOW_IDS` |
| **Trigger** | Domain event type that starts a workflow | `trigger.eventType` |
| **Step** | Atomic action in a workflow (notify, dispatch_n8n, execute_ai, …) | `WorkflowStep` |
| **Dead Letter** | Job that exhausted all retries | status = `dead_letter` |
| **Manual Trigger** | Manager-initiated workflow start via API | `triggerManual()` |
| **Saga** | Multi-step process with compensation on failure | Workflow engine pattern |

### Business workflow names

| ID | Business name |
|----|---------------|
| `wf-lead-qualification` | Lead Qualification |
| `wf-client-onboarding` | Client Onboarding |
| `wf-project-creation` | Project Creation |
| `wf-talent-matching` | Talent Matching |
| `wf-assignment` | Assignment |
| `wf-qa` | Quality Assurance |
| `wf-delivery` | Delivery |
| `wf-invoice` | Invoice |
| `wf-project-closure` | Project Closure |

---

## WhatsApp context

| Term | Definition | Code reference |
|------|------------|----------------|
| **Conversation** | Per-talent WhatsApp session state | `whatsapp_conversations` |
| **Intent** | Detected user command from message text | `WhatsAppPlatformIntent` |
| **Active Entity** | Context object the conversation is acting on | `active_entity_type/id` |
| **Memory Entry** | Turn in conversation history for AI context | `whatsapp_memory_entries` |
| **Approval Gate (WhatsApp)** | Link between workflow approval and WhatsApp session | `whatsapp_approval_gates` |
| **Command** | Business operation executed via WhatsApp or REST API | `executeCommand()` |
| **Opt Out** | Freelancer unsubscribes from WhatsApp messages | STOP keyword |
| **Agent Query** | Free-text message routed to AI assistant | intent = `agent.query` |

### Common WhatsApp commands

| User message | Intent | Business operation |
|--------------|--------|-------------------|
| YES / NO | opportunity.interested / declined | Respond to opportunity |
| ACCEPT ASSIGNMENT | assignment.accept | Confirm allocation |
| SUBMIT | milestone.submit | Submit milestone |
| DELIVER | deliverable.submit | Send deliverable |
| STATUS | project.status | List active projects |
| STOP | opt_out | Unsubscribe |

---

## AI & intelligence context

| Term | Definition | Code reference |
|------|------------|----------------|
| **AI Request** | Single LLM/embedding invocation in the ledger | `ai_requests` |
| **Feature** | AI capability tag (talent_match, brief_parse, digest, …) | `request_type` / gateway `feature` |
| **Gateway** | Central AI execution pipeline with guardrails | `lib/ai/gateway/` |
| **Guardrail** | Input validation / safety check before AI call | Gateway pipeline step |
| **PII Redaction** | Removal of sensitive data before provider call | Gateway pipeline step |
| **Circuit Breaker** | Fail-fast when provider error rate exceeds threshold | Gateway runtime |
| **Prompt Version** | Template version used for reproducibility | `ai_requests.prompt_version` |
| **Token** | LLM input/output unit for cost tracking | `input_tokens`, `output_tokens` |
| **Estimated Cost** | Computed provider cost for a request | `ai_requests.estimated_cost` |
| **Agent** | Role-based AI assistant with tools and memory | `AgentId` (7 agents) |
| **Agent Session** | Conversation instance for an agent run | `agent_sessions` |
| **MCP Tool** | Model Context Protocol tool exposed to agents | `lib/mcp/servers/*` |
| **Knowledge Entry** | Organizational document/memory for RAG | `knowledge_entries` |
| **Embedding Chunk** | Vector-indexed text segment of a knowledge entry | `knowledge_embeddings` |
| **RAG** | Retrieval-Augmented Generation using knowledge search | Knowledge + AI Gateway |

### AI features

| Feature key | Business purpose |
|-------------|-----------------|
| `talent_match` | Rank freelancers for an opportunity |
| `brief_parse` | Extract requirements from client brief |
| `project_summary` | Summarize project status |
| `shortlist_summary` | Summarize shortlist rationale |
| `status_assessment` | Assess milestone/project health |
| `digest` | WhatsApp AI assistant responses |

---

## Analytics context

| Term | Definition | Code reference |
|------|------------|----------------|
| **Dashboard** | Manager-facing metrics view for a domain | `ANALYTICS_DASHBOARDS` |
| **Summary** | KPI object in dashboard response | `payload.summary` |
| **Chart Series** | Named array of data points for visualization | `payload.charts` |
| **Export** | Downloadable CSV/JSON snapshot of a dashboard | `analytics_exports` |
| **Utilization** | Percentage of talent capacity allocated | Utilization dashboard |
| **Fill Rate** | Opportunity-to-filled conversion rate | CRM analytics |
| **Observability** | Platform health metrics (distinct from business analytics) | `ObservabilityService` |

---

## Notification context

| Term | Definition | Code reference |
|------|------------|----------------|
| **Notification** | In-app message to a user | `notifications` |
| **Notification Type** | Category tag (opportunity_response, milestone_approved, …) | `type` field |
| **Unread** | Notification not yet seen by user | `read_at IS NULL` |

---

## Integration terms

| Term | Definition |
|------|------------|
| **n8n** | External workflow automation platform; receives HMAC-signed webhooks |
| **Webhook Delivery** | Idempotent record of inbound/outbound webhook processing |
| **Meta WhatsApp** | WhatsApp Business API provider |
| **Supabase** | Postgres + Auth + Storage + RLS platform |
| **RLS** | Row-Level Security — tenant isolation at database layer |
| **MCP** | Model Context Protocol — agent tool interface |
| **Cron Dispatch** | Scheduled job that processes domain event outbox |

---

## Anti-patterns & deprecated terms

| Avoid | Use instead | Reason |
|-------|-------------|--------|
| "Tenant" in user-facing UI | Organization | Business language |
| "Freelancer" in new module docs | Talent | Module naming convention |
| "Invoice" for payment record | Payment | No invoice aggregate exists yet |
| "User" for talent | Talent / Member | Disambiguate profile vs talent |
| "Job" (ambiguous) | Workflow Job or Opportunity | Context-dependent overload |
| "Event" without qualifier | Domain Event | Distinguish from timeline events |
| Flat event names in new code | Namespaced (`crm.lead.created`) | Consistency with module pattern |

---

## Role-specific language

### Manager (admin / talent_manager)

Uses: Lead, Deal, Allocation, Approve, Review, Dashboard, Workflow, Export

### Talent (freelancer)

Uses: Opportunity, Assignment, Milestone, Submit, Deliver, Availability, WhatsApp commands

### Client

Uses: Project, Deliverable, Company (read-only on linked projects)

---

## Cross-context linking terms

| Term | Links |
|------|-------|
| **Company ID** | CRM company ↔ Project client ↔ Opportunity client |
| **Freelancer ID** | Talent ↔ Project assignment ↔ Allocation ↔ Payment |
| **Opportunity ID** | CRM deal (optional) ↔ Legacy opportunity ↔ Allocation |
| **Project ID** | Project ↔ Milestones ↔ Payments ↔ Deliverables ↔ Allocations |
| **Milestone ID** | Milestone ↔ Payment (1:1) |

---

## Related documents

- [DOMAIN_MODEL.md](./DOMAIN_MODEL.md) — structural model per context
- [CONTEXT_MAP.md](./CONTEXT_MAP.md) — context relationships
- [EVENT_CATALOG.md](./EVENT_CATALOG.md) — event type reference

---

## Glossary maintenance

When adding new domain concepts:

1. Add term to this document under the correct context
2. Add constant to module `types.ts` if it's an event or enum
3. Use the term consistently in API responses, UI copy, and commit messages
4. Mark legacy synonyms in the anti-patterns section
