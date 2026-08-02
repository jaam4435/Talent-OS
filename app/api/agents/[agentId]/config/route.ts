import { withApiHandler } from '@/modules/core/api/handler'
import { AppError } from '@/modules/core/api/response'
import { createServices } from '@/lib/services/factory'
import { updateAgentConfigSchema } from '@/modules/agents/validation'
import type { AgentId } from '@/modules/agents/types'

export const GET = withApiHandler(
  { auth: 'manager', permissions: ['agent:configure'], rateLimit: 'default' },
  async ({ ctx, params }) => {
    const services = await createServices()
    const agent = await services.agent.getAgent(ctx.tenant!.id, params!.agentId as AgentId)
    if (!agent) throw new AppError('NOT_FOUND', 'Agent not found', 404)
    return { payload: agent }
  }
)

export const PATCH = withApiHandler(
  {
    auth: 'admin',
    permissions: ['agent:configure'],
    rateLimit: 'default',
    validate: { body: updateAgentConfigSchema },
  },
  async ({ ctx, params, body }) => {
    const services = await createServices()
    const result = await services.agent.updateAgentConfig(
      ctx.tenant!.id,
      params!.agentId as AgentId,
      body as never
    )
    if (!result.ok) throw new AppError('VALIDATION_ERROR', result.error, 400)
    const agent = await services.agent.getAgent(ctx.tenant!.id, params!.agentId as AgentId)
    return { payload: agent }
  }
)
