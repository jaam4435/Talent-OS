import type { Repositories } from '@/lib/repositories/factory'
import type { CreateNotificationInput } from '@/lib/repositories/notification.repository'
import type { NotificationRow } from '@/lib/repositories/notification.repository'
import { instrumentNotification } from '@/lib/observability/instrumentation'

export class NotificationService {
  constructor(private readonly repos: Repositories) {}

  async create(input: CreateNotificationInput): Promise<void> {
    await this.repos.notification.create(input)
    instrumentNotification({
      channel: 'in_app',
      status: 'sent',
      context: { tenantId: input.tenant_id },
    })
  }

  async createMany(inputs: CreateNotificationInput[]): Promise<void> {
    await this.repos.notification.createMany(inputs)
    for (const input of inputs) {
      instrumentNotification({
        channel: 'in_app',
        status: 'sent',
        context: { tenantId: input.tenant_id },
      })
    }
  }

  async listByUser(userId: string, tenantId: string, unreadOnly = false): Promise<NotificationRow[]> {
    return this.repos.notification.listByUser(userId, tenantId, unreadOnly)
  }

  async markRead(notificationId: string, userId: string): Promise<void> {
    await this.repos.notification.markRead(notificationId, userId)
  }
}
