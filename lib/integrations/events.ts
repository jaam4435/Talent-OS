import { createAdminRepositories } from '@/lib/repositories/factory'
import type { EmitDomainEventInput } from '@/lib/repositories/domain-event.repository'

export type EmitEventInput = EmitDomainEventInput

export async function emitEvent(input: EmitEventInput): Promise<string | null> {
  const repos = await createAdminRepositories()
  return repos.domainEvent.emit(input)
}

export async function markEventProcessing(eventId: string) {
  const repos = await createAdminRepositories()
  await repos.domainEvent.markProcessing(eventId)
}

export async function markEventDelivered(eventId: string) {
  const repos = await createAdminRepositories()
  await repos.domainEvent.markDelivered(eventId)
}

export async function markEventFailed(eventId: string, error: string) {
  const repos = await createAdminRepositories()
  await repos.domainEvent.markFailed(eventId, error)
}
