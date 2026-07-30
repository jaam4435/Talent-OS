import { describe, expect, it, vi } from 'vitest'
import { CRMService } from '@/lib/services/crm.service'
import { createMockRepositories } from '@/tests/helpers/mock-repositories'

describe('CRMService', () => {
  it('getCompanyById delegates to repository', async () => {
    const company = { id: 'c-1', name: 'Acme' }
    const repos = createMockRepositories({
      company: {
        findById: vi.fn().mockResolvedValue(company),
      },
    } as never)

    const notifications = { create: vi.fn() }
    const workflow = { emitEvent: vi.fn() }
    const service = new CRMService(repos, notifications as never, workflow as never)

    await expect(service.getCompanyById('c-1', 't-1')).resolves.toEqual(company)
  })
})
