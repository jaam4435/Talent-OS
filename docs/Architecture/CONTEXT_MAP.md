# Talent OS — Context Map

**Document version:** 1.0.0  
**Date:** August 2, 2026  
**Status:** Draft — awaiting approval

---

## Legend

| Symbol | Meaning |
|--------|---------|
| `[BC]` | Bounded context |
| `[SK]` | Shared kernel |
| `[SD]` | Supporting subdomain |
| `───>` | Downstream (customer/supplier) |
| `- - ->` | Published language / conformist |
| `═══` | Anti-corruption layer (ACL) |
| `(OHS)` | Open Host Service |
| `(PL)` | Published Language |
| `(CF)` | Conformist |

---

## System context diagram

```
                    ┌─────────────────────────────────────────┐
                    │           External Actors               │
                    │  Meta WhatsApp │ n8n │ AI Providers      │
                    │  (Future: Stripe, Email SMTP)           │
                    └──────────┬──────────────┬───────────────┘
                               │              │
                    ═══════════╪══════════════╪══════════════
                    │  Anti-Corruption Layers │              │
                    │  lib/integrations/*     │ lib/ai/*     │
                    ═══════════╪══════════════╪══════════════
                               │              │
┌──────────────────────────────▼──────────────▼──────────────────────────────┐
│                         Talent OS Modular Monolith                          │
│                                                                             │
│  ┌─────────────┐                                                           │
│  │ [SK]        │◄──────────────── all contexts conform ────────────────┐   │
│  │ Platform    │   tenant_id, RBAC, domain_events outbox, RLS         │   │
│  │ Core        │                                                        │   │
│  └──────┬──────┘                                                        │   │
│         │                                                                 │   │
│  ┌──────▼──────┐                                                        │   │
│  │ [BC]        │                                                        │   │
│  │ Organization│───► every other BC (tenant boundary)                  │   │
│  └─────────────┘                                                        │   │
│         │                                                                 │   │
│    ┌────┴────────────────────────────────────────────┐                  │   │
│    │                                                  │                  │   │
│  ┌─▼─────────┐    ┌─────────────┐    ┌─────────────┐ │                  │   │
│  │ [BC] CRM  │    │ [BC] Talent │    │ [BC] Finance│ │                  │   │
│  │ & Demand  │───►│ Supply      │    │ Payments    │ │                  │   │
│  └─────┬─────┘    └──────┬──────┘    └──────▲──────┘ │                  │   │
│        │                 │                   │        │                  │   │
│        └────────┬────────┘                   │        │                  │   │
│                 │                            │        │                  │   │
│          ┌──────▼──────┐              ┌──────┴──────┐ │                  │   │
│          │ [BC] Project│──────────────│ Milestone   │ │                  │   │
│          │ Delivery    │              │ payment link│ │                  │   │
│          └──────┬──────┘              └─────────────┘ │                  │   │
│                 │                                      │                  │   │
│          ┌──────▼──────┐                               │                  │   │
│          │ [BC]        │                               │                  │   │
│          │ Assignment  │◄── capacity/conflict checks ──┘                  │   │
│          └──────┬──────┘                                                    │   │
│                 │                                                           │   │
│  ┌──────────────▼──────────────────────────────────────────────────────┐  │   │
│  │                    [BC] Workflow Orchestration                       │  │   │
│  │   domain_events ──► runs ──► jobs ──► n8n / AI / notify / approve  │──┘   │
│  └──────────────┬───────────────────────────────┬───────────────────────┘      │
│                 │                               │                              │
│  ┌──────────────▼──────────┐    ┌───────────────▼──────────────┐              │
│  │ [BC] WhatsApp Channel   │    │ [BC] AI & Intelligence       │              │
│  │ (OHS) intents + memory  │    │ Gateway │ Agents │ Knowledge  │              │
│  └─────────────────────────┘    └──────────────────────────────┘              │
│                                                                                │
│  ┌─────────────────────────┐    ┌──────────────────────────────┐              │
│  │ [BC] Analytics (CF)     │    │ [SD] Notifications (CF)      │              │
│  │ read-only all contexts  │    │ workflow-triggered delivery  │              │
│  └─────────────────────────┘    └──────────────────────────────┘              │
└────────────────────────────────────────────────────────────────────────────────┘
```

---

