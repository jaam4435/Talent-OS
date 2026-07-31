# AI Platform — Gap Analysis

**Document version:** 1.0.0  
**Date:** July 31, 2026  
**Baseline architecture:** [AI_PLATFORM.md](./AI_PLATFORM.md) v1.0.0  
**Baseline codebase:** `cursor/p0-production-blockers-5fb1` (includes distributed Redis rate limits)  
**Scope:** Analysis only — no implementation

---

## Executive Summary

Talent OS has a **credible AI gateway foundation** (`lib/ai/`, ~29 files) that covers provider abstraction, structured outputs, retry/fallback, and basic observability. Against the target **AI Platform** architecture, overall maturity is **~38%**.

| Dimension | Current | Target (AI_PLATFORM.md) | Gap |
|-----------|:-------:|:-----------------------:|:---:|
| AI Gateway | 55% | 100% | Pipeline, cache, circuit breakers, guardrails |
| Provider Layer | 50% | 100% | Azure, embeddings API, policy routing |
| Prompt Platform | 25% | 100% | Postgres registry, eval, lifecycle |
| Embedding Platform | 20% | 100% | Generation, indexing jobs, search pipeline |
| Memory Platform | 30% | 100% | Unified scopes, retention, semantic recall |
| Cost Platform | 30% | 100% | USD budgets, alerts, optimization |
| AI Observability | 40% | 100% | Traces, provider health, quality signals |
| AI Security | 15% | 100% | Guardrails, PII, injection defense |
| Developer Experience | 35% | 100% | Platform SDK, tests, DI |
| Multi-Product | 5% | 100% | `productId`, namespaces, registration |

**Overall platform maturity: ~38%**

Confirmed architecture decisions (not yet implemented) widen several gaps:

- pgvector first (schema ready; pipeline missing)
- Azure OpenAI Phase 1 (not started)
- Hybrid budgets — soft alert + hard 402 (only request-count limit exists)
- Product IDs `talent_os`, `media_intel`, `ad_studio` (not in schema or types)
- Direct execution default; deprecate n8n-only AI path (inverted today)

---

## Comparison Matrix

| AI_PLATFORM.md Component | Status | Evidence |
|----------------------------|:------:|----------|
| **AI Gateway — complete/stream/structured** | Implemented | `lib/ai/gateway.ts` |
| **AI Gateway — 18-stage pipeline** | Missing | Monolithic `execute()` method |
| **AI Gateway — response cache** | Missing | No cache layer |
| **AI Gateway — circuit breakers** | Missing | Not in middleware |
| **AI Gateway — gateway-level auth** | Partial | Auth at API/service layer only |
| **Provider Layer — OpenAI/Anthropic/Gemini/OpenRouter** | Implemented | `lib/ai/providers/` |
| **Provider Layer — Azure OpenAI** | Missing | Confirmed Phase 1; not in codebase |
| **Provider Layer — embedding API** | Missing | No `embed()` on `AiProviderInterface` |
| **Provider Layer — policy routing** | Partial | Env `AI_PRIMARY_PROVIDER` + fallback chain |
| **Prompt Platform — registry** | Partial | In-memory `PromptManager` only |
| **Prompt Platform — Postgres + eval + rollback** | Missing | No `ai_prompt_*` tables |
| **Embedding Platform — chunking** | Implemented | `KnowledgeService.prepareEmbeddingChunks()` |
| **Embedding Platform — vector generation** | Missing | `storeEmbeddingVector()` unused |
| **Embedding Platform — pgvector search** | Partial | RPC exists; requires external embedding input |
| **Memory Platform — agent scopes** | Partial | `agent_memory_entries`, `lib/ai/agent/memory.ts` |
| **Memory Platform — unified 9-scope model** | Missing | No user/org/client/talent/platform memory |
| **Cost Platform — per-request cost in DB** | Implemented | `ai_requests.estimated_cost` |
| **Cost Platform — USD budgets + 402** | Missing | Count-based monthly limit only |
| **Cost Platform — in-memory tracker** | Partial | `globalCostTracker` — process-local, lost on cold start |
| **AI Observability — metrics** | Partial | `instrumentAiRequest()`, SQL views |
| **AI Observability — trace spans per stage** | Missing | No prompt/guardrail/provider sub-spans |
| **AI Security — guardrails** | Missing | No input/output validation layer |
| **AI Security — PII redaction** | Missing | No AI-path PII pipeline |
| **AI Security — prompt hash audit** | Implemented | `prompt_hash` on `ai_requests` |
| **DevEx — `createAiPlatformClient`** | Missing | `getAiGateway()` only |
| **DevEx — `lib/ai-platform/` SDK** | Missing | Folder does not exist |
| **DevEx — AI unit/integration tests** | Missing | No `tests/**/ai*` files |
| **Multi-product — `productId`** | Missing | Not in `AiCompletionRequest` or DB |
| **Integration — direct AI execution default** | Missing | `AI_EXECUTION_MODE=direct` opt-in; n8n default |
| **Integration — MCP tool execution** | Missing | `McpGateway.invoke()` returns stub error |
| **Integration — agent framework** | Partial | Reasoning loop works; tools non-functional |

