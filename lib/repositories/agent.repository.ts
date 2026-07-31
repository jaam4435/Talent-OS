import { BaseRepository } from '@/lib/repositories/base/base.repository'
import type {
  AgentConfigRow,
  AgentId,
  AgentMemoryPolicy,
  AgentReasoningPolicy,
  AgentConversationPolicy,
  UpdateAgentConfigInput,
} from '@/modules/agents/types'
import type { Json } from '@/modules/core/types/database'
import { getAgentDefault } from '@/lib/ai/agent/registry'

function mapConfigRow(row: Record<string, unknown>): AgentConfigRow {
  const defaults = getAgentDefault(row.agent_id as AgentId)
  const reasoningRaw = row.reasoning_policy as Partial<AgentReasoningPolicy> | undefined
  const conversationRaw = row.conversation_policy as Partial<AgentConversationPolicy> | undefined

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
    reasoning_policy: {
      maxSteps: reasoningRaw?.maxSteps ?? defaults.reasoningPolicy.maxSteps,
      toolUseEnabled: reasoningRaw?.toolUseEnabled ?? defaults.reasoningPolicy.toolUseEnabled,
      temperature: reasoningRaw?.temperature ?? defaults.reasoningPolicy.temperature,
      maxTokens: reasoningRaw?.maxTokens ?? defaults.reasoningPolicy.maxTokens,
    },
    conversation_policy: {
      maxHistoryMessages:
        conversationRaw?.maxHistoryMessages ?? defaults.conversationPolicy.maxHistoryMessages,
      persistToolResults:
        conversationRaw?.persistToolResults ?? defaults.conversationPolicy.persistToolResults,
      autoSummarize: conversationRaw?.autoSummarize ?? defaults.conversationPolicy.autoSummarize,
    },
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
      reasoning_policy: {
        ...(existing?.reasoning_policy ?? defaults.reasoningPolicy),
        ...(input.reasoningPolicy ?? {}),
      } as Json,
      conversation_policy: {
        ...(existing?.conversation_policy ?? defaults.conversationPolicy),
        ...(input.conversationPolicy ?? {}),
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

  /** Publish a new instruction version — server-side only, never exposed in UI. */
  async publish(params: {
    tenantId: string | null
    agentId: AgentId
    promptId: string
    version: string
    content: string
    createdBy?: string
  }): Promise<string> {
    if (params.tenantId) {
      await this.ctx.supabase
        .from('agent_instruction_versions')
        .update({ active: false } as never)
        .eq('agent_id', params.agentId)
        .eq('tenant_id', params.tenantId)
    } else {
      await this.ctx.supabase
        .from('agent_instruction_versions')
        .update({ active: false } as never)
        .eq('agent_id', params.agentId)
        .is('tenant_id', null)
    }

    const { data, error } = await this.ctx.supabase
      .from('agent_instruction_versions')
      .insert({
        tenant_id: params.tenantId,
        agent_id: params.agentId,
        prompt_id: params.promptId,
        version: params.version,
        content: params.content,
        active: true,
        created_by: params.createdBy ?? null,
      })
      .select('id')
      .single()

    this.throwIfError(error)
    if (!data?.id) this.notFound('Agent instruction version')
    return data.id
  }
}
