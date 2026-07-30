'use server'

import { revalidatePath } from 'next/cache'
import { createServices } from '@/lib/services/factory'
import { requireManager } from '@/modules/core/services/guards'
import { requirePermission } from '@/modules/core/services/permissions'
import type { AgentId, UpdateAgentConfigInput, WriteAgentMemoryInput } from '@/modules/agents/types'
import { createAgentSessionSchema } from '@/modules/agents/validation'

/** Update agent config — tools, memory, permissions. No instruction content. */
export async function updateAgentConfig(agentId: AgentId, input: UpdateAgentConfigInput) {
  const { tenant } = await requireManager()
  requirePermission(tenant.role, 'agent:configure')

  const services = await createServices()
  const result = await services.agent.updateAgentConfig(tenant.id, agentId, input)

  if (result.ok) {
    revalidatePath('/settings/agents')
  }

  return result
}

export async function resetAgentConfig(agentId: AgentId) {
  const { tenant } = await requireManager()
  requirePermission(tenant.role, 'agent:configure')

  const services = await createServices()
  const result = await services.agent.resetAgentConfig(tenant.id, agentId)

  if (result.ok) {
    revalidatePath('/settings/agents')
  }

  return result
}

export async function createAgentSession(input: {
  agentId: AgentId
  entityType?: string
  entityId?: string
  correlationId?: string
}) {
  const { tenant, user } = await requireManager()
  requirePermission(tenant.role, 'agent:run')

  const parsed = createAgentSessionSchema.safeParse({ ...input, userId: user.id })
  if (!parsed.success) {
    return { ok: false as const, error: parsed.error.errors[0]?.message ?? 'Invalid input' }
  }

  const services = await createServices()
  return services.agent.createSession(tenant.id, parsed.data)
}

/** Prepare agent run context — instructions resolved server-side, never returned to client. */
export async function prepareAgentRun(input: {
  agentId: AgentId
  sessionId?: string
  entityType?: string
  entityId?: string
  correlationId?: string
}) {
  const { tenant, user } = await requireManager()
  requirePermission(tenant.role, 'agent:run')

  const services = await createServices()
  const result = await services.agent.prepareRun(tenant.id, user.id, tenant.role, input)

  if (!result.ok) return result

  // Strip instruction content — only expose metadata safe for orchestration layer
  return {
    ok: true as const,
    context: {
      agentId: result.context.agentId,
      sessionId: result.context.sessionId,
      tools: result.context.tools,
      memory: result.context.memory.map((m: {
        id: string
        scope: string
        memory_key: string
        content: string
        entity_type: string | null
        entity_id: string | null
      }) => ({
        id: m.id,
        scope: m.scope,
        memoryKey: m.memory_key,
        content: m.content,
        entityType: m.entity_type,
        entityId: m.entity_id,
      })),
      permissions: result.context.permissions,
      correlationId: result.context.correlationId,
      instructions: result.context.instructions,
    },
  }
}

export async function writeAgentMemory(input: WriteAgentMemoryInput) {
  const { tenant } = await requireManager()
  requirePermission(tenant.role, 'agent:run')

  const services = await createServices()
  return services.agent.writeMemory(tenant.id, input)
}

export async function clearAgentMemory(
  agentId: AgentId,
  options?: { sessionId?: string; entityType?: string; entityId?: string }
) {
  const { tenant } = await requireManager()
  requirePermission(tenant.role, 'agent:configure')

  const services = await createServices()
  return services.agent.clearMemory(tenant.id, agentId, options)
}
