import { withApiHandler } from '@/modules/core/api/handler'
import { AppError } from '@/modules/core/api/response'
import { createServices } from '@/lib/services/factory'
import { runAgentSchema } from '@/modules/agents/validation'
import type { AgentId } from '@/modules/agents/types'

export const POST = withApiHandler(
  {
    auth: 'manager',
    permissions: ['agent:run'],
    rateLimit: 'ai',
    validate: { body: runAgentSchema.omit({ agentId: true }) },
  },
  async ({ ctx, params, body }) => {
    const services = await createServices()
    const result = await services.agent.run(ctx.tenant!.id, ctx.userId!, ctx.tenant!.role, {
      ...(body as Record<string, unknown>),
      agentId: params!.agentId as AgentId,
    })
    if (!result.ok) throw new AppError('VALIDATION_ERROR', result.error, 400)
    return { payload: result.result }
  }
)
