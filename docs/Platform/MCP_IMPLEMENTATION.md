# MCP Platform Implementation

| Field | Value |
|-------|-------|
| **Version** | 1.0.0 |
| **Date** | 2026-07-30 |
| **Status** | Implemented |
| **Spec** | [08 MCP Platform](./08%20MCP%20Platform.md) |

---

## Architecture

Talent OS exposes **11 independent MCP servers** (10 business domains + storage). Each server defines business tools; each tool handler calls **Services only** — never repositories or database clients directly.

```
MCP Client / AI Agent
        ↓
   McpGateway.invoke()
        ↓
   Authorization (RBAC)
        ↓
   Tool Adapter (lib/mcp/adapters/)
        ↓
   Domain Service (lib/services/)
        ↓
   Repository (internal — not exposed to MCP)
```

---

## Servers

| Server ID | Domain | Tools | Service(s) |
|-----------|--------|------:|------------|
| `crm` | CRM | 5 | `CRMService` |
| `talent` | Talent | 7 | `TalentService`, `PortfolioService` |
| `projects` | Projects | 7 | `ProjectService`, `WorkflowService` |
| `workflow` | Workflow | 6 | `WorkflowService`, `WorkflowEngineService` |
| `knowledge` | Knowledge | 5 | `KnowledgeService` |
| `finance` | Finance | 7 | `FinanceService` |
| `notification` | Notifications | 6 | `NotificationService` |
| `analytics` | Analytics | 6 | `AnalyticsService` |
| `marketplace` | Marketplace | 6 | `MarketplaceService` |
| `ai` | AI | 8 | `AIService`, AI Gateway |
| `storage` | Storage | 6 | `StorageService` |

**Total:** 69 tools

---

## Usage

```typescript
import { getMcpGateway, createMcpExecutionContext } from '@/lib/mcp'

const gateway = getMcpGateway()
const context = createMcpExecutionContext({
  tenantId,
  userId,
  role: 'admin',
  permissions: ['freelancers:read'],
})

const result = await gateway.invoke({
  serverId: 'talent',
  toolName: 'talent_search',
  input: { query: 'motion designer' },
  context,
})
```

---

## Tool Contracts

JSON contracts are generated at `docs/mcp/contracts/{server}.contract.json`.

```bash
npm run mcp:contracts
```

---

## Enforcement

```bash
npm run check:mcp-services   # Adapters must not import repositories
npm run docs:generate        # Regenerates docs/generated/mcp-tools.md
```

---

## Key Files

| Path | Purpose |
|------|---------|
| `lib/mcp/gateway.ts` | Routes tool calls with auth |
| `lib/mcp/adapters/` | Service-backed tool handlers |
| `lib/mcp/servers/` | Tool definitions + JSON schemas |
| `docs/mcp/contracts/` | Generated tool contracts |
| `scripts/check-mcp-services.mjs` | CI guard |
