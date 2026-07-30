#!/usr/bin/env node
/** Generate docs/generated/events-catalog.md from module event constants + catalog.ts */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')
const OUT = path.join(ROOT, 'docs', 'generated', 'events-catalog.md')
const BANNER = `<!-- AUTO-GENERATED — do not edit manually. Run: npm run events:catalog -->\n`

const RUNTIME_EVENTS = [
  ['opportunity.response', 'domain', 'crm', 'Freelancer responded to opportunity', 'opportunity', 'CRMService'],
  ['project.assigned', 'domain', 'projects', 'Project assigned to freelancer', 'project', 'ProjectService'],
  ['milestone.approved', 'domain', 'projects', 'Manager approved milestone', 'milestone', 'WorkflowService'],
  ['milestone.revision_requested', 'domain', 'projects', 'Manager requested revision', 'milestone', 'WorkflowService'],
  ['milestone.overdue', 'domain', 'projects', 'Milestone past due date', 'milestone', 'Cron'],
  ['payment.pending', 'domain', 'finance', 'Payment status changed (DB trigger)', 'payment', 'DB trigger'],
  ['ai.summary_requested', 'application', 'ai', 'AI summary requested', 'project', 'AIService'],
  ['ai.status_assessment_requested', 'application', 'ai', 'AI status assessment requested', 'project', 'AIService'],
  ['whatsapp.inbound', 'application', 'whatsapp', 'Inbound WhatsApp message', 'whatsapp', 'WhatsAppService'],
  ['whatsapp.intent_handled', 'application', 'whatsapp', 'WhatsApp intent handled', 'whatsapp', 'WhatsAppService'],
  ['whatsapp.agent_requested', 'application', 'whatsapp', 'WhatsApp agent query', 'whatsapp', 'WhatsAppService'],
  ['whatsapp.opt_out', 'application', 'whatsapp', 'WhatsApp opt out', 'whatsapp', 'WhatsAppService'],
  ['whatsapp.unrecognized', 'application', 'whatsapp', 'Unrecognized WhatsApp message', 'whatsapp', 'WhatsAppService'],
  ['whatsapp.send_requested', 'application', 'whatsapp', 'WhatsApp send queued', 'whatsapp', 'WorkflowService'],
  ['whatsapp.send_completed', 'integration', 'integrations', 'n8n WhatsApp callback', 'whatsapp', 'IntegrationService'],
  ['email.sent', 'integration', 'integrations', 'n8n email callback', 'email', 'IntegrationService'],
  ['ai.match_completed', 'integration', 'integrations', 'n8n AI match callback', 'ai_request', 'IntegrationService'],
]

function parseModuleEvents(filePath, domain, category = 'domain') {
  const src = fs.readFileSync(filePath, 'utf8')
  const rows = []
  for (const m of src.matchAll(/(\w+):\s*'([^']+)'/g)) {
    if (m[1] === 'type') continue
    rows.push({
      type: m[2],
      category,
      domain,
      description: m[1].replace(/_/g, ' ').toLowerCase(),
      aggregateType: domain,
      emitter: `${domain} module`,
    })
  }
  return rows
}

function main() {
  const modulesDir = path.join(ROOT, 'modules')
  const rows = [...RUNTIME_EVENTS.map(([type, category, domain, description, aggregateType, emitter]) => ({
    type, category, domain, description, aggregateType, emitter,
  }))]

  for (const mod of fs.readdirSync(modulesDir)) {
    const eventFile = path.join(modulesDir, mod, 'events', 'index.ts')
    if (!fs.existsSync(eventFile)) continue
    const category = ['ai', 'whatsapp', 'knowledge', 'notifications', 'agents'].includes(mod)
      ? 'application'
      : mod === 'integrations'
        ? 'integration'
        : 'domain'
    rows.push(...parseModuleEvents(eventFile, mod, category))
  }

  const seen = new Set()
  const unique = rows.filter((r) => {
    if (seen.has(r.type)) return false
    seen.add(r.type)
    return true
  })

  let md = `# Event Catalog (Generated)\n\n`
  md += `| Type | Category | Domain | Aggregate | Emitter | Description |\n|---|---|---|---|---|---|\n`
  for (const e of unique.sort((a, b) => a.type.localeCompare(b.type))) {
    md += `| \`${e.type}\` | ${e.category} | ${e.domain} | ${e.aggregateType} | ${e.emitter} | ${e.description} |\n`
  }
  md += `\n**Total:** ${unique.length} documented events\n`
  md += `\nAuthoritative registry: [\`lib/events/catalog.ts\`](../lib/events/catalog.ts)\n`

  fs.mkdirSync(path.dirname(OUT), { recursive: true })
  fs.writeFileSync(OUT, BANNER + md)
  console.log(`Generated events catalog (${unique.length} events)`)
}

main()
