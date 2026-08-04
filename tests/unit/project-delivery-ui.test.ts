import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { hasPermission } from '@/modules/core/services/permissions'

const ROOT = process.cwd()

function read(path: string) {
  return readFileSync(join(ROOT, path), 'utf8')
}

describe('Project delivery UI routes', () => {
  const pages = [
    'app/(dashboard)/projects/[id]/layout.tsx',
    'app/(dashboard)/projects/[id]/tasks/page.tsx',
    'app/(dashboard)/projects/[id]/deliverables/page.tsx',
    'app/(dashboard)/projects/[id]/timeline/page.tsx',
    'app/(dashboard)/projects/templates/page.tsx',
  ]

  it.each(pages)('%s exists', (pagePath) => {
    expect(read(pagePath).length).toBeGreaterThan(0)
  })

  it('project detail layout renders sub-navigation and health badge', () => {
    const src = read('app/(dashboard)/projects/[id]/layout.tsx')
    expect(src).toContain('ProjectSubNav')
    expect(src).toContain('ProjectHealthBadge')
    expect(src).toContain('requireTenant')
  })

  it('templates page is manager-only', () => {
    expect(read('app/(dashboard)/projects/templates/page.tsx')).toContain('requireManager')
  })
})

describe('Project sub-navigation', () => {
  it('marks overview tab as exact match', () => {
    const src = read('components/projects/project-sub-nav.tsx')
    expect(src).toContain("suffix: ''")
    expect(src).toContain('exact: true')
    expect(src).toContain('/tasks')
    expect(src).toContain('/deliverables')
    expect(src).toContain('/timeline')
  })
})

describe('Project delivery components', () => {
  it('task board loads tasks via REST API', () => {
    const src = read('components/projects/task-board.tsx')
    expect(src).toContain('listTasks')
    expect(src).toContain('createTask')
    expect(src).toContain('updateTask')
    expect(src).toContain('readOnly')
  })

  it('deliverable list shows workflow status', () => {
    const src = read('components/projects/deliverable-list.tsx')
    expect(src).toContain('submitted')
    expect(src).toContain('approved')
    expect(src).toContain('listDeliverables')
  })

  it('template library applies templates via REST', () => {
    const src = read('components/projects/template-library.tsx')
    expect(src).toContain('applyTemplate')
    expect(src).toContain('listTemplates')
  })
})

describe('Project API client', () => {
  it('targets project sub-resource endpoints', () => {
    const src = read('lib/api/project-api.ts')
    expect(src).toContain('/api/projects/')
    expect(src).toContain('/tasks')
    expect(src).toContain('/deliverables')
    expect(src).toContain('/timeline')
    expect(src).toContain('/templates')
  })

  it('uses project delivery hook with user-friendly errors', () => {
    const src = read('modules/project/hooks/use-project-delivery.ts')
    expect(src).toContain('getUserMessageForApiError')
    expect(src).toContain('router.refresh()')
  })
})

describe('Project read permission alias', () => {
  it('maps project:read to projects:read for freelancers', () => {
    expect(hasPermission('freelancer', 'project:read')).toBe(true)
  })

  it('keeps project:read for managers', () => {
    expect(hasPermission('admin', 'project:read')).toBe(true)
  })
})

describe('Freelancer read API routes', () => {
  const routes = [
    'app/api/projects/[id]/route.ts',
    'app/api/projects/[id]/tasks/route.ts',
    'app/api/projects/[id]/deliverables/route.ts',
    'app/api/projects/[id]/timeline/route.ts',
    'app/api/projects/[id]/health/route.ts',
  ]

  it.each(routes)('%s allows tenant read', (routePath) => {
    const src = read(routePath)
    expect(src).toContain("auth: 'tenant'")
    expect(src).toContain("'project:read'")
  })
})
