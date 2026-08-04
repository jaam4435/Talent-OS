import type { PlatformEventType } from '@/modules/platform/types'

export const PLATFORM_EVENTS = {
  PRODUCT_REGISTERED: 'platform.product.registered',
  FEATURE_FLAG_CHANGED: 'platform.feature_flag.changed',
  CONFIG_UPDATED: 'platform.config.updated',
  CONTEXT_RESOLVED: 'platform.context.resolved',
} as const satisfies Record<string, PlatformEventType>

export const AI_EVENTS = {
  REQUEST_STARTED: 'ai.request.started',
  REQUEST_COMPLETED: 'ai.request.completed',
  REQUEST_FAILED: 'ai.request.failed',
  BUDGET_THRESHOLD: 'ai.budget.threshold',
} as const satisfies Record<string, PlatformEventType>

export const PLATFORM_EVENT_CATALOG = {
  ...PLATFORM_EVENTS,
  ...AI_EVENTS,
} as const

export type CatalogEventType =
  (typeof PLATFORM_EVENT_CATALOG)[keyof typeof PLATFORM_EVENT_CATALOG]

export function isCatalogEventType(eventType: string): eventType is CatalogEventType {
  return Object.values(PLATFORM_EVENT_CATALOG).includes(eventType as CatalogEventType)
}
