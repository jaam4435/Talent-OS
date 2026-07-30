'use server'

import { revalidatePath } from 'next/cache'
import { createServices } from '@/lib/services/factory'
import { requireManager } from '@/modules/core/services/guards'
import { requirePermission } from '@/modules/core/services/permissions'
import type { AgentId, UpdateAgentConfigInput, WriteAgentMemoryInput } from '@/modules/agents/types'
import { createAgentSessionSchema } from '@/modules/agents/validation'

/** Update agent config — tools, memory, permissions, reasoning, conversation. No instruction content. */
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

  return {
    ok: true as const,
    context: {
      agentId: result.context.agentId,
      sessionId: result.context.sessionId,
      tools: result.context.tools.map(({ name, title, description, destructive, requiredPermission }) => ({
        name,
        title,
        description,
        destructive,
        requiredPermission,
      })),
      memory: result.context.memory.map((m) => ({
        id: m.id,
        scope: m.scope,
        memoryKey: m.memory_key,
        content: m.content,
        entityType: m.entity_type,
        entityId: m.entity_id,
      })),
      permissions: result.context.permissions,
      reasoningPolicy: result.context.reasoningPolicy,
      conversationPolicy: result.context.conversationPolicy,
      correlationId: result.context.correlationId,
      instructions: {
        promptId: result.context.instructions.promptId,
        version: result.context.instructions.version,
        promptHash: result.context.instructions.promptHash,
      },
    },
  }
}

/** Execute an agent with a user message — full reasoning loop with tool use. */
export async function runAgent(input: {
  agentId: AgentId
  message: string
  sessionId?: string
  entityType?: string
  entityId?: string
  correlationId?: string
}) {
  const { tenant, user } = await requireManager()
  requirePermission(tenant.role, 'agent:run')

  const services = await createServices()
  return services.agent.run(tenant.id, user.id, tenant.role, input)
}

export async function getAgentConversationState(sessionId: string) {
  const { tenant } = await requireManager()
  requirePermission(tenant.role, 'agent:run')

  const services = await createServices()
  return services.agent.getConversationState(sessionId, tenant.id)
}

/** Publish tenant instruction override — server-side only, never exposed in UI. */
export async function publishAgentInstruction(input: {
  agentId: AgentId
  promptId: string
  version: string
  content: string
}) {
  const { tenant, user } = await requireManager()
  requirePermission(tenant.role, 'agent:configure')

  const services = await createServices()
  return services.agent.publishInstruction(tenant.id, user.id, input)
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