---

## Implemented

Capabilities that meet or substantially meet the target design.

### AI Gateway core

| Item | Location | Notes |
|------|----------|-------|
| Central gateway singleton | `lib/ai/gateway.ts`, `getAiGateway()` | All integration LLM calls route here |
| Structured output (`completeStructured`) | `gateway.ts` | JSON Schema via providers |
| Streaming (`stream`) | `gateway.ts`, `lib/ai/streaming/handler.ts` | SSE helpers; token usage estimated on stream |
| Provider fallback chain | `lib/ai/middleware/fallback.ts` | Primary → configured fallbacks |
| Retry with exponential backoff | `lib/ai/middleware/retry.ts` | Respects `isRetryableAiError()` |
| Distributed rate limiting | `lib/ai/middleware/rate-limit.ts` | Upstash Redis + memory fallback |
| Feature flag gates | `lib/ai/features/flags.ts` | Tenant settings + env toggles |
| Error hierarchy | `lib/ai/errors.ts` | Typed gateway errors |

### Provider Layer

| Item | Location | Notes |
|------|----------|-------|
| `AiProviderInterface` | `lib/ai/providers/interface.ts` | Swappable provider contract |
| OpenAI provider | `openai.provider.ts` | JSON Schema structured output |
| Anthropic provider | `anthropic.provider.ts` | Tool-use style structured output |
| Gemini provider | `gemini.provider.ts` | responseSchema support |
| OpenRouter provider | `openrouter.provider.ts` | Multi-model proxy |
| Provider registry | `lib/ai/providers/index.ts` | `getProviderChain()` |

### Prompts (baseline)

| Item | Location | Notes |
|------|----------|-------|
| In-memory prompt registry | `lib/ai/prompt/manager.ts` | Register, version, `build()`, hash |
| Default feature prompts | `registerDefaultPrompts()` | talent_match, brief_parse, etc. |
| Agent instruction prompts | `lib/ai/agent/instructions.ts` | Registered in PromptManager |
| DB agent instruction versions | `agent_instruction_versions` | Tenant overrides via `AgentService` |

### Cost & audit (baseline)

| Item | Location | Notes |
|------|----------|-------|
| Token usage logging | `lib/ai/logging/token-logger.ts` | Writes to `ai_requests` |
| Cost estimation | `lib/ai/logging/cost-tracker.ts` | Per-model pricing table |
| Request ledger table | `ai_requests` (migration 005) | Status, tokens, cost, prompt_hash |
| Monthly request quota | `AIService.assertAiFeatureAllowed()` | Count-based, not USD |
| Observability SQL views | `v_observability_ai_latency` | p95, cost, failures from `ai_requests` |
| Gateway instrumentation | `instrumentAiRequest()` | Duration + cost histograms |

### Embeddings & knowledge (schema)

| Item | Location | Notes |
|------|----------|-------|
| pgvector schema | `016_knowledge_module.sql` | `knowledge_embeddings.vector(1536)` |
| Chunking on write | `KnowledgeService.prepareEmbeddingChunks()` | ~1500 char chunks, status `pending` |
| Full-text search | `KnowledgeService.search()` | Available today |
| Vector search RPC | `search_knowledge_vector()` | Ready when vectors exist |

### Agents & workflows

| Item | Location | Notes |
|------|----------|-------|
| Agent reasoning loop | `lib/ai/agent/reasoning.ts` | Structured tool-use via gateway |
| 7 built-in agents | `lib/ai/agent/registry.ts` | Configurable six dimensions |
| Async AI event pattern | `ai.*_requested` events | Outbox → workflow → executor |
| Direct execution path | `executeAi()` when `AI_EXECUTION_MODE=direct` | Works when explicitly enabled |
| AI feature integrations | `lib/integrations/ai/*` | Match, brief, summary, status |

