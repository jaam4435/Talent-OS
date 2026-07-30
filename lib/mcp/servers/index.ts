export { CRM_TOOLS, CRM_SERVER_DEFINITION } from '@/lib/mcp/servers/crm.server'
export type { CrmMcpServerInterface, CrmToolName, CrmToolInputs } from '@/lib/mcp/servers/crm.server'

export { TALENT_TOOLS, TALENT_SERVER_DEFINITION } from '@/lib/mcp/servers/talent.server'
export type { TalentMcpServerInterface, TalentToolName, TalentToolInputs } from '@/lib/mcp/servers/talent.server'

export { PROJECTS_TOOLS, PROJECTS_SERVER_DEFINITION } from '@/lib/mcp/servers/projects.server'
export type { ProjectsMcpServerInterface, ProjectsToolName, ProjectsToolInputs } from '@/lib/mcp/servers/projects.server'

export { WORKFLOW_TOOLS, WORKFLOW_SERVER_DEFINITION } from '@/lib/mcp/servers/workflow.server'
export type { WorkflowMcpServerInterface, WorkflowToolName, WorkflowToolInputs } from '@/lib/mcp/servers/workflow.server'

export { FINANCE_TOOLS, FINANCE_SERVER_DEFINITION } from '@/lib/mcp/servers/finance.server'
export type { FinanceMcpServerInterface, FinanceToolName, FinanceToolInputs } from '@/lib/mcp/servers/finance.server'

export { ANALYTICS_TOOLS, ANALYTICS_SERVER_DEFINITION } from '@/lib/mcp/servers/analytics.server'
export type { AnalyticsMcpServerInterface, AnalyticsToolName, AnalyticsToolInputs } from '@/lib/mcp/servers/analytics.server'

export { KNOWLEDGE_TOOLS, KNOWLEDGE_SERVER_DEFINITION } from '@/lib/mcp/servers/knowledge.server'
export type { KnowledgeMcpServerInterface, KnowledgeToolName, KnowledgeToolInputs } from '@/lib/mcp/servers/knowledge.server'

export { NOTIFICATION_TOOLS, NOTIFICATION_SERVER_DEFINITION } from '@/lib/mcp/servers/notification.server'
export type {
  NotificationMcpServerInterface,
  NotificationToolName,
  NotificationToolInputs,
} from '@/lib/mcp/servers/notification.server'

export { STORAGE_TOOLS, STORAGE_SERVER_DEFINITION } from '@/lib/mcp/servers/storage.server'
export type { StorageMcpServerInterface, StorageToolName, StorageToolInputs } from '@/lib/mcp/servers/storage.server'

export { AI_TOOLS, AI_SERVER_DEFINITION } from '@/lib/mcp/servers/ai.server'
export type { AiMcpServerInterface, AiToolName, AiToolInputs } from '@/lib/mcp/servers/ai.server'

export { MARKETPLACE_TOOLS, MARKETPLACE_SERVER_DEFINITION } from '@/lib/mcp/servers/marketplace.server'
export type {
  MarketplaceMcpServerInterface,
  MarketplaceToolName,
  MarketplaceToolInputs,
} from '@/lib/mcp/servers/marketplace.server'

import { CRM_SERVER_DEFINITION } from '@/lib/mcp/servers/crm.server'
import { TALENT_SERVER_DEFINITION } from '@/lib/mcp/servers/talent.server'
import { PROJECTS_SERVER_DEFINITION } from '@/lib/mcp/servers/projects.server'
import { WORKFLOW_SERVER_DEFINITION } from '@/lib/mcp/servers/workflow.server'
import { FINANCE_SERVER_DEFINITION } from '@/lib/mcp/servers/finance.server'
import { ANALYTICS_SERVER_DEFINITION } from '@/lib/mcp/servers/analytics.server'
import { KNOWLEDGE_SERVER_DEFINITION } from '@/lib/mcp/servers/knowledge.server'
import { NOTIFICATION_SERVER_DEFINITION } from '@/lib/mcp/servers/notification.server'
import { STORAGE_SERVER_DEFINITION } from '@/lib/mcp/servers/storage.server'
import { AI_SERVER_DEFINITION } from '@/lib/mcp/servers/ai.server'
import { MARKETPLACE_SERVER_DEFINITION } from '@/lib/mcp/servers/marketplace.server'
import type { McpServerDefinition } from '@/lib/mcp/types'

/** All MCP server definitions for discovery and documentation generation. */
export const ALL_MCP_SERVER_DEFINITIONS: readonly McpServerDefinition[] = [
  CRM_SERVER_DEFINITION,
  TALENT_SERVER_DEFINITION,
  PROJECTS_SERVER_DEFINITION,
  WORKFLOW_SERVER_DEFINITION,
  FINANCE_SERVER_DEFINITION,
  ANALYTICS_SERVER_DEFINITION,
  KNOWLEDGE_SERVER_DEFINITION,
  NOTIFICATION_SERVER_DEFINITION,
  MARKETPLACE_SERVER_DEFINITION,
  STORAGE_SERVER_DEFINITION,
  AI_SERVER_DEFINITION,
] as const

/** Flat catalog of all tool names across servers. */
export const ALL_MCP_TOOL_NAMES = ALL_MCP_SERVER_DEFINITIONS.flatMap((server) =>
  server.tools.map((tool) => tool.name)
) as readonly string[]

export const MCP_SERVER_COUNT = ALL_MCP_SERVER_DEFINITIONS.length
export const MCP_TOOL_COUNT = ALL_MCP_TOOL_NAMES.length
