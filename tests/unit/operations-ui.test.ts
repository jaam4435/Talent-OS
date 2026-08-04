import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { getNavGroupsForRole } from '@/modules/core/components/navigation/nav-config'
import { resolveApprovalSchema } from '@/modules/workflow-engine/validation'
import { resolveApprovalSchema as whatsappResolveSchema } from '@/modules/whatsapp-platform/validation'

const ROOT = process.cwd()

function read(path: string) {
  return readFileSync(join(ROOT, path), 'utf8')
}

describe('Workflow UI routes', () => {
  const pages = [
    'app/(dashboard)/workflows/layout.tsx',
    'app/(dashboard)/workflows/page.tsx',
    'app/(dashboard)/workflows/runs/page.tsx',
    'app/(dashboard)/workflows/runs/[id]/page.tsx',
    'app/(dashboard)/workflows/approvals/page.tsx',
    'app/(dashboard)/workflows/definitions/page.tsx',
  ]

  it.each(pages)('%s uses requireManager or layout guard', (pagePath) => {
    const src = read(pagePath)
    if (pagePath.endsWith('layout.tsx')) {
      expect(src).toContain('requireManager')
      expect(src).toContain('notFound')
    } else {
      expect(src).toContain('requireManager')
    }
  })
})

describe('WhatsApp UI routes', () => {
  const pages = [
    'app/(dashboard)/whatsapp/layout.tsx',
    'app/(dashboard)/whatsapp/page.tsx',
    'app/(dashboard)/whatsapp/[freelancerId]/page.tsx',
    'app/(dashboard)/whatsapp/approvals/page.tsx',
  ]

  it.each(pages)('%s uses requireManager or layout guard', (pagePath) => {
    const src = read(pagePath)
    if (pagePath.endsWith('layout.tsx')) {
      expect(src).toContain('requireManager')
      expect(src).toContain('notFound')
    } else {
      expect(src).toContain('requireManager')
    }
  })
})

describe('Operations navigation', () => {
  it('includes workflow and whatsapp links for managers', () => {
    const labels = getNavGroupsForRole('talent_manager')
      .flatMap((group) => group.items)
      .map((item) => item.label)
    expect(labels).toContain('Workflows')
    expect(labels).toContain('WhatsApp')
  })

  it('hides operations links from freelancers', () => {
    const labels = getNavGroupsForRole('freelancer')
      .flatMap((group) => group.items)
      .map((item) => item.label)
    expect(labels).not.toContain('Workflows')
    expect(labels).not.toContain('WhatsApp')
  })
})

describe('Workflow API client', () => {
  it('uses REST endpoints for approvals and retries', () => {
    const src = read('lib/api/workflow-api.ts')
    expect(src).toContain('/api/workflows/approvals/')
    expect(src).toContain('/api/workflows/retries/jobs')
  })

  it('uses workflow hook with user-friendly errors', () => {
    const src = read('modules/workflow-engine/hooks/use-workflows.ts')
    expect(src).toContain('getUserMessageForApiError')
    expect(src).toContain('router.refresh()')
  })
})

describe('WhatsApp API client', () => {
  it('uses REST endpoint for approval resolution', () => {
    const src = read('lib/api/whatsapp-api.ts')
    expect(src).toContain('/api/whatsapp/approvals/')
  })
})

describe('Approval action validation', () => {
  it('accepts workflow approval decisions', () => {
    const result = resolveApprovalSchema.safeParse({ decision: 'approved', note: 'Looks good' })
    expect(result.success).toBe(true)
  })

  it('accepts whatsapp approval decisions', () => {
    const result = whatsappResolveSchema.safeParse({ decision: 'rejected' })
    expect(result.success).toBe(true)
  })
})
