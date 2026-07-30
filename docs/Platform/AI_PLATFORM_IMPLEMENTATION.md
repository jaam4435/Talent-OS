# AI Platform Implementation

| Field | Value |
|-------|-------|
| **Version** | 1.0.0 |
| **Date** | 2026-07-30 |
| **Status** | Implemented |
| **Spec** | [07 AI Platform](./07%20AI%20Platform.md) |

---

## Rule

**No business module may call an LLM directly.** All requests flow through `@/lib/ai` → `AiGateway`.

```
Domain Service / Executor / WhatsApp / Agent
              ↓
         callAiStructured()  or  getAiGateway().complete()
              ↓
            AiGateway
    ┌─────────┼─────────┐
    ↓         ↓         ↓
 Prompt    Guardrails  ModelRouter
 Manager                  ↓
    ↓         ↓         ↓
 Memory   RateLimit   Fallback
    ↓         ↓         ↓
         Providers (OpenAI, Anthropic, Gemini, OpenRouter)
              ↓
    Token Logger + Cost Tracker
```

---

## Components

| Component | Path | Description |
|-----------|------|-------------|
| **AI Gateway** | `lib/ai/gateway.ts` | `complete()`, `completeStructured()`, `stream()` |
| **Provider abstraction** | `lib/ai/providers/` | `AiProviderInterface` + 4 providers |
| **Prompt Manager** | `lib/ai/prompt/manager.ts` | Versioned prompts by ID |
| **Model Router** | `lib/ai/router/model-router.ts` | Feature/tier-based model selection |
| **Cost Tracking** | `lib/ai/logging/cost-tracker.ts` | In-process + `estimateTokenCost()` |
| **Token Usage** | `lib/ai/logging/token-logger.ts` | Persists to `ai_requests` |
| **Prompt Versioning** | `PromptManager.setActiveVersion()` | Multi-version per prompt ID |
| **AI Memory** | `lib/ai/memory/platform-memory.ts` | Context injection via `request.memory` |
| **Structured Outputs** | `gateway.completeStructured()` | JSON schema + parse |
| **Streaming** | `gateway.stream()` + `/api/ai/stream` | SSE via `createStreamResponse()` |
| **Retries** | `lib/ai/middleware/retry.ts` | Exponential backoff |
| **Fallbacks** | `lib/ai/middleware/fallback.ts` | Provider chain failover |
| **Guardrails** | `lib/ai/guardrails/` | Input/output validation, injection block |

---

## Usage

### Structured output (preferred)

```typescript
import { callAiStructured } from '@/lib/ai'

const result = await callAiStructured<MyType>({
  system: '...',
  user: '...',
  schema: MY_SCHEMA,
  tenantId,
  feature: 'brief_parse',
  promptId: 'brief_parse',
  promptVersion: '1.0.0',
})
```

### Versioned prompt helper

```typescript
import { completeWithPrompt } from '@/lib/ai'

await completeWithPrompt({
  promptId: 'talent_match',
  userContent: { opportunity, candidates },
  schema: TALENT_MATCH_SCHEMA,
  tenantId,
  feature: 'talent_match',
})
```

### Streaming

```typescript
import { getAiGateway } from '@/lib/ai'

for await (const chunk of getAiGateway().stream(request)) {
  if (!chunk.done) process.stdout.write(chunk.content)
}
```

---

## CI Enforcement

```bash
npm run check:ai-gateway
```

Blocks direct provider imports and raw API URLs outside `lib/ai/providers/`.

---

## WhatsApp Agent

- Prompt: `whatsapp.agent@1.0.0` (registered in `lib/ai/agent/instructions.ts`)
- Feature flag: `digest` → governed via AI PM settings (no bypass)
- Memory: entity-scoped context for freelancer sessions

---

## Environment

| Variable | Default | Purpose |
|----------|---------|---------|
| `AI_PRIMARY_PROVIDER` | `openai` | Primary provider |
| `AI_FALLBACK_PROVIDERS` | — | Comma-separated fallbacks |
| `AI_MAX_RETRIES` | `3` | Retry count |
| `AI_RATE_LIMIT_RPM` | `60` | Per-tenant RPM |
| `AI_ENABLE_STREAMING` | `true` | Streaming toggle |
| `AI_MAX_INPUT_CHARS` | `32000` | Guardrail limit |
| `AI_MAX_OUTPUT_CHARS` | `16000` | Guardrail limit |

---

## Related

- [27-ai-gateway.md](../27-ai-gateway.md)
- [Engineering Roadmap](./Engineering%20Roadmap.md) — Phase 3
