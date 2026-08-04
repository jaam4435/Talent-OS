import type { Repositories } from '@/lib/repositories/factory'
import type { CreateNotificationInput } from '@/lib/repositories/notification.repository'
import type { NotificationRow } from '@/lib/repositories/notification.repository'
import type { NotificationModuleService } from '@/lib/services/notification-module.service'

export class NotificationService {
  constructor(
    private readonly repos: Repositories,
    private readonly module: NotificationModuleService
  ) {}

  async create(input: CreateNotificationInput): Promise<void> {
    await this.module.create(input)
  }

  async createMany(inputs: CreateNotificationInput[]): Promise<void> {
    await this.module.createMany(inputs)
  }

  async listByUser(userId: string, tenantId: string, unreadOnly = false): Promise<NotificationRow[]> {
    return this.repos.notification.listByUserLegacy(userId, tenantId, unreadOnly)
  }

  async markRead(notificationId: string, userId: string): Promise<void> {
    const row = await this.repos.notification.findByIdForUser(notificationId, userId)
    if (!row) return
    await this.module.markRead(row.tenant_id, userId, notificationId)
  }
}
