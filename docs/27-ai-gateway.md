# AI Gateway

**Location:** `/lib/ai`  
**Rule:** No page, action, or API route may call OpenAI (or any LLM provider) directly. All AI requests must go through the gateway.

---

## Architecture

```
/lib/ai/
├── index.ts                 # Public API — import from here
├── gateway.ts               # AiGateway orchestrator
├── types.ts                 # Shared gateway types
├── errors.ts                # Gateway error hierarchy
├── config.ts                # Provider config from environment
├── providers/
│   ├── interface.ts         # AiProviderInterface
│   ├── openai.provider.ts
│   ├── anthropic.provider.ts
│   ├── gemini.provider.ts
│   ├── openrouter.provider.ts
│   └── index.ts             # Provider registry
├── prompt/
│   └── manager.ts           # Prompt Manager + versioning
├── logging/
│   ├── token-logger.ts      # Token usage → ai_requests table
│   └── cost-tracker.ts      # Cost estimation + in-memory tracking
├── middleware/
│   ├── retry.ts             # Exponential backoff retry
│   ├── rate-limit.ts        # RPM rate limiting
│   └── fallback.ts          # Provider fallback chain
├── features/
│   └── flags.ts             # Tenant feature flags + env toggles
└── streaming/
    └── handler.ts           # SSE streaming helpers
```

---

## Request Flow

```
Caller (action / API / integration)
        │
        ▼
   getAiGateway()
        │
        ├── Feature flags (tenant settings)
        ├── Rate limiter (RPM)
        ├── Retry middleware (exponential backoff)
        ├── Primary provider
        │     └── on failure → fallback providers
        ├── Token usage logger → ai_requests
        ├── Cost tracker
        └── Response (structured or text)
```

---

## Usage

### Structured output (recommended)

```typescript
import { getAiGateway } from '@/lib/ai'

const gateway = getAiGateway()

const response = await gateway.completeStructured<MyResult>({
  messages: [
    { role: 'system', content: 'You are a helpful assistant.' },
    { role: 'user', content: JSON.stringify(input) },
  ],
  schema: {
    name: 'my_result',
    strict: true,
    schema: { type: 'object', properties: { ... } },
  },
  tenantId: tenant.id,
  feature: 'brief_parse',
  promptId: 'brief_parse',
  promptVersion: '1.0.0',
})

console.log(response.data)
console.log(response.usage.estimatedCost)
```

### Convenience wrapper (legacy integrations)

```typescript
import { callAiStructured } from '@/lib/ai'

const { data, model, inputTokens, outputTokens, estimatedCost } =
  await callAiStructured<Result>({
    system: '...',
    user: '...',
    schema: MY_SCHEMA,
    tenantId,
    feature: 'talent_match',
  })
```

### Streaming

```typescript
import { getAiGateway } from '@/lib/ai'

const gateway = getAiGateway()

for await (const chunk of gateway.stream({
  messages: [{ role: 'user', content: 'Summarize this project...' }],
  tenantId,
  feature: 'project_summary',
})) {
  if (!chunk.done) process.stdout.write(chunk.content)
}
```

### Prompt Manager (versioning)

```typescript
import { globalPromptManager } from '@/lib/ai'

// Register a new prompt version
globalPromptManager.register({
  id: 'talent_match',
  version: '1.1.0',
  system: 'Updated system prompt...',
})

// Activate a version
globalPromptManager.setActiveVersion('talent_match', '1.1.0')

// Build a versioned prompt
const { system, user, promptHash, promptVersion } =
  globalPromptManager.build('talent_match', userPayload)
```

---

## Providers

| Provider | Env key | Model env | Structured output |
|---|---|---|---|
| OpenAI | `OPENAI_API_KEY` | `OPENAI_MODEL` | JSON Schema |
| Anthropic | `ANTHROPIC_API_KEY` | `ANTHROPIC_MODEL` | Tool use |
| Gemini | `GEMINI_API_KEY` | `GEMINI_MODEL` | responseSchema |
| OpenRouter | `OPENROUTER_API_KEY` | `OPENROUTER_MODEL` | JSON Schema |

### Provider selection

```bash
AI_PRIMARY_PROVIDER=openai          # openai | anthropic | gemini | openrouter
AI_FALLBACK_PROVIDERS=anthropic,openrouter
```

The gateway tries the primary provider first. On failure it walks the fallback chain.

---

## Environment Variables

