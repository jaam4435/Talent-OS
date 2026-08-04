import { describe, expect, it, vi } from 'vitest'
import { NotificationModuleService } from '@/lib/services/notification-module.service'

function createModuleService(options?: { preferenceEnabled?: boolean }) {
  const rows = [
    {
      id: 'n-1',
      userId: 'user-1',
      tenantId: 'tenant-1',
      type: 'system',
      category: 'system' as const,
      title: 'Hello',
      body: 'World',
      data: {},
      readAt: null,
      createdAt: '2026-08-02T10:00:00.000Z',
    },
  ]

  const repos = {
    notification: {
      listByUser: vi.fn(async () => ({
        data: rows,
        page: 1,
        limit: 20,
        total: 1,
        hasMore: false,
      })),
      countUnread: vi.fn(async () => 1),
      markRead: vi.fn(async () => true),
      markAllRead: vi.fn(async () => 2),
      create: vi.fn(async () => undefined),
      isPreferenceEnabled: vi.fn(async () => options?.preferenceEnabled ?? true),
      listPreferences: vi.fn(async () => []),
      updatePreferences: vi.fn(async () => []),
    },
  }

  return {
    service: new NotificationModuleService(repos as never),
    repos,
  }
}

describe('NotificationModuleService.listNotifications', () => {
  it('returns paginated notifications with unread count', async () => {
    const { service } = createModuleService()
    const result = await service.listNotifications('tenant-1', 'user-1')
    expect(result.data).toHaveLength(1)
    expect(result.unreadCount).toBe(1)
  })
})

describe('NotificationModuleService.markRead', () => {
  it('marks a notification as read', async () => {
    const { service, repos } = createModuleService()
    const result = await service.markRead('tenant-1', 'user-1', 'n-1')
    expect(result.ok).toBe(true)
    expect(repos.notification.markRead).toHaveBeenCalledWith('n-1', 'user-1', 'tenant-1')
  })
})

describe('NotificationModuleService.create', () => {
  it('creates notification when preference enabled', async () => {
    const { service, repos } = createModuleService({ preferenceEnabled: true })
    const result = await service.create({
      tenant_id: 'tenant-1',
      user_id: 'user-1',
      type: 'system',
      title: 'Test',
    })
    expect(result.created).toBe(true)
    expect(repos.notification.create).toHaveBeenCalled()
  })

  it('skips notification when preference disabled', async () => {
    const { service, repos } = createModuleService({ preferenceEnabled: false })
    const result = await service.create({
      tenant_id: 'tenant-1',
      user_id: 'user-1',
      type: 'system',
      title: 'Test',
    })
    expect(result.created).toBe(false)
    expect(result.skipped).toBe(true)
    expect(repos.notification.create).not.toHaveBeenCalled()
  })
})
