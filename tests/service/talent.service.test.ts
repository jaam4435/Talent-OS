import { describe, expect, it, vi } from 'vitest'
import { TalentService } from '@/lib/services/talent.service'
import { createMockRepositories } from '@/tests/helpers/mock-repositories'

describe('TalentService', () => {
  const tenantId = '11111111-1111-1111-1111-111111111111'

  it('searchRoster delegates to repository', async () => {
    const rows = [{ id: 'f-1', full_name: 'Alex' }]
    const repos = createMockRepositories({
      talent: {
        search: vi.fn().mockResolvedValue(rows),
      },
    } as never)

    const service = new TalentService(repos)
    const result = await service.searchRoster(tenantId, { query: 'alex', page: 1, limit: 10 })

    expect(result).toEqual(rows)
    expect(repos.talent.search).toHaveBeenCalledWith(
      tenantId,
      expect.objectContaining({ query: 'alex', limit: 10, offset: 0 })
    )
  })

  it('getTalentName returns repository value', async () => {
    const repos = createMockRepositories({
      talent: {
        findNameById: vi.fn().mockResolvedValue('Jordan'),
      },
    } as never)

    const service = new TalentService(repos)
    await expect(service.getTalentName('f-1')).resolves.toBe('Jordan')
  })
})