## Context relationships

### Organization → All contexts

| Relationship | Type | Integration |
|--------------|------|-------------|
| Organization → CRM, Talent, Project, … | **Shared tenant boundary** | `tenant_id` FK on all tables; RLS `is_manager_of()` |
| Organization → Identity | **Partnership** | `tenant_members.user_id` → `profiles` |

Organization is the **root tenancy aggregate**. All other contexts are conformist to the organization boundary.

---

### CRM & Demand ↔ Talent Supply

| Relationship | Type | Integration |
|--------------|------|-------------|
| CRM → Talent | **Customer/supplier** | Opportunity broadcast → `opportunity_recipients.freelancer_id` |
| Talent → CRM | **Upstream** | `RespondToOpportunity` command; `opportunity.response` event |
| CRM → AI | **Customer** | `ai.match_requested` → `talent_match_scores` |
| CRM (Sales) → CRM (Opportunities) | **Partnership (same BC, different sub-domains)** | `crm_deals.opportunity_id` optional link |

**Published language:** Opportunity, Shortlist, MatchScore (legacy flat events)  
**Tension:** Two demand models (sales pipeline vs gig broadcast) share `companies` without explicit aggregate boundary in code.

---

### CRM & Demand → Project Delivery

| Relationship | Type | Integration |
|--------------|------|-------------|
| CRM → Project | **Customer/supplier** | `projects.company_id`, `projects.opportunity_id` (implicit) |
| CRM → Project | **Event-driven** | `crm.lead.converted` → `wf-client-onboarding`; `project.created` workflow |

---

### Talent Supply → Assignment → Project

| Relationship | Type | Integration |
|--------------|------|-------------|
| Talent → Assignment | **Upstream supplier** | `assignment_allocations.freelancer_id` |
| Assignment → Project | **Customer** | `assignment_allocations.project_id` |
| Assignment → Talent | **Conformist** | Reads availability, skills for conflict/suggestion |
| Assignment → Workflow | **Downstream** | `assignment.created` → `wf-assignment` |

---

### Project Delivery → Finance

| Relationship | Type | Integration |
|--------------|------|-------------|
| Project → Finance | **Customer/supplier** | `payments.milestone_id` (1:1); milestone approval unlocks payment |
| Project → Finance | **Event-driven** | `milestone.approved` → delivery workflow; `payment.approved` → invoice workflow |

Finance is a **thin downstream context** conformist to Project milestone lifecycle.

---

### All contexts → Workflow Orchestration

| Relationship | Type | Integration |
|--------------|------|-------------|
| * → Workflow | **Published language (PL)** | `domain_events` outbox; event type strings |
| Workflow → n8n | **ACL + OHS** | `dispatch_n8n` action; HMAC envelope |
| Workflow → AI | **ACL** | `execute_ai` action → `lib/integrations/ai/*` |
| Workflow → Notifications | **Customer** | `notify` action → `NotificationService` |
| Workflow → WhatsApp | **Customer** | Approval gates; outbound via n8n |

Workflow is the **central orchestrator**. Contexts publish events; workflow reacts. Contexts do not call workflow directly (except manual trigger API).

---

### WhatsApp Channel → Business contexts

| Relationship | Type | Integration |
|--------------|------|-------------|
| WhatsApp → CRM | **ACL (delegates)** | `CRMService.respondToPendingOpportunity()` |
| WhatsApp → Project | **ACL** | `ProjectModuleService`, `WorkflowService` |
| WhatsApp → Assignment | **ACL** | `AssignmentModuleService` |
| WhatsApp → Workflow | **ACL** | `WorkflowEngineModuleService.resolveApproval()` |
| WhatsApp → AI | **ACL** | `AiGateway.complete()` for agent queries |
| WhatsApp → Workflow | **Downstream events** | `whatsapp.inbound`, `whatsapp.intent_handled` |

WhatsApp is an **Open Host Service** for the freelancer channel. It translates channel commands into domain commands in other contexts.

---

### AI & Intelligence → Business contexts

| Relationship | Type | Integration |
|--------------|------|-------------|
| AI Gateway → CRM/Talent/Project | **Service provider** | Feature-specific executors read/write entity context |
| Agents → All (via MCP) | **OHS** | `lib/mcp/servers/*` expose read/write tools per context |
| Knowledge → All | **Upstream reference** | Entity-linked entries for RAG context |
| AI → Workflow | **Conformist** | Workflow triggers AI via `execute_ai`; AI emits request events |