### Security (baseline)

| Item | Location | Notes |
|------|----------|-------|
| No direct OpenAI from products | Enforced by convention | Only `lib/ai/providers/openai.provider.ts` hits API |
| Prompt content not stored | `prompt_hash` only | Privacy-aligned with target |
| Tenant feature permissions | `assertAiFeatureAllowed()` | RBAC at service layer |
| MCP tool authorization | `McpGateway` authorizer | RBAC before invoke (adapters stubbed) |

---

## Partially Implemented

Capabilities started but incomplete relative to AI_PLATFORM.md.

### AI Gateway

| Gap detail | Current | Target |
|------------|---------|--------|
| Request lifecycle | Single `execute()` try/catch | 18-stage pipeline with idempotency, cache, guardrails |
| Authorization | Feature flags + tenant quota | RBAC permissions per feature (`ai:match`, etc.) at gateway |
| Provider routing | Static env primary + fallbacks | Policy engine by feature, tier, cost, residency |
| Streaming accuracy | Output tokens estimated (`length/4`) | Provider-reported usage on stream close |
| Gateway ↔ integration coupling | `getAiGateway()` exported publicly | `createAiPlatformClient(productId)` facade |

### Prompt Platform

| Gap detail | Current | Target |
|------------|---------|--------|
| Storage | In-memory Map, lost on cold start | Postgres registry with org overrides |
| Template variables | `build()` serializes user JSON | Typed variable schema + validation |
| Duplicate prompts | `lib/integrations/ai/prompt.ts` duplicates PromptManager content | Single source of truth |
| Lifecycle | Manual `register()` at boot | draft → review → published → deprecated |
| Testing / eval | None | Golden datasets, regression gate |

### Embedding Platform

| Gap detail | Current | Target |
|------------|---------|--------|
| Ingestion | Chunks stored without vectors | Gateway `embed()` → store → index |
| Search | Caller must supply query vector | End-to-end semantic search API |
| Refresh | Status `pending` indefinitely | Workflow job `ai.embedding_requested` |
| Multi-product namespaces | Single `knowledge_embeddings` | `talent.knowledge`, `media.content`, etc. |

### Memory Platform

| Gap detail | Current | Target |
|------------|---------|--------|
| Scopes | Agent: session, entity, tenant | + user, org, project, client, talent, long/short-term |
| Recall | Filter by policy, no semantic search | Hybrid keyword + vector recall |
| Retention | TTL on agent entries | Tier-based cron sweep |
| Agent vs platform | `agent_memory_entries` only | Unified `ai_memory_entries` |

### Cost Platform

| Gap detail | Current | Target |
|------------|---------|--------|
| Limits | Monthly **request count** per tenant | USD budgets per org/user/feature/agent |
| Alerts | None on AI spend | 80% soft alert, 100% hard 402 (confirmed design) |
| Aggregation | SQL views + in-memory tracker | `ai_cost_aggregates`, durable roll-ups |
| Optimization | None | Model downgrade near budget, cache |

### AI Observability

| Gap detail | Current | Target |
|------------|---------|--------|
| Metrics | Duration, cost, error counters | + cache hit, circuit state, guardrail blocks |
| Tracing | Flat `instrumentAiRequest()` | Sub-spans: prompt, guardrail, provider, fallback |
| Provider health | Not tracked | Healthy / degraded / unavailable dashboard |
| Hallucination / quality | None | User feedback, schema failure rate, grounding score |
| Agent runs | May omit `feature` on gateway calls | Full ledger per agent step |

### AI Security

| Gap detail | Current | Target |
|------------|---------|--------|
| Tool sandbox | MCP auth only; adapters stub | Tool allowlists enforced at runtime |
| Output validation | JSON parse in `completeStructured` | Schema repair, citation checks for RAG |
| Audit | `ai_requests` row | Immutable audit stream for all AI calls |

### Integration & execution

| Gap detail | Current | Target |
|------------|---------|--------|
| Default execution | n8n unless `AI_EXECUTION_MODE=direct` | **Direct default** (confirmed) |
| Audit path | Gateway token logger **and** integration `updateAiRequest()` | Single ledger write |
| MCP tools | 80+ tool definitions; invoke stubbed | Adapters call domain services |
| Agent tool-use | Loop runs; all tool calls fail | Functional MCP adapters |

