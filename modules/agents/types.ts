/** Agent framework domain types. */

export const AGENT_IDS = [
  'recruiter',
  'project_manager',
  'finance',
  'qa',
  'executive',
  'knowledge',
  'support',
] as const

export type AgentId = (typeof AGENT_IDS)[number]

export const AGENT_LABELS: Record<AgentId, string> = {
  recruiter: 'Recruiter Agent',
  project_manager: 'Project Manager Agent',
  finance: 'Finance Agent',
  qa: 'QA Agent',
  executive: 'Executive Agent',
  knowledge: 'Knowledge Agent',
  support: 'Support Agent',
}

export type AgentMemoryScope = 'session' | 'entity' | 'tenant'

export type AgentSessionStatus = 'active' | 'completed' | 'failed'

export type AgentMessageRole = 'user' | 'assistant' | 'system' | 'tool'

export interface AgentMemoryPolicy {
  scope: AgentMemoryScope
  entityTypes?: string[]
  maxEntries: number
  ttlHours?: number
}

/** Configurable reasoning loop parameters per agent. */
export interface AgentReasoningPolicy {
  maxSteps: number
  toolUseEnabled: boolean
  temperature: number
  maxTokens: number
}

/** Configurable conversation state parameters per agent. */
export interface AgentConversationPolicy {
  maxHistoryMessages: number
  persistToolResults: boolean
  autoSummarize: boolean
}

/**
 * Complete agent definition — six configurable dimensions.
 * Instructions and tool content are resolved server-side only.
 */
export interface AgentDefinition {
  agentId: AgentId
  label: string
  description: string
  instructions: AgentInstructionsConfig
  tools: AgentToolsConfig
  permissions: AgentPermissionsConfig
  memory: AgentMemoryPolicy
  reasoning: AgentReasoningPolicy
  conversation: AgentConversationPolicy
}

export interface AgentInstructionsConfig {
  promptId: string
  version: string
}

export interface AgentToolsConfig {
  allowedTools: string[]
}

export interface AgentPermissionsConfig {
  requiredPermissions: string[]
}

/** Built-in default definition (code registry). */
export interface AgentDefaultDefinition {
  agentId: AgentId
  label: string
  description: string
  instructionPromptId: string
  instructionVersion: string
  allowedTools: string[]
  requiredPermissions: string[]
  memoryPolicy: AgentMemoryPolicy
  reasoningPolicy: AgentReasoningPolicy
  conversationPolicy: AgentConversationPolicy
  modelOverride?: string
}

/** Resolved agent config after merging defaults + tenant overrides. */
export interface ResolvedAgentConfig {
  agentId: AgentId
  label: string
  description: string
  enabled: boolean
  instructionPromptId: string
  instructionVersion: string | null
  allowedTools: string[]
  requiredPermissions: string[]
  memoryPolicy: AgentMemoryPolicy
  reasoningPolicy: AgentReasoningPolicy
  conversationPolicy: AgentConversationPolicy
  modelOverride: string | null
  metadata: Record<string, unknown>
  hasTenantOverride: boolean
}

/** Public-facing config (no instruction content). */
export interface AgentConfigSummary {
  agentId: AgentId
  label: string
  description: string
  enabled: boolean
  allowedTools: string[]
  requiredPermissions: string[]
  memoryPolicy: AgentMemoryPolicy
  reasoningPolicy: AgentReasoningPolicy
  conversationPolicy: AgentConversationPolicy
  modelOverride: string | null
  instructionPromptId: string
  instructionVersion: string | null
  hasTenantOverride: boolean
}

/** Tenant-configurable fields only — instructions are never included. */
export interface UpdateAgentConfigInput {
  enabled?: boolean
  allowedTools?: string[]
  requiredPermissions?: string[]
  memoryPolicy?: Partial<AgentMemoryPolicy>
  reasoningPolicy?: Partial<AgentReasoningPolicy>
  conversationPolicy?: Partial<AgentConversationPolicy>
  modelOverride?: string | null
  metadata?: Record<string, unknown>
}

export interface CreateAgentSessionInput {
  agentId: AgentId
  userId?: string | null
  entityType?: string
  entityId?: string
  correlationId?: string
  context?: Record<string, unknown>
}

export interface WriteAgentMemoryInput {
  agentId: AgentId
  sessionId?: string
  scope: AgentMemoryScope
  entityType?: string
  entityId?: string
  memoryKey: string
  content: string
  metadata?: Record<string, unknown>
  ttlHours?: number
}

export interface AgentRunInput {
  agentId: AgentId
  message: string
  sessionId?: string
  entityType?: string
  entityId?: string
  correlationId?: string
}

export interface AgentToolCallRecord {
  tool: string
  serverId: string
  arguments: Record<string, unknown>
  result: unknown
  isError: boolean
}

export interface AgentRunResult {
  agentId: AgentId
  sessionId: string
  correlationId: string
  content: string
  steps: number
  toolCalls: AgentToolCallRecord[]
  usage?: {
    inputTokens: number
    outputTokens: number
    totalTokens: number
  }
}

export interface AgentConversationState {
  sessionId: string
  agentId: AgentId
  status: AgentSessionStatus
  turnCount: number
  entityType: string | null
  entityId: string | null
  correlationId: string | null
  messages: AgentMessageSummary[]
  context: Record<string, unknown>
}

export interface AgentMessageSummary {
  id: string
  role: AgentMessageRole
  content: string
  createdAt: string
  metadata?: Record<string, unknown>
}

export interface AgentMemoryEntryRow {
  id: string
  tenant_id: string
  agent_id: AgentId
  session_id: string | null
  scope: AgentMemoryScope
  entity_type: string | null
  entity_id: string | null
  memory_key: string
  content: string
  metadata: Record<string, unknown>
  expires_at: string | null
  created_at: string
  updated_at: string
}

export interface AgentMessageRow {
  id: string
  tenant_id: string
  session_id: string
  agent_id: AgentId
  role: AgentMessageRole
  content: string
  metadata: Record<string, unknown>
  created_at: string
}

export interface AgentSessionRow {
  id: string
  tenant_id: string
  agent_id: AgentId
  user_id: string | null
  entity_type: string | null
  entity_id: string | null
  status: AgentSessionStatus
  context: Record<string, unknown>
  correlation_id: string | null
  created_at: string
  updated_at: string
  completed_at: string | null
}

export interface AgentConfigRow {
  id: string
  tenant_id: string
  agent_id: AgentId
  enabled: boolean
  instruction_prompt_id: string
  instruction_version: string | null
  allowed_tools: string[]
  required_permissions: string[]
  memory_policy: AgentMemoryPolicy
  reasoning_policy: AgentReasoningPolicy
  conversation_policy: AgentConversationPolicy
  model_override: string | null
  metadata: Record<string, unknown>
  created_at: string
  updated_at: string
}

/** Assembled context for an agent run (instructions resolved server-side). */
export interface AgentRunContext {
  agentId: AgentId
  sessionId: string
  instructions: {
    promptId: string
    version: string
    promptHash: string
    system: string
  }
  tools: Array<{
    name: string
    title: string
    description: string
    destructive?: boolean
    requiredPermission?: string
    serverId: string
  }>
  memory: AgentMemoryEntryRow[]
  permissions: string[]
  reasoningPolicy: AgentReasoningPolicy
  conversationPolicy: AgentConversationPolicy
  modelOverride: string | null
  correlationId: string
  conversationMessages: AgentMessageRow[]
}
