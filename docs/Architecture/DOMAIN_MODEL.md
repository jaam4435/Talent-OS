# Talent OS — Domain Model

**Document version:** 1.0.0  
**Date:** August 2, 2026  
**Status:** Draft — awaiting approval  
**Method:** Domain-Driven Design (DDD) reverse-engineering from codebase

---

## Overview

Talent OS is a **modular monolith** for agency workforce operations. The system coordinates **demand** (CRM, opportunities), **supply** (talent), **delivery** (projects), **allocation** (assignments), **orchestration** (workflows), and **channels** (WhatsApp, notifications) within a multi-tenant **organization** boundary.

Each bounded context below maps to `modules/<context>/`, `lib/services/*-module.service.ts`, and `supabase/migrations/02x_*`.

---

## Bounded Context 1 — Organization Management

### Business purpose

Manage the **workspace organization** (tenant): identity, branding, structure (departments, teams), membership, invites, and subscription reference. Every other context is scoped by `tenant_id`.

### Aggregates

| Aggregate root | Consistency boundary |
|----------------|-------------------|
| **Organization** (`tenants`) | Profile, branding, timezone, currency, business hours, soft delete |
| **Department** (`org_departments`) | Name, slug, lifecycle within organization |
| **Team** (`org_teams`) | Department link, member roster via `org_team_members` |
| **Member** (`tenant_members`) | User ↔ organization role binding |
| **Invite** (`member_invites`) | Pending membership offers |

### Entities

- `OrganizationDepartment`, `OrganizationTeam`, `OrganizationMember`, `OrganizationInvite`
- `OrganizationAuditEntry` (audit trail entity, not part of transactional aggregate)

### Value objects

- `OrganizationBranding` — logo URL, primary/accent colors
- `OrganizationSettings` — timezone, currency, business hours schedule
- `BusinessHoursDay` / `BusinessHoursSchedule` — weekly open/close windows
- `UserRole`, `MemberStatus` — enums from shared kernel

### Domain services

- `OrganizationService` — orchestrates CRUD, invite lifecycle, audit + event emission

### Repositories

- `OrganizationRepository`, `OrganizationDepartmentRepository`, `OrganizationTeamRepository`, `OrganizationMemberRepository`, `OrganizationInviteRepository`, `OrganizationAuditRepository`
- `TenantRepository`, `TenantMemberRepository`, `MemberInviteRepository` (legacy paths)

### Domain events

See `ORGANIZATION_EVENT_TYPES` in `modules/organization/types.ts` (13 events).

### Commands (intent)

| Command | Handler |
|---------|---------|
| UpdateOrganization | `OrganizationService.updateProfile()` |
| UpdateBranding | `OrganizationService.updateBranding()` |
| InviteMember | `OrganizationService.inviteMember()` |
| ChangeMemberRole | `OrganizationService.changeMemberRole()` |
| SuspendMember / RemoveMember | `OrganizationService.suspendMember()` / `removeMember()` |
| CreateDepartment / UpdateDepartment / DeleteDepartment | Department CRUD |
| CreateTeam / UpdateTeam / DeleteTeam | Team CRUD |

### Policies

- Only `admin` or `talent_manager` may manage organization structure
- Soft-deleted organizations hidden from active queries (`deleted_at`)
- Invites expire; revoked invites cannot be reused
- RLS: `is_manager_of(tenant_id)` for structural changes

### External integrations

- **Supabase Auth** — `profiles`, magic link, session
- **Future billing** — `subscription_reference` reserved (no Stripe implementation)

---

## Bounded Context 2 — CRM & Demand Management

### Business purpose

Manage **client demand** through two coexisting sub-domains:

1. **Sales CRM** — leads, companies, contacts, deals, contracts, pipeline
2. **Talent Opportunities** (legacy) — gig broadcast to freelancers via shortlists

Both share `companies` as the client anchor.

### Aggregates

