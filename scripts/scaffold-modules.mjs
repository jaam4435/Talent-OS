#!/usr/bin/env node
/**
 * Scaffolds standardized module folders under modules/<domain>/.
 * Each module exposes: api, services, repositories, types, schemas, events, tests, README.
 */

import { mkdirSync, writeFileSync, existsSync } from 'fs'
import { join } from 'path'

const MODULES = [
  {
    name: 'talent',
    service: '@/lib/services/talent.service',
    portfolio: '@/lib/services/portfolio.service',
    repos: '@/lib/repositories/talent.repository',
    extraRepos: ['portfolio', 'rating'],
    types: '@/lib/domains/talent/types',
    schemas: '@/lib/domains/talent/validation',
    actions: '@/app/actions/freelancers',
    portfolioActions: '@/app/actions/portfolio',
    events: {
      FREELANCER_CREATED: 'talent.freelancer_created',
      FREELANCER_UPDATED: 'talent.freelancer_updated',
    },
  },
  {
    name: 'crm',
    service: '@/lib/services/crm.service',
    repos: '@/lib/repositories/company.repository',
    extraRepos: ['lead'],
    types: '@/lib/opportunities/types',
    schemas: '@/lib/opportunities/validation',
    actions: '@/app/actions/opportunities',
    extraActions: ['companies'],
    events: {
      OPPORTUNITY_OPENED: 'opportunity.opened',
      OPPORTUNITY_BROADCAST: 'opportunity.broadcast',
    },
  },
  {
    name: 'projects',
    service: '@/lib/services/project.service',
    repos: '@/lib/repositories/project.repository',
    extraRepos: ['task'],
    types: '@/lib/projects/types',
    schemas: '@/lib/projects/validation',
    actions: '@/app/actions/projects',
    extraActions: ['milestones'],
    events: {
      PROJECT_CREATED: 'project.created',
      MILESTONE_SUBMITTED: 'milestone.submitted',
    },
  },
  {
    name: 'assignment',
    service: '@/lib/services/assignment.service',
    repos: '@/lib/repositories/shortlist.repository',
    types: '@/lib/shortlists/types',
    actions: '@/app/actions/shortlists',
    events: {
      SHORTLIST_UPDATED: 'shortlist.updated',
      MATCH_SCORED: 'assignment.match_scored',
    },
  },
  {
    name: 'finance',
    service: '@/lib/services/finance.service',
    repos: '@/lib/repositories/invoice.repository',
    types: '@/modules/finance/types',
    schemas: '@/modules/finance/schemas',
    actions: '@/app/actions/payments',
    events: {
      PAYMENT_APPROVED: 'payment.approved',
      PAYMENT_PAID: 'payment.paid',
    },
  },
  {
    name: 'workflow',
    service: '@/lib/services/workflow.service',
    engine: '@/lib/services/workflow-engine.service',
    repos: '@/lib/repositories/workflow.repository',
    extraRepos: ['domainEvent'],
    types: '@/lib/workflows/types',
    actions: '@/app/actions/approvals',
    events: {
      DOMAIN_EVENT_EMITTED: 'domain_event.emitted',
    },
  },
  {
    name: 'ai',
    service: '@/lib/services/ai.service',
    repos: '@/lib/repositories/ai-request.repository',
    types: '@/lib/integrations/ai/types',
    actions: '@/app/actions/ai',
    extraActions: ['ai-pm'],
    events: {
      MATCH_REQUESTED: 'ai.match_requested',
      BRIEF_PARSE_REQUESTED: 'ai.brief_parse_requested',
    },
  },
  {
    name: 'whatsapp',
    service: '@/lib/services/whatsapp.service',
    repos: '@/lib/repositories/whatsapp-conversation.repository',
    types: '@/lib/whatsapp/types',
    events: {
      INBOUND_MESSAGE: 'whatsapp.inbound_message',
      STATUS_UPDATE: 'whatsapp.status_update',
    },
  },
  {
    name: 'integrations',
    service: '@/lib/services/integration.service',
    repos: '@/lib/repositories/integration.repository',
    events: {
      WEBHOOK_RECEIVED: 'integration.webhook_received',
    },
  },
  {
    name: 'notifications',
    service: '@/lib/services/notification.service',
    repos: '@/lib/repositories/notification.repository',
    events: {
      NOTIFICATION_CREATED: 'notification.created',
    },
  },
  {
    name: 'analytics',
    service: '@/lib/services/analytics.service',
    repos: '@/lib/repositories/dashboard.repository',
    events: {},
  },
]

function writeIfMissing(path, content) {
  if (existsSync(path)) return
  writeFileSync(path, content)
}

