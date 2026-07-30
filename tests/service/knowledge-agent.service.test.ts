import { describe, expect, it, vi, beforeEach } from 'vitest'
import { KnowledgeService } from '@/lib/services/knowledge.service'
import { AgentService } from '@/lib/services/agent.service'
import { createMockRepositories } from '@/tests/helpers/mock-repositories'
import { TEST_TENANT_ID, TEST_USER_ID, TEST_ENTRY_ID } from '@/tests/helpers/mock-supabase'
import { registerAgentPrompts } from '@/lib/ai/agent/instructions'

beforeEach(() => {
  registerAgentPrompts()
})

describe('KnowledgeService', () => {
  it('createEntry validates input', async () => {
    const repos = createMockRepositories()
    const service = new KnowledgeService(repos)

    const result = await service.createEntry(TEST_TENANT_ID, TEST_USER_ID, {
      category: 'sop',
      title: '',
    })

    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toBeTruthy()
  })

  it('createEntry creates chunks when content provided', async () => {
    const repos = createMockRepositories()
    const service = new KnowledgeService(repos)

    const result = await service.createEntry(TEST_TENANT_ID, TEST_USER_ID, {
      category: 'meeting_note',
      title: 'Standup',
      content: 'Discussion points',
    })

    expect(result.ok).toBe(true)
    expect(repos.knowledge.create).toHaveBeenCalled()
    expect(repos.knowledgeEmbedding.createChunks).toHaveBeenCalled()
  })

  it('createEntry skips embeddings when no content', async () => {
    const repos = createMockRepositories()
    const service = new KnowledgeService(repos)

    await service.createEntry(TEST_TENANT_ID, TEST_USER_ID, {
      category: 'document',
      title: 'Empty doc',
    })

    expect(repos.knowledge.updateEmbeddingStatus).toHaveBeenCalledWith(
      'entry-1',
      TEST_TENANT_ID,
      'skipped'
    )
    expect(repos.knowledgeEmbedding.createChunks).not.toHaveBeenCalled()
  })

  it('deleteEntry removes embeddings then entry', async () => {
    const repos = createMockRepositories()
    const service = new KnowledgeService(repos)

    const result = await service.deleteEntry(TEST_ENTRY_ID, TEST_TENANT_ID)
    expect(result.ok).toBe(true)
    expect(repos.knowledgeEmbedding.deleteByEntry).toHaveBeenCalledWith(TEST_ENTRY_ID, TEST_TENANT_ID)
    expect(repos.knowledge.delete).toHaveBeenCalledWith(TEST_ENTRY_ID, TEST_TENANT_ID)
  })

  it('search validates query', async () => {
    const repos = createMockRepositories()
    const service = new KnowledgeService(repos)

    const result = await service.search(TEST_TENANT_ID, { query: '' })
    expect(result.ok).toBe(false)
  })

  it('search returns results from repository', async () => {
    const repos = createMockRepositories({
      knowledge: {
        ...createMockRepositories().knowledge,
        search: vi.fn().mockResolvedValue([{ id: '1', title: 'Hit', category: 'sop', rank: 1 }]),
      } as never,
    })
    const service = new KnowledgeService(repos)

    const result = await service.search(TEST_TENANT_ID, { query: 'test' })
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.results).toHaveLength(1)
  })

  it('createMeetingNote sets category', async () => {
    const repos = createMockRepositories()
    const service = new KnowledgeService(repos)

    await service.createMeetingNote(TEST_TENANT_ID, TEST_USER_ID, { title: 'Call notes' })
    expect(repos.knowledge.create).toHaveBeenCalledWith(
      TEST_TENANT_ID,
      TEST_USER_ID,
      expect.objectContaining({ category: 'meeting_note' })
    )
  })
})

describe('AgentService', () => {
  it('listAgents returns all six agents', async () => {
    const repos = createMockRepositories()
    const service = new AgentService(repos)

    const agents = await service.listAgents(TEST_TENANT_ID)
    expect(agents).toHaveLength(6)
    expect(agents.map((a) => a.agentId)).toContain('recruiter')
    expect(agents.map((a) => a.agentId)).toContain('knowledge')
  })

  it('updateAgentConfig rejects invalid tools', async () => {
    const repos = createMockRepositories()
    const service = new AgentService(repos)

    const result = await service.updateAgentConfig(TEST_TENANT_ID, 'recruiter', {
      allowedTools: ['totally_fake_tool'],
    })
    expect(result.ok).toBe(false)
  })

  it('updateAgentConfig upserts valid config', async () => {
    const repos = createMockRepositories()
    const service = new AgentService(repos)

    const result = await service.updateAgentConfig(TEST_TENANT_ID, 'finance', {
      enabled: false,
    })
    expect(result.ok).toBe(true)
    expect(repos.agentConfig.upsert).toHaveBeenCalled()
  })

  it('prepareRun fails when agent disabled', async () => {
    const repos = createMockRepositories({
      agentConfig: {
        findByAgent: vi.fn().mockResolvedValue({
          id: 'cfg',
          tenant_id: TEST_TENANT_ID,
          agent_id: 'qa',
          enabled: false,
          instruction_prompt_id: 'agent.qa',
          instruction_version: '1.0.0',
          allowed_tools: [],
          required_permissions: ['agent:run'],
          memory_policy: { scope: 'session', maxEntries: 10 },
          model_override: null,
          metadata: {},
          created_at: '',
          updated_at: '',
        }),
        listByTenant: vi.fn().mockResolvedValue([]),
        upsert: vi.fn(),
        resetToDefaults: vi.fn(),
      } as never,
    })
    const service = new AgentService(repos)

    const result = await service.prepareRun(TEST_TENANT_ID, TEST_USER_ID, 'admin', {
      agentId: 'qa',
    })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toBe('Agent is disabled')
  })

  it('prepareRun assembles context for admin', async () => {
    const repos = createMockRepositories()
    const service = new AgentService(repos)

    const result = await service.prepareRun(TEST_TENANT_ID, TEST_USER_ID, 'admin', {
      agentId: 'knowledge',
    })

    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.context.sessionId).toBe('session-1')
      expect(result.context.instructions.promptId).toBe('agent.knowledge')
      expect(result.context.tools.length).toBeGreaterThan(0)
    }
  })
})