---

### Analytics → All contexts

| Relationship | Type | Integration |
|--------------|------|-------------|
| Analytics → * | **Conformist (read-only)** | SECURITY DEFINER RPCs aggregate across tables |
| Analytics → Organization | **Customer** | Manager permission check |

Analytics has **no upstream influence**. It reads published data; never mutates domain state.

---

### Platform Core (Shared Kernel)

| Relationship | Type | Integration |
|--------------|------|-------------|
| Platform → All | **Shared kernel** | Feature flags, config, tenant context, idempotency |
| Platform → Workflow | **Partnership** | Observability views for queue depth, failures |

---

## Integration topology (event flow)

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│ Organization │     │ CRM & Demand │     │Talent Supply │
└──────┬───────┘     └──────┬───────┘     └──────┬───────┘
       │                    │                    │
       │    domain_events (outbox)               │
       └────────────────────┼────────────────────┘
                            │
                    ┌───────▼────────┐
                    │    Workflow    │
                    │  Orchestration │
                    └───┬───┬───┬────┘
                        │   │   │
              ┌─────────┘   │   └─────────┐
              ▼             ▼             ▼
         ┌────────┐   ┌─────────┐   ┌──────────┐
         │  n8n   │   │   AI    │   │ WhatsApp │
         │(OHS)   │   │ Gateway │   │ Channel  │
         └────────┘   └─────────┘   └──────────┘
                            │
                    ┌───────▼────────┐
                    │  Analytics     │
                    │  (read-only)   │
                    └────────────────┘
```

---

## Context maturity matrix

| Context | Module layer | Legacy service | Event namespacing | REST API | Audit log |
|---------|-------------|----------------|-------------------|----------|-----------|
| Organization | ✅ | ✅ same | ✅ | ✅ | ✅ |
| CRM (sales) | ✅ | — | ✅ | ✅ | ✅ |
| CRM (opportunities) | — | ✅ | ❌ flat | partial | partial |
| Talent | ✅ | ✅ | ✅ | ✅ | ✅ |
| Project | ✅ | ✅ | ✅ + legacy | ✅ | ✅ |
| Assignment | ✅ | ✅ | ✅ | ✅ | ✅ |
| Finance | — | ✅ thin | ❌ DB trigger | partial | — |
| Workflow | ✅ | ✅ | ✅ | ✅ | ✅ |
| WhatsApp | ✅ | ✅ | ✅ + legacy | ✅ | ✅ |
| AI Gateway | partial | ✅ | mixed | partial | ledger |
| Agents | ✅ | ✅ | — | ✅ | sessions |
| Knowledge | ✅ | ✅ | — | ✅ | — |
| Analytics | ✅ | ✅ | N/A read-only | ✅ | exports |
| Platform | ✅ | ✅ | ✅ | partial | observability |

---

## Recommended future context boundaries

| Proposed split | Rationale |
|----------------|-----------|
| **Talent Demand** (separate from Sales CRM) | Opportunity/shortlist/broadcast is a distinct ubiquitous language from leads/deals |
| **Billing** (separate from Finance/Payments) | Stripe/subscriptions would be a new BC, not an extension of milestone payments |
| **Marketplace** (Sprint 11) | External talent marketplace would be ACL + new aggregate roots |

---

## Team alignment suggestion

| Team / focus | Primary contexts | Secondary |
|--------------|-----------------|-----------|
| Platform | Organization, Platform Core, Workflow | Analytics |
| Demand | CRM & Demand | WhatsApp (opportunity flows) |
| Supply | Talent, Assignment | AI matching |
| Delivery | Project, Finance | WhatsApp (milestone flows) |
| Intelligence | AI Gateway, Agents, Knowledge | Workflow AI steps |
| Channels | WhatsApp | Notifications |

---

## Related documents

- [DOMAIN_MODEL.md](./DOMAIN_MODEL.md) — per-context aggregates and entities
- [EVENT_CATALOG.md](./EVENT_CATALOG.md) — integration event inventory
- [UBIQUITOUS_LANGUAGE.md](./UBIQUITOUS_LANGUAGE.md) — shared terminology
