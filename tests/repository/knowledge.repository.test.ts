import { describe, expect, it, vi } from 'vitest'
import { KnowledgeRepository } from '@/lib/repositories/knowledge.repository'
import { createMockSupabase, TEST_TENANT_ID, TEST_ENTRY_ID, TEST_USER_ID } from '@/tests/helpers/mock-supabase'

describe('KnowledgeRepository', () => {
  it('create inserts entry and returns id', async () => {
    const supabase = createMockSupabase({
      knowledge_entries: { data: { id: TEST_ENTRY_ID }, error: null },
    })
    const repo = new KnowledgeRepository({ supabase: supabase as never })

    const id = await repo.create(TEST_TENANT_ID, TEST_USER_ID, {
      category: 'sop',
      title: 'Test SOP',
      content: 'Content',
    })

    expect(id).toBe(TEST_ENTRY_ID)
    expect(supabase.from).toHaveBeenCalledWith('knowledge_entries')
  })

  it('findById returns mapped row', async () => {
    const supabase = createMockSupabase({
      knowledge_entries: {
        data: {
          id: TEST_ENTRY_ID,
          tenant_id: TEST_TENANT_ID,
          category: 'sop',
          title: 'Test',
          content: 'Body',
          summary: null,
          entity_type: null,
          entity_id: null,
          company_id: null,
          project_id: null,
          opportunity_id: null,
          freelancer_id: null,
          milestone_id: null,
          storage_bucket: null,
          storage_path: null,
          mime_type: null,
          file_size_bytes: null,
          tags: [],
          metadata: {},
          embedding_status: 'pending',
          created_by: TEST_USER_ID,
          updated_by: TEST_USER_ID,
          created_at: '2026-01-01T00:00:00Z',
          updated_at: '2026-01-01T00:00:00Z',
        },
        error: null,
      },
    })
    const repo = new KnowledgeRepository({ supabase: supabase as never })

    const entry = await repo.findById(TEST_ENTRY_ID, TEST_TENANT_ID)
    expect(entry?.title).toBe('Test')
    expect(entry?.category).toBe('sop')
  })

  it('findById returns null when not found', async () => {
    const supabase = createMockSupabase({
      knowledge_entries: { data: null, error: null },
    })
    const repo = new KnowledgeRepository({ supabase: supabase as never })

    const entry = await repo.findById('missing', TEST_TENANT_ID)
    expect(entry).toBeNull()
  })

  it('search calls RPC with params', async () => {
    const supabase = createMockSupabase({
      'rpc:search_knowledge_entries': {
        data: [
          {
            id: TEST_ENTRY_ID,
            category: 'sop',
            title: 'Result',
            summary: null,
            content: 'snippet',
            entity_type: null,
            entity_id: null,
            rank: 0.9,
          },
        ],
        error: null,
      },
    })
    const repo = new KnowledgeRepository({ supabase: supabase as never })

    const results = await repo.search(TEST_TENANT_ID, { query: 'test' })
    expect(results).toHaveLength(1)
    expect(results[0].title).toBe('Result')
    expect(results[0].rank).toBe(0.9)
    expect(supabase.rpc).toHaveBeenCalledWith(
      'search_knowledge_entries',
      expect.objectContaining({ p_tenant_id: TEST_TENANT_ID, p_query: 'test' })
    )
  })

  it('listByCategory returns paginated results', async () => {
    const row = {
      id: TEST_ENTRY_ID,
      tenant_id: TEST_TENANT_ID,
      category: 'document',
      title: 'Doc',
      content: null,
      summary: null,
      entity_type: null,
      entity_id: null,
      company_id: null,
      project_id: null,
      opportunity_id: null,
      freelancer_id: null,
      milestone_id: null,
      storage_bucket: null,
      storage_path: null,
      mime_type: null,
      file_size_bytes: null,
      tags: [],
      metadata: {},
      embedding_status: 'skipped',
      created_by: null,
      updated_by: null,
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-01T00:00:00Z',
    }

    const supabase = createMockSupabase({
      knowledge_entries: { data: [row], error: null, count: 1 },
    })
    const repo = new KnowledgeRepository({ supabase: supabase as never })

    const page = await repo.listByCategory(TEST_TENANT_ID, 'document', { page: 1, limit: 20 })
    expect(page.data).toHaveLength(1)
    expect(page.total).toBe(1)
    expect(page.hasMore).toBe(false)
  })

  it('updateEmbeddingStatus updates without error', async () => {
    const supabase = createMockSupabase({
      knowledge_entries: { data: null, error: null },
    })
    const repo = new KnowledgeRepository({ supabase: supabase as never })

    await expect(
      repo.updateEmbeddingStatus(TEST_ENTRY_ID, TEST_TENANT_ID, 'indexed')
    ).resolves.toBeUndefined()
  })
})

describe('AgentConfigRepository', () => {
  it('findByAgent returns null when no config', async () => {
    const { AgentConfigRepository } = await import('@/lib/repositories/agent.repository')
    const supabase = createMockSupabase({
      agent_configs: { data: null, error: null },
    })
    const repo = new AgentConfigRepository({ supabase: supabase as never })

    const config = await repo.findByAgent(TEST_TENANT_ID, 'recruiter')
    expect(config).toBeNull()
  })
})
