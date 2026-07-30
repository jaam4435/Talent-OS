import type { McpExecutionContext, McpToolCallResult } from '@/lib/mcp/types'
import type { Services } from '@/lib/services/factory'
import type { TenantContext, UserRole } from '@/modules/core/types/enums'

export interface McpAdapterContext {
  readonly execution: McpExecutionContext
  readonly services: Services
}

export function mcpOk<T>(content: T): McpToolCallResult<T> {
  return { content }
}

export function mcpErr(message: string, code = 'MCP_ERROR'): McpToolCallResult {
  return { content: { error: message, code }, isError: true }
}

export function paginate<T>(items: T[], page = 1, limit = 20): { items: T[]; page: number; limit: number; total: number } {
  const safeLimit = Math.min(Math.max(limit, 1), 100)
  const safePage = Math.max(page, 1)
  const offset = (safePage - 1) * safeLimit
  return {
    items: items.slice(offset, offset + safeLimit),
    page: safePage,
    limit: safeLimit,
    total: items.length,
  }
}

export function tenantContext(execution: McpExecutionContext): TenantContext {
  return {
    id: execution.tenantId,
    slug: 'tenant',
    name: 'Tenant',
    role: execution.role as UserRole,
    timezone: 'UTC',
    currency: 'USD',
  }
}

export type McpToolHandlerFn = (
  input: unknown,
  ctx: McpAdapterContext
) => Promise<McpToolCallResult>