| Aggregate root | Sub-domain |
|----------------|------------|
| **Lead** (`crm_leads`) | Sales CRM |
| **Company** (`companies`) | Shared client entity |
| **Contact** (`crm_contacts`) | Sales CRM |
| **Deal** (`crm_deals`) | Sales CRM — pipeline stage transitions |
| **Contract** (`crm_contracts`) | Sales CRM |
| **Opportunity** (`opportunities`) | Talent demand — broadcast lifecycle |
| **Shortlist** (`shortlists`) | Talent demand — curated freelancer sets |
| **OpportunityRecipient** (`opportunity_recipients`) | Per-freelancer invite/response |

### Entities

- `CrmNote`, `CrmAttachment`, `CrmActivity` — collateral linked to CRM entities
- `CrmPipelineStage` — configurable pipeline
- `ShortlistItem`, `TalentMatchScore` — matching artifacts

### Value objects

- `CrmLeadStatus`, `CrmCompanyStatus`, `CrmContractStatus`, `CrmStageOutcome`
- `OpportunityStatus`, `DisciplineType` — shared enums
- Money: `value` + `currency` pairs on deals/contracts/opportunities

### Domain services

- `CrmDemandService` — module REST path; sales pipeline + audit
- `CRMService` (legacy) — opportunity broadcast, WhatsApp responses, company CRUD
- `AssignmentService` (legacy) — shortlist broadcast orchestration

### Repositories

- `CrmLeadRepository`, `CrmCompanyRepository`, `CrmContactRepository`, `CrmDealRepository`, `CrmContractRepository`, `CrmPipelineRepository`, `CrmNoteRepository`, `CrmAttachmentRepository`, `CrmActivityRepository`, `CrmAuditRepository`
- `LeadRepository`, `CompanyRepository`, `ShortlistRepository`, `MatchScoreRepository` (legacy)

### Domain events

**Module (namespaced):** `CRM_EVENT_TYPES` — 12 events (`crm.lead.*`, `crm.deal.*`, …)

**Legacy:** `opportunity.broadcast`, `opportunity.response`, `opportunity.opened` (DB trigger)

### Commands

| Command | Handler |
|---------|---------|
| CreateLead / QualifyLead / ConvertLead | `CrmDemandService` |
| MoveDealStage | `CrmDemandService.updateDeal()` |
| SignContract | `CrmDemandService.signContract()` |
| CreateOpportunity / BroadcastOpportunity | `CRMService` / `AssignmentService` |
| RespondToOpportunity | `CRMService.respondToOpportunity()` |

### Policies

- Lead conversion creates company/deal linkage
- Opportunity `open` status triggers `opportunity.opened` via DB trigger
- Freelancers may only respond to opportunities they were invited to
- Deal stage changes emit `crm.deal.stage_changed`

### External integrations

- **WhatsApp** — opportunity YES/NO responses via `CRMService.respondToPendingOpportunity()`
- **AI matching** — `ai.match_requested` → talent match scores
- **n8n** — broadcast and response workflows

---

## Bounded Context 3 — Talent Supply Management

### Business purpose

Manage the **freelancer supply side**: profiles, skills, experience, documents, availability, import batches, and profile completeness scoring.

### Aggregates

| Aggregate root | Consistency boundary |
|----------------|-------------------|
| **Talent** (`freelancers`) | Core profile, skills, rates, availability status |
| **Experience** (`talent_experience`) | Work history entries |
| **Document** (`talent_documents`) | CV, certificates, references |
| **AvailabilitySlot** (`talent_availability_slots`) | Bookable time windows |
| **ImportBatch** (`talent_import_batches`) | Bulk CSV import lifecycle |
| **PortfolioItem** (`freelancer_portfolio_items`) | Legacy portfolio |
| **Rating** (`freelancer_rating_history`) | Internal rating history |

### Entities

- `TalentAuditEntry`
- `TalentExperience`, `TalentDocument`, `TalentAvailabilitySlot`, `TalentImportBatch`

