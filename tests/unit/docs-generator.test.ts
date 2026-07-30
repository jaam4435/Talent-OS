import { describe, expect, it } from 'vitest'
import fs from 'fs'
import path from 'path'

describe('documentation generator output', () => {
  const generatedDir = path.join(process.cwd(), 'docs', 'generated')

  it('manifest.json exists and lists all catalogs', () => {
    const manifest = JSON.parse(fs.readFileSync(path.join(generatedDir, 'manifest.json'), 'utf8'))
    expect(manifest.files).toContain('api-routes.md')
    expect(manifest.files).toContain('migrations.md')
    expect(manifest.files).toContain('mcp-tools.md')
    expect(manifest.files).toContain('workflows.md')
    expect(manifest.generatedAt).toBeTruthy()
  })

  it('api-routes catalog includes health endpoint', () => {
    const content = fs.readFileSync(path.join(generatedDir, 'api-routes.md'), 'utf8')
    expect(content).toContain('/api/health')
  })

  it('migrations catalog includes 018 marketplace', () => {
    const content = fs.readFileSync(path.join(generatedDir, 'migrations.md'), 'utf8')
    expect(content).toContain('018_marketplace_architecture.sql')
  })

  it('workflows catalog includes milestone submitted', () => {
    const content = fs.readFileSync(path.join(generatedDir, 'workflows.md'), 'utf8')
    expect(content).toContain('wf-milestone-submitted')
    expect(content).toContain('milestone.submitted')
  })
})
