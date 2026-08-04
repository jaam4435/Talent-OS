import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const ROOT = process.cwd()

function read(path: string) {
  return readFileSync(join(ROOT, path), 'utf8')
}

describe('Notifications module migration', () => {
  it('creates notification preferences table and list index', () => {
    const sql = read('supabase/migrations/034_notifications_module.sql')
    expect(sql).toContain('CREATE TABLE notification_preferences')
    expect(sql).toContain('idx_notifications_tenant_user_created')
    expect(sql).toContain('ENABLE ROW LEVEL SECURITY')
  })
})

describe('Notifications API routes', () => {
  const routes = [
    'app/api/notifications/route.ts',
    'app/api/notifications/[id]/read/route.ts',
    'app/api/notifications/read-all/route.ts',
    'app/api/notifications/preferences/route.ts',
  ]

  it.each(routes)('%s uses withApiHandler', (routePath) => {
    expect(read(routePath)).toContain('withApiHandler')
  })

  it('list route uses tenant auth', () => {
    expect(read('app/api/notifications/route.ts')).toContain("'tenant'")
  })
})

describe('MCP notification adapter', () => {
  it('routes notification server tools through adapter', () => {
    const src = read('lib/mcp/gateway.ts')
    expect(src).toContain("request.serverId === 'notification'")
    expect(src).toContain('invokeNotificationTool')
  })
})

describe('Backward compatibility', () => {
  it('preserves legacy NotificationService facade', () => {
    expect(read('lib/services/notification.service.ts')).toContain('class NotificationService')
  })

  it('workflow notify action still uses NotificationService.create', () => {
    expect(read('lib/workflows/actions.ts')).toContain('services.notification.create')
  })
})
