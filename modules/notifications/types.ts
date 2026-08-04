export const NOTIFICATION_CHANNELS = ['in_app'] as const
export type NotificationChannel = (typeof NOTIFICATION_CHANNELS)[number]

export const NOTIFICATION_CATEGORIES = [
  'opportunity',
  'project',
  'milestone',
  'payment',
  'system',
] as const
export type NotificationCategory = (typeof NOTIFICATION_CATEGORIES)[number]

export interface NotificationItem {
  id: string
  userId: string
  tenantId: string
  type: string
  category: NotificationCategory
  title: string
  body: string | null
  data: Record<string, unknown>
  readAt: string | null
  createdAt: string
}

export interface NotificationPreference {
  id: string
  category: NotificationCategory
  channel: NotificationChannel
  enabled: boolean
  updatedAt: string
}

export interface NotificationListMeta {
  page: number
  limit: number
  total: number
  hasMore: boolean
  unreadCount: number
}

const TYPE_CATEGORY_MAP: Record<string, NotificationCategory> = {
  opportunity_broadcast: 'opportunity',
  opportunity_response: 'opportunity',
  project_assigned: 'project',
  milestone_submitted: 'milestone',
  milestone_approved: 'milestone',
  milestone_revision: 'milestone',
  payment_pending: 'payment',
  payment_approved: 'payment',
  payment_paid: 'payment',
  system: 'system',
}

export function resolveNotificationCategory(type: string): NotificationCategory {
  return TYPE_CATEGORY_MAP[type] ?? 'system'
}

export const DEFAULT_NOTIFICATION_PREFERENCES: Array<{
  category: NotificationCategory
  channel: NotificationChannel
  enabled: boolean
}> = NOTIFICATION_CATEGORIES.flatMap((category) =>
  NOTIFICATION_CHANNELS.map((channel) => ({ category, channel, enabled: true }))
)
