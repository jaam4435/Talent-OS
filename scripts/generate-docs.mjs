#!/usr/bin/env node
/**
 * Talent OS — Documentation generator
 * Scans the codebase and regenerates docs/generated/* from source.
 * Run: npm run docs:generate
 * CI:  npm run docs:check (fails if generated docs are stale)
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')
const OUT = path.join(ROOT, 'docs', 'generated')

const GENERATED_BANNER = `<!-- AUTO-GENERATED — do not edit manually. Run: npm run docs:generate -->\n`

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true })
}

function writeGenerated(filename, body) {
  const content = GENERATED_BANNER + body.trim() + '\n'
  fs.writeFileSync(path.join(OUT, filename), content)
}

function walkDir(dir, filter) {
  const results = []
  if (!fs.existsSync(dir)) return results
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) results.push(...walkDir(full, filter))
    else if (!filter || filter(full)) results.push(full)
  }
  return results
}

function rel(p) {
  return path.relative(ROOT, p).replace(/\\/g, '/')
}

function extractExports(filePath) {
  const src = fs.readFileSync(filePath, 'utf8')
  const exports = []
  const fnRe = /export\s+async\s+function\s+(\w+)/g
  let m
  while ((m = fnRe.exec(src))) exports.push(m[1])
  return exports
}

function extractHttpMethods(filePath) {
  const src = fs.readFileSync(filePath, 'utf8')
  const methods = []
  const re = /export\s+async\s+function\s+(GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS)\b/g
  let m
  while ((m = re.exec(src))) methods.push(m[1])
  return methods
}

function routeFromApiPath(filePath) {
  const relPath = rel(filePath)
  const segment = relPath.replace(/^app\/api\//, '').replace(/\/route\.ts$/, '')
  return '/api/' + segment.replace(/\[(\w+)\]/g, ':$1')
}

function generateApiRoutes() {
  const routes = walkDir(path.join(ROOT, 'app', 'api'), (f) => f.endsWith('route.ts'))
  const rows = routes
    .map((f) => {
      const methods = extractHttpMethods(f)
      return { route: routeFromApiPath(f), methods: methods.join(', ') || '—', file: rel(f) }
    })
    .sort((a, b) => a.route.localeCompare(b.route))

  let md = `# API Routes (Generated)\n\n`
  md += `| Method | Route | Source |\n|---|---|---|\n`
  for (const r of rows) {
    md += `| ${r.methods} | \`${r.route}\` | [\`${r.file}\`](../../${r.file}) |\n`
  }
  md += `\n**Total:** ${rows.length} route handlers\n`
  return md
}

function generateServerActions() {
  const dir = path.join(ROOT, 'app', 'actions')
  const files = fs.readdirSync(dir).filter((f) => f.endsWith('.ts'))
  let md = `# Server Actions (Generated)\n\n`
  for (const file of files.sort()) {
    const fpath = path.join(dir, file)
    const exports = extractExports(fpath)
    md += `## \`${file}\`\n\n`
    if (exports.length) {
      md += exports.map((e) => `- \`${e}()\``).join('\n') + '\n\n'
    } else {
      md += `_No exported async functions_\n\n`
    }
  }
  md += `**Total:** ${files.length} action modules\n`
  return md
}

function generateMigrations() {
  const dir = path.join(ROOT, 'supabase', 'migrations')
  const files = fs.readdirSync(dir).filter((f) => f.endsWith('.sql')).sort()
  let md = `# Database Migrations (Generated)\n\n`
  md += `| # | File | Summary |\n|---|---|---|\n`
  for (const file of files) {
    const src = fs.readFileSync(path.join(dir, file), 'utf8')
    const firstLine =
      src
        .split('\n')
        .find((l) => l.startsWith('--') && !l.startsWith('-- ='))?.replace(/^--\s*/, '') ?? '—'
    md += `| ${file.split('_')[0]} | [\`${file}\`](../../supabase/migrations/${file}) | ${firstLine} |\n`
  }
  md += `\n**Total:** ${files.length} migrations — apply in filename order\n`
  return md
}

