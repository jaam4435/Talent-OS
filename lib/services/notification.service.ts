import type { Repositories } from '@/lib/repositories/factory'
import type { CreateNotificationInput } from '@/lib/repositories/notification.repository'
import type { NotificationRow } from '@/lib/repositories/notification.repository'
import { NotificationsEvents } from '@/modules/notifications/events'
import { IdempotencyKeys } from '@/lib/events/idempotency'
import type { EventPlatformService } from '@/lib/services/event-platform.service'

export class NotificationService {
  constructor(
    private readonly repos: Repositories,
    private readonly eventPlatform?: EventPlatformService
  ) {}

  async create(input: CreateNotificationInput): Promise<void> {
    await this.repos.notification.create(input)

    if (this.eventPlatform) {
      await this.eventPlatform.emitApplicationEvent({
        tenantId: input.tenant_id,
        eventType: NotificationsEvents.NOTIFICATION_CREATED,
        aggregateType: 'notification',
        aggregateId: input.user_id,
        idempotencyKey: IdempotencyKeys.notification(input.user_id, input.type, input.title),
        applicationScope: 'notifications',
        payload: {
          user_id: input.user_id,
          type: input.type,
          title: input.title,
        },
      })
    }
  }

  async createMany(inputs: CreateNotificationInput[]): Promise<void> {
    await this.repos.notification.createMany(inputs)
  }

  async listByUser(userId: string, tenantId: string, unreadOnly = false): Promise<NotificationRow[]> {
    return this.repos.notification.listByUser(userId, tenantId, unreadOnly)
  }

  async markRead(notificationId: string, userId: string): Promise<void> {
    await this.repos.notification.markRead(notificationId, userId)
  }

  async getById(notificationId: string, userId: string, tenantId: string) {
    return this.repos.notification.findById(notificationId, userId, tenantId)
  }

  async markAllRead(userId: string, tenantId: string) {
    const count = await this.repos.notification.markAllRead(userId, tenantId)
    return { marked: count }
  }

  getRealtimeConfig(tenantId: string, userId: string) {
    return {
      channel: `notifications:${tenantId}:${userId}`,
      event: 'notification',
      tenant_id: tenantId,
      user_id: userId,
    }
  }
}
