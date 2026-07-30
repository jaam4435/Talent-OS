import { findToolDefinition } from '@/lib/ai/agent/tool-filter'
import { hasPermission } from '@/modules/core/services/permissions'
import type { UserRole } from '@/modules/core/types/enums'
import type {
  McpExecutionContext,
  McpGatewayInterface,
  McpToolCallRequest,
  McpToolCallResult,
} from '@/lib/mcp/types'
import { ALL_MCP_SERVER_DEFINITIONS } from '@/lib/mcp/servers'

class DefaultToolAuthorizer {
  async authorize(
    _toolName: string,
    requiredPermission: string | undefined,
    context: McpExecutionContext
  ): Promise<void> {
    if (!requiredPermission) return
    if (context.permissions.includes(requiredPermission)) return
    if (hasPermission(context.role as UserRole, requiredPermission)) return
    throw new Error(`FORBIDDEN: missing permission ${requiredPermission}`)
  }
}

/**
 * MCP gateway — routes tool calls with authorization.
 * Domain adapters will be wired in a future iteration; invoke returns not-implemented for now.
 */
export class McpGateway implements McpGatewayInterface {
  private readonly authorizer = new DefaultToolAuthorizer()

  discover() {
    return ALL_MCP_SERVER_DEFINITIONS
  }

  async invoke<TOutput = unknown>(request: McpToolCallRequest): Promise<McpToolCallResult<TOutput>> {
    const tool = findToolDefinition(request.toolName)
    if (!tool) {
      return { content: { error: `Unknown tool: ${request.toolName}` } as TOutput, isError: true }
    }

    if (tool.serverId !== request.serverId) {
      return {
        content: { error: `Tool ${request.toolName} does not belong to server ${request.serverId}` } as TOutput,
        isError: true,
      }
    }

    await this.authorizer.authorize(request.toolName, tool.requiredPermission, request.context)

    return {
      content: {
        error: 'Tool adapter not implemented',
        tool: request.toolName,
        message: 'MCP tool adapters will be wired in a future iteration',
      } as TOutput,
      isError: true,
      _meta: { serverId: request.serverId, toolName: request.toolName },
    }
  }
}

let gateway: McpGateway | null = null

export function getMcpGateway(): McpGateway {
  if (!gateway) gateway = new McpGateway()
  return gateway
}

export function resetMcpGateway(): void {
  gateway = null
}

export function createMcpExecutionContext(input: {
  tenantId: string
  userId: string
  role: UserRole
  permissions: readonly string[]
  correlationId?: string
}): McpExecutionContext {
  return {
    tenantId: input.tenantId,
    userId: input.userId,
    role: input.role,
    permissions: input.permissions,
    correlationId: input.correlationId ?? crypto.randomUUID(),
    requestId: crypto.randomUUID(),
  }
}
