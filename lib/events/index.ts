export type {
  EventCategory,
  EventDeliveryStatus,
  EventCatalogEntry,
  EmitDomainEventInput,
  EmitApplicationEventInput,
  RecordIntegrationEventInput,
  DeadLetterItem,
} from '@/lib/events/types'

export {
  EVENT_CATALOG,
  EVENT_CATALOG_BY_TYPE,
  DOMAIN_EVENTS,
  APPLICATION_EVENTS,
  INTEGRATION_EVENTS,
  findCatalogEntry,
  isKnownEventType,
} from '@/lib/events/catalog'

export { IdempotencyKeys } from '@/lib/events/idempotency'

export { runEventDispatchWorker, runEventCompletionWorker } from '@/lib/events/workers/dispatch-worker'
export { runJobProcessorWorker } from '@/lib/events/workers/job-worker'

export { EventPlatformService } from '@/lib/services/event-platform.service'
