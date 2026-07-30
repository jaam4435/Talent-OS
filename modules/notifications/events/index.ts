/** Canonical notifications domain event type strings. */
export const NotificationsEvents = {
  NOTIFICATION_CREATED: 'notification.created',
} as const

export type NotificationsEventType = (typeof NotificationsEvents)[keyof typeof NotificationsEvents]