function generateMcpTools() {
  const dir = path.join(ROOT, 'lib', 'mcp', 'servers')
  const files = fs.readdirSync(dir).filter((f) => f.endsWith('.server.ts'))
  let md = `# MCP Tools Catalog (Generated)\n\n`
  let total = 0
  for (const file of files.sort()) {
    const src = fs.readFileSync(path.join(dir, file), 'utf8')
    const serverMatch = src.match(/id:\s*'(\w+)'/)
    const serverId = serverMatch?.[1] ?? file.replace('.server.ts', '')
    const tools = [...src.matchAll(/name:\s*'([a-z_]+)'/g)].map((m) => m[1])
    const toolNames = tools.filter((t) => t.includes('_'))
    total += toolNames.length
    md += `## Server: \`${serverId}\` — [\`${file}\`](../../lib/mcp/servers/${file})\n\n`
    md += toolNames.map((t) => `- \`${t}\``).join('\n') + '\n\n'
  }
  md += `**Total:** ${total} tools across ${files.length} servers\n`
  return md
}

function generateWorkflows() {
  const src = fs.readFileSync(path.join(ROOT, 'lib', 'workflows', 'registry.ts'), 'utf8')
  const blocks = [...src.matchAll(/id:\s*'(wf-[^']+)'[\s\S]*?eventType:\s*'([^']+)'/g)]
  let md = `# Workflow Registry (Generated)\n\n`
  md += `| Workflow ID | Trigger Event | Source |\n|---|---|---|\n`
  for (const [, id, eventType] of blocks) {
    md += `| \`${id}\` | \`${eventType}\` | [\`registry.ts\`](../../lib/workflows/registry.ts) |\n`
  }
  md += `\n**Total:** ${blocks.length} built-in workflows\n`
  return md
}

function generateServices() {
  const dir = path.join(ROOT, 'lib', 'services')
  const files = fs.readdirSync(dir).filter((f) => f.endsWith('.service.ts'))
  let md = `# Services (Generated)\n\n`
  md += `| Service | File |\n|---|---|\n`
  for (const file of files.sort()) {
    const name = file.replace('.service.ts', '')
    md += `| \`${name}\` | [\`${rel(path.join(dir, file))}\`](../../${rel(path.join(dir, file))}) |\n`
  }
  md += `\n**Total:** ${files.length} services\n`
  return md
}

function generateRepositories() {
  const dir = path.join(ROOT, 'lib', 'repositories')
  const files = walkDir(dir, (f) => f.endsWith('.repository.ts'))
  let md = `# Repositories (Generated)\n\n`
  md += `| Repository | File |\n|---|---|\n`
  for (const f of files.sort()) {
    const name = path.basename(f, '.repository.ts')
    md += `| \`${name}\` | [\`${rel(f)}\`](../../${rel(f)}) |\n`
  }
  md += `\n**Total:** ${files.length} repositories\n`
  return md
}

function generateModules() {
  const modulesDir = path.join(ROOT, 'modules')
  const modules = fs.existsSync(modulesDir)
    ? fs.readdirSync(modulesDir, { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name)
    : []
  let md = `# Domain Modules (Generated)\n\n`
  for (const mod of modules.sort()) {
    md += `- \`modules/${mod}/\`\n`
  }
  md += `\n**Total:** ${modules.length} modules\n`
  return md
}

function main() {
  ensureDir(OUT)
  const generatedAt = new Date().toISOString()

  const files = {
    'api-routes.md': generateApiRoutes(),
    'server-actions.md': generateServerActions(),
    'migrations.md': generateMigrations(),
    'mcp-tools.md': generateMcpTools(),
    'workflows.md': generateWorkflows(),
    'services.md': generateServices(),
    'repositories.md': generateRepositories(),
    'modules.md': generateModules(),
  }

  for (const [name, content] of Object.entries(files)) {
    writeGenerated(name, content)
  }

  const manifest = {
    generatedAt,
    generator: 'scripts/generate-docs.mjs',
    files: Object.keys(files),
    counts: {
      apiRoutes: (files['api-routes.md'].match(/^\| [A-Z]/gm) ?? []).length,
      actionModules: (files['server-actions.md'].match(/^## `/gm) ?? []).length,
      migrations: (files['migrations.md'].match(/^\| \d+/gm) ?? []).length,
      workflows: (files['workflows.md'].match(/^\| `wf-/gm) ?? []).length,
    },
  }

  fs.writeFileSync(path.join(OUT, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n')
  console.log(`Generated ${Object.keys(files).length} docs at ${generatedAt}`)
}

main()
