import { CRM_ADAPTER_HANDLERS } from '@/lib/mcp/adapters/crm.adapter'
import { TALENT_ADAPTER_HANDLERS } from '@/lib/mcp/adapters/talent.adapter'
import { PROJECTS_ADAPTER_HANDLERS } from '@/lib/mcp/adapters/projects.adapter'
import { WORKFLOW_ADAPTER_HANDLERS } from '@/lib/mcp/adapters/workflow.adapter'
import { FINANCE_ADAPTER_HANDLERS } from '@/lib/mcp/adapters/finance.adapter'
import { ANALYTICS_ADAPTER_HANDLERS } from '@/lib/mcp/adapters/analytics.adapter'
import { KNOWLEDGE_ADAPTER_HANDLERS } from '@/lib/mcp/adapters/knowledge.adapter'
import { NOTIFICATION_ADAPTER_HANDLERS } from '@/lib/mcp/adapters/notification.adapter'
import { STORAGE_ADAPTER_HANDLERS } from '@/lib/mcp/adapters/storage.adapter'
import { AI_ADAPTER_HANDLERS } from '@/lib/mcp/adapters/ai.adapter'
import { MARKETPLACE_ADAPTER_HANDLERS } from '@/lib/mcp/adapters/marketplace.adapter'
import type { McpToolHandlerFn } from '@/lib/mcp/adapters/helpers'

/** Unified dispatch map — every MCP tool routes to a service-backed handler. */
export const MCP_TOOL_HANDLERS: Record<string, McpToolHandlerFn> = {
  ...CRM_ADAPTER_HANDLERS,
  ...TALENT_ADAPTER_HANDLERS,
  ...PROJECTS_ADAPTER_HANDLERS,
  ...WORKFLOW_ADAPTER_HANDLERS,
  ...FINANCE_ADAPTER_HANDLERS,
  ...ANALYTICS_ADAPTER_HANDLERS,
  ...KNOWLEDGE_ADAPTER_HANDLERS,
  ...NOTIFICATION_ADAPTER_HANDLERS,
  ...STORAGE_ADAPTER_HANDLERS,
  ...AI_ADAPTER_HANDLERS,
  ...MARKETPLACE_ADAPTER_HANDLERS,
}

export function getMcpToolHandler(toolName: string): McpToolHandlerFn | undefined {
  return MCP_TOOL_HANDLERS[toolName]
}

export const MCP_ADAPTER_TOOL_COUNT = Object.keys(MCP_TOOL_HANDLERS).length
