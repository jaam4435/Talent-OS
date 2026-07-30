/**
 * Talent OS — Model Context Protocol (MCP) core types.
 * Interfaces only; no runtime business logic.
 * @see docs/28-mcp-architecture.md
 */

/** JSON Schema subset used for MCP tool input/output definitions. */
export type McpJsonSchema = {
  type: 'object' | 'string' | 'number' | 'boolean' | 'array' | 'null'
  description?: string
  enum?: readonly string[]
  items?: McpJsonSchema
  properties?: Record<string, McpJsonSchema>
  required?: readonly string[]
  additionalProperties?: boolean
}

export interface McpToolDefinition<TName extends string = string> {
  /** Unique tool name within the server namespace (e.g. `talent_search`). */
  readonly name: TName
  readonly title: string
  readonly description: string
  readonly inputSchema: McpJsonSchema
  readonly outputSchema?: McpJsonSchema
  /** Whether the tool mutates state. Used for audit and agent guardrails. */
  readonly destructive?: boolean
  /** Minimum RBAC permission required (maps to modules/core permissions). */
  readonly requiredPermission?: string
  /** Whether tool is available in current product release. */
  readonly enabled?: boolean
}

export interface McpResourceDefinition {
  readonly uri: string
  readonly name: string
  readonly description?: string
  readonly mimeType?: string
}

export interface McpPromptDefinition {
  readonly name: string
  readonly description?: string
  readonly arguments?: Array<{
    name: string
    description?: string
    required?: boolean
  }>
}

export interface McpServerMetadata {
  /** Server identifier (e.g. `talent`, `crm`). */
  readonly id: McpServerId
  readonly name: string
  readonly version: string
  readonly description: string
  /** Base URI prefix for resources exposed by this server. */
  readonly resourcePrefix: string
}

export type McpServerId =
  | 'crm'
  | 'talent'
  | 'projects'
  | 'workflow'
  | 'finance'
  | 'analytics'
  | 'knowledge'
  | 'notification'
  | 'storage'
  | 'ai'

export interface McpToolCallRequest<TInput = unknown> {
  readonly serverId: McpServerId
  readonly toolName: string
  readonly input: TInput
  readonly context: McpExecutionContext
}

export interface McpToolCallResult<TOutput = unknown> {
  readonly content: TOutput
  readonly isError?: boolean
  readonly _meta?: {
    latencyMs?: number
    serverId?: McpServerId
    toolName?: string
  }
}

export interface McpExecutionContext {
  readonly tenantId: string
  readonly userId: string
  readonly role: string
  readonly permissions: readonly string[]
  readonly correlationId: string
  readonly requestId: string
}

export interface McpServerCapabilities {
  readonly tools: boolean
  readonly resources: boolean
  readonly prompts: boolean
  readonly logging: boolean
}

export interface McpServerDefinition {
  readonly metadata: McpServerMetadata
  readonly capabilities: McpServerCapabilities
  readonly tools: readonly McpToolDefinition[]
  readonly resources?: readonly McpResourceDefinition[]
  readonly prompts?: readonly McpPromptDefinition[]
}

/** Maps a tool name to its input/output types for type-safe handlers. */
export interface McpToolHandlerMap {
  [toolName: string]: {
    input: unknown
    output: unknown
  }
}

export type McpToolHandler<
  TInput = unknown,
  TOutput = unknown,
> = (
  input: TInput,
  context: McpExecutionContext
) => Promise<McpToolCallResult<TOutput>>

export interface McpServerInterface {
  readonly definition: McpServerDefinition
  listTools(): readonly McpToolDefinition[]
  listResources?(): readonly McpResourceDefinition[]
  listPrompts?(): readonly McpPromptDefinition[]
  /** Implemented by future server adapters — not provided in this interface-only layer. */
  callTool?(
    toolName: string,
    input: unknown,
    context: McpExecutionContext
  ): Promise<McpToolCallResult>
}

export interface McpRegistryInterface {
  register(server: McpServerInterface): void
  get(serverId: McpServerId): McpServerInterface | undefined
  listServers(): readonly McpServerInterface[]
  listAllTools(): readonly McpToolDefinition[]
  findTool(toolName: string): { server: McpServerInterface; tool: McpToolDefinition } | undefined
}

export interface McpGatewayInterface {
  /** Route a tool call to the appropriate domain MCP server. */
  invoke<TOutput = unknown>(
    request: McpToolCallRequest
  ): Promise<McpToolCallResult<TOutput>>
  /** Aggregate tool catalog for MCP client discovery. */
  discover(): readonly McpServerDefinition[]
}
