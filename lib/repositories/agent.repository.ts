import { BaseRepository } from '@/lib/repositories/base/base.repository'
import type {
  AgentConfigRow,
  AgentId,
  AgentMemoryPolicy,
  UpdateAgentConfigInput,
} from '@/modules/agents/types'
import type { Json } from '@/modules/core/types/database'
import { getAgentDefault } from '@/lib/ai/agent/registry'

function mapConfigRow(row: Record<string, unknown>): AgentConfigRow {
  return {
    id: row.id as string,
    tenant_id: row.tenant_id as string,
    agent_id: row.agent_id as AgentId,
    enabled: row.enabled as boolean,
    instruction_prompt_id: row.instruction_prompt_id as string,
    instruction_version: row.instruction_version as string | null,
    allowed_tools: (row.allowed_tools as string[]) ?? [],
    required_permissions: (row.required_permissions as string[]) ?? [],
    memory_policy: (row.memory_policy as AgentMemoryPolicy) ?? { scope: 'session', maxEntries: 50 },
    model_override: row.model_override as string | null,
    metadata: (row.metadata as Record<string, unknown>) ?? {},
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
  }
}

export class AgentConfigRepository extends BaseRepository {
  async findByAgent(tenantId: string, agentId: AgentId): Promise<AgentConfigRow | null> {
    const { data } = await this.ctx.supabase
      .from('agent_configs')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('agent_id', agentId)
      .maybeSingle()

    return data ? mapConfigRow(data) : null
  }

  async listByTenant(tenantId: string): Promise<AgentConfigRow[]> {
    const { data, error } = await this.ctx.supabase
      .from('agent_configs')
      .select('*')
      .eq('tenant_id', tenantId)

    this.throwIfError(error)
    return (data ?? []).map(mapConfigRow)
  }

  async upsert(tenantId: string, agentId: AgentId, input: UpdateAgentConfigInput): Promise<AgentConfigRow> {
    const defaults = getAgentDefault(agentId)
    const existing = await this.findByAgent(tenantId, agentId)

    const row = {
      tenant_id: tenantId,
      agent_id: agentId,
      enabled: input.enabled ?? existing?.enabled ?? true,
      instruction_prompt_id: existing?.instruction_prompt_id ?? defaults.instructionPromptId,
      instruction_version: existing?.instruction_version ?? defaults.instructionVersion,
      allowed_tools: input.allowedTools ?? existing?.allowed_tools ?? defaults.allowedTools,
      required_permissions:
        input.requiredPermissions ?? existing?.required_permissions ?? defaults.requiredPermissions,
      memory_policy: {
        ...(existing?.memory_policy ?? defaults.memoryPolicy),
        ...(input.memoryPolicy ?? {}),
      } as Json,
      model_override:
        input.modelOverride !== undefined
          ? input.modelOverride
          : (existing?.model_override ?? defaults.modelOverride ?? null),
      metadata: {
        ...(existing?.metadata ?? {}),
        ...(input.metadata ?? {}),
      } as Json,
    }

    const { data, error } = await this.ctx.supabase
      .from('agent_configs')
      .upsert(row, { onConflict: 'tenant_id,agent_id' })
      .select('*')
      .single()

    this.throwIfError(error)
    this.invalidateTable('agent_configs')
    return mapConfigRow(data!)
  }

  async resetToDefaults(tenantId: string, agentId: AgentId): Promise<void> {
    const { error } = await this.ctx.supabase
      .from('agent_configs')
      .delete()
      .eq('tenant_id', tenantId)
      .eq('agent_id', agentId)

    this.throwIfError(error)
    this.invalidateTable('agent_configs')
  }
}

export class AgentInstructionRepository extends BaseRepository {
  /** Load instruction content server-side only. */
  async getActiveInstruction(
    agentId: AgentId,
    tenantId?: string
  ): Promise<{ promptId: string; version: string; content: string } | null> {
    let query = this.ctx.supabase
      .from('agent_instruction_versions')
      .select('prompt_id, version, content')
      .eq('agent_id', agentId)
      .eq('active', true)

    if (tenantId) {
      query = query.or(`tenant_id.eq.${tenantId},tenant_id.is.null`)
    } else {
      query = query.is('tenant_id', null)
    }

    const { data } = await query.order('created_at', { ascending: false }).limit(1).maybeSingle()
    if (!data) return null

    return {
      promptId: data.prompt_id as string,
      version: data.version as string,
      content: data.content as string,
    }
  }
}
