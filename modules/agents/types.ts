/** Agent framework domain types. */

export const AGENT_IDS = [
  'recruiter',
  'project_manager',
  'finance',
  'qa',
  'executive',
  'knowledge',
] as const

export type AgentId = (typeof AGENT_IDS)[number]

export const AGENT_LABELS: Record<AgentId, string> = {
  recruiter: 'Recruiter Agent',
  project_manager: 'Project Manager Agent',
  finance: 'Finance Agent',
  qa: 'QA Agent',
  executive: 'Executive Agent',
  knowledge: 'Knowledge Agent',
}

export type AgentMemoryScope = 'session' | 'entity' | 'tenant'

export type AgentSessionStatus = 'active' | 'completed' | 'failed'

export interface AgentMemoryPolicy {
  scope: AgentMemoryScope
  entityTypes?: string[]
  maxEntries: number
  ttlHours?: number
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
  }
  tools: Array<{
    name: string
    title: string
    description: string
    destructive?: boolean
    requiredPermission?: string
  }>
  memory: AgentMemoryEntryRow[]
  permissions: string[]
  correlationId: string
}