### Value objects

- `TalentLanguage` — code + proficiency level
- `TalentCompleteness` — score + missing sections
- `TalentEmploymentType`, `TalentDocumentType`, `TalentSlotStatus`
- `DisciplineType`, `AvailabilityStatus`
- `Money` — day rate + currency

### Domain services

- `TalentModuleService` — extended profile, import, completeness, audit
- `TalentService` (legacy) — CRUD, search, phone lookup for WhatsApp
- `lib/domains/talent/services/talent.service.ts` — partial clean-architecture extraction (not primary)

### Repositories

- `TalentRepository`, `TalentExperienceRepository`, `TalentDocumentRepository`, `TalentAvailabilityRepository`, `TalentImportRepository`, `TalentAuditRepository`
- `PortfolioRepository`, `RatingRepository`

### Domain events

`TALENT_EVENT_TYPES` — 9 events (`talent.created`, `talent.experience.added`, …)

### Commands

| Command | Handler |
|---------|---------|
| CreateTalent / UpdateTalent / SoftDeleteTalent | `TalentModuleService` |
| AddExperience / UploadDocument | `TalentModuleService` |
| UpdateAvailability | `TalentModuleService` |
| ImportTalentBatch | `TalentModuleService.processImport()` |
| RecalculateCompleteness | `TalentModuleService` (internal) |

### Policies

- Profile completeness recalculated on material changes
- Freelancer linked to user via `freelancers.user_id` for self-service
- Import batches track row-level errors without partial commit of invalid rows
- RLS: managers read all; freelancers read/update own profile

### External integrations

- **WhatsApp** — identity resolution by phone (`TalentService.findByPhone()`)
- **AI** — talent match input; `TALENT_AI_ENTITIES` for MCP tools
- **Storage** — CV/document file paths in Supabase storage

---

## Bounded Context 4 — Project Delivery Management

### Business purpose

Manage **client project delivery**: project lifecycle, milestones (legacy payment gates), tasks, deliverables, assets, comments, dependencies, templates, health scoring, and timeline.

### Aggregates

| Aggregate root | Consistency boundary |
|----------------|-------------------|
| **Project** (`projects`) | Status, health, priority, deadline, freelancer assignment |
| **Milestone** (`milestones`) | Legacy submit/review lifecycle; payment trigger |
| **Task** (`project_tasks`) | Work breakdown within project |
| **Deliverable** (`project_deliverables`) | Client-facing submission artifacts |
| **Template** (`project_templates`) | Reusable project blueprints |

### Entities

- `ProjectAsset`, `ProjectComment`, `ProjectDependency`
- `ProjectTimelineEvent` — read model / event log on project stream
- `ProjectAuditEntry`

### Value objects

- `ProjectPriority`, `ProjectHealthStatus`, `ProjectTaskStatus`, `ProjectDeliverableStatus`
- `ProjectHealth` — computed score + overdue counts
- `ProjectStatusTransition` — role-gated state machine (`MANAGER_STATUS_TRANSITIONS`, `FREELANCER_STATUS_TRANSITIONS`)
- `MilestoneStatus`

### Domain services

- `ProjectModuleService` — full delivery model + audit + events
- `ProjectService` (legacy) — project creation RPC, assignment
- `WorkflowService` — milestone submit/review (cross-context coordination)

### Repositories

- `ProjectRepository`, `ProjectMilestoneRepository`, `ProjectTaskRepository`, `ProjectDeliverableRepository`, `ProjectAssetRepository`, `ProjectCommentRepository`, `ProjectDependencyRepository`, `ProjectTemplateRepository`, `ProjectTimelineRepository`, `ProjectAuditRepository`
- `TaskRepository` (legacy milestone ops)

### Domain events

**Module:** `PROJECT_EVENT_TYPES` — 12 events

**Legacy:** `project.assigned`, `milestone.submitted`, `milestone.approved`, `milestone.revision_requested`, `milestone.overdue`, `project.closed`