### Developer Experience

| Gap detail | Current | Target |
|------------|---------|--------|
| Public API | `@/lib/ai` exports gateway | `@/lib/ai-platform` client SDK |
| Folder structure | Flat `lib/ai/` | `gateway/`, `embedding/`, `memory/`, `cost/`, `security/` |
| Testing | No AI-specific tests | Mock provider, eval suite |
| Lint enforcement | Convention only | Rule: no provider SDK outside `providers/` |

### Multi-product

| Gap detail | Current | Target |
|------------|---------|--------|
| Product scoping | Implicit single product (Talent OS) | `productId` on every request |
| Feature registry | Hardcoded `AiFeature` union | Per-product feature namespaces |
| Cost attribution | By tenant only | By tenant + product + feature |

---

## Missing

Capabilities defined in AI_PLATFORM.md with no meaningful implementation.

| ID | Capability | AI_PLATFORM.md Section |
|----|------------|------------------------|
| M-001 | `lib/ai-platform/` SDK and `createAiPlatformClient()` | §13, §16 |
| M-002 | Gateway middleware pipeline (`pipeline.ts`, ordered stages) | §5.3 |
| M-003 | Response cache (Redis, semantic/exact) | §5.6 |
| M-004 | Circuit breakers (Redis-backed, per provider) | §5.5 |
| M-005 | Input/output guardrails (`GuardrailRule` interface) | §12 |
| M-006 | PII detection and redaction pipeline | §12.4 |
| M-007 | Azure OpenAI provider | §6.4 (confirmed Phase 1) |
| M-008 | Provider `embed()` capability | §6.1, §8 |
| M-009 | Embedding generation workflow | §8.5 |
| M-010 | Postgres prompt platform (`ai_prompts`, versions, assignments) | §7.2 |
| M-011 | Prompt eval CI and A/B routing | §7.4 |
| M-012 | USD budget tables (`ai_budgets`) and 402 rejection | §10 (confirmed hybrid) |
| M-013 | Cost alert emission (`ai.budget_threshold_reached`) | §10.3 |
| M-014 | Unified memory platform (`ai_memory_entries`) | §9 |
| M-015 | Memory semantic recall via Embedding Platform | §9.5 |
| M-016 | `productId` on `AiRequestContext` and `ai_requests` | §5.2, ADR-009 |
| M-017 | Product registration (`talent_os`, `media_intel`, `ad_studio`) | §17 |
| M-018 | Policy-driven provider routing (`ai_routing_policies`) | §6.3 |
| M-019 | Provider health probes and dashboard | §11.4 |
| M-020 | AI-specific trace spans (prompt, guardrail, provider) | §11.2 |
| M-021 | Hallucination / quality reporting (`ai_quality_reports`) | §11.3 |
| M-022 | MCP tool adapters (all servers) | §18.3 |
| M-023 | Mock AI provider for CI | §13.4 |
| M-024 | Gateway-level idempotency for AI requests | §5.3 stage 7 |
| M-025 | Media Intelligence / Ad Studio embedding namespaces | §8.4, §17 |
| M-026 | `AI_GUARDRAILS_ENABLED`, `AI_CIRCUIT_BREAKER_ENABLED` env controls | Appendix A |
| M-027 | Cost optimization routing (budget-aware model downgrade) | §10.4 |
| M-028 | OpenTelemetry export for AI spans | §11, Phase 3 roadmap |

---

## Technical Debt

