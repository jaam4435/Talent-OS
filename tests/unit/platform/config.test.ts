import { describe, expect, it, vi } from 'vitest'
import { createConfigService } from '@/modules/platform/config/service'
import type { PlatformConfigRepository } from '@/lib/repositories/platform-config.repository'
import { deepMerge } from '@/modules/platform/config/schema'
import { TALENT_OS_DEFAULT_CONFIG } from '@/modules/platform/types'

function mockConfigRepo(rows: {
  platform?: Array<{ configKey: string; configValue: Record<string, unknown> }>
  org?: Array<{ configKey: string; configValue: Record<string, unknown> }>
}): PlatformConfigRepository {
  return {
    getConfig: vi.fn(),
    listConfig: vi.fn(async (tenantId) => {
      const source = tenantId === null ? rows.platform ?? [] : rows.org ?? []
      return source.map((row) => ({ ...row, tenantId }))
    }),
  } as unknown as PlatformConfigRepository
}

describe('ConfigService', () => {
  it('merges Talent OS default config', async () => {
    const service = createConfigService({})
    const merged = await service.getMerged()
    expect(merged.ai).toEqual(TALENT_OS_DEFAULT_CONFIG.ai)
  })

  it('org config overrides platform rows', async () => {
    const service = createConfigService({
      configRepo: mockConfigRepo({
        platform: [{ configKey: 'ai', configValue: { maxConcurrentRequests: 5 } }],
        org: [{ configKey: 'ai', configValue: { maxConcurrentRequests: 20 } }],
      }),
    })
    const merged = await service.getMerged({ organizationId: 'tenant-1' })
    expect((merged.ai as Record<string, unknown>).maxConcurrentRequests).toBe(20)
  })

  it('reads nested config keys via dot path', async () => {
    const service = createConfigService({})
    const result = await service.get<string>('ai.defaultProvider')
    expect(result.value).toBe('openai')
  })
})

describe('deepMerge', () => {
  it('deep merges nested objects', () => {
    const result = deepMerge(
      { ai: { provider: 'openai', limits: { max: 10 } } },
      { ai: { limits: { max: 20, min: 1 } } }
    )
    expect(result).toEqual({ ai: { provider: 'openai', limits: { max: 20, min: 1 } } })
  })
})
