#!/usr/bin/env node
/**
 * Generate MCP tool contract JSON files from lib/mcp/servers/*.server.ts
 * Run: npm run mcp:contracts
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')
const SERVERS_DIR = path.join(ROOT, 'lib/mcp/servers')
const OUT = path.join(ROOT, 'docs/mcp/contracts')

function extractBlock(src, key) {
  const re = new RegExp(`${key}:\\s*\\{([\\s\\S]*?)\\n\\s*\\},\\n\\s*capabilities`, 'm')
  const match = src.match(re)
  if (!match) return null
  const id = match[1].match(/id:\s*'([^']+)'/)?.[1]
  const name = match[1].match(/name:\s*'([^']+)'/)?.[1]
  const version = match[1].match(/version:\s*'([^']+)'/)?.[1]
  const description = match[1].match(/description:\s*'([^']+)'/)?.[1]
  const resourcePrefix = match[1].match(/resourcePrefix:\s*'([^']+)'/)?.[1]
  return { id, name, version, description, resourcePrefix }
}

function extractTools(src) {
  const tools = []
  const toolBlocks = [...src.matchAll(/\{\s*\n\s*name:\s*'([a-z_]+)'[\s\S]*?\n\s*\},(?=\n)/g)]
  for (const block of toolBlocks) {
    const chunk = block[0]
    const name = block[1]
    if (!name.includes('_')) continue
    const title = chunk.match(/title:\s*'([^']+)'/)?.[1] ?? name
    const description = chunk.match(/description:\s*'([^']+)'/)?.[1] ?? ''
    const requiredPermission = chunk.match(/requiredPermission:\s*'([^']+)'/)?.[1] ?? null
    const destructive = /destructive:\s*true/.test(chunk)
    tools.push({ name, title, description, requiredPermission, destructive })
  }
  return tools
}

function main() {
  fs.mkdirSync(OUT, { recursive: true })
  const files = fs.readdirSync(SERVERS_DIR).filter((f) => f.endsWith('.server.ts'))
  const manifest = { generatedAt: new Date().toISOString(), generator: 'scripts/generate-mcp-contracts.mjs', servers: [] }

  for (const file of files.sort()) {
    const src = fs.readFileSync(path.join(SERVERS_DIR, file), 'utf8')
    const metadata = extractBlock(src, 'metadata')
    if (!metadata?.id) continue

    const tools = extractTools(src)
    const contract = {
      server: metadata,
      tools: tools.map((tool) => ({
        ...tool,
        inputSchema: { type: 'object', $ref: `lib/mcp/servers/${file}#${tool.name}` },
        serviceLayer: true,
      })),
    }

    const filename = `${metadata.id}.contract.json`
    fs.writeFileSync(path.join(OUT, filename), JSON.stringify(contract, null, 2) + '\n')
    manifest.servers.push({ id: metadata.id, name: metadata.name, toolCount: tools.length, contract: `docs/mcp/contracts/${filename}` })
  }

  fs.writeFileSync(path.join(OUT, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n')
  console.log(`Generated ${manifest.servers.length} MCP contracts`)
}

main()
