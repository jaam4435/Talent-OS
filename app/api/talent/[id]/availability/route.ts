import { withApiHandler } from '@/modules/core/api/handler'
import { AppError } from '@/modules/core/api/response'
import { createServices } from '@/lib/services/factory'
import {
  availabilityCalendarQuerySchema,
  createAvailabilitySlotSchema,
  updateAvailabilitySlotSchema,
} from '@/modules/talent/validation'

export const GET = withApiHandler(
  {
    auth: 'manager',
    permissions: ['talent:read'],
    rateLimit: 'default',
    validate: { query: availabilityCalendarQuerySchema.partial() },
  },
  async ({ ctx, params, searchParams }) => {
    const services = await createServices()
    const from = searchParams.get('from') ?? undefined
    const to = searchParams.get('to') ?? undefined
    const range = from && to ? { from, to } : undefined
    const data = await services.talentModule.listAvailability(ctx.tenant!.id, params!.id, range)
    return { payload: data }
  }
)

export const POST = withApiHandler(
  {
    auth: 'manager',
    permissions: ['talent:manage'],
    rateLimit: 'default',
    validate: { body: createAvailabilitySlotSchema },
  },
  async ({ ctx, params, body }) => {
    const services = await createServices()
    const result = await services.talentModule.addAvailabilitySlot(
      ctx.tenant!.id,
      ctx.userId!,
      params!.id,
      body as Record<string, unknown>
    )
    if (!result.ok) throw new AppError('NOT_FOUND', result.error, 404)
    return { payload: result.slot }
  }
)

export const PATCH = withApiHandler(
  {
    auth: 'manager',
    permissions: ['talent:manage'],
    rateLimit: 'default',
    validate: { body: updateAvailabilitySlotSchema },
  },
  async ({ ctx, params, body, searchParams }) => {
    const slotId = searchParams.get('slot_id')
    if (!slotId) throw new AppError('VALIDATION_ERROR', 'slot_id query param required', 400)

    const services = await createServices()
    const result = await services.talentModule.updateAvailabilitySlot(
      ctx.tenant!.id,
      ctx.userId!,
      params!.id,
      slotId,
      body as Record<string, unknown>
    )
    if (!result.ok) throw new AppError('NOT_FOUND', result.error, 404)
    return { payload: result.slot }
  }
)

export const DELETE = withApiHandler(
  { auth: 'manager', permissions: ['talent:manage'], rateLimit: 'default' },
  async ({ ctx, params, searchParams }) => {
    const slotId = searchParams.get('slot_id')
    if (!slotId) throw new AppError('VALIDATION_ERROR', 'slot_id query param required', 400)

    const services = await createServices()
    const result = await services.talentModule.deleteAvailabilitySlot(
      ctx.tenant!.id,
      ctx.userId!,
      params!.id,
      slotId
    )
    if (!result.ok) throw new AppError('NOT_FOUND', result.error, 404)
    return { payload: { deleted: true } }
  }
)
