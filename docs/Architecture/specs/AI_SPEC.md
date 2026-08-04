# AI & Intelligence — Implementation Specification

**Document version:** 1.0.0  
**Date:** August 2, 2026  
**Status:** Draft — awaiting approval  
**Bounded context:** AI & Intelligence Platform  
**Sub-contexts:** AI Gateway, Agent Framework, Knowledge Management  
**References:** `DOMAIN_MODEL.md`, `CONTEXT_MAP.md`, `EVENT_CATALOG.md`, `UBIQUITOUS_LANGUAGE.md`

---

## 1. Business Overview

The AI & Intelligence context provides the **central AI execution pipeline**, **role-based agents**, and **organizational knowledge (RAG)** for Talent OS. All AI invocations flow through a unified gateway with guardrails, cost tracking, and provider abstraction.

**Primary actors:** Platform (workflow/cron), talent manager (agent sessions), system integrations  
**Business outcome:** Governed AI execution with audit ledger, agent tool access, and searchable organizational memory.

---

## 2. Responsibilities

### In scope

**AI Gateway (9a)**

- Provider routing (OpenAI, Claude, Gemini, OpenRouter, Azure, Mock)
- Guardrails, PII redaction, circuit breakers
- Unified token/cost ledger (`ai_requests`)
- Integration executors: matching, brief-parse, summary, status-assessment
- Feature gating and monthly limits

**Agent Framework (9b)**

- Role-based agents (recruiter, PM, finance, QA, executive, knowledge, support)
- Session lifecycle, memory policies, reasoning policies
- MCP tool access across all business contexts
- Tenant agent config overrides

**Knowledge Management (9c)**

- Categorized knowledge entries with entity linking
- Chunking and embedding pipeline
- Full-text and vector search

### Out of scope

- Business entity mutations (delegated to owning contexts via MCP tools)
- Workflow orchestration (Workflow BC) — consumes `execute_ai` action
- WhatsApp intent parsing (WhatsApp BC) — falls through to agent query

---

## 3. Public APIs

### AI Gateway

| Method | Path | Permission | Description |
|--------|------|------------|-------------|
| POST | `/api/ai/match` | `ai:match` (feature flag) | Trigger talent match |
| POST | `/api/ai/match/{opportunityId}` | `ai:match` | Match for specific opportunity |
| POST | `/api/ai/pm/{entityType}/{entityId}` | `ai:pm` | PM status assessment |

**Internal:** AI Gateway invoked by workflow `execute_ai` action, WhatsApp agent queries, cron direct dispatch.

### Agent Framework

| Method | Path | Permission | Description |
|--------|------|------------|-------------|
| POST | `/api/agents/{agentId}/sessions` | Manager | Start agent session |
| GET | `/api/agents/{agentId}/sessions/{id}` | Manager | Session detail |
| POST | `/api/agents/{agentId}/run` | Manager | Execute agent turn |

**MCP servers:** `lib/mcp/servers/` — CRM, talent, projects, workflow, finance, analytics, knowledge, notification, storage, AI

### Knowledge Management

| Method | Path | Permission | Description |
|--------|------|------------|-------------|
| GET/POST | `/api/knowledge/entries` | Manager | List/create entries |
| GET/PATCH/DELETE | `/api/knowledge/entries/{id}` | Manager | Entry CRUD |
| POST | `/api/knowledge/search` | Manager | Full-text + vector search |

---

## 4. Internal Services

| Service | Path | Sub-context |
|---------|------|-------------|
| **AIService** | `lib/services/ai.service.ts` | Feature gating, limits, ledger |
| **AiGateway** | `lib/ai/gateway/` | Pipeline execution, providers |
| **Integration executors** | `lib/ai/integrations/` | matching, brief-parse, summary, status-assessment |
| **AgentService** | `lib/services/agent.service.ts` | Config merge, session lifecycle, executor |
| **AgentExecutor** | `lib/agents/executor.ts` | LLM reasoning + MCP tool calls |
| **KnowledgeService** | `lib/services/knowledge.service.ts` | CRUD, chunking, search |

**Repositories:** `AiRequestRepository`, `AgentConfigRepository`, `AgentInstructionRepository`, `AgentSessionRepository`, `AgentMemoryRepository`, `AgentMessageRepository`, `KnowledgeRepository`, `KnowledgeEmbeddingRepository`

