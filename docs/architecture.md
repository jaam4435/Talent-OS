# Architecture

Talent OS is a **multi-tenant, event-driven SaaS platform** for creative agencies. It follows a **modular monolith** on Next.js with async orchestration via n8n and governed AI via a central gateway.

---

## Layered Design

```
┌─────────────────────────────────────────────────────────────┐
│  Presentation — Next.js App Router (RSC + Client Components) │
├─────────────────────────────────────────────────────────────┤
│  Application — Server Actions, Route Handlers, Cron          │
├─────────────────────────────────────────────────────────────┤
│  Domain Services — lib/services/* (business orchestration)   │
├─────────────────────────────────────────────────────────────┤
│  Repositories — lib/repositories/* (Supabase data access)    │
├─────────────────────────────────────────────────────────────┤
│  Infrastructure — Supabase (Auth, DB, Storage, Realtime)     │
├─────────────────────────────────────────────────────────────┤
│  Integrations — n8n, WhatsApp, AI providers, webhooks        │
└─────────────────────────────────────────────────────────────┘
```

### Request flow

```
Browser → Page (RSC) → lib/queries/* → createServices() → Repository → PostgreSQL
Browser → Action     → createServices() → Service → Repository → PostgreSQL
Webhook → Route      → createAdminServices() → Service → emit domain_event
Cron    → Route      → WorkflowEngine / dispatch-events
```

**Rule:** Pages never call repositories directly. All mutations go through services.

---

## Bounded Contexts

| Context | Modules / Services | Key Tables |
|---|---|---|
| **Core** | Auth, RBAC, tenants | `tenants`, `profiles`, `tenant_members` |
| **Talent** | `TalentService` | `freelancers`, `freelancer_portfolio_items` |
| **CRM** | `CRMService` | `companies`, `opportunities` |
| **Assignment** | `AssignmentService` | `opportunity_recipients`, `shortlists` |
| **Projects** | `ProjectService` | `projects`, `milestones`, `tasks` |
| **Finance** | `FinanceService` | `payments` |
| **Workflow** | `WorkflowEngineService` | `domain_events`, `workflow_runs`, `workflow_jobs` |
| **AI** | `AIService`, `lib/ai/` | `ai_requests`, `talent_match_scores` |
| **Knowledge** | `KnowledgeService` | `knowledge_entries`, `knowledge_embeddings` |
| **Agents** | `AgentService`, `lib/ai/agent/` | `agent_configs`, `agent_sessions` |
| **WhatsApp** | `WhatsAppService` | `whatsapp_conversations`, `whatsapp_messages` |
| **Marketplace** | (architecture) | See [35-marketplace-architecture.md](./35-marketplace-architecture.md) |

Auto-generated service list: [generated/services.md](./generated/services.md)

---

## Cross-Cutting Concerns

| Concern | Implementation |
|---|---|
| **Multi-tenancy** | `tenant_id` on all tables + RLS (`is_manager_of`) |
| **Auth** | Supabase Auth JWT, session in cookies |
| **RBAC** | `modules/core/services/permissions.ts` |
| **Events** | Transactional outbox (`domain_events`) — see [Events](./events.md) |
| **AI** | All LLM calls via `lib/ai/gateway.ts` — see [AI](./ai.md) |
| **Agents** | MCP tools + configurable agents — see [Agent Framework](./34-agent-framework.md) |
| **Caching** | Repository-level cache (`BaseRepository.withCache`) |

---

## Architectural Principles

1. **Tenant isolation by default** — RLS on every data path
2. **Async side effects** — outbox → n8n / workflow engine
3. **Idempotent integrations** — webhook dedup keys, event idempotency
4. **Provider abstraction** — AI, email, WhatsApp behind interfaces
5. **Observable workflows** — correlation IDs across app → events → n8n

---

## Related

- [System Diagrams](./system-diagrams.md) — C4 and sequence diagrams
- [11 Enterprise Architecture](./11-enterprise-system-architecture.md) — full HLD
- [08 Multi-Tenant Architecture](./08-multi-tenant-architecture.md) — isolation detail
- [30 Service Layer](./30-service-layer.md) — service patterns
