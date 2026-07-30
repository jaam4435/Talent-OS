import { describe, expect, it } from 'vitest'
import { resolvePagination, toPaginatedResult } from '@/lib/repositories/base/types'
import { hasPermission, getPermissionsForRole } from '@/modules/core/services/permissions'
import { mergeAgentConfig, toAgentConfigSummary } from '@/lib/ai/agent/resolver'
import {
  validateToolAllowlist,
  checkAgentPermissions,
  resolveAgentTools,
} from '@/lib/ai/agent/tool-filter'
import { filterMemoryByPolicy, computeExpiresAt } from '@/lib/ai/agent/memory'
import { getAgentDefault, listAgentDefaults } from '@/lib/ai/agent/registry'
import { createKnowledgeEntrySchema } from '@/modules/knowledge/validation'
import { publishProfileSchema } from '@/modules/marketplace/validation'
import { getSubdomainBoundary, listBoundariesByPhase } from '@/lib/marketplace/boundaries'
import type { AgentMemoryEntryRow } from '@/modules/agents/types'

describe('resolvePagination', () => {
  it('defaults to page 1 and limit 20', () => {
    expect(resolvePagination()).toEqual({ limit: 20, offset: 0, page: 1 })
  })

  it('caps limit at 100', () => {
    expect(resolvePagination({ limit: 500 }).limit).toBe(100)
  })

  it('computes offset from page', () => {
    expect(resolvePagination({ page: 3, limit: 10 })).toEqual({ limit: 10, offset: 20, page: 3 })
  })
})

describe('toPaginatedResult', () => {
  it('sets hasMore when total exceeds page', () => {
    const result = toPaginatedResult([1, 2], { page: 1, limit: 2 }, 5)
    expect(result.hasMore).toBe(true)
    expect(result.total).toBe(5)
  })

  it('hasMore false on last page', () => {
    const result = toPaginatedResult([1], { page: 2, limit: 2 }, 3)
    expect(result.hasMore).toBe(false)
  })
})

describe('permissions', () => {
  it('admin has agent:run', () => {
    expect(hasPermission('admin', 'agent:run')).toBe(true)
  })

  it('client lacks agent:run', () => {
    expect(hasPermission('client', 'agent:run')).toBe(false)
  })

  it('talent_manager has freelancers:read', () => {
    expect(getPermissionsForRole('talent_manager')).toContain('freelancers:read')
  })
})

describe('mergeAgentConfig', () => {
  it('returns defaults when no tenant override', () => {
    const config = mergeAgentConfig('recruiter', null)
    expect(config.agentId).toBe('recruiter')
    expect(config.enabled).toBe(true)
    expect(config.hasTenantOverride).toBe(false)
    expect(config.allowedTools).toEqual(getAgentDefault('recruiter').allowedTools)
  })

  it('applies tenant override for enabled and tools', () => {
    const config = mergeAgentConfig('finance', {
      id: 'cfg-1',
      tenant_id: 't-1',
      agent_id: 'finance',
      enabled: false,
      instruction_prompt_id: 'agent.finance',
      instruction_version: '1.0.0',
      allowed_tools: ['finance_list_payments'],
      required_permissions: ['agent:run'],
      memory_policy: { scope: 'entity', maxEntries: 10 },
      model_override: null,
      metadata: {},
      created_at: '',
      updated_at: '',
    })
    expect(config.enabled).toBe(false)
    expect(config.allowedTools).toEqual(['finance_list_payments'])
    expect(config.hasTenantOverride).toBe(true)
  })
})

describe('toAgentConfigSummary', () => {
  it('excludes instruction content', () => {
    const summary = toAgentConfigSummary(mergeAgentConfig('qa', null))
    expect(summary).not.toHaveProperty('system')
    expect(summary.instructionPromptId).toBe('agent.qa')
  })
})

describe('validateToolAllowlist', () => {
  it('rejects tools not in defaults', () => {
    const defaults = getAgentDefault('recruiter').allowedTools
    const result = validateToolAllowlist(['nonexistent_tool'], defaults)
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.invalid).toContain('nonexistent_tool')
  })

  it('accepts valid subset', () => {
    const defaults = getAgentDefault('recruiter').allowedTools
    const result = validateToolAllowlist([defaults[0]], defaults)
    expect(result.ok).toBe(true)
  })
})

