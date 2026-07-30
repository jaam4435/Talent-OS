import type {
  AgentConfigRow,
  AgentDefaultDefinition,
  AgentMemoryPolicy,
  ResolvedAgentConfig,
} from '@/modules/agents/types'
import { getAgentDefault } from '@/lib/ai/agent/registry'

export function mergeAgentConfig(
  agentId: AgentDefaultDefinition['agentId'],
  tenantOverride: AgentConfigRow | null
): ResolvedAgentConfig {
  const defaults = getAgentDefault(agentId)

  if (!tenantOverride) {
    return {
      agentId,
      label: defaults.label,
      description: defaults.description,
      enabled: true,
      instructionPromptId: defaults.instructionPromptId,
      instructionVersion: defaults.instructionVersion,
      allowedTools: [...defaults.allowedTools],
      requiredPermissions: [...defaults.requiredPermissions],
      memoryPolicy: { ...defaults.memoryPolicy },
      modelOverride: defaults.modelOverride ?? null,
      metadata: {},
      hasTenantOverride: false,
    }
  }

  return {
    agentId,
    label: defaults.label,
    description: defaults.description,
    enabled: tenantOverride.enabled,
    instructionPromptId: tenantOverride.instruction_prompt_id,
    instructionVersion: tenantOverride.instruction_version,
    allowedTools:
      tenantOverride.allowed_tools.length > 0
        ? tenantOverride.allowed_tools
        : [...defaults.allowedTools],
    requiredPermissions:
      tenantOverride.required_permissions.length > 0
        ? tenantOverride.required_permissions
        : [...defaults.requiredPermissions],
    memoryPolicy: mergeMemoryPolicy(defaults.memoryPolicy, tenantOverride.memory_policy),
    modelOverride: tenantOverride.model_override ?? defaults.modelOverride ?? null,
    metadata: tenantOverride.metadata ?? {},
    hasTenantOverride: true,
  }
}

function mergeMemoryPolicy(
  defaults: AgentMemoryPolicy,
  override: Partial<AgentMemoryPolicy>
): AgentMemoryPolicy {
  return {
    scope: override.scope ?? defaults.scope,
    entityTypes: override.entityTypes ?? defaults.entityTypes,
    maxEntries: override.maxEntries ?? defaults.maxEntries,
    ttlHours: override.ttlHours ?? defaults.ttlHours,
  }
}

/** Public summary — never includes instruction content. */
export function toAgentConfigSummary(config: ResolvedAgentConfig) {
  return {
    agentId: config.agentId,
    label: config.label,
    description: config.description,
    enabled: config.enabled,
    allowedTools: config.allowedTools,
    requiredPermissions: config.requiredPermissions,
    memoryPolicy: config.memoryPolicy,
    modelOverride: config.modelOverride,
    instructionPromptId: config.instructionPromptId,
    instructionVersion: config.instructionVersion,
    hasTenantOverride: config.hasTenantOverride,
  }
}
