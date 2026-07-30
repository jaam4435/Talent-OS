import type { Repositories } from '@/lib/repositories/factory'
import type { CreateNotificationInput } from '@/lib/repositories/notification.repository'
import type { NotificationRow } from '@/lib/repositories/notification.repository'

export class NotificationService {
  constructor(private readonly repos: Repositories) {}

  async create(input: CreateNotificationInput): Promise<void> {
    await this.repos.notification.create(input)
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
}
