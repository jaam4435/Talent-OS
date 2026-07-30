import { findToolDefinition } from '@/lib/ai/agent/tool-filter'
import { hasPermission } from '@/modules/core/services/permissions'
import type { UserRole } from '@/modules/core/types/enums'
import { getMcpToolHandler } from '@/lib/mcp/adapters'
import type {
  McpExecutionContext,
  McpGatewayInterface,
  McpToolCallRequest,
  McpToolCallResult,
} from '@/lib/mcp/types'
import { ALL_MCP_SERVER_DEFINITIONS } from '@/lib/mcp/servers'
import { createMcpServices } from '@/lib/services/factory'

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

/** MCP gateway — routes tool calls through service-backed adapters with authorization. */
export class McpGateway implements McpGatewayInterface {
  private readonly authorizer = new DefaultToolAuthorizer()

  discover() {
    return ALL_MCP_SERVER_DEFINITIONS
  }

  async invoke<TOutput = unknown>(request: McpToolCallRequest): Promise<McpToolCallResult<TOutput>> {
    const started = Date.now()
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

    const handler = getMcpToolHandler(request.toolName)
    if (!handler) {
      return {
        content: { error: 'Tool adapter not registered', tool: request.toolName } as TOutput,
        isError: true,
      }
    }

    try {
      const services = await createMcpServices(request.context)
      const result = await handler(request.input, {
        execution: request.context,
        services,
      })
      return {
        ...result,
        _meta: {
          ...result._meta,
          latencyMs: Date.now() - started,
          serverId: request.serverId,
          toolName: request.toolName,
        },
      } as McpToolCallResult<TOutput>
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Tool execution failed'
      return {
        content: { error: message, tool: request.toolName } as TOutput,
        isError: true,
        _meta: {
          latencyMs: Date.now() - started,
          serverId: request.serverId,
          toolName: request.toolName,
        },
      }
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
