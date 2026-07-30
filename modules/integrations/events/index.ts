/** Canonical integrations domain event type strings. */
export const IntegrationsEvents = {
  WEBHOOK_RECEIVED: 'integration.webhook_received',
} as const

export type IntegrationsEventType = (typeof IntegrationsEvents)[keyof typeof IntegrationsEvents]
