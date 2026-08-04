import { describe, expect, it, vi } from 'vitest'
import { CrmDemandService } from '@/lib/services/crm-demand.service'

function createCrmDemandService(overrides: Partial<Record<string, unknown>> = {}) {
  const repos = {
    crmPipeline: {
      ensureDefaultStages: vi.fn(async () => undefined),
      listStages: vi.fn(async () => [
        { id: 'stage-1', name: 'Qualification', slug: 'qualification', sortOrder: 10, outcome: 'open', color: '#000' },
      ]),
      getFirstOpenStage: vi.fn(async () => ({
        id: 'stage-1',
        name: 'Qualification',
        slug: 'qualification',
        sortOrder: 10,
        outcome: 'open',
        color: '#000',
      })),
      findStageById: vi.fn(async () => ({
        id: 'stage-2',
        name: 'Proposal',
        slug: 'proposal',
        sortOrder: 20,
        outcome: 'open',
        color: '#111',
      })),
    },
    crmDeal: {
      listByStage: vi.fn(async () => []),
      create: vi.fn(async () => ({
        id: 'deal-1',
        title: 'Deal',
        value: 1000,
        currency: 'USD',
        stageId: 'stage-1',
        companyId: 'co-1',
        leadId: 'lead-1',
        opportunityId: null,
        ownerId: 'user-1',
        expectedCloseDate: null,
        probability: null,
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      })),
      findById: vi.fn(async () => ({
        id: 'deal-1',
        title: 'Deal',
        value: 1000,
        currency: 'USD',
        stageId: 'stage-1',
        companyId: null,
        leadId: null,
        opportunityId: null,
        ownerId: null,
        expectedCloseDate: null,
        probability: null,
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      })),
      update: vi.fn(async () => ({
        id: 'deal-1',
        title: 'Deal',
        value: 1000,
        currency: 'USD',
        stageId: 'stage-2',
        stageName: 'Proposal',
        companyId: null,
        leadId: null,
        opportunityId: null,
        ownerId: null,
        expectedCloseDate: null,
        probability: null,
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      })),
    },
    crmLead: {
      findById: vi.fn(async () => ({
        id: 'lead-1',
        title: 'Inbound lead',
        source: 'web',
        status: 'qualified',
        companyId: null,
        contactId: null,
        ownerId: 'user-1',
        valueEstimate: 5000,
        currency: 'USD',
        description: null,
        convertedAt: null,
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      })),
      update: vi.fn(async () => ({
        id: 'lead-1',
        title: 'Inbound lead',
        source: 'web',
        status: 'converted',
        companyId: 'co-1',
        contactId: null,
        ownerId: 'user-1',
        valueEstimate: 5000,
        currency: 'USD',
        description: null,
        convertedAt: '2026-01-02T00:00:00.000Z',
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-02T00:00:00.000Z',
      })),
    },
    crmCompany: {
      create: vi.fn(async () => ({
        id: 'co-1',
        name: 'Inbound lead',
        slug: 'inbound-lead',
        status: 'client',
        contactEmail: null,
        contactName: null,
        website: null,
        industry: null,
        notes: null,
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      })),
      update: vi.fn(),
    },
    crmAudit: { record: vi.fn(async () => undefined) },
    domainEvent: { emit: vi.fn(async () => 'evt-1') },
    ...overrides,
  }

  const notifications = { create: vi.fn(async () => undefined) }
  return { service: new CrmDemandService(repos as never, notifications as never), repos, notifications }
}

describe('CrmDemandService.getPipelineBoard', () => {
  it('returns kanban columns with totals', async () => {
    const { service } = createCrmDemandService()
    const board = await service.getPipelineBoard('tenant-1')
    expect(board.stages).toHaveLength(1)
    expect(board.totals.count).toBe(0)
  })
})

describe('CrmDemandService.convertLead', () => {
  it('converts lead to company and deal', async () => {
    const { service, repos, notifications } = createCrmDemandService()
    const result = await service.convertLead('tenant-1', 'user-1', 'lead-1', {
      markClient: true,
    })

    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.companyId).toBe('co-1')
      expect(result.dealId).toBe('deal-1')
    }
    expect(repos.crmAudit.record).toHaveBeenCalled()
    expect(repos.domainEvent.emit).toHaveBeenCalled()
    expect(notifications.create).toHaveBeenCalled()
  })

  it('rejects already converted lead', async () => {
    const { service } = createCrmDemandService({
      crmLead: {
        findById: vi.fn(async () => ({
          id: 'lead-1',
          title: 'Done',
          source: null,
          status: 'converted',
          companyId: 'co-1',
          contactId: null,
          ownerId: null,
          valueEstimate: null,
          currency: 'USD',
          description: null,
          convertedAt: '2026-01-01',
          createdAt: '2026-01-01',
          updatedAt: '2026-01-01',
        })),
      },
    })

    const result = await service.convertLead('tenant-1', 'user-1', 'lead-1', {})
    expect(result).toEqual({ ok: false, error: 'Lead already converted' })
  })
})

describe('CrmDemandService.moveDealStage', () => {
  it('moves deal and emits audit/event', async () => {
    const { service, repos } = createCrmDemandService()
    const result = await service.moveDealStage('tenant-1', 'user-1', 'deal-1', 'stage-2')
    expect(result.ok).toBe(true)
    expect(repos.crmDeal.update).toHaveBeenCalled()
    expect(repos.crmAudit.record).toHaveBeenCalled()
  })
})
