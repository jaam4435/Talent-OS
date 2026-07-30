#!/usr/bin/env node
/**
 * CI guard: MCP adapters must call Services only — never repositories or direct DB.
 */

import { readFileSync, readdirSync, statSync } from 'fs'
import { join, relative } from 'path'

const ROOT = process.cwd()
const violations = []

const FORBIDDEN_PATTERNS = [
  /from ['"]@\/lib\/repositories/,
  /from ['"]@\/modules\/.*\/repositories/,
  /\.from\(['"][a-z_]+['"]\)/,
  /createAdminRepositories/,
  /createRepositories/,
]

const ALLOWED_PREFIXES = ['lib/services/', 'lib/mcp/adapters/helpers.ts']

function walk(dir, files = []) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry)
    if (statSync(full).isDirectory()) walk(full, files)
    else if (/\.(ts|tsx)$/.test(entry)) files.push(full)
  }
  return files
}

const adapterDir = join(ROOT, 'lib/mcp/adapters')
for (const file of walk(adapterDir)) {
  const rel = relative(ROOT, file).replace(/\\/g, '/')
  if (ALLOWED_PREFIXES.some((prefix) => rel.startsWith(prefix) || rel === prefix)) continue

  const content = readFileSync(file, 'utf8')
  for (const pattern of FORBIDDEN_PATTERNS) {
    if (pattern.test(content)) {
      violations.push({ file: rel, pattern: pattern.toString() })
      break
    }
  }
}

if (violations.length) {
  console.error('MCP adapter violations — tools must call Services only:\n')
  for (const v of violations) {
    console.error(`  ${v.file}`)
  }
  process.exit(1)
}

console.log('MCP service-layer usage check passed.')