---

## 5. Database Schema

**Migrations:** `016_knowledge_module.sql`, `017_agents_module.sql`, `018_ai_gateway.sql` (approximate)

| Table | Sub-context | Purpose |
|-------|-------------|---------|
| `ai_requests` | Gateway | AI invocation ledger |
| `agent_configs` | Agents | Tenant agent overrides |
| `agent_sessions` | Agents | Conversation session state |
| `agent_messages` | Agents | Turn history |
| `agent_memory_entries` | Agents | Long-term memory |
| `agent_instruction_versions` | Agents | Prompt versioning |
| `knowledge_entries` | Knowledge | Content + entity links |
| `knowledge_embeddings` | Knowledge | Vector chunks (1536 dims) |

**Key RPCs:** `search_knowledge_entries`, vector similarity search

---

## 6. Aggregates

| Aggregate | Root table | Invariants |
|-----------|------------|------------|
| **AiRequest** | `ai_requests` | Status: pending → completed/failed; token counts recorded |
| **AgentSession** | `agent_sessions` | Belongs to tenant + agent; entity context optional |
| **AgentConfig** | `agent_configs` | One override per agent per tenant |
| **KnowledgeEntry** | `knowledge_entries` | Valid category; embedding status tracked |
| **EmbeddingChunk** | `knowledge_embeddings` | Belongs to entry; chunk index unique |

**Circuit breaker:** Runtime state (not persisted); resets on success threshold.

---

## 7. Domain Events

### Integration events (consumed)

`ai.match_requested`, `ai.brief_parse_requested`, `ai.summary_requested`, `ai.status_assessment_requested`

### Platform events (`AI_EVENTS`)

`ai.request.started`, `ai.request.completed`, `ai.request.failed`, `ai.budget.threshold`

### Agent events

Session lifecycle events emitted via agent service (see EVENT_CATALOG.md)

**Emission:** AIService / AiGateway → `WorkflowService.emitEvent()` or direct outbox insert.

---

## 8. Commands

| Command | Handler | Sub-context |
|---------|---------|-------------|
| ExecuteAiRequest | `AiGateway.complete()` | Gateway |
| RequestTalentMatch | `matching.ts` executor | Gateway |
| ParseBrief | `brief-parse.ts` executor | Gateway |
| GenerateSummary | `summary.ts` executor | Gateway |
| AssessStatus | `status-assessment.ts` executor | Gateway |
| StartAgentSession | `AgentService.startSession()` | Agents |
| RunAgentTurn | `AgentService.run()` | Agents |
| CreateKnowledgeEntry | `KnowledgeService.create()` | Knowledge |
| EmbedKnowledgeEntry | `KnowledgeService.embed()` | Knowledge |
| SearchKnowledge | `KnowledgeService.search()` | Knowledge |

---

## 9. Queries

| Query | Returns |
|-------|---------|
| GetAiRequest | Ledger entry with tokens, cost, provider |
| ListAiRequests | Paginated by feature, date range |
| GetAgentSession | Session with messages and memory |
| GetAgentConfig | Merged config (defaults + tenant override) |
| SearchKnowledge | Full-text + vector ranked results |
| GetKnowledgeEntry | Entry with embedding status |

---

## 10. Validation Rules

| Rule | Field | Constraint |
|------|-------|------------|
| AI feature | feature flag | Must be enabled for tenant |
| Monthly limit | token count | Block when exceeded |
| Agent ID | `agentId` | Valid enum from agent registry |
| Knowledge title | `title` | 2–200 chars |
| Knowledge category | `category` | Valid enum |
| Search query | `q` | Min 2 chars |
| MCP tool args | per tool schema | Validated by tool server |

**Business rules:**

- PII redaction applied before provider call
- Circuit breaker opens after consecutive failures
- Budget threshold emits `ai.budget.threshold` event
- Agent tool calls logged in session metadata

---

## 11. Authorization Rules

| Permission | Roles | Scope |
|------------|-------|-------|
| AI features | Feature flag gated | Per-tenant enablement |
| Agent sessions | admin, talent_manager | Start/run agents |
| Knowledge CRUD | admin, talent_manager | Full access |
| Knowledge read (client) | client | Company-linked entries only |
| MCP tools | Agent executor | Scoped by tool server permissions |

