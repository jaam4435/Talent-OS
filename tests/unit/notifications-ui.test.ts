import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const ROOT = process.cwd()

function read(path: string) {
  return readFileSync(join(ROOT, path), 'utf8')
}

describe('Notifications UI', () => {
  it('notifications page uses REST inbox component', () => {
    const src = read('app/(dashboard)/notifications/page.tsx')
    expect(src).toContain('NotificationInbox')
    expect(src).toContain('/notifications/preferences')
  })

  it('header uses notification bell badge', () => {
    const src = read('modules/core/components/layout/header.tsx')
    expect(src).toContain('NotificationBell')
  })

  it('notifications API client targets REST endpoints', () => {
    const src = read('lib/api/notifications-api.ts')
    expect(src).toContain('/api/notifications')
    expect(src).toContain('/read-all')
    expect(src).toContain('/preferences')
  })
})

describe('Deprecated patterns', () => {
  it('notification actions use hook rather than server actions', () => {
    const src = read('modules/notifications/components/notification-inbox.tsx')
    expect(src).toContain('useNotifications')
    expect(src).not.toContain("'use server'")
  })
})
