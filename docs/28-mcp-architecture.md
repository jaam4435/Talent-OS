# Model Context Protocol (MCP) Architecture

**Status:** Interface definitions only — no runtime implementation  
**Location:** `/lib/mcp`  
**Spec reference:** [Model Context Protocol](https://modelcontextprotocol.io)

---

## 1. Overview

Talent OS exposes its business domains to AI agents (Cursor, Claude Desktop, internal copilots, n8n AI nodes) via **Model Context Protocol**. Each domain is a separate MCP server with typed tools, resources, and (where applicable) prompts.

```
┌─────────────────────────────────────────────────────────────────────┐
│                     MCP Clients (External)                        │
│  Cursor │ Claude Desktop │ Internal Copilot │ n8n AI Agent        │
└───────────────────────────────┬─────────────────────────────────────┘
                                │ MCP (stdio / HTTP+SSE)
                                ▼
┌─────────────────────────────────────────────────────────────────────┐
│                     MCP Gateway (Future)                            │
│  Auth │ Tenant scope │ RBAC │ Rate limit │ Audit log │ Routing      │
└───────────────────────────────┬─────────────────────────────────────┘
                                │
     ┌──────────┬───────────┬───┴───┬──────────┬──────────┐
     ▼          ▼           ▼       ▼          ▼          ▼
  CRM MCP   Talent MCP  Projects  Workflow  Finance   Analytics
     │          │           │       │          │          │
     ▼          ▼           ▼       ▼          ▼          ▼
 Knowledge  Notification  Storage   AI MCP
     │          │           │       │
     └──────────┴───────────┴───────┴──► Domain Services / Repositories
                                          (modules/*, lib/domains/*)
```

**Current deliverable:** TypeScript interfaces and tool catalogs in `lib/mcp/`. No transport, no handlers, no UI.

---

## 2. Design Principles

| Principle | Rule |
|---|---|
| **Interfaces only** | This layer defines contracts; implementations live in future `lib/mcp/adapters/`. |
| **Tenant isolation** | Every tool call carries `McpExecutionContext` with `tenantId` and RBAC permissions. |
| **No direct LLM calls** | AI MCP routes through `/lib/ai` gateway — never to provider APIs. |
| **Tool naming** | `{server}_{action}` (e.g. `talent_search`, `projects_create`). |
| **Permission mapping** | Each tool declares `requiredPermission` aligned with `modules/core/services/permissions.ts`. |
| **Destructive flag** | Mutating tools set `destructive: true` for agent guardrails. |

---

## 3. Core Types

Defined in `lib/mcp/types.ts`:

| Type | Purpose |
|---|---|
| `McpToolDefinition` | Tool name, description, JSON Schema input/output |
| `McpServerDefinition` | Server metadata, capabilities, tools, resources, prompts |
| `McpExecutionContext` | Tenant, user, role, permissions, correlation ID |
| `McpToolCallRequest` / `McpToolCallResult` | Invocation envelope |
| `McpServerInterface` | Server contract (list tools, optional callTool) |
| `McpGatewayInterface` | Route invocations across servers |
| `McpRegistryInterface` | Server registration and discovery |

Middleware interfaces in `lib/mcp/interfaces.ts`:

| Interface | Purpose |
|---|---|
| `McpToolAuthorizer` | RBAC check before tool execution |
| `McpContextValidator` | Validate tenant scope |
| `McpAuditLogger` | Audit trail for agent actions |
| `McpRateLimiter` | Per-tenant tool call throttling |
| `McpTransportInterface` | stdio / HTTP+SSE transport (future) |
| `McpClientInterface` | Typed client for internal use (future) |

---

## 4. MCP Servers

### 4.1 Server Catalog

| Server ID | Name | Tools | Resources | Prompts |
|---|---|---:|---|---|
| `crm` | CRM MCP | 5 | 1 | — |
| `talent` | Talent MCP | 7 | 2 | — |
| `projects` | Projects MCP | 7 | 2 | — |
| `workflow` | Workflow MCP | 6 | 1 | — |
| `finance` | Finance MCP | 7 | 2 | — |
| `analytics` | Analytics MCP | 6 | 2 | — |
| `knowledge` | Knowledge MCP | 5 | 2 | 1 |
| `notification` | Notification MCP | 6 | 1 | — |
| `storage` | Storage MCP | 6 | 1 | — |
| `ai` | AI MCP | 8 | 2 | 2 |
| **Total** | | **63** | **16** | **3** |

---

### 4.2 CRM MCP (`lib/mcp/servers/crm.server.ts`)

**Domain:** Client companies, contacts, account search.

| Tool | Permission | Destructive |
|---|---|---|
| `crm_list_companies` | `companies:read` | — |
| `crm_get_company` | `companies:read` | — |
| `crm_create_company` | `companies:create` | ✓ |
| `crm_update_company` | `companies:update` | ✓ |
| `crm_search_companies` | `companies:read` | — |

**Resources:** `talentos://crm/companies/{company_id}`

---

### 4.3 Talent MCP (`lib/mcp/servers/talent.server.ts`)

**Domain:** Freelancer roster, skills, portfolio, ratings.

| Tool | Permission | Destructive |
|---|---|---|
| `talent_search` | `freelancers:read` | — |
| `talent_get_profile` | `freelancers:read` | — |
| `talent_create_profile` | `freelancers:create` | ✓ |
| `talent_update_profile` | `freelancers:update` | ✓ |
| `talent_list_portfolio` | `freelancers:read` | — |
| `talent_add_portfolio_item` | `freelancers:update` | ✓ |
| `talent_get_rating_history` | `freelancers:read` | — |

**Resources:** `talentos://talent/profiles/{id}`, `talentos://talent/portfolio/{id}`

**Maps to:** `lib/domains/talent/`, `modules/talent/` (future)

---

### 4.4 Projects MCP (`lib/mcp/servers/projects.server.ts`)

**Domain:** Project lifecycle, milestones, deliverables.

| Tool | Permission | Destructive |
|---|---|---|
| `projects_list` | `projects:read` | — |
| `projects_get` | `projects:read` | — |
| `projects_create` | `projects:create` | ✓ |
| `projects_update_status` | `projects:update` | ✓ |
| `projects_list_milestones` | `projects:read` | — |
| `projects_submit_milestone` | `milestones:submit` | ✓ |
| `projects_review_milestone` | `milestones:review` | ✓ |

**Resources:** `talentos://projects/{id}`, `talentos://projects/{id}/milestones`

---

### 4.5 Workflow MCP (`lib/mcp/servers/workflow.server.ts`)

**Domain:** Domain events, n8n, WhatsApp.

| Tool | Permission | Destructive |
|---|---|---|
| `workflow_emit_event` | `tenant:read` | ✓ |
| `workflow_list_events` | `tenant:read` | — |
| `workflow_get_event_status` | `tenant:read` | — |
| `workflow_dispatch_n8n` | `integrations:manage` | ✓ |
| `workflow_send_whatsapp` | `integrations:manage` | ✓ |
| `workflow_retry_failed_events` | `integrations:manage` | ✓ |

**Maps to:** `lib/integrations/events.ts`, `n8n.ts`, `whatsapp.ts`

---

### 4.6 Finance MCP (`lib/mcp/servers/finance.server.ts`)

**Domain:** Payments, approval, disbursement, exports.

| Tool | Permission | Destructive |
|---|---|---|
| `finance_list_payments` | `payments:read` | — |
| `finance_get_payment` | `payments:read` | — |
| `finance_approve_payment` | `payments:approve` | ✓ |
| `finance_mark_paid` | `payments:pay` | ✓ |
| `finance_dispute_payment` | `payments:approve` | ✓ |
| `finance_export_payments` | `payments:read` | — |
| `finance_payment_aging` | `payments:read` | — |

---

### 4.7 Analytics MCP (`lib/mcp/servers/analytics.server.ts`)

**Domain:** KPIs, fill rate, utilization, AI usage.

| Tool | Permission |
|---|---|
| `analytics_dashboard_summary` | `analytics:read` |
| `analytics_fill_rate` | `analytics:read` |
| `analytics_talent_utilization` | `analytics:read` |
| `analytics_payment_aging` | `analytics:read` |
| `analytics_ai_usage` | `analytics:read` |
| `analytics_pipeline_health` | `analytics:read` |

**Maps to:** `app/api/analytics/*`, Supabase views in `004_views_analytics.sql`

---

### 4.8 Knowledge MCP (`lib/mcp/servers/knowledge.server.ts`)

**Domain:** Entity context assembly for agent reasoning — cross-domain read model.

| Tool | Permission |
|---|---|
| `knowledge_get_entity_context` | `tenant:read` |
| `knowledge_list_related_records` | `tenant:read` |
| `knowledge_search` | `tenant:read` |
| `knowledge_get_tenant_policies` | `tenant:read` |
| `knowledge_get_schema_reference` | `tenant:read` |

**Prompts:** `entity_summary`

This server is the **agent context layer** — it does not mutate data; it assembles read-only bundles from other domains.

---

### 4.9 Notification MCP (`lib/mcp/servers/notification.server.ts`)

**Domain:** In-app notifications and Realtime feed.

| Tool | Permission | Destructive |
|---|---|---|
| `notification_list` | `tenant:read` | — |
| `notification_get` | `tenant:read` | — |
| `notification_mark_read` | `tenant:read` | ✓ |
| `notification_mark_all_read` | `tenant:read` | ✓ |
| `notification_send` | `tenant:read` | ✓ |
| `notification_subscribe_realtime` | `tenant:read` | — |

---

### 4.10 Storage MCP (`lib/mcp/servers/storage.server.ts`)

**Domain:** Supabase Storage (portfolio, deliverables, attachments).

| Tool | Destructive |
|---|---|
| `storage_upload_file` | ✓ |
| `storage_get_signed_url` | — |
| `storage_get_public_url` | — |
| `storage_delete_file` | ✓ |
| `storage_list_files` | — |
| `storage_move_file` | ✓ |

**Buckets:** `portfolio`, `deliverables`, `attachments`

---

### 4.11 AI MCP (`lib/mcp/servers/ai.server.ts`)

**Domain:** All AI features via `/lib/ai` gateway. **No direct LLM provider access.**

| Tool | Permission | Notes |
|---|---|---|
| `ai_match_talent` | `ai:match` | Async by default |
| `ai_parse_brief` | `ai:brief_parse` | |
| `ai_project_summary` | `ai:summary` | |
| `ai_shortlist_summary` | `ai:summary` | |
| `ai_status_assessment` | `ai:status` | |
| `ai_get_request_status` | `tenant:read` | Poll async results |
| `ai_complete` | `tenant:read` | Gateway passthrough |
| `ai_list_prompts` | `tenant:read` | Prompt Manager catalog |

**Prompts:** `talent_match`, `brief_parse`

**Maps to:** `lib/ai/gateway.ts`, `lib/integrations/ai/*`

---

## 5. Folder Structure

```
lib/mcp/
├── index.ts                 # Public exports
├── types.ts                 # Core MCP protocol types
├── interfaces.ts            # Gateway, transport, middleware interfaces
├── schemas/
│   └── common.ts            # Shared JSON Schema helpers
└── servers/
    ├── index.ts             # Server catalog + tool counts
    ├── crm.server.ts
    ├── talent.server.ts
    ├── projects.server.ts
    ├── workflow.server.ts
    ├── finance.server.ts
    ├── analytics.server.ts
    ├── knowledge.server.ts
    ├── notification.server.ts
    ├── storage.server.ts
    └── ai.server.ts
```

**Future (not in scope):**

```
lib/mcp/
├── gateway.ts               # McpGateway implementation
├── registry.ts              # Server registry
├── adapters/                # Domain service → tool handler adapters
│   ├── crm.adapter.ts
│   └── ...
└── transport/
    ├── stdio.ts
    └── http-sse.ts
```

---

## 6. Execution Context

Every tool invocation includes:

```typescript
interface McpExecutionContext {
  tenantId: string       // Active agency tenant
  userId: string         // Authenticated user
  role: string           // admin | talent_manager | freelancer | client
  permissions: string[]  // Resolved RBAC permissions
  correlationId: string  // Trace across services
  requestId: string      // Unique invocation ID
}
```

The gateway injects context from the Supabase session (`modules/core/services/session.ts`). Agents never pass raw tenant IDs without auth validation.

---

## 7. Security Model

```
Agent Request
     │
     ▼
┌─────────────┐
│  Transport  │  API key / OAuth / session token
└──────┬──────┘
       ▼
┌─────────────┐
│  Context    │  Resolve tenant + user + permissions
│  Validator  │
└──────┬──────┘
       ▼
┌─────────────┐
│  Tool       │  Check requiredPermission
│  Authorizer │
└──────┬──────┘
       ▼
┌─────────────┐
│  Rate       │  Per-tenant RPM limit
│  Limiter    │
└──────┬──────┘
       ▼
┌─────────────┐
│  Domain     │  Existing service/repository
│  Adapter    │  (RLS-enforced Supabase queries)
└──────┬──────┘
       ▼
┌─────────────┐
│  Audit      │  Log tool, input hash, result, latency
│  Logger     │
└─────────────┘
```

---

## 8. Resource URI Scheme

All MCP resources use the `talentos://` URI scheme:

```
talentos://{server}/{resource-type}/{id}
talentos://{server}/{resource-type}/{id}/{sub-resource}
```

Examples:

- `talentos://talent/profiles/550e8400-e29b-41d4-a716-446655440000`
- `talentos://projects/abc123/milestones`
- `talentos://ai/requests/def456`

Resources are read-only views for agent context. Mutations go through tools.

---

## 9. Integration with Existing Architecture

| MCP Server | Existing Code | Future Module |
|---|---|---|
| CRM | `app/actions/companies.ts` | `modules/crm/` |
| Talent | `lib/domains/talent/` | `modules/talent/` |
| Projects | `app/actions/projects.ts`, `milestones.ts` | `modules/projects/` |
| Workflow | `lib/integrations/events.ts`, `n8n.ts` | `modules/workflow/` |
| Finance | `app/(dashboard)/payments/` (read-only) | `modules/finance/` |
| Analytics | `app/api/analytics/dashboard/` | `modules/analytics/` |
| Knowledge | — (new read model) | `modules/knowledge/` |
| Notification | `notifications` table | `modules/notifications/` |
| Storage | Supabase Storage buckets | `modules/storage/` |
| AI | `lib/ai/gateway.ts` | `modules/ai/` |

---

## 10. Agent Usage Patterns

### 10.1 Talent matching workflow

```
1. knowledge_get_entity_context  → opportunity details
2. talent_search                 → available candidates
3. ai_match_talent               → ranked scores (async)
4. ai_get_request_status         → poll result
5. notification_send             → notify manager
```

### 10.2 Project health check

```
1. projects_get                  → project + milestones
2. ai_status_assessment          → risk assessment
3. analytics_dashboard_summary   → KPI context
4. notification_send             → alert if at_risk
```

### 10.3 Onboarding new talent

```
1. talent_create_profile         → create roster entry
2. storage_upload_file           → portfolio image
3. talent_add_portfolio_item     → link portfolio
4. workflow_emit_event           → trigger welcome workflow
```

---

## 11. Implementation Roadmap

| Phase | Deliverable | Status |
|---|---|---|
| **1** | Interface definitions + tool catalogs | ✅ Complete |
| **2** | MCP Gateway + Registry | Planned |
| **3** | Domain adapters (CRM, Talent, Projects) | Planned |
| **4** | stdio transport (Cursor / Claude Desktop) | Planned |
| **5** | HTTP+SSE transport (remote agents) | Planned |
| **6** | Knowledge MCP read model | Planned |
| **7** | Audit logging + agent analytics | Planned |

---

## 12. Import Reference

```typescript
// Discover all servers and tools
import {
  ALL_MCP_SERVER_DEFINITIONS,
  ALL_MCP_TOOL_NAMES,
  MCP_TOOL_COUNT,
} from '@/lib/mcp'

// Server-specific tool catalogs
import { TALENT_TOOLS, TALENT_SERVER_DEFINITION } from '@/lib/mcp'
import type { TalentToolInputs, TalentToolName } from '@/lib/mcp'

// Core types for adapter implementation
import type {
  McpServerInterface,
  McpGatewayInterface,
  McpExecutionContext,
  McpToolCallResult,
} from '@/lib/mcp'
```

---

## 13. Related Documentation

| Doc | Topic |
|---|---|
| `docs/27-ai-gateway.md` | AI MCP backend — all LLM calls via `/lib/ai` |
| `docs/26-business-domains-refactor.md` | Domain module structure |
| `docs/08-multi-tenant-architecture.md` | Tenant isolation + RLS |
| `docs/07-authentication-design.md` | RBAC permissions |
| `docs/05-api-architecture.md` | REST + Server Actions layer |