### Commands

| Command | Handler |
|---------|---------|
| CreateProject / UpdateProject / TransitionStatus | `ProjectModuleService` |
| SubmitMilestone / ReviewMilestone | `WorkflowService` |
| CreateTask / CompleteTask | `ProjectModuleService` |
| SubmitDeliverable | `ProjectModuleService` |
| ApplyTemplate | `ProjectModuleService.applyTemplate()` |
| RefreshHealth | `ProjectModuleService` (internal) |

### Policies

- Status transitions enforced by role (manager vs freelancer)
- Milestone must be `submitted` before manager review
- Revision requires review note
- Deliverable submission refreshes project health
- Client role: read-only on company-linked projects

### External integrations

- **WhatsApp** — milestone submit/start, deliverable submit, project status
- **Finance** — milestone approval unlocks payment creation (001 schema)
- **Storage** — deliverable/asset file paths
- **Workflow** — QA workflow on `project.deliverable.submitted`

---

## Bounded Context 5 — Resource Assignment

### Business purpose

Plan and track **freelancer allocation** to projects/opportunities: capacity limits, schedules, conflict detection, and AI-assisted suggestions.

### Aggregates

| Aggregate root | Consistency boundary |
|----------------|-------------------|
| **Allocation** (`assignment_allocations`) | Status, pct, date range, project/opportunity link |
| **Capacity** (`assignment_capacity`) | Weekly hours, max concurrent assignments |
| **Conflict** (`assignment_conflicts`) | Detected scheduling conflicts |

### Entities

- `AssignmentSchedule`, `AssignmentRequirement`
- `AssignmentHistoryEntry`, `AssignmentAuditEntry`
- `AssignmentSuggestion` (read model, not persisted as aggregate)

### Value objects

- `AssignmentStatus` — planned → confirmed → active → completed | canceled
- `AssignmentConflictType`, `AssignmentConflictSeverity`
- `AssignmentConflictCheck` — ephemeral validation result
- Date range: `startsAt` + `endsAt` + `allocationPct`

### Domain services

- `AssignmentModuleService` — allocations, conflicts, suggestions, audit
- `AssignmentService` (legacy) — opportunity broadcast, shortlist orchestration

### Repositories

- `AssignmentAllocationRepository`, `AssignmentCapacityRepository`, `AssignmentScheduleRepository`, `AssignmentRequirementRepository`, `AssignmentConflictRepository`, `AssignmentHistoryRepository`, `AssignmentAuditRepository`

### Domain events

`ASSIGNMENT_EVENT_TYPES` — 9 events

### Commands

| Command | Handler |
|---------|---------|
| CreateAllocation | `AssignmentModuleService` |
| ConfirmAllocation / CancelAllocation | `updateAllocation()` / `cancelAllocation()` |
| UpdateCapacity | `AssignmentModuleService` |
| DetectConflicts | `AssignmentModuleService.checkConflicts()` (RPC `detect_assignment_conflicts`) |
| ResolveConflict | `AssignmentModuleService.resolveConflict()` |
| GenerateSuggestions | `AssignmentModuleService.suggestFreelancers()` |

### Policies

- Conflicts with `severity: error` block allocation unless `skip_conflict_check`
- Over-allocation (>100% pct) flagged as conflict
- Canceled allocations emit `assignment.canceled`
- WhatsApp accept/reject maps to confirmed/canceled status

### External integrations

- **Talent** — freelancer availability input
- **Project / Opportunity** — allocation targets
- **WhatsApp** — accept/reject assignment commands
- **Workflow** — `wf-assignment` on `assignment.created`

---

## Bounded Context 6 — Finance & Payments

### Business purpose

Track **milestone-linked payments** through manual approve/mark-paid workflow. Thin context — no billing, invoicing engine, or Stripe integration yet.

### Aggregates

| Aggregate root | Consistency boundary |
|----------------|-------------------|
| **Payment** (`payments`) | 1:1 with milestone; status lifecycle |

