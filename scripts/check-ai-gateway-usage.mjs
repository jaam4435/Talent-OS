#!/usr/bin/env node
/**
 * CI guard: business modules must not import LLM providers directly.
 * Allowed: lib/ai/**, lib/ai/providers/**
 */

import { readFileSync, readdirSync, statSync } from 'fs'
import { join, relative } from 'path'

const ROOT = process.cwd()
const violations = []

const FORBIDDEN_PATTERNS = [
  /from ['"]@\/lib\/ai\/providers\/(?!interface)/,
  /from ['"]@\/lib\/integrations\/ai\/openai-client['"]/,
  /from ['"]@\/lib\/integrations\/ai\/openai['"]/,
  /api\.openai\.com/,
  /api\.anthropic\.com/,
  /generativelanguage\.googleapis\.com/,
]

const ALLOWED_PREFIXES = [
  'lib/ai/providers/',
  'lib/ai/gateway.ts',
  'lib/integrations/ai/openai-client.ts',
  'lib/integrations/ai/openai.ts',
  'scripts/check-ai-gateway-usage.mjs',
]

function walk(dir, files = []) {
  for (const entry of readdirSync(dir)) {
    if (entry === 'node_modules' || entry === '.git' || entry === 'coverage') continue
    const full = join(dir, entry)
    if (statSync(full).isDirectory()) {
      walk(full, files)
    } else if (/\.(ts|tsx|js|mjs)$/.test(entry)) {
      files.push(full)
    }
  }
  return files
}

for (const file of walk(ROOT)) {
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
  console.error('AI Gateway usage violations — all LLM calls must go through @/lib/ai:\n')
  for (const v of violations) {
    console.error(`  ${v.file}`)
  }
  process.exit(1)
}

console.log('AI Gateway usage check passed.')
