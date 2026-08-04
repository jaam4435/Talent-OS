import { createServices } from '@/lib/services/factory'
import type { AgentId } from '@/modules/agents/types'

export async function listAgents(tenantId: string) {
  const services = await createServices()
  return services.agent.listAgents(tenantId)
}

export async function getAgent(tenantId: string, agentId: AgentId) {
  const services = await createServices()
  return services.agent.getAgent(tenantId, agentId)
}

export async function getAgentSession(sessionId: string, tenantId: string) {
  const services = await createServices()
  return services.agent.getSession(sessionId, tenantId)
}

export async function getAgentConversationState(sessionId: string, tenantId: string) {
  const services = await createServices()
  return services.agent.getConversationState(sessionId, tenantId)
}