### Entities

- None beyond payment root (activity log references payment in metadata)

### Value objects

- `PaymentStatus` — pending → approved → processing → paid | disputed | canceled
- Money: `amount` + `currency`
- `payment_reference` — external payment trace

### Domain services

- `FinanceService` — approve, mark paid, list for UI

### Repositories

- `InvoiceRepository` (maps to `payments` table)

### Domain events

**DB-triggered (005):** `payment.{status}` for each status transition

**Workflow consumers:** `payment.approved`, `payment.paid`

### Commands

| Command | Handler |
|---------|---------|
| ApprovePayment | `FinanceService.approvePayment()` |
| MarkPaymentPaid | `FinanceService.markPaymentPaid()` |

### Policies

- Only `pending` → `approved` (manager/admin)
- Only `approved` → `paid` (admin with reference)
- Payment amount tied to milestone at creation (001 schema)
- Freelancers read own payments; clients read company project payments

### External integrations

- **DB triggers** — automatic domain event emission on status change
- **n8n** — invoice workflow on `payment.approved`
- **Future Stripe** — documented only; `subscription_reference` on tenant

---

## Bounded Context 7 — Workflow Orchestration

### Business purpose

**Event-driven process orchestration** across all contexts: match domain events to workflow definitions, enqueue jobs, human approvals, retries, compensation (saga rollback), and outbound actions (n8n, AI, notifications).

### Aggregates

| Aggregate root | Consistency boundary |
|----------------|-------------------|
| **WorkflowRun** (`workflow_runs`) | Single execution instance of a workflow |
| **WorkflowJob** (`workflow_jobs`) | Individual step job in a run |
| **ApprovalRequest** (`approval_requests`) | Human approval gate |
| **WorkflowDefinition** (`workflow_definitions`) | Reusable definition (builtin + tenant custom) |

### Entities

- `WorkflowExecutionHistoryEntry` — step-level audit
- `WorkflowCompensationRecord` — saga rollback job
- `WorkflowAuditEntry`
- `DomainEvent` (`domain_events`) — **outbox** entity (integration boundary)

### Value objects

- `WorkflowStep`, `WorkflowTrigger`, `WorkflowQueue`
- `WorkflowDefinitionCategory`
- Job status enums: pending, running, completed, failed, dead_letter
- `correlationId`, `idempotencyKey`

### Domain services

- `WorkflowEngineService` — core engine: trigger, execute, retry, compensate, resolve approval
- `WorkflowEngineModuleService` — REST management, manual trigger, observability
- `WorkflowService` — outbox write (`emitEvent`), milestone lifecycle (legacy bridge)

### Repositories

- `WorkflowRepository`, `WorkflowDefinitionRepository`, `WorkflowExecutionHistoryRepository`, `WorkflowCompensationRepository`, `WorkflowAuditRepository`
- `DomainEventRepository`

### Domain events

**Engine meta-events:** `WORKFLOW_EVENT_TYPES` — 11 events

**Consumed:** all `*.` namespaced events + legacy flat events (see EVENT_CATALOG.md)

**Emitted by actions:** configured `emit_event` steps, e.g. `project.closed`

### Commands

| Command | Handler |
|---------|---------|
| EmitDomainEvent | `WorkflowService.emitEvent()` → outbox |
| TriggerWorkflow | `WorkflowEngineService.triggerFromDomainEvent()` |
| ProcessJob / RetryJob | Cron `/api/cron/process-workflow-jobs` |
| ResolveApproval | `WorkflowEngineModuleService.resolveApproval()` |
| ManualTrigger | `WorkflowEngineModuleService.triggerManual()` |
| RetryFailedJobs / RetryCompensations | Module service |

### Policies

- Idempotency via `idempotency_key` on domain events
- Exponential backoff on job failure (max 5 retries → dead letter)
- Dead letter triggers compensation steps
- Approval gates block run until resolved
- Business workflows (9) chain CRM → Project → Assignment → Finance

