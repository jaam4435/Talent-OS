import { describe, expect, it, vi } from 'vitest'
import { TalentModuleService, computeProfileCompleteness, mapTalentProfile } from '@/lib/services/talent-module.service'
import type { Tables } from '@/modules/core/types/database'

function baseRow(overrides: Partial<Tables<'freelancers'>> = {}): Tables<'freelancers'> {
  return {
    id: 'talent-1',
    tenant_id: 'tenant-1',
    user_id: null,
    email: 'dev@example.com',
    full_name: 'Jane Doe',
    phone: '+1234567890',
    discipline: 'engineering',
    skills: ['typescript', 'react'],
    day_rate: 500,
    currency: 'USD',
    bio: 'Senior engineer',
    portfolio_url: 'https://example.com',
    availability: 'available',
    internal_rating: 4.5,
    internal_notes: null,
    tags: ['remote'],
    metadata: {},
    last_active_at: '2026-01-01T00:00:00.000Z',
    deleted_at: null,
    timezone: 'America/New_York',
    employment_type: 'freelance',
    languages: [{ code: 'en', level: 'native' }],
    ai_context: {},
    ai_summary: 'Strong full-stack engineer',
    profile_completeness: 0,
    cv_file_path: null,
    marketplace_visible: false,
    marketplace_published_at: null,
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
    ...overrides,
  }
}

describe('computeProfileCompleteness', () => {
  it('scores a well-filled profile highly', () => {
    const result = computeProfileCompleteness({
      row: baseRow({ cv_file_path: '/cv.pdf' }),
      experienceCount: 2,
      documentCount: 1,
    })
    expect(result.score).toBeGreaterThanOrEqual(90)
    expect(result.missing.length).toBeLessThanOrEqual(2)
  })

  it('reports missing sections for sparse profiles', () => {
    const result = computeProfileCompleteness({
      row: baseRow({
        phone: null,
        bio: null,
        portfolio_url: null,
        day_rate: null,
        timezone: null,
        languages: [],
        ai_summary: null,
      }),
      experienceCount: 0,
      documentCount: 0,
    })
    expect(result.score).toBeLessThan(60)
    expect(result.missing).toContain('bio')
    expect(result.missing).toContain('experience')
  })
})

describe('mapTalentProfile', () => {
  it('maps database row to API profile', () => {
    const profile = mapTalentProfile(baseRow())
    expect(profile.fullName).toBe('Jane Doe')
    expect(profile.employmentType).toBe('freelance')
    expect(profile.languages).toEqual([{ code: 'en', level: 'native' }])
  })
})

describe('TalentModuleService', () => {
  it('creates talent with audit and completeness', async () => {
    const row = baseRow({ profile_completeness: 80 })
    const repos = {
      talent: {
        createModule: vi.fn(async () => baseRow()),
        updateModule: vi.fn(async () => row),
      },
      talentExperience: { countByFreelancer: vi.fn(async () => 0) },
      talentDocument: { countByFreelancer: vi.fn(async () => 0) },
      talentAudit: { record: vi.fn(async () => undefined) },
      domainEvent: { emit: vi.fn(async () => undefined) },
    }

    const service = new TalentModuleService(repos as never)
    const talent = await service.createTalent('tenant-1', 'user-1', {
      full_name: 'Jane Doe',
      email: 'dev@example.com',
      discipline: 'engineering',
      skills: ['typescript'],
    })

    expect(talent.fullName).toBe('Jane Doe')
    expect(repos.talentAudit.record).toHaveBeenCalled()
    expect(repos.domainEvent.emit).toHaveBeenCalled()
  })

  it('matches skills via repository RPC', async () => {
    const repos = {
      talent: {
        matchSkills: vi.fn(async () => [
          {
            freelancer_id: 'talent-1',
            full_name: 'Jane Doe',
            discipline: 'engineering',
            day_rate: 500,
            internal_rating: 4.5,
            skill_match_count: 2,
            match_ratio: 1,
          },
        ]),
      },
    }

    const service = new TalentModuleService(repos as never)
    const matches = await service.matchSkills('tenant-1', ['typescript', 'react'])
    expect(matches[0].skillMatchCount).toBe(2)
    expect(matches[0].matchRatio).toBe(1)
  })

  it('returns error when updating missing talent', async () => {
    const repos = {
      talent: { findModuleById: vi.fn(async () => null) },
    }
    const service = new TalentModuleService(repos as never)
    const result = await service.updateTalent('tenant-1', 'user-1', 'missing', { bio: 'Updated' })
    expect(result.ok).toBe(false)
  })
})
