# Agent Framework

Configurable multi-agent system for Talent OS. Six built-in agents with **Instructions**, **Tools**, **Memory**, and **Permissions** — all configurable per tenant. Instruction content is managed server-side only and **never exposed in the UI**.

## Built-in Agents

| Agent | ID | Primary Domain |
|---|---|---|
| Recruiter Agent | `recruiter` | Talent sourcing, matching, shortlists |
| Project Manager Agent | `project_manager` | Projects, milestones, delivery |
| Finance Agent | `finance` | Payments, aging, approvals |
| QA Agent | `qa` | Deliverable review, milestone QA |
| Executive Agent | `executive` | Analytics, KPIs, pipeline health |
| Knowledge Agent | `knowledge` | Knowledge base search and context |

## Agent Components

Each agent is defined by four configurable dimensions:

```
┌─────────────────────────────────────────────────┐
│  Agent Definition                                │
├──────────────┬──────────────┬──────────┬────────┤
│ Instructions │    Tools     │  Memory  │ Perms  │
├──────────────┼──────────────┼──────────┼────────┤
│ PromptManager│ MCP allowlist│ Scoped   │ RBAC + │
│ + DB versions│ (filtered)   │ recall   │ agent  │
│ (no UI)      │              │ entries  │ gates  │
└──────────────┴──────────────┴──────────┴────────┤
```

### Instructions

- Registered in `lib/ai/agent/instructions.ts` via `PromptManager`
- Tenant-specific overrides in `agent_instruction_versions` table
- UI shows only `instructionPromptId` and version — **never prompt text**
- Resolved server-side in `AgentService.prepareRun()`

### Tools

- Subset of MCP tool catalog (`lib/mcp/servers/`)
- Default allowlist per agent in `lib/ai/agent/registry.ts`
- Tenant can restrict further via `agent_configs.allowed_tools`
- Runtime intersection with invoking user's RBAC permissions

### Memory

- `agent_memory_entries` table with scopes: `session`, `entity`, `tenant`
- Policy configurable per agent: max entries, TTL, entity types
- Filtered at run time by `filterMemoryByPolicy()`

### Permissions

- Agent-level gates: `agent:run`, `agent:configure`
- Per-agent `required_permissions` (e.g. `ai:match` for Recruiter)
- Tool permissions enforced via MCP gateway authorizer
- No privilege escalation — agents inherit user's RBAC

## Schema

Migration: `supabase/migrations/017_agents_module.sql`

| Table | Purpose |
|---|---|
| `agent_configs` | Tenant overrides (tools, memory, permissions) |
| `agent_instruction_versions` | Server-side instruction content |
| `agent_sessions` | Run/conversation sessions |
| `agent_memory_entries` | Persistent scoped memory |

## Code Layout

```
lib/ai/agent/
  registry.ts        — 6 default agent definitions
  instructions.ts    — PromptManager registration
  resolver.ts        — Merge defaults + tenant config
  tool-filter.ts     — MCP tool resolution + permission checks
  memory.ts          — Memory policy helpers

modules/agents/
  types.ts           — Domain types
  validation.ts      — Zod schemas (no instruction fields)

lib/repositories/
  agent.repository.ts
  agent-session.repository.ts

lib/services/agent.service.ts
lib/mcp/gateway.ts   — Tool authorization (adapters TBD)

app/actions/agents.ts   — Config + run prep (no prompt editing)
lib/queries/agents.queries.ts
```

## Usage

```typescript
// List agents (config summary only — no instructions)
import { listAgents } from '@/lib/queries/agents.queries'
const agents = await listAgents(tenantId)

// Configure agent (tools, memory, permissions — NOT instructions)
import { updateAgentConfig } from '@/app/actions/agents'
await updateAgentConfig('recruiter', {
  enabled: true,
  allowedTools: ['talent_search', 'ai_match_talent'], // subset of defaults
  memoryPolicy: { scope: 'entity', maxEntries: 50 },
})

// Prepare run context (server-side only)
import { prepareAgentRun } from '@/app/actions/agents'
const result = await prepareAgentRun({
  agentId: 'project_manager',
  entityType: 'project',
  entityId: projectId,
})
// Returns: sessionId, tools, memory, permissions, instruction metadata (hash only)
```

## What's NOT included (future)

- LLM execution loop (tool-use orchestration)
- MCP tool adapters (gateway returns not-implemented)
- Background agent jobs via workflow engine
- UI for agent configuration pages

## Permissions

| Permission | Roles | Purpose |
|---|---|---|
| `agent:run` | admin, talent_manager | Start sessions, prepare runs |
| `agent:configure` | admin, talent_manager | Update agent config, clear memory |