### External integrations

- **n8n** — `dispatch_n8n` action; HMAC-signed webhooks
- **AI Gateway** — `execute_ai` action
- **NotificationService** — `notify` action
- **WhatsApp** — approval gates linked via `whatsapp_approval_gates`
- **Cron** — `/api/cron/dispatch-events`, `/api/cron/process-workflow-jobs`

---

## Bounded Context 8 — WhatsApp Channel Interface

### Business purpose

First-class **WhatsApp business channel** for freelancers and managers: inbound message processing, intent detection, conversation memory, audit, approval resolution, and delegation to other contexts (no duplicated business logic).

### Aggregates

| Aggregate root | Consistency boundary |
|----------------|-------------------|
| **Conversation** (`whatsapp_conversations`) | Session context, active entity, memory summary |
| **InboundMessage** (`whatsapp_messages`) | Raw message log |
| **ApprovalGate** (`whatsapp_approval_gates`) | Workflow approval ↔ WhatsApp session link |

### Entities

- `WhatsAppMemoryEntry` — turn history for AI context
- `WhatsAppAuditEntry` — platform operation audit
- `WebhookDelivery` — idempotency tracking (integration context)

### Value objects

- `WhatsAppPlatformIntent` — 20+ intent types
- `DetectedIntent` — intent + confidence + entities
- `ConversationContext` — active intent/entity/session state
- `ParsedWhatsAppMessage` — normalized Meta webhook payload

### Domain services

- `WhatsAppPlatformModuleService` — memory, audit, commands, exports; delegates to other module services
- `WhatsAppService` (legacy) — orchestration, agent queries, n8n payload building
- Intent/handler layer: `lib/whatsapp/intents.ts`, `lib/whatsapp/handlers.ts`

### Repositories

- `WhatsappConversationRepository`, `WhatsappMessageRepository`, `WhatsappMemoryRepository`, `WhatsappAuditRepository`, `WhatsappApprovalGateRepository`
- `WebhookDeliveryRepository`, `IntegrationConfigRepository`

### Domain events

`WHATSAPP_EVENT_TYPES` — 9 typed events + `whatsapp.unrecognized` (legacy string)

Also emits/consumes: `whatsapp.inbound`, `whatsapp.intent_handled`, `whatsapp.agent_requested`, `whatsapp.opt_out`

### Commands

| Command | Handler |
|---------|---------|
| ProcessInboundMessage | `WhatsAppPlatformModuleService.processInboundMessage()` |
| ExecuteBusinessCommand | `WhatsAppPlatformModuleService.executeCommand()` |
| ResolveApprovalViaWhatsApp | Handler → `WorkflowEngineModuleService` |
| RunAgentQuery | `WhatsAppService.runAgentQuery()` |
| RegisterApprovalGate | `WhatsAppPlatformModuleService.registerApprovalGate()` |

### Policies

- Freelancer identity resolved by phone number within tenant
- Context-aware intent: active entity beats generic YES/NO keywords
- All business mutations delegate to owning context services
- Opt-out clears active conversation entity
- Webhook idempotency via `wa-inbound:{messageId}`

### External integrations

- **Meta WhatsApp Business API** — webhook GET/POST verification
- **AI Gateway** — free-text agent queries
- **n8n** — outbound confirmations and replies
- **All business contexts** — CRM, Project, Assignment, Workflow (downstream)

---

## Bounded Context 9 — AI & Intelligence Platform

Sub-contexts: **AI Gateway**, **Agents**, **Knowledge**. Related but separable; share `ai_requests` ledger.

### 9a — AI Gateway

#### Business purpose

Central **AI execution pipeline**: provider routing, guardrails, PII redaction, circuit breakers, unified token/cost ledger.

#### Aggregates

| Aggregate root | Consistency boundary |
|----------------|-------------------|
| **AiRequest** (`ai_requests`) | Single AI invocation lifecycle |