```bash
# Provider keys
OPENAI_API_KEY=
OPENAI_MODEL=gpt-4o-mini
ANTHROPIC_API_KEY=
ANTHROPIC_MODEL=claude-3-5-sonnet-20241022
GEMINI_API_KEY=
GEMINI_MODEL=gemini-1.5-flash
OPENROUTER_API_KEY=
OPENROUTER_MODEL=openai/gpt-4o-mini

# Gateway behavior
AI_PRIMARY_PROVIDER=openai
AI_FALLBACK_PROVIDERS=anthropic,openrouter
AI_MAX_RETRIES=3
AI_RETRY_BASE_DELAY_MS=500
AI_RATE_LIMIT_RPM=60
AI_ENABLE_STREAMING=true
AI_ENABLE_COST_TRACKING=true
AI_ENABLE_TOKEN_LOGGING=true

# Per-feature toggles (default: enabled)
AI_FEATURE_STREAMING=true
```

---

## Capabilities

| Capability | Implementation |
|---|---|
| **AI Gateway** | `AiGateway` class in `gateway.ts` |
| **Provider Interface** | `AiProviderInterface` in `providers/interface.ts` |
| **OpenAI Provider** | `providers/openai.provider.ts` |
| **Anthropic Provider** | `providers/anthropic.provider.ts` |
| **Gemini Provider** | `providers/gemini.provider.ts` |
| **OpenRouter Provider** | `providers/openrouter.provider.ts` |
| **Prompt Manager** | `prompt/manager.ts` with version registry |
| **Token Usage Logger** | `logging/token-logger.ts` → `ai_requests` table |
| **Cost Tracking** | `logging/cost-tracker.ts` with per-model pricing |
| **Retry Logic** | `middleware/retry.ts` exponential backoff |
| **Streaming Support** | Provider `stream()` + `streaming/handler.ts` SSE |
| **Prompt Versioning** | `PromptManager.register()` / `setActiveVersion()` |
| **Structured Outputs** | `completeStructured()` with JSON Schema |
| **Rate Limiting** | `middleware/rate-limit.ts` sliding window RPM |
| **Fallback Provider** | `middleware/fallback.ts` provider chain |
| **Feature Flags** | `features/flags.ts` + tenant settings from governance |

---

## Migration from Direct OpenAI Calls

| Before (forbidden) | After (required) |
|---|---|
| `fetch('https://api.openai.com/...')` | `getAiGateway().complete(...)` |
| `callOpenAiStructured(...)` | `callAiStructured(...)` from `@/lib/ai` |
| `process.env.OPENAI_API_KEY` checks | `getAiGateway().isConfigured()` |
| Inline prompts | `globalPromptManager.build(promptId, payload)` |

Legacy wrappers in `lib/integrations/ai/openai-client.ts` and `openai.ts` delegate to the gateway and are marked `@deprecated`.

---

## Database Compatibility

The `ai_requests.provider` column accepts `openai | claude`. The gateway maps:

- `openai`, `gemini`, `openrouter` → `openai`
- `anthropic` → `claude`

The actual provider and model are preserved in the `model` column and `result` JSON.

---

## Adding a New AI Feature

1. Register a prompt in `prompt/manager.ts` (or at runtime).
2. Define a JSON schema for structured output.
3. Call `getAiGateway().completeStructured()` from a service or integration module — **never from a page component**.
4. Pass `tenantId` and `feature` for logging, rate limiting, and feature flags.
5. Handle fallback behavior at the integration layer if business-specific rule-based fallback is needed.

```typescript
// ✅ Correct — integration layer
import { getAiGateway } from '@/lib/ai'

export async function myAiFeature(tenantId: string, input: Input) {
  const gateway = getAiGateway()
  return gateway.completeStructured({
    messages: [...],
    schema: MY_SCHEMA,
    tenantId,
    feature: 'brief_parse',
    promptId: 'my_feature',
  })
}

// ❌ Forbidden — page or direct provider call
const res = await fetch('https://api.openai.com/v1/chat/completions', ...)
```

---

## Related Files

| File | Role |
|---|---|
| `lib/integrations/ai/*` | Domain-specific AI workflows (matching, PM, etc.) |
| `lib/integrations/ai/governance.ts` | Tenant limits + ai_requests CRUD |
| `app/actions/ai.ts`, `ai-pm.ts` | Server action entry points |
| `app/api/internal/ai/*` | Async executor routes |

All integration modules now route LLM calls through `@/lib/ai`.