| ID | Debt | Impact | Location |
|----|------|--------|----------|
| TD-001 | **Dual audit path** — gateway `tokenLogger.log()` creates/updates rows; integrations also `createAiRequest()` + `updateAiRequest()` | Duplicate or inconsistent `ai_requests`; cost double-count risk | `token-logger.ts`, `matching.ts`, `governance.ts` |
| TD-002 | **Duplicate prompt definitions** — same talent_match system prompt in `prompt/manager.ts` and `integrations/ai/prompt.ts` | Drift on prompt updates | Two files |
| TD-003 | **Legacy prompt builders** — `prompt.ts`, `prompt-pm.ts` bypass PromptManager for some features | Inconsistent versioning and hashing | `lib/integrations/ai/` |
| TD-004 | **Provider enum collapse** — `mapProviderToDb()` maps gemini/openrouter → `openai` | Loss of provider attribution in DB | `lib/ai/config.ts` |
| TD-005 | **`ai_provider` enum** — only `openai \| claude` in Postgres | Cannot store azure_openai, gemini natively | `005_event_infrastructure.sql` |
| TD-006 | **In-memory cost tracker** — `globalCostTracker` not durable | Budget checks impossible across instances | `cost-tracker.ts` |
| TD-007 | **In-memory prompt registry** — cold start re-registers; no cross-instance consistency | Prompt rollback unreliable in serverless | `prompt/manager.ts` |
| TD-008 | **Agent reasoning missing `feature`** — gateway calls omit `feature` on `completeStructured` | Token logger may skip or misclassify agent LLM calls | `reasoning.ts:147-174` |
| TD-009 | **Streaming token estimation** — `Math.ceil(content.length / 4)` | Inaccurate cost and usage metrics | `gateway.ts:112-116` |
| TD-010 | **n8n AI dependency** — default path externalizes core LLM execution | Latency, failure domain, observability gap | `workflows/actions.ts:63-65` |
| TD-011 | **WhatsApp AI path** — partial bypass of standard AI platform patterns | Inconsistent governance | `lib/services/whatsapp.service.ts` |
| TD-012 | **No `lib/ai-platform` boundary** — products import gateway internals | Prevents clean multi-product SDK | Import graph |
| TD-013 | **`@deprecated` wrappers** — `openai-client.ts`, `openai.ts` naming | Confusing DevEx | `lib/integrations/ai/` |
| TD-014 | **Agent memory not generalized** — tied to agent module only | Blocks Memory Platform unification | `agent_memory_entries` |
| TD-015 | **Knowledge embeddings stuck in `pending`** — no worker consumes queue | Growing backlog of unindexed content | `KnowledgeService` |

---

## Risks

| ID | Risk | Likelihood | Impact | Mitigation (from AI_PLATFORM.md) |
|----|------|:----------:|:------:|----------------------------------|
| R-001 | **Prompt injection** via briefs, WhatsApp, user messages — no guardrails | High | High | Input guardrails (M-005) |
| R-002 | **PII leakage** to LLM providers — client/talent data in prompts | High | Critical | PII redaction pipeline (M-006) |
| R-003 | **Agent tool-use non-functional** — all MCP invokes fail | Certain | High | MCP adapters (M-022) |
| R-004 | **Provider outage cascade** — no circuit breakers; retry storms | Medium | High | Circuit breakers (M-004) |
| R-005 | **Bill shock** — no USD budgets; count limit easily misconfigured | Medium | High | Cost Platform (M-012, M-013) |
| R-006 | **Inconsistent audit trail** — dual write paths | High | Medium | Unified ledger (TD-001) |
| R-007 | **n8n as default AI executor** — extra hop, HMAC dependency | High | Medium | Direct execution default (confirmed) |
| R-008 | **RAG blocked** — embeddings never generated | Certain | High | Embedding pipeline (M-008, M-009) |
| R-009 | **Multi-product cost attribution failure** — no productId | Medium | Medium | M-016, M-017 |
| R-010 | **Enterprise procurement blocker** — no Azure OpenAI | Medium | High | M-007 (confirmed Phase 1) |
| R-011 | **Prompt drift** — duplicate definitions, in-memory registry | Medium | Medium | Prompt Platform (M-010) |
| R-012 | **Observability blind spots** — agent steps under-instrumented | Medium | Medium | TD-008, M-020 |
| R-013 | **Cold-start prompt loss** — in-memory registry re-init | Low | Medium | Postgres prompt registry |
| R-014 | **Compliance gap** — no hallucination/quality audit | Medium | Medium | M-021 |

---

## Scalability Issues

