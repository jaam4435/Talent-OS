# MCP (Model Context Protocol)

Talent OS exposes business domains to AI agents via **MCP tool catalogs**. Each domain is a separate MCP server with typed tools, resources, and permission gates.

> **Auto-generated tool catalog:** [generated/mcp-tools.md](./generated/mcp-tools.md)

---

## Overview

```
MCP Clients (Cursor, Claude Desktop, internal agents)
  → MCP Gateway (lib/mcp/gateway.ts) — auth + routing
  → Domain tool adapters (future)
  → Services → Repositories → Supabase
```

**Current status:** Tool definitions + gateway stub with RBAC authorization. Full adapters planned.

---

## Servers

| Server ID | Domain | Tools (approx) |
|---|---|---|
| `crm` | Companies | list, get, create, update, search |
| `talent` | Freelancers | search, profile, portfolio, ratings |
| `projects` | Projects | list, get, create, milestones, review |
| `workflow` | Events | emit, list, dispatch n8n, WhatsApp |
| `finance` | Payments | list, approve, mark paid, aging |
| `analytics` | KPIs | dashboard, fill rate, utilization |
| `knowledge` | Knowledge base | search, entity context, schema ref |
| `notification` | Notifications | list, send, mark read |
| `storage` | Files | upload, signed URL, list |
| `ai` | AI Gateway | match, parse, summary, status |

Full catalog: [generated/mcp-tools.md](./generated/mcp-tools.md)

---

## Tool Conventions

| Rule | Example |
|---|---|
| Naming | `{server}_{action}` → `talent_search` |
| Permissions | Each tool declares `requiredPermission` |
| Destructive flag | Mutating tools set `destructive: true` |
| Tenant scope | All calls carry `McpExecutionContext.tenantId` |

---

## Gateway

```typescript
import { getMcpGateway, createMcpExecutionContext } from '@/lib/mcp/gateway'

const gateway = getMcpGateway()
const context = createMcpExecutionContext({ tenantId, userId, role, permissions })

await gateway.invoke({ serverId: 'talent', toolName: 'talent_search', input, context })
```

Location: `lib/mcp/gateway.ts`

---

## Agent Integration

Six built-in agents filter MCP tools by allowlist + user RBAC:

| Agent | Primary MCP servers |
|---|---|
| Recruiter | talent, crm, ai, knowledge |
| Project Manager | projects, workflow, ai, notification |
| Finance | finance, analytics |
| QA | projects, knowledge, storage |
| Executive | analytics, knowledge |
| Knowledge | knowledge, storage |

See [34 Agent Framework](./34-agent-framework.md)

---

## Related

- [28 MCP Architecture (legacy)](./28-mcp-architecture.md) — full interface spec
- [AI](./ai.md)
- [Agent Framework](./34-agent-framework.md)
