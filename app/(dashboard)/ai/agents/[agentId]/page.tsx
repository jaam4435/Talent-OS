import { notFound } from 'next/navigation'
import { createServices } from '@/lib/services/factory'
import { requireManager } from '@/modules/core/services/guards'
import { AgentChatPanel } from '@/modules/agents/components/agent-chat-panel'
import { isValidAgentId } from '@/lib/ai/agent'
import type { AgentId } from '@/modules/agents/types'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ agentId: string }>
}) {
  const { agentId } = await params
  return { title: `Agent · ${agentId.replace(/_/g, ' ')}` }
}

export default async function AgentSessionPage({
  params,
}: {
  params: Promise<{ agentId: string }>
}) {
  const { agentId } = await params
  if (!isValidAgentId(agentId)) notFound()

  const { tenant } = await requireManager()
  const services = await createServices()
  const agent = await services.agent.getAgent(tenant.id, agentId as AgentId)
  if (!agent || !agent.enabled) notFound()

  return (
    <AgentChatPanel agentId={agent.agentId} agentLabel={agent.label} />
  )
}