for (const mod of MODULES) {
  const base = join(process.cwd(), 'modules', mod.name)
  mkdirSync(join(base, 'api'), { recursive: true })
  mkdirSync(join(base, 'services'), { recursive: true })
  mkdirSync(join(base, 'repositories'), { recursive: true })
  mkdirSync(join(base, 'types'), { recursive: true })
  mkdirSync(join(base, 'schemas'), { recursive: true })
  mkdirSync(join(base, 'events'), { recursive: true })
  mkdirSync(join(base, 'tests'), { recursive: true })

  const eventEntries = Object.entries(mod.events ?? {})
  const eventsContent =
    eventEntries.length === 0
      ? `/** ${mod.name} domain events — none defined yet. */\nexport const ${capitalize(mod.name)}Events = {} as const\n`
      : `/** Canonical ${mod.name} domain event type strings. */\nexport const ${capitalize(mod.name)}Events = {\n${eventEntries.map(([k, v]) => `  ${k}: '${v}',`).join('\n')}\n} as const\n\nexport type ${capitalize(mod.name)}EventType = (typeof ${capitalize(mod.name)}Events)[keyof typeof ${capitalize(mod.name)}Events]\n`

  writeIfMissing(
    join(base, 'events', 'index.ts'),
    eventsContent
  )

  writeIfMissing(
    join(base, 'services', 'index.ts'),
    buildServicesIndex(mod)
  )

  writeIfMissing(
    join(base, 'repositories', 'index.ts'),
    buildReposIndex(mod)
  )

  writeIfMissing(
    join(base, 'types', 'index.ts'),
    mod.types?.startsWith('@/modules/')
      ? `export * from '${mod.types.replace('@/', '../../')}'\n`
      : `export * from '${mod.types}'\n`
  )

  writeIfMissing(
    join(base, 'schemas', 'index.ts'),
    mod.schemas
      ? mod.schemas.startsWith('@/modules/')
        ? `export * from '${mod.schemas.replace('@/', '../../')}'\n`
        : `export * from '${mod.schemas}'\n`
      : `/** No domain schemas yet for ${mod.name}. */\nexport {}\n`
  )

  writeIfMissing(join(base, 'api', 'index.ts'), buildApiIndex(mod))

  writeIfMissing(
    join(base, 'tests', 'README.md'),
    `# ${capitalize(mod.name)} module tests\n\nService tests: \`tests/service/${mod.name}.service.test.ts\`\nRepository tests: \`tests/repository/${mod.name}.*.test.ts\`\n`
  )

  writeIfMissing(join(base, 'README.md'), buildReadme(mod))

  writeIfMissing(
    join(base, 'index.ts'),
    `/** ${capitalize(mod.name)} module — standardized barrel export. */\nexport * from './api'\nexport * from './services'\nexport * from './repositories'\nexport * from './types'\nexport * from './schemas'\nexport * from './events'\n`
  )
}

console.log(`Scaffolded ${MODULES.length} modules under modules/`)

function capitalize(s) {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

function buildServicesIndex(mod) {
  const lines = [`export { ${capitalize(mod.name)}Service } from '${mod.service}'`]
  if (mod.portfolio) lines.push(`export { PortfolioService } from '${mod.portfolio}'`)
  if (mod.engine) lines.push(`export { WorkflowEngineService } from '${mod.engine}'`)
  return lines.join('\n') + '\n'
}

function buildReposIndex(mod) {
  const lines = [`export * from '${mod.repos}'`]
  if (mod.extraRepos) {
    for (const r of mod.extraRepos) {
      const map = {
        portfolio: '@/lib/domains/talent/repositories/portfolio.repository',
        rating: '@/lib/domains/talent/repositories/rating.repository',
        lead: '@/lib/repositories/lead.repository',
        task: '@/lib/repositories/task.repository',
        domainEvent: '@/lib/repositories/domain-event.repository',
      }
      if (map[r]) lines.push(`export * from '${map[r]}'`)
    }
  }
  return lines.join('\n') + '\n'
}

function buildApiIndex(mod) {
  const actions = [`export * from '${mod.actions}'`]
  if (mod.portfolioActions) actions.push(`export * from '${mod.portfolioActions}'`)
  if (mod.extraActions) {
    for (const a of mod.extraActions) {
      actions.push(`export * from '@/app/actions/${a}'`)
    }
  }
  return `/** Server actions (API layer) for ${mod.name}. */\n${actions.join('\n')}\n`
}

function buildReadme(mod) {
  return `# ${capitalize(mod.name)} Module

Standard module layout per [MODULE_STANDARD](../../docs/Platform/MODULE_STANDARD.md).

| Layer | Path |
|-------|------|
| API | \`api/\` — server actions |
| Service | \`services/\` — business logic |
| Repository | \`repositories/\` — persistence |
| Types | \`types/\` |
| Schemas | \`schemas/\` — Zod validators |
| Events | \`events/\` — domain event constants |
| Tests | \`tests/\` — see \`tests/service/${mod.name}.service.test.ts\` |
`
}
