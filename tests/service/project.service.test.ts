import { describe, expect, it, vi } from 'vitest'
import { ProjectService } from '@/lib/services/project.service'
import { createMockRepositories } from '@/tests/helpers/mock-repositories'

describe('ProjectService', () => {
  it('findById delegates to repository', async () => {
    const project = { id: 'p-1', title: 'Website redesign' }
    const repos = createMockRepositories({
      project: {
        findById: vi.fn().mockResolvedValue(project),
      },
    } as never)

    const workflow = { emitEvent: vi.fn() }
    const service = new ProjectService(repos, workflow as never)

    await expect(service.findById('p-1', 't-1')).resolves.toEqual(project)
  })
})
