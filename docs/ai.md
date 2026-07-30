# AI

All LLM requests in Talent OS go through the **AI Gateway** (`lib/ai/gateway.ts`). Direct provider API calls from pages or services are prohibited.

---

## Gateway

```
Service / Workflow / MCP
  → getAiGateway().complete() | .completeStructured() | .stream()
  → Provider chain (OpenAI → Anthropic → fallback)
  → Token logging → ai_requests table
```

Location: `lib/ai/`

| Component | Path |
|---|---|
| Gateway | `lib/ai/gateway.ts` |
| Providers | `lib/ai/providers/` |
| Prompt manager | `lib/ai/prompt/manager.ts` |
| Feature flags | `lib/ai/features/flags.ts` |
| Middleware | retry, rate-limit, fallback |

---

## Features

| Feature | Prompt ID | Service | Permission |
|---|---|---|---|
| Talent matching | `talent_match` | AIService | `ai:match` |
| Brief parsing | `brief_parse` | AIService | `ai:brief_parse` |
| Project summary | `project_summary` | AIService | `ai:summary` |
| Status assessment | `status_assessment` | AIService | `ai:status` |
| Shortlist summary | `shortlist_summary` | AIService | `ai:summary` |
| Digest | `digest` | WhatsAppService | — |

Agent prompts: `agent.recruiter`, `agent.project_manager`, etc. — see [34 Agent Framework](./34-agent-framework.md)

---

## Async Execution

Long-running AI requests use the outbox pattern:

```
1. INSERT ai_requests (status: pending)
2. emit domain_event (ai.*_requested)
3. Cron / internal route executes via lib/integrations/ai/executor.ts
4. UPDATE ai_requests + entity JSONB fields
```

Integrations: `lib/integrations/ai/matching.ts`, `brief-parse.ts`, `summary.ts`, `status-assessment.ts`

---

## Governance

| Control | Location |
|---|---|
| Tenant AI toggles | `tenants.settings` JSONB |
| Monthly caps | `AIService.assertAiFeatureAllowed()` |
| Prompt hashing | `ai_requests.prompt_hash` (never raw prompts in DB) |
| Cost tracking | `lib/ai/logging/cost-tracker.ts` |

---

## Knowledge + Vector Search

Knowledge module prepares embeddings without AI:

- Chunks stored in `knowledge_embeddings` (vectors NULL until pipeline runs)
- Future: background job calls gateway → `storeEmbeddingVector()`

See [33 Knowledge Module](./33-knowledge-module.md)

---

## Environment Variables

| Variable | Purpose |
|---|---|
| `AI_PRIMARY_PROVIDER` | openai, anthropic, gemini, openrouter |
| `AI_FALLBACK_PROVIDERS` | Comma-separated fallback chain |
| `OPENAI_API_KEY` | OpenAI provider |
| `ANTHROPIC_API_KEY` | Anthropic provider |

---

## Related

- [27 AI Gateway (legacy)](./27-ai-gateway.md)
- [13 AI Talent Matching](./13-ai-talent-matching-service.md)
- [MCP](./mcp.md) — AI MCP server
- [Agent Framework](./34-agent-framework.md)
