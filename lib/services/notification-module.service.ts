import type { Repositories } from '@/lib/repositories/factory'
import type { CreateNotificationInput } from '@/lib/repositories/notification.repository'
import type { PaginatedResult } from '@/lib/repositories/base/types'
import type {
  NotificationCategory,
  NotificationChannel,
  NotificationItem,
  NotificationListMeta,
  NotificationPreference,
} from '@/modules/notifications/types'
import { resolveNotificationCategory } from '@/modules/notifications/types'
import { instrumentNotification } from '@/lib/observability/instrumentation'

export class NotificationModuleService {
  constructor(private readonly repos: Repositories) {}

  async listNotifications(
    tenantId: string,
    userId: string,
    options?: { page?: number; limit?: number; unreadOnly?: boolean }
  ): Promise<PaginatedResult<NotificationItem> & { unreadCount: number }> {
    const [result, unreadCount] = await Promise.all([
      this.repos.notification.listByUser(userId, tenantId, {
        page: options?.page,
        limit: options?.limit,
        unreadOnly: options?.unreadOnly,
      }),
      this.repos.notification.countUnread(userId, tenantId),
    ])

    return { ...result, unreadCount }
  }

  async getUnreadCount(tenantId: string, userId: string): Promise<number> {
    return this.repos.notification.countUnread(userId, tenantId)
  }

  async markRead(
    tenantId: string,
    userId: string,
    notificationId: string
  ): Promise<{ ok: true } | { ok: false; error: string }> {
    const updated = await this.repos.notification.markRead(notificationId, userId, tenantId)
    if (!updated) return { ok: false, error: 'Notification not found' }
    return { ok: true }
  }

  async markAllRead(tenantId: string, userId: string): Promise<{ updated: number }> {
    const updated = await this.repos.notification.markAllRead(userId, tenantId)
    return { updated }
  }

  async getPreferences(tenantId: string, userId: string): Promise<NotificationPreference[]> {
    return this.repos.notification.listPreferences(tenantId, userId)
  }

  async updatePreferences(
    tenantId: string,
    userId: string,
    updates: Array<{ category: NotificationCategory; channel: NotificationChannel; enabled: boolean }>
  ): Promise<NotificationPreference[]> {
    return this.repos.notification.updatePreferences(tenantId, userId, updates)
  }

  async create(input: CreateNotificationInput): Promise<{ created: boolean; skipped?: boolean }> {
    const category = resolveNotificationCategory(input.type)
    const enabled = await this.repos.notification.isPreferenceEnabled(
      input.tenant_id,
      input.user_id,
      category,
      'in_app'
    )

    if (!enabled) {
      return { created: false, skipped: true }
    }

    await this.repos.notification.create(input)
    instrumentNotification({
      channel: 'in_app',
      status: 'sent',
      context: { tenantId: input.tenant_id, category },
    })
    return { created: true }
  }

  async createMany(inputs: CreateNotificationInput[]): Promise<{ created: number; skipped: number }> {
    let created = 0
    let skipped = 0
    for (const input of inputs) {
      const result = await this.create(input)
      if (result.created) created += 1
      else skipped += 1
    }
    return { created, skipped }
  }

  buildListMeta(result: PaginatedResult<NotificationItem>, unreadCount: number): NotificationListMeta {
    return {
      page: result.page,
      limit: result.limit,
      total: result.total,
      hasMore: result.hasMore,
      unreadCount,
    }
  }
}