**RLS:** Manager-scoped writes; agent sessions tied to tenant.

---

## 12. AI Capabilities

This context **is** the AI platform. Key capabilities:

| Capability | Description |
|------------|-------------|
| **Multi-provider routing** | Failover across OpenAI, Claude, Gemini, etc. |
| **Talent matching** | Score freelancers for opportunities |
| **Brief parsing** | Extract structured fields from free text |
| **Status assessment** | Narrative project health analysis |
| **Agent reasoning** | Multi-turn with MCP tool access |
| **RAG search** | Vector + full-text knowledge retrieval |
| **Cost governance** | Token ledger, monthly limits, budget alerts |

---

## 13. Background Jobs

| Job | Trigger | Action |
|-----|---------|--------|
| Direct AI dispatch | Cron (optional mode) | Process integration events without workflow |
| Knowledge embedding | Entry create/update | Async chunk + embed pipeline |
| Budget threshold check | After each request | Emit alert if threshold crossed |

**Execution modes:** `AI_EXECUTION_MODE=workflow` (default) or `direct` (cron bypass).

---

## 14. Integrations

| System | Direction | Purpose |
|--------|-----------|---------|
| **LLM providers** | Outbound | OpenAI, Claude, Gemini, OpenRouter, Azure |
| **Embedding models** | Outbound | text-embedding-3-small (1536 dims) |
| **Workflow BC** | Inbound | `execute_ai` action |
| **WhatsApp BC** | Inbound | Free-text agent queries |
| **All business BCs** | Bidirectional | MCP tool read/write |
| **n8n** | Optional | External AI execution mode |
| **Analytics BC** | Outbound | AI Usage dashboard |

---

## 15. Observability

| Signal | Source |
|--------|--------|
| AI ledger | `ai_requests` — tokens, cost, latency, provider |
| Agent sessions | `agent_sessions`, `agent_messages` |
| MCP tool calls | Logged in session metadata |
| Budget alerts | `ai.budget.threshold` events |
| Analytics | AI Usage dashboard (requests, cost by provider) |

---

## 16. Testing Strategy

| Test | Focus |
|------|-------|
| Unit | Provider routing and failover |
| Unit | PII redaction pipeline |
| Unit | Circuit breaker state transitions |
| Integration | Match executor with mock provider |
| Integration | Agent MCP tool invocation |
| Integration | Knowledge search RPC |
| E2E | WhatsApp agent query → tool call → response |

**Coverage target:** 80% on AiGateway and integration executors.

---

## 17. Migration Strategy

| Migration | Content |
|-----------|---------|
| `016_knowledge_module.sql` | Knowledge entries, embeddings, search RPC |
| `017_agents_module.sql` | Agent sessions, configs, messages |
| `018_*` (AI gateway) | ai_requests ledger |
| Future | Agent config UI; embedding model upgrade |

---

## 18. Future Enhancements

1. **Fine-tuned models** — Tenant-specific model selection
2. **Agent marketplace** — Custom agent definitions per tenant
3. **Real-time streaming** — SSE for agent responses
4. **Multi-modal** — Image/document analysis in gateway
5. **Evaluation framework** — Automated agent quality scoring
6. **Cost allocation** — Per-project AI spend tracking

---

## Appendix — UI surfaces (Sprint 19)

| Route | Purpose |
|-------|---------|
| `/ai/agents` | Agent launcher grid |
| `/ai/agents/{agentId}` | Agent chat session |
| `/knowledge` | Knowledge entry list + search |
| `/knowledge/{id}` | Entry detail + edit |
| `/knowledge/new` | Create entry |
| `/settings/agents` | Admin agent enable/tool settings |

Opportunity detail includes AI match panel (REST). Talent detail shows AI match insights when scores exist.

---

## Appendix — File map

| Artifact | Path |
|----------|------|
| AI Gateway | `lib/ai/gateway/` |
| Integrations | `lib/ai/integrations/` |
| Agent executor | `lib/agents/executor.ts` |
| MCP servers | `lib/mcp/servers/` |
| Knowledge service | `lib/services/knowledge.service.ts` |
| AI service | `lib/services/ai.service.ts` |
| Platform events | `modules/platform/events/catalog.ts` |
