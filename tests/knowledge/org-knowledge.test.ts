import { describe, expect, it, vi } from 'vitest'
import { buildOrgKnowledgeMetadata, OrgKnowledgeStore } from '@/lib/knowledge/org-knowledge'
import { ORG_KNOWLEDGE_METADATA_KEYS } from '@/modules/knowledge/types'
import type { KnowledgeService } from '@/lib/services/knowledge.service'

describe('OrgKnowledgeStore', () => {
  function mockKnowledge(overrides: Partial<KnowledgeService> = {}): KnowledgeService {
    return {
      createEntry: vi.fn().mockResolvedValue({ ok: true, entryId: 'entry-new' }),
      findBySource: vi.fn().mockResolvedValue(null),
      ...overrides,
    } as unknown as KnowledgeService
  }

  it('buildOrgKnowledgeMetadata includes source fields', () => {
    const meta = buildOrgKnowledgeMetadata('conversation', {
      title: 'Test',
      sourceId: 'conv-1',
      sourceModule: 'whatsapp',
    })
    expect(meta[ORG_KNOWLEDGE_METADATA_KEYS.sourceType]).toBe('conversation')
    expect(meta[ORG_KNOWLEDGE_METADATA_KEYS.sourceId]).toBe('conv-1')
    expect(meta[ORG_KNOWLEDGE_METADATA_KEYS.sourceModule]).toBe('whatsapp')
    expect(meta[ORG_KNOWLEDGE_METADATA_KEYS.ingestedAt]).toBeTruthy()
  })

  it('storeMeeting creates meeting_note category', async () => {
    const knowledge = mockKnowledge()
    const store = new OrgKnowledgeStore(knowledge)

    await store.storeMeeting('tenant-1', 'user-1', { title: 'Standup', content: 'Updates' })

    expect(knowledge.createEntry).toHaveBeenCalledWith(
      'tenant-1',
      'user-1',
      expect.objectContaining({ category: 'meeting_note' })
    )
  })

  it('deduplicates by source_id', async () => {
    const knowledge = mockKnowledge({
      findBySource: vi.fn().mockResolvedValue({ id: 'existing-entry' }),
    })
    const store = new OrgKnowledgeStore(knowledge)

    const result = await store.storeAiResponse('tenant-1', null, {
      title: 'AI reply',
      content: 'Response text',
      sourceId: 'req-123',
    })

    expect(result).toEqual({ ok: true, entryId: 'existing-entry', deduplicated: true })
    expect(knowledge.createEntry).not.toHaveBeenCalled()
  })

  it('storeBrandGuide uses brand_guide category', async () => {
    const knowledge = mockKnowledge()
    const store = new OrgKnowledgeStore(knowledge)

    await store.storeBrandGuide('tenant-1', null, { title: 'Brand colors', content: 'Primary: blue' })

    expect(knowledge.createEntry).toHaveBeenCalledWith(
      'tenant-1',
      null,
      expect.objectContaining({ category: 'brand_guide' })
    )
  })
})