| ID | Issue | Current behavior | Scale trigger | Target solution |
|----|-------|------------------|---------------|-----------------|
| SC-001 | **pgvector index performance** | Schema ready; no load data | >500K vectors/org | HNSW tuning; evaluate external DB (confirmed: pgvector until trigger) |
| SC-002 | **Synchronous embedding in API** | Not implemented | N/A today | Background workflow jobs for indexing |
| SC-003 | **Talent match prompt size** | Up to 50 candidate profiles inline | Large rosters | Context compression, retrieval-first matching |
| SC-004 | **In-memory cost tracker** | Per-instance only | Multi-instance deploy | Postgres aggregates (M-012) |
| SC-005 | **No response cache** | Every identical prompt hits provider | High repeat queries | Redis cache (M-003) |
| SC-006 | **Rate limit key granularity** | `ai:{tenantId}` only | Per-user fairness needed | Per org/user/feature keys |
| SC-007 | **Serverless function duration** | Long agent loops in single invocation | maxSteps > 8 | Durable agent step queue (Phase 4) |
| SC-008 | **Observability collector buffer** | In-process batch to Postgres | High AI volume | Async export, sampling |
| SC-009 | **Single `ai_requests` table growth** | Unpartitioned | Millions of rows | Time-based partitioning / archival |
| SC-010 | **n8n AI throughput** | External workflow engine bottleneck | Concurrent AI jobs | Direct execution (confirmed) |

---

## Security Issues

| ID | Issue | Severity | Current state | Required control |
|----|-------|:--------:|---------------|------------------|
| SEC-001 | No prompt injection defense | **Critical** | User content passed directly to LLM | Input guardrails (M-005) |
| SEC-002 | No PII redaction before provider call | **Critical** | Talent/client PII in match prompts | PII pipeline (M-006) |
| SEC-003 | No output content policy enforcement | **High** | Structured parse only | Output guardrails (M-005) |
| SEC-004 | Agent can attempt any allowed tool — adapters return errors but loop continues | **Medium** | Tool results may leak into prompts | Functional sandbox + validation |
| SEC-005 | No AI-specific audit immutability | **Medium** | `ai_requests` updatable | Append-only audit option |
| SEC-006 | Provider metadata loss in DB enum | **Low** | gemini stored as openai | Extend provider enum (TD-005) |
| SEC-007 | Brief/user text not sanitized | **High** | `brief-parse.ts` sync path | Guardrails on all paths |
| SEC-008 | No rate limit on agent reasoning steps | **Medium** | Multi-step loops multiply LLM calls | Per-session step budget |
| SEC-009 | MCP transport not implemented — external agent access surface undefined | **Medium** | Definitions only | Transport auth when exposed |
| SEC-010 | Service role used for token logging | **Low** | Admin client for all AI writes | Acceptable; document breadth |

---

## Performance Issues

| ID | Issue | Impact | Location | Remediation |
|----|-------|--------|----------|-------------|
| PERF-001 | **Double DB round-trips** on AI requests (create pending + gateway log + integration update) | +latency, write amplification | TD-001 path | Single ledger write |
| PERF-002 | **n8n hop for default AI execution** | +500ms–5s per async AI job | `executeAi()` | Direct default |
| PERF-003 | **No completion cache** | Repeat LLM cost and latency | Gateway | M-003 |
| PERF-004 | **Large match payloads** — 50 freelancers × full profile JSON | High input tokens, slow, costly | `matching.ts`, `prompt.ts` | Retrieval + top-K |
| PERF-005 | **Streaming usage estimation** | Inaccurate billing, wrong metrics | `gateway.ts` stream path | Provider usage on complete |
| PERF-006 | **Sequential agent tool loop** | Multi-step agents slow | `reasoning.ts` | Parallel tool calls (future) |
| PERF-007 | **Cold-start prompt registration** | Boot latency on first gateway call | `ensurePromptsRegistered()` | Lazy vs eager; DB prompts |
| PERF-008 | **Fallback retry chain** — full retry per provider | Latency on failures | `fallback.ts` + `retry.ts` | Circuit breaker fast-fail (M-004) |
| PERF-009 | **Knowledge chunking synchronous on write** | Slow create/update for long docs | `KnowledgeService.createEntry` | Async embedding job |
| PERF-010 | **Observability synchronous flush failures** | Log noise, buffer growth under load | E2E logs | Decouple collector |

---

## Prioritized Findings

### P0 — Critical (block production AI platform / security / agent functionality)

| ID | Finding | Category | Effort |
|----|---------|----------|--------|
| P0-001 | **No AI guardrails** (injection, output validation) — SEC-001, SEC-003, M-005 | Security | Medium |
| P0-002 | **No PII redaction** before LLM calls — SEC-002, M-006 | Security | Medium |
| P0-003 | **MCP tool adapters not implemented** — agents non-functional — M-022, R-003 | Missing | High |
| P0-004 | **Embedding generation pipeline absent** — RAG blocked — M-008, M-009, R-008 | Missing | Medium |
| P0-005 | **Dual audit path** for `ai_requests` — TD-001, R-006 | Technical debt | Medium |
| P0-006 | **n8n default AI execution** (inverse of confirmed direct-default) — TD-010, R-007 | Technical debt | Low |
| P0-007 | **No circuit breakers** — provider outage cascade — M-004, R-004 | Missing | Medium |
| P0-008 | **Agent gateway calls omit `feature`** — cost/observability blind spot — TD-008 | Technical debt | Low |

