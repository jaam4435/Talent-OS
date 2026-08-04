import { BaseRepository } from '@/lib/repositories/base/base.repository'
import type { PaginatedResult } from '@/lib/repositories/base/types'
import { toPaginatedResult } from '@/lib/repositories/base/types'
import type { Json } from '@/modules/core/types/database'
import type {
  NotificationCategory,
  NotificationChannel,
  NotificationItem,
  NotificationPreference,
} from '@/modules/notifications/types'
import { resolveNotificationCategory } from '@/modules/notifications/types'
import type { NotificationRow } from '@/lib/repositories/notification.repository'

export type { NotificationRow, CreateNotificationInput } from '@/lib/repositories/notification.repository'

function mapNotificationRow(row: NotificationRow): NotificationItem {
  return {
    id: row.id,
    userId: row.user_id,
    tenantId: row.tenant_id,
    type: row.type,
    category: resolveNotificationCategory(row.type),
    title: row.title,
    body: row.body,
    data: (row.data as Record<string, unknown>) ?? {},
    readAt: row.read_at,
    createdAt: row.created_at,
  }
}

export class NotificationRepository extends BaseRepository {
  async create(input: import('@/lib/repositories/notification.repository').CreateNotificationInput): Promise<void> {
    const { error } = await this.ctx.supabase.from('notifications').insert({
      ...input,
      data: (input.data ?? {}) as Json,
    })
    this.throwIfError(error)
  }

  async createMany(inputs: import('@/lib/repositories/notification.repository').CreateNotificationInput[]): Promise<void> {
    if (!inputs.length) return
    const { error } = await this.ctx.supabase.from('notifications').insert(
      inputs.map((n) => ({ ...n, data: (n.data ?? {}) as Json }))
    )
    this.throwIfError(error)
  }

  async findByIdForUser(notificationId: string, userId: string): Promise<NotificationRow | null> {
    const { data, error } = await this.ctx.supabase
      .from('notifications')
      .select('*')
      .eq('id', notificationId)
      .eq('user_id', userId)
      .maybeSingle()
    this.throwIfError(error)
    return data ?? null
  }

  async markRead(notificationId: string, userId: string, tenantId: string): Promise<boolean> {
    const { data, error } = await this.ctx.supabase
      .from('notifications')
      .update({ read_at: new Date().toISOString() })
      .eq('id', notificationId)
      .eq('user_id', userId)
      .eq('tenant_id', tenantId)
      .select('id')
      .maybeSingle()
    this.throwIfError(error)
    return data != null
  }

  async markAllRead(userId: string, tenantId: string): Promise<number> {
    const { data, error } = await this.ctx.supabase
      .from('notifications')
      .update({ read_at: new Date().toISOString() })
      .eq('user_id', userId)
      .eq('tenant_id', tenantId)
      .is('read_at', null)
      .select('id')
    this.throwIfError(error)
    return data?.length ?? 0
  }

  async countUnread(userId: string, tenantId: string): Promise<number> {
    const { count, error } = await this.ctx.supabase
      .from('notifications')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('tenant_id', tenantId)
      .is('read_at', null)
    this.throwIfError(error)
    return count ?? 0
  }

  async listByUser(
    userId: string,
    tenantId: string,
    options?: { unreadOnly?: boolean; page?: number; limit?: number }
  ): Promise<PaginatedResult<NotificationItem>> {
    const { limit, offset, page } = this.paginate(options)

    let query = this.ctx.supabase
      .from('notifications')
      .select('*', { count: 'exact' })
      .eq('user_id', userId)
      .eq('tenant_id', tenantId)

    if (options?.unreadOnly) query = query.is('read_at', null)

    const { data, count, error } = await query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    this.throwIfError(error)
    return toPaginatedResult((data ?? []).map((row) => mapNotificationRow(row as NotificationRow)), { limit, page }, count ?? undefined)
  }

  async listByUserLegacy(userId: string, tenantId: string, unreadOnly = false): Promise<NotificationRow[]> {
    const result = await this.listByUser(userId, tenantId, { unreadOnly, limit: 50 })
    return result.data.map((item) => ({
      id: item.id,
      tenant_id: item.tenantId,
      user_id: item.userId,
      type: item.type,
      title: item.title,
      body: item.body,
      data: item.data as Json,
      read_at: item.readAt,
      created_at: item.createdAt,
    }))
  }

  async isPreferenceEnabled(
    tenantId: string,
    userId: string,
    category: NotificationCategory,
    channel: NotificationChannel = 'in_app'
  ): Promise<boolean> {
    const { data, error } = await this.ctx.supabase
      .from('notification_preferences')
      .select('enabled')
      .eq('tenant_id', tenantId)
      .eq('user_id', userId)
      .eq('category', category)
      .eq('channel', channel)
      .maybeSingle()
    this.throwIfError(error)
    return data?.enabled ?? true
  }

  async ensureDefaultPreferences(tenantId: string, userId: string): Promise<void> {
    const { data, error } = await this.ctx.supabase
      .from('notification_preferences')
      .select('category, channel')
      .eq('tenant_id', tenantId)
      .eq('user_id', userId)
    this.throwIfError(error)

    const existing = new Set((data ?? []).map((row) => `${row.category}:${row.channel}`))
    const defaults = [
      { category: 'opportunity', channel: 'in_app' },
      { category: 'project', channel: 'in_app' },
      { category: 'milestone', channel: 'in_app' },
      { category: 'payment', channel: 'in_app' },
      { category: 'system', channel: 'in_app' },
    ] as const

    const missing = defaults.filter((row) => !existing.has(`${row.category}:${row.channel}`))
    if (!missing.length) return

    const { error: insertError } = await this.ctx.supabase.from('notification_preferences').insert(
      missing.map((row) => ({
        tenant_id: tenantId,
        user_id: userId,
        category: row.category,
        channel: row.channel,
        enabled: true,
      }))
    )
    this.throwIfError(insertError)
  }

  async listPreferences(tenantId: string, userId: string): Promise<NotificationPreference[]> {
    await this.ensureDefaultPreferences(tenantId, userId)
    const { data, error } = await this.ctx.supabase
      .from('notification_preferences')
      .select('id, category, channel, enabled, updated_at')
      .eq('tenant_id', tenantId)
      .eq('user_id', userId)
      .order('category', { ascending: true })
    this.throwIfError(error)

    return (data ?? []).map((row) => ({
      id: row.id,
      category: row.category as NotificationCategory,
      channel: row.channel as NotificationChannel,
      enabled: row.enabled,
      updatedAt: row.updated_at,
    }))
  }

  async updatePreferences(
    tenantId: string,
    userId: string,
    updates: Array<{ category: NotificationCategory; channel: NotificationChannel; enabled: boolean }>
  ): Promise<NotificationPreference[]> {
    await this.ensureDefaultPreferences(tenantId, userId)

    for (const update of updates) {
      const { error } = await this.ctx.supabase
        .from('notification_preferences')
        .update({ enabled: update.enabled })
        .eq('tenant_id', tenantId)
        .eq('user_id', userId)
        .eq('category', update.category)
        .eq('channel', update.channel)
      this.throwIfError(error)
    }

    return this.listPreferences(tenantId, userId)
  }
}
