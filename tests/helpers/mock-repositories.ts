import { vi } from 'vitest'
import type { Repositories } from '@/lib/repositories/factory'

/** Minimal mock repositories for service-layer tests. */
export function createMockRepositories(overrides: Partial<Repositories> = {}): Repositories {
  const defaults: Partial<Repositories> = {
    knowledge: {
      create: vi.fn().mockResolvedValue('entry-1'),
      findById: vi.fn().mockResolvedValue(null),
      update: vi.fn().mockResolvedValue(undefined),
      delete: vi.fn().mockResolvedValue(undefined),
      search: vi.fn().mockResolvedValue([]),
      updateEmbeddingStatus: vi.fn().mockResolvedValue(undefined),
      listByCategory: vi.fn().mockResolvedValue({ data: [], page: 1, limit: 20, hasMore: false }),
    } as unknown as Repositories['knowledge'],
    knowledgeEmbedding: {
      createChunks: vi.fn().mockResolvedValue(['chunk-1']),
      deleteByEntry: vi.fn().mockResolvedValue(undefined),
      listByEntry: vi.fn().mockResolvedValue([]),
      storeVector: vi.fn().mockResolvedValue(undefined),
      countIndexedByEntry: vi.fn().mockResolvedValue(0),
    } as unknown as Repositories['knowledgeEmbedding'],
    agentConfig: {
      findByAgent: vi.fn().mockResolvedValue(null),
      listByTenant: vi.fn().mockResolvedValue([]),
      upsert: vi.fn(),
      resetToDefaults: vi.fn().mockResolvedValue(undefined),
    } as unknown as Repositories['agentConfig'],
    agentInstruction: {
      getActiveInstruction: vi.fn().mockResolvedValue(null),
    } as unknown as Repositories['agentInstruction'],
    agentSession: {
      create: vi.fn().mockResolvedValue('session-1'),
      findById: vi.fn().mockResolvedValue(null),
      updateStatus: vi.fn().mockResolvedValue(undefined),
    } as unknown as Repositories['agentSession'],
    agentMemory: {
      list: vi.fn().mockResolvedValue([]),
      upsert: vi.fn().mockResolvedValue('memory-1'),
      deleteByScope: vi.fn().mockResolvedValue(undefined),
    } as unknown as Repositories['agentMemory'],
  }

  return { ...defaults, ...overrides } as Repositories
}
