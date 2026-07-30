import { BaseRepository } from '@/lib/repositories/base/base.repository'
import type { Tables, Json } from '@/modules/core/types/database'

export type NotificationRow = Tables<'notifications'>

export interface CreateNotificationInput {
  tenant_id: string
  user_id: string
  type: string
  title: string
  body?: string | null
  data?: Record<string, unknown>
}

export class NotificationRepository extends BaseRepository {
  async create(input: CreateNotificationInput): Promise<void> {
    const { error } = await this.ctx.supabase.from('notifications').insert({
      ...input,
      data: (input.data ?? {}) as Json,
    })
    this.throwIfError(error)
  }

  async createMany(inputs: CreateNotificationInput[]): Promise<void> {
    if (!inputs.length) return
    const { error } = await this.ctx.supabase.from('notifications').insert(
      inputs.map((n) => ({ ...n, data: (n.data ?? {}) as Json }))
    )
    this.throwIfError(error)
  }

  async markRead(notificationId: string, userId: string): Promise<void> {
    const { error } = await this.ctx.supabase
      .from('notifications')
      .update({ read_at: new Date().toISOString() })
      .eq('id', notificationId)
      .eq('user_id', userId)
    this.throwIfError(error)
  }

  async listByUser(userId: string, tenantId: string, unreadOnly = false): Promise<NotificationRow[]> {
    let query = this.ctx.supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false })
      .limit(50)

    if (unreadOnly) query = query.is('read_at', null)

    const { data, error } = await query
    this.throwIfError(error)
    return data ?? []
  }
}
