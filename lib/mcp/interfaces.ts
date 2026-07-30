import type { McpExecutionContext, McpToolCallResult } from '@/lib/mcp/types'

/** Validates that the execution context has required tenant scope. */
export interface McpContextValidator {
  validate(context: McpExecutionContext): Promise<void>
}

/** Authorizes a tool call against RBAC permissions. */
export interface McpToolAuthorizer {
  authorize(
    toolName: string,
    requiredPermission: string | undefined,
    context: McpExecutionContext
  ): Promise<void>
}

/** Logs MCP tool invocations for audit. */
export interface McpAuditLogger {
  logInvocation(input: {
    serverId: string
    toolName: string
    context: McpExecutionContext
    input: unknown
    result: McpToolCallResult
    latencyMs: number
  }): Promise<void>
}

/** Rate-limits MCP tool calls per tenant. */
export interface McpRateLimiter {
  check(tenantId: string, toolName: string): Promise<void>
}

export interface McpMiddleware {
  readonly authorizer?: McpToolAuthorizer
  readonly contextValidator?: McpContextValidator
  readonly auditLogger?: McpAuditLogger
  readonly rateLimiter?: McpRateLimiter
}

export interface McpTransportInterface {
  /** Stdio transport for local MCP clients (Cursor, Claude Desktop). */
  startStdio?(): Promise<void>
  /** HTTP/SSE transport for remote MCP clients. */
  startHttp?(options: { port: number; path?: string }): Promise<void>
  stop(): Promise<void>
}

export interface McpClientInterface {
  connect(transport: McpTransportInterface): Promise<void>
  listTools(serverId?: string): Promise<readonly import('@/lib/mcp/types').McpToolDefinition[]>
  callTool<TInput, TOutput>(
    serverId: import('@/lib/mcp/types').McpServerId,
    toolName: string,
    input: TInput,
    context: McpExecutionContext
  ): Promise<McpToolCallResult<TOutput>>
  disconnect(): Promise<void>
}
