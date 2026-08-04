import { ALL_MCP_SERVER_DEFINITIONS } from '@/lib/mcp/servers'
import type { McpToolDefinition } from '@/lib/mcp/types'
import { hasPermission } from '@/modules/core/services/permissions'
import type { UserRole } from '@/modules/core/types/enums'

export interface ResolvedAgentTool {
  name: string
  title: string
  description: string
  destructive?: boolean
  requiredPermission?: string
  serverId: string
}

const TOOL_CATALOG = new Map<string, McpToolDefinition & { serverId: string }>(
  ALL_MCP_SERVER_DEFINITIONS.flatMap((server) =>
    server.tools.map((tool) => [tool.name, { ...tool, serverId: server.metadata.id }] as const)
  )
)

export function getToolCatalog(): readonly McpToolDefinition[] {
  return [...TOOL_CATALOG.values()]
}

export function findToolDefinition(toolName: string): (McpToolDefinition & { serverId: string }) | undefined {
  return TOOL_CATALOG.get(toolName)
}

/** Resolve allowed tools for an agent, intersected with user permissions. */
export function resolveAgentTools(
  allowedToolNames: string[],
  userPermissions: readonly string[],
  role: UserRole
): ResolvedAgentTool[] {
  const resolved: ResolvedAgentTool[] = []

  for (const toolName of allowedToolNames) {
    const tool = TOOL_CATALOG.get(toolName)
    if (!tool || tool.enabled === false) continue

    const permission = tool.requiredPermission
    if (permission && !userPermissions.includes(permission) && !hasPermission(role, permission)) {
      continue
    }

    resolved.push({
      name: tool.name,
      title: tool.title,
      description: tool.description,
      destructive: tool.destructive,
      requiredPermission: tool.requiredPermission,
      serverId: tool.serverId,
    })
  }

  return resolved
}

/** Validate that requested tool allowlist is a subset of defaults. */
export function validateToolAllowlist(
  requested: string[],
  defaults: string[]
): { ok: true } | { ok: false; invalid: string[] } {
  const defaultSet = new Set(defaults)
  const invalid = requested.filter((t) => !defaultSet.has(t))
  if (invalid.length > 0) return { ok: false, invalid }
  return { ok: true }
}

/** Check user has all agent-level required permissions. */
export function checkAgentPermissions(
  requiredPermissions: readonly string[],
  userPermissions: readonly string[],
  role: UserRole
): { ok: true } | { ok: false; missing: string[] } {
  const missing = requiredPermissions.filter(
    (p) => !userPermissions.includes(p) && !hasPermission(role, p)
  )
  if (missing.length > 0) return { ok: false, missing }
  return { ok: true }
}