#### Value objects

- `AiProvider`, `AiRequestType`, prompt hash/version, token counts, estimated cost
- Circuit breaker state (runtime, not persisted)

#### Domain services

- `AIService` — feature gating, monthly limits, ledger
- `AiGateway` (`lib/ai/gateway/`) — pipeline execution
- Integration executors: `matching.ts`, `brief-parse.ts`, `summary.ts`, `status-assessment.ts`

#### Repositories

- `AiRequestRepository`

#### Domain events

- Integration: `ai.match_requested`, `ai.brief_parse_requested`, `ai.summary_requested`, `ai.status_assessment_requested`
- Platform: `AI_EVENTS` — `ai.request.started/completed/failed`, `ai.budget.threshold`

#### External integrations

- **OpenAI, Claude, Gemini, OpenRouter, Azure OpenAI, Mock** — providers
- **n8n** — optional execution mode (`AI_EXECUTION_MODE`)

---

### 9b — Agent Framework

#### Business purpose

**Role-based AI agents** (recruiter, PM, finance, QA, executive, knowledge, support) with sessions, memory, MCP tool access, and configurable policies.

#### Aggregates

| Aggregate root | Consistency boundary |
|----------------|-------------------|
| **AgentSession** (`agent_sessions`) | Conversation turn state |
| **AgentConfig** (`agent_configs`) | Tenant override of agent defaults |

#### Entities

- `AgentMessage`, `AgentMemoryEntry`, `AgentInstructionVersion`

#### Value objects

- `AgentId`, `AgentMemoryPolicy`, `AgentReasoningPolicy`, `AgentConversationPolicy`
- `AgentToolCallRecord`, `AgentRunResult`

#### Domain services

- `AgentService` — config merge, session lifecycle, `AgentExecutor` runs

#### Repositories

- `AgentConfigRepository`, `AgentInstructionRepository`, `AgentSessionRepository`, `AgentMemoryRepository`, `AgentMessageRepository`

#### External integrations

- **MCP tool servers** — CRM, talent, projects, workflow, finance, analytics, knowledge, notification, storage, AI
- **AI Gateway** — LLM completion for agent reasoning

---

### 9c — Knowledge Management

#### Business purpose

**Organizational memory** for RAG: categorized entries, chunking, embedding status, entity linking, full-text search.

#### Aggregates

| Aggregate root | Consistency boundary |
|----------------|-------------------|
| **KnowledgeEntry** (`knowledge_entries`) | Content, links, embedding status |
| **EmbeddingChunk** (`knowledge_embeddings`) | Vector chunks per entry |

#### Value objects

- `KnowledgeCategory`, `KnowledgeEmbeddingStatus`
- `KnowledgeEntryLinks` — entity/project/company associations

#### Domain services

- `KnowledgeService` — CRUD, chunking, search

#### Repositories

- `KnowledgeRepository`, `KnowledgeEmbeddingRepository`

#### External integrations

- **Embedding models** — OpenAI text-embedding-3-small (1536 dims)
- **Storage** — optional file attachments

---

## Bounded Context 10 — Analytics & Reporting

### Business purpose

**Read-only cross-context reporting** for managers: 8 dashboards, chart aggregations, caching, CSV/JSON exports. No domain mutations.

### Aggregates

| Aggregate root | Consistency boundary |
|----------------|-------------------|
| **AnalyticsExport** (`analytics_exports`) | Export job with content + expiry |

### Entities

- `AnalyticsCacheSnapshot` — optional persisted cache (supporting)

### Value objects

- `AnalyticsDashboardPayload` — summary + charts
- `ChartDataPoint`, `AnalyticsPeriod`
- `AnalyticsModuleSummary` — combined overview

### Domain services

- `AnalyticsModuleService` — dashboard orchestration, cache, exports
- `AnalyticsService` (legacy) — role-based dashboard context, team page

### Repositories

