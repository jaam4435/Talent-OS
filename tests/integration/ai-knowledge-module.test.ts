import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const ROOT = process.cwd()

function read(path: string) {
  return readFileSync(join(ROOT, path), 'utf8')
}

describe('Agents API routes', () => {
  const routes = [
    'app/api/agents/route.ts',
    'app/api/agents/[agentId]/config/route.ts',
    'app/api/agents/[agentId]/sessions/route.ts',
    'app/api/agents/[agentId]/sessions/[sessionId]/route.ts',
    'app/api/agents/[agentId]/run/route.ts',
  ]

  it.each(routes)('%s uses withApiHandler', (routePath) => {
    expect(read(routePath)).toContain('withApiHandler')
  })
})

describe('Knowledge API routes', () => {
  const routes = [
    'app/api/knowledge/entries/route.ts',
    'app/api/knowledge/entries/[id]/route.ts',
    'app/api/knowledge/search/route.ts',
  ]

  it.each(routes)('%s uses withApiHandler', (routePath) => {
    expect(read(routePath)).toContain('withApiHandler')
  })
})

describe('Backward compatibility', () => {
  it('preserves existing AI match routes', () => {
    expect(read('app/api/ai/match/route.ts')).toContain('withApiHandler')
    expect(read('app/api/ai/match/[opportunityId]/route.ts')).toContain('withApiHandler')
  })
})
