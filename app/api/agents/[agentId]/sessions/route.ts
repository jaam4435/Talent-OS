import { withApiHandler } from '@/modules/core/api/handler'
import { AppError } from '@/modules/core/api/response'
import { createServices } from '@/lib/services/factory'
import { createAgentSessionSchema } from '@/modules/agents/validation'
import type { AgentId } from '@/modules/agents/types'

export const POST = withApiHandler(
  {
    auth: 'manager',
    permissions: ['agent:run'],
    rateLimit: 'ai',
    validate: { body: createAgentSessionSchema.omit({ agentId: true }) },
  },
  async ({ ctx, params, body }) => {
    const services = await createServices()
    const result = await services.agent.createSession(ctx.tenant!.id, {
      ...(body as Record<string, unknown>),
      agentId: params!.agentId as AgentId,
      userId: ctx.userId!,
    })
    if (!result.ok) throw new AppError('VALIDATION_ERROR', result.error, 400)
    return { payload: { sessionId: result.sessionId } }
  }
)