- `AnalyticsModuleRepository`, `AnalyticsExportRepository`
- `DashboardRepository` (legacy `v_dashboard_summary`)

### Domain events

None emitted (read-only context).

### Commands

| Command | Handler |
|---------|---------|
| GetDashboard | `AnalyticsModuleService.getDashboard()` |
| CreateExport | `AnalyticsModuleService.createExport()` |
| InvalidateCache | `?refresh=true` query param |

### Policies

- Manager-only (`analytics:read`, `analytics:export`)
- SECURITY DEFINER RPCs enforce `is_manager_of(tenant_id)`
- Export content expires after 7 days

### External integrations

- **Supabase RPCs** — `get_analytics_*` aggregation functions
- **Legacy views** — `v_dashboard_summary`, `v_freelancer_utilization`, etc.

---

## Bounded Context 11 — Platform Core (Shared Kernel)

### Business purpose

Cross-cutting **platform infrastructure**: feature flags, layered config, org context resolution, API idempotency, observability.

### Aggregates

| Aggregate root | Consistency boundary |
|----------------|-------------------|
| **FeatureFlag** (`platform_feature_flags`) | Per-tenant feature toggles |
| **PlatformConfig** (`platform_config`) | Layered configuration entries |

### Entities (observability)

- `PlatformLogEntry`, `PlatformMetricPoint`, `PlatformTraceSpan`, `PlatformAlert`
- `ApiIdempotencyResponse` — request deduplication

### Value objects

- `TenantContext`, `SessionContext`, `Permission` strings
- Config schema layers (global → tenant → user)

### Domain services

- `ObservabilityService` — health dashboard, alerts
- Platform SDK: `createPlatformClient()`, context resolver, feature flag provider

### Domain events

`PLATFORM_EVENTS`, `AI_EVENTS` (platform-level AI lifecycle)

### External integrations

- **Redis** — distributed cache, rate limiting
- **Supabase** — auth, RLS helper functions (`is_manager_of`, `user_tenant_ids`)

---

## Supporting Subdomain — Notifications

### Business purpose

Deliver **in-app notifications** triggered by workflows and domain services.

### Aggregates

**Notification** (`notifications`) — per-user notification record

### Domain services

- `NotificationService` — create, list, mark read

### Repositories

- `NotificationRepository`

### Domain events

None directly; consumed via workflow `notify` action

### External integrations

- **n8n** — email delivery via workflows (not direct SMTP)
- **Observability** — `instrumentNotification()` metrics

---

## Cross-Context Integration Pattern

```
[Bounded Context mutation]
    → Domain Event (domain_events outbox)
        → Workflow Engine (match + enqueue jobs)
            → n8n / AI / Notification / WhatsApp / emit_event
```

**Anti-corruption layers:**
- `lib/integrations/n8n.ts` — n8n envelope format
- `lib/integrations/whatsapp.ts` — Meta webhook parsing
- `lib/ai/gateway/` — provider abstraction
- `lib/mcp/servers/` — MCP tool surface for agents

---

## Known modeling gaps (technical debt)

| Gap | Impact |
|-----|--------|
| Dual service pattern (legacy + module) per context | Two orchestration paths; consolidation needed |
| Split event naming (namespaced vs flat) | Workflow registry must match both styles |
| Opportunity vs CRM Lead overlap | Two demand models without explicit bounded context boundary |
| `lib/domains/talent` partial extraction | Incomplete clean architecture migration |
| Finance context is thin | No Invoice aggregate, no Stripe, DB-trigger-only events |
| Analytics reads across all contexts | Acceptable for reporting; no CQRS read models |

---

## Related documents

- [CONTEXT_MAP.md](./CONTEXT_MAP.md) — relationships between contexts
- [EVENT_CATALOG.md](./EVENT_CATALOG.md) — complete event inventory
- [UBIQUITOUS_LANGUAGE.md](./UBIQUITOUS_LANGUAGE.md) — glossary
