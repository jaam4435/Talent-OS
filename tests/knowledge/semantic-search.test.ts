import { describe, expect, it, vi } from 'vitest'
import { hybridSemanticSearch } from '@/lib/knowledge/semantic-search'

describe('hybridSemanticSearch', () => {
  it('merges FTS and vector hits with weighted scoring', async () => {
    const ftsSearch = vi.fn().mockResolvedValue([
      {
        id: 'entry-1',
        category: 'sop',
        title: 'Onboarding SOP',
        summary: 'Steps',
        content: 'Step one',
        entityType: null,
        entityId: null,
        rank: 0.8,
      },
      {
        id: 'entry-2',
        category: 'meeting_note',
        title: 'Kickoff',
        summary: null,
        content: 'Notes',
        entityType: null,
        entityId: null,
        rank: 0.5,
      },
    ])

    const vectorSearch = vi.fn().mockResolvedValue([
      {
        entry_id: 'entry-1',
        chunk_id: 'chunk-1',
        category: 'sop',
        title: 'Onboarding SOP',
        chunk_content: 'Step one details',
        similarity: 0.9,
      },
      {
        entry_id: 'entry-3',
        chunk_id: 'chunk-3',
        category: 'conversation',
        title: 'Client call',
        chunk_content: 'Discussed timeline',
        similarity: 0.85,
      },
    ])

    const embedQuery = vi.fn().mockResolvedValue([0.1, 0.2, 0.3])

    const results = await hybridSemanticSearch(
      { query: 'onboarding steps', limit: 5 },
      { ftsSearch, vectorSearch, embedQuery }
    )

    expect(embedQuery).toHaveBeenCalledWith('onboarding steps')
    expect(results.length).toBeGreaterThan(0)
    expect(results[0].id).toBe('entry-1')
    expect(results[0].matchSources).toContain('fts')
    expect(results[0].matchSources).toContain('vector')

    const vectorOnly = results.find((r) => r.id === 'entry-3')
    expect(vectorOnly?.matchSources).toEqual(['vector'])
  })

  it('respects limit', async () => {
    const ftsSearch = vi.fn().mockResolvedValue(
      Array.from({ length: 10 }, (_, i) => ({
        id: `e-${i}`,
        category: 'document' as const,
        title: `Doc ${i}`,
        summary: null,
        content: null,
        entityType: null,
        entityId: null,
        rank: 0.1 * i,
      }))
    )
    const vectorSearch = vi.fn().mockResolvedValue([])
    const embedQuery = vi.fn().mockResolvedValue([0.1])

    const results = await hybridSemanticSearch({ query: 'test', limit: 3 }, { ftsSearch, vectorSearch, embedQuery })
    expect(results).toHaveLength(3)
  })
})