### P1 — High (required for AI Platform v1 and confirmed architecture decisions)

| ID | Finding | Category | Effort |
|----|---------|----------|--------|
| P1-001 | **`createAiPlatformClient` SDK** — M-001, M-016 | Missing | Medium |
| P1-002 | **`productId` on requests and DB** — M-016, M-017 (confirmed IDs) | Missing | Low |
| P1-003 | **Azure OpenAI provider** — M-007 (confirmed Phase 1) | Missing | Medium |
| P1-004 | **USD budget platform** — soft alert + hard 402 — M-012, M-013 (confirmed hybrid) | Missing | Medium |
| P1-005 | **Postgres Prompt Platform** — M-010; replace in-memory registry — TD-007 | Missing | Medium |
| P1-006 | **Gateway pipeline refactor** — M-002 | Missing | Medium |
| P1-007 | **Direct execution as default** — flip `AI_EXECUTION_MODE` — confirmed | Partial | Low |
| P1-008 | **Consolidate duplicate prompts** — TD-002, TD-003 | Technical debt | Low |
| P1-009 | **Response cache (Redis)** — M-003, SC-005 | Missing | Medium |
| P1-010 | **Extend `ai_provider` enum** — TD-004, TD-005 | Technical debt | Low |
| P1-011 | **Embedding indexing workflow** — M-009, TD-015 | Missing | Medium |
| P1-012 | **AI test suite with MockProvider** — M-023 | Missing | Medium |
| P1-013 | **Policy-driven provider routing** — M-018 | Missing | Medium |
| P1-014 | **Unified Memory Platform** (generalize agent memory) — M-014 | Missing | High |

### P2 — Medium (enterprise readiness, multi-product, quality)

| ID | Finding | Category | Effort |
|----|---------|----------|--------|
| P2-001 | **Prompt eval CI and regression gate** — M-011 | Missing | Medium |
| P2-002 | **AI trace sub-spans** — M-020 | Missing | Medium |
| P2-003 | **Provider health dashboard** — M-019 | Missing | Medium |
| P2-004 | **Hallucination / quality reporting** — M-021 | Missing | Medium |
| P2-005 | **Cost optimization routing** — M-027 | Missing | Medium |
| P2-006 | **Multi-product embedding namespaces** — M-025 | Missing | Medium |
| P2-007 | **Memory semantic recall** — M-015 | Missing | Medium |
| P2-008 | **Talent match context compression** — PERF-004, SC-003 | Performance | Medium |
| P2-009 | **Accurate streaming usage** — TD-009, PERF-005 | Technical debt | Low |
| P2-010 | **Gateway-level RBAC** — partial auth | Partial | Medium |
| P2-011 | **Retention cron for memory** — §9.4 | Missing | Low |
| P2-012 | **OpenTelemetry export** — M-028 | Missing | Medium |
| P2-013 | **Product feature registries** for media_intel, ad_studio — M-017 | Missing | Medium |
| P2-014 | **`ai_requests` partitioning strategy** — SC-009 | Scalability | Medium |

### P3 — Low (future scale, polish, Phase 4 roadmap)

| ID | Finding | Category | Effort |
|----|---------|----------|--------|
| P3-001 | External vector DB evaluation (Pinecone/Weaviate) — post pgvector scale trigger | Scalability | High |
| P3-002 | Fine-tuning pipeline | Missing | High |
| P3-003 | AI Platform admin UI (prompts, budgets, health) | Missing | High |
| P3-004 | Cross-region provider failover | Missing | High |
| P3-005 | ML-based model routing optimizer | Missing | High |
| P3-006 | Parallel agent tool execution | Performance | Medium |
| P3-007 | Durable multi-step agent queue (Inngest) — SC-007 | Scalability | High |
| P3-008 | A/B prompt routing in production | Missing | Medium |
| P3-009 | MCP HTTP/SSE transport for external clients | Missing | High |
| P3-010 | Load testing baseline (k6) for AI gateway | Missing | Medium |
| P3-011 | Deprecate and remove `@deprecated` OpenAI wrappers — TD-013 | Technical debt | Low |
| P3-012 | Media Intelligence and Ad Studio product scaffolding | Missing | High |