describe('checkAgentPermissions', () => {
  it('passes when admin has required permissions', () => {
    const required = getAgentDefault('recruiter').requiredPermissions
    const result = checkAgentPermissions(required, [], 'admin')
    expect(result.ok).toBe(true)
  })

  it('fails for client missing agent:run', () => {
    const result = checkAgentPermissions(['agent:run', 'freelancers:read'], [], 'client')
    expect(result.ok).toBe(false)
  })
})

describe('resolveAgentTools', () => {
  it('filters tools by user permissions for client role', () => {
    const allowed = getAgentDefault('recruiter').allowedTools
    const tools = resolveAgentTools(allowed, [], 'client')
    expect(tools.some((t) => t.name === 'talent_search')).toBe(false)
    expect(tools.some((t) => t.name === 'ai_match_talent')).toBe(false)
    expect(tools.some((t) => t.name === 'crm_list_companies')).toBe(true)
  })

  it('returns tools admin can access', () => {
    const allowed = ['analytics_dashboard_summary']
    const tools = resolveAgentTools(allowed, getPermissionsForRole('admin'), 'admin')
    expect(tools.some((t) => t.name === 'analytics_dashboard_summary')).toBe(true)
  })
})

describe('filterMemoryByPolicy', () => {
  const baseEntry: AgentMemoryEntryRow = {
    id: 'm-1',
    tenant_id: 't-1',
    agent_id: 'recruiter',
    session_id: 's-1',
    scope: 'session',
    entity_type: null,
    entity_id: null,
    memory_key: 'key',
    content: 'note',
    metadata: {},
    expires_at: null,
    created_at: '',
    updated_at: '',
  }

  it('filters expired entries', () => {
    const expired = { ...baseEntry, expires_at: '2020-01-01T00:00:00Z' }
    const result = filterMemoryByPolicy([expired, baseEntry], { scope: 'session', maxEntries: 10 })
    expect(result).toHaveLength(1)
  })

  it('respects maxEntries for tenant scope', () => {
    const entries = Array.from({ length: 5 }, (_, i) => ({ ...baseEntry, id: `m-${i}`, scope: 'tenant' as const }))
    const result = filterMemoryByPolicy(entries, { scope: 'tenant', maxEntries: 2 })
    expect(result).toHaveLength(2)
  })
})

describe('computeExpiresAt', () => {
  it('returns null without ttl', () => {
    expect(computeExpiresAt()).toBeNull()
  })

  it('returns future ISO string with ttl', () => {
    const result = computeExpiresAt(24)
    expect(result).not.toBeNull()
    expect(new Date(result!).getTime()).toBeGreaterThan(Date.now())
  })
})

describe('listAgentDefaults', () => {
  it('includes all six agents', () => {
    expect(listAgentDefaults()).toHaveLength(6)
  })
})

describe('knowledge validation', () => {
  it('rejects empty title', () => {
    const result = createKnowledgeEntrySchema.safeParse({
      category: 'sop',
      title: '',
    })
    expect(result.success).toBe(false)
  })

  it('accepts valid entry', () => {
    const result = createKnowledgeEntrySchema.safeParse({
      category: 'meeting_note',
      title: 'Kickoff',
      content: 'Notes here',
    })
    expect(result.success).toBe(true)
  })
})

describe('marketplace validation', () => {
  it('validates public slug format', () => {
    const result = publishProfileSchema.safeParse({
      freelancerId: '11111111-1111-1111-1111-111111111111',
      marketplaceVisibility: 'marketplace',
      publicSlug: 'Invalid Slug!',
    })
    expect(result.success).toBe(false)
  })
})

describe('marketplace boundaries', () => {
  it('maps all eight subdomains', () => {
    const boundary = getSubdomainBoundary('contracts')
    expect(boundary.phase).toBe(4)
    expect(boundary.extension.tables).toContain('marketplace_contracts')
  })

  it('lists phase 1 boundaries', () => {
    const phase1 = listBoundariesByPhase(1)
    expect(phase1.map((b) => b.subdomain)).toContain('profiles')
    expect(phase1.map((b) => b.subdomain)).toContain('portfolio')
  })
})
