# Agent Framework Architecture

Configurable multi-agent system for Talent OS. Seven built-in agents, each defined by six configurable dimensions: **Instructions**, **Tools**, **Permissions**, **Memory**, **Reasoning**, and **Conversation State**. Instruction content is managed server-side only and never exposed in UI components.

## Built-in Agents

| Agent | ID | Primary Domain |
|---|---|---|
| Recruiter Agent | `recruiter` | Talent sourcing, matching, shortlists |
| Project Manager Agent | `project_manager` | Projects, milestones, delivery |
| Finance Agent | `finance` | Payments, aging, approvals |
| QA Agent | `qa` | Deliverable review, milestone QA |
| Executive Agent | `executive` | Analytics, KPIs, pipeline health |
| Knowledge Agent | `knowledge` | Knowledge base search and context |
| Support Agent | `support` | User inquiries, notifications, operational support |

## Agent Definition Model

Every agent is a composition of six dimensions. All are configurable per tenant via `agent_configs` (except instruction *content*, which is server-side only):

```
┌──────────────────────────────────────────────────────────────────────┐
│  AgentDefinition                                                      │
├─────────────┬─────────┬─────────────┬────────┬───────────┬────────────┤
│ Instructions│  Tools  │ Permissions │ Memory │ Reasoning │ Conversation│
├─────────────┼─────────┼─────────────┼────────┼───────────┼────────────┤
│ PromptMgr + │ MCP     │ RBAC +      │ Scoped │ Tool-use  │ Turn       │
│ DB versions │ allowlist│ agent gates │ recall │ loop      │ history    │
│ (no UI)     │         │             │        │           │            │
└─────────────┴─────────┴─────────────┴────────┴───────────┴────────────┘
```

### Instructions

- Registered in `lib/ai/agent/instructions.ts` via `PromptManager`
- Tenant-specific overrides in `agent_instruction_versions` table
- Published via `AgentService.publishInstruction()` — server-side only
- UI shows only `instructionPromptId` and version hash — **never prompt text**
- Resolved in `AgentService.prepareRun()` and `AgentService.run()`

### Tools

- Subset of MCP tool catalog (`lib/mcp/servers/`)
- Default allowlist per agent in `lib/ai/agent/registry.ts`
- Tenant can restrict further via `agent_configs.allowed_tools`
- Runtime intersection with invoking user's RBAC permissions via `resolveAgentTools()`

### Permissions

- Agent-level gates: `agent:run`, `agent:configure`
- Per-agent `required_permissions` (e.g. `ai:match` for Recruiter)
- Tool permissions enforced via MCP gateway authorizer
- No privilege escalation — agents inherit user's RBAC

### Memory

- `agent_memory_entries` table with scopes: `session`, `entity`, `tenant`
- Policy configurable per agent: max entries, TTL, entity types
- Filtered at run time by `filterMemoryByPolicy()`

### Reasoning

- Configurable via `reasoning_policy` on `agent_configs`
- Defaults in `lib/ai/agent/defaults.ts`: `maxSteps`, `toolUseEnabled`, `temperature`, `maxTokens`
- `AgentReasoningEngine` runs structured tool-use loop via `AiGateway` + `McpGateway`
- Returns final answer after tool calls or max steps

### Conversation State

- `agent_messages` table stores user, assistant, and tool turns
- `agent_sessions.context` JSONB tracks turn count and metadata
- Policy configurable via `conversation_policy`: `maxHistoryMessages`, `persistToolResults`, `autoSummarize`
- `AgentConversationManager` loads history and persists turns during `AgentService.run()`

## Execution Flow

```
runAgent(message)
    │
    ▼
prepareRun() ──► permissions check, session create/load
    │            instructions resolve (server-side)
    │            tools filter, memory load, conversation history
    ▼
AgentExecutor.execute()
    │
    ├── record user message
    ├── AgentReasoningEngine.run()
    │       ├── AiGateway.completeStructured()
    │       ├── tool_call → McpGateway.invoke()
    │       └── final → return content
    ├── record tool results (if policy allows)
    └── record assistant message
```

## Schema

| Migration | Purpose |
|---|---|
| `017_agents_module.sql` | Core tables: configs, instructions, sessions, memory |
| `018_agent_framework_extend.sql` | Support agent, messages, reasoning/conversation policies |

| Table | Purpose |
|---|---|
| `agent_configs` | Tenant overrides (tools, memory, permissions, reasoning, conversation) |
| `agent_instruction_versions` | Server-side instruction content |
| `agent_sessions` | Run/conversation sessions with context JSONB |
| `agent_memory_entries` | Persistent scoped memory |
| `agent_messages` | Conversation turn history |

## Code Layout

```
lib/ai/agent/
  registry.ts        — 7 default agent definitions
  defaults.ts        — shared reasoning/conversation defaults
  instructions.ts    — PromptManager registration (no UI)
  resolver.ts        — Merge defaults + tenant config
  tool-filter.ts     — MCP tool resolution + permission checks
  memory.ts          — Memory policy helpers
  reasoning.ts       — Tool-use reasoning loop
  conversation.ts    — Conversation state management
  executor.ts        — Run orchestration

modules/agents/
  types.ts           — AgentDefinition, six dimensions
  validation.ts      — Zod schemas (no instruction fields in config)

lib/services/agent.service.ts
app/actions/agents.ts
```

## Usage

```typescript
// List agents (config summary only — no instructions)
import { listAgents } from '@/lib/queries/agents.queries'
const agents = await listAgents(tenantId)

// Configure agent (all dimensions except instruction content)
import { updateAgentConfig } from '@/app/actions/agents'
await updateAgentConfig('recruiter', {
  enabled: true,
  allowedTools: ['talent_search', 'ai_match_talent'],
  reasoningPolicy: { maxSteps: 8, toolUseEnabled: true },
  conversationPolicy: { maxHistoryMessages: 30 },
})

// Execute agent with reasoning + tool use
import { runAgent } from '@/app/actions/agents'
const result = await runAgent({
  agentId: 'project_manager',
  message: 'What is the status of project X?',
  entityType: 'project',
  entityId: projectId,
})

// Get conversation state
import { getAgentConversationState } from '@/app/actions/agents'
const state = await getAgentConversationState(sessionId)
```

## Design Principles

1. **No prompts in components** — all instruction content lives in `PromptManager` or `agent_instruction_versions`
2. **Everything configurable** — tools, permissions, memory, reasoning, and conversation policies are tenant-overridable
3. **Service → Repository → DB** — agents never bypass the service layer
4. **Permission inheritance** — agents cannot exceed the invoking user's RBAC
5. **Server-side execution** — `run()` resolves instructions and executes reasoning entirely on the server

## Permissions

| Permission | Roles | Purpose |
|---|---|---|
| `agent:run` | admin, talent_manager | Start sessions, run agents |
| `agent:configure` | admin, talent_manager | Update config, publish instructions, clear memory |