---

## Summary Scorecard

| Priority | Count | Theme |
|----------|------:|-------|
| **P0** | 8 | Security, agents, embeddings, audit integrity, execution path |
| **P1** | 14 | Platform v1, confirmed decisions (Azure, budgets, productId, direct) |
| **P2** | 14 | Enterprise quality, observability, multi-product |
| **P3** | 12 | Scale, admin UI, future products |

### Recommended implementation order

1. **P0 security + execution** — Guardrails, PII, direct default, dual audit fix, circuit breakers
2. **P0 intelligence** — Embedding pipeline, MCP adapters (unblocks agents + RAG)
3. **P1 platform shell** — SDK, productId, pipeline refactor, Prompt Platform DB, Azure, budgets
4. **P1 cache + routing** — Response cache, policy routing, AI tests
5. **P2 quality + multi-product** — Eval CI, traces, health, namespaces for future products
6. **Billing Platform (Wave 0b)** — SaaS subscription, usage metering, invoicing — see [BILLING_PLATFORM.md](./BILLING_PLATFORM.md) and [AI_IMPLEMENTATION_ROADMAP.md](./AI_IMPLEMENTATION_ROADMAP.md) PR-B01–B08

---

## Billing Platform Gap (cross-cutting)

The **Billing Platform** is separate from the AI Platform but shares organization context and integrates at usage/budget boundaries. Full analysis: [BILLING_PLATFORM.md](./BILLING_PLATFORM.md).

| Billing flow stage | Current | Target | Gap |
|--------------------|:-------:|:------:|:---:|
| Organizations | 80% (`tenants`) | Billing profile extension | Low |
| Subscription | 30% (JSON + column) | `billing_subscriptions` | High |
| Plan | 25% (hardcoded tiers) | `billing_plans` + entitlements | High |
| Seats | 10% | `billing_seats` + enforcement | High |
| Usage | 20% (AI counts only) | Unified usage ledger | High |
| Invoice | 0% | `billing_invoices` | Critical |
| Payments (SaaS) | 0% | Stripe + `billing_payments` | Critical |

**Overall billing maturity: ~15%** — PR-B01 through PR-B08 in roadmap Wave 0b.

**AI ↔ Billing integration gaps:**

| Gap | AI component | Billing dependency |
|-----|--------------|-------------------|
| Budget defaults from plan | PR-19/20 Cost Platform | PR-B02 entitlements |
| Usage for invoicing | AI gateway ledger | PR-B04 usage meters |
| Tier limits scattered | `tenant.settings` | PR-B07 subscription service |

---

## Appendix — File Reference (current AI code)

| Path | Role | Platform subsystem |
|------|------|-------------------|
| `lib/ai/gateway.ts` | Orchestrator | AI Gateway |
| `lib/ai/providers/*` | LLM adapters | Provider Layer |
| `lib/ai/prompt/manager.ts` | In-memory prompts | Prompt Platform (partial) |
| `lib/ai/logging/*` | Cost + token audit | Cost Platform (partial) |
| `lib/ai/middleware/*` | Retry, fallback, rate limit | AI Gateway |
| `lib/ai/agent/*` | Agent runtime | Memory + Gateway consumer |
| `lib/integrations/ai/*` | Domain AI features | Product layer (should use SDK) |
| `lib/services/ai.service.ts` | Governance + orchestration | Product layer |
| `lib/services/knowledge.service.ts` | Chunking, search | Embedding Platform (partial) |
| `lib/mcp/gateway.ts` | Tool routing (stub) | Agent integration |
| `lib/workflows/actions.ts` | Async AI dispatch | Integration |
| `lib/observability/instrumentation.ts` | AI metrics | AI Observability (partial) |
| `supabase/migrations/005_*.sql` | `ai_requests` | Cost + audit |
| `supabase/migrations/016_*.sql` | Knowledge + pgvector | Embedding Platform (schema) |
| `supabase/migrations/017_*.sql` | Agent tables | Memory Platform (partial) |

---

**Next step:** Approve prioritization and Phase 1 scope; no code changes until approved.

*End of AI Platform Gap Analysis v1.0.0*
