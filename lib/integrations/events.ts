import { createAdminServices } from '@/lib/services/factory'
import type { EmitEventInput } from '@/lib/services/workflow.service'

export type { EmitEventInput }

export async function emitEvent(input: EmitEventInput): Promise<string | null> {
  const services = await createAdminServices()
  return services.workflow.emitEvent(input)
}

export async function markEventProcessing(eventId: string) {
  const services = await createAdminServices()
  await services.workflow.markEventProcessing(eventId)
}

export async function markEventDelivered(eventId: string) {
  const services = await createAdminServices()
  await services.workflow.markEventDelivered(eventId)
}

export async function markEventFailed(eventId: string, error: string) {
  const services = await createAdminServices()
  await services.workflow.markEventFailed(eventId, error)
}
