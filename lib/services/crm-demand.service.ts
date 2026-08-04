import type { Repositories } from '@/lib/repositories/factory'
import { CRM_EVENT_TYPES, type CrmActivityType, type CrmDeal, type CrmLead, type CrmPipelineBoard } from '@/modules/crm/types'
import type { PaginatedResult } from '@/lib/repositories/base/types'
import type { NotificationService } from '@/lib/services/notification.service'
import { DomainError, ErrorCodes } from '@/modules/core/utils/errors'

export class CrmDemandService {
  constructor(
    private readonly repos: Repositories,
    private readonly notifications: NotificationService
  ) {}

  async ensurePipeline(tenantId: string) {
    await this.repos.crmPipeline.ensureDefaultStages(tenantId)
  }

  async getPipelineBoard(tenantId: string): Promise<CrmPipelineBoard> {
    await this.ensurePipeline(tenantId)
    const stages = await this.repos.crmPipeline.listStages(tenantId)
    const columns = await Promise.all(
      stages.map(async (stage) => ({
        ...stage,
        deals: await this.repos.crmDeal.listByStage(tenantId, stage.id),
      }))
    )
    const allDeals = columns.flatMap((c) => c.deals)
    return {
      stages: columns,
      totals: {
        count: allDeals.length,
        value: allDeals.reduce((sum, d) => sum + (d.value ?? 0), 0),
      },
    }
  }

  async listLeads(tenantId: string, options: Parameters<typeof this.repos.crmLead.list>[1]) {
    return this.repos.crmLead.list(tenantId, options)
  }

  async getLead(tenantId: string, id: string) {
    return this.repos.crmLead.findById(id, tenantId)
  }

  async createLead(
    tenantId: string,
    actorId: string,
    input: Parameters<typeof this.repos.crmLead.create>[0]
  ) {
    const lead = await this.repos.crmLead.create({ ...input, tenant_id: tenantId })
    await this.auditAndEmit({
      tenantId,
      actorId,
      action: 'crm.lead.created',
      entityType: 'lead',
      entityId: lead.id,
      eventType: CRM_EVENT_TYPES.LEAD_CREATED,
      afterState: { title: lead.title, status: lead.status },
    })
    return lead
  }

  async updateLead(
    tenantId: string,
    actorId: string,
    id: string,
    patch: Record<string, unknown>
  ): Promise<{ ok: true; lead: CrmLead } | { ok: false; error: string }> {
    const current = await this.repos.crmLead.findById(id, tenantId)
    if (!current) return { ok: false, error: 'Lead not found' }

    const lead = await this.repos.crmLead.update(id, tenantId, patch)
    await this.auditAndEmit({
      tenantId,
      actorId,
      action: 'crm.lead.updated',
      entityType: 'lead',
      entityId: id,
      eventType: CRM_EVENT_TYPES.LEAD_STATUS_CHANGED,
      beforeState: { status: current.status, title: current.title },
      afterState: { status: lead.status, title: lead.title },
    })
    return { ok: true, lead }
  }

  async convertLead(
    tenantId: string,
    actorId: string,
    leadId: string,
    options: {
      createCompany?: boolean
      companyName?: string
      createDeal?: boolean
      dealTitle?: string
      dealValue?: number | null
      markClient?: boolean
    }
  ): Promise<
    | { ok: true; lead: CrmLead; companyId: string | null; dealId: string | null }
    | { ok: false; error: string }
  > {
    const lead = await this.repos.crmLead.findById(leadId, tenantId)
    if (!lead) return { ok: false, error: 'Lead not found' }
    if (lead.status === 'converted') return { ok: false, error: 'Lead already converted' }

    await this.ensurePipeline(tenantId)

    let companyId = lead.companyId
    if (options.createCompany !== false) {
      if (!companyId) {
        const company = await this.repos.crmCompany.create({
          tenant_id: tenantId,
          name: options.companyName ?? lead.title,
          status: options.markClient ? 'client' : 'prospect',
        })
        companyId = company.id
      } else if (options.markClient) {
        await this.repos.crmCompany.update(companyId, tenantId, { status: 'client' })
      }
    }

    let dealId: string | null = null
    if (options.createDeal !== false) {
      const stage = await this.repos.crmPipeline.getFirstOpenStage(tenantId)
      if (!stage) return { ok: false, error: 'Pipeline not configured' }

      const deal = await this.repos.crmDeal.create({
        tenant_id: tenantId,
        title: options.dealTitle ?? lead.title,
        value: options.dealValue ?? lead.valueEstimate,
        currency: lead.currency,
        stage_id: stage.id,
        company_id: companyId,
        lead_id: leadId,
        owner_id: lead.ownerId,
      })
      dealId = deal.id
    }

    const converted = await this.repos.crmLead.update(leadId, tenantId, {
      status: 'converted',
      converted_at: new Date().toISOString(),
      converted_company_id: companyId,
      converted_deal_id: dealId,
      company_id: companyId,
    })

    await this.auditAndEmit({
      tenantId,
      actorId,
      action: 'crm.lead.converted',
      entityType: 'lead',
      entityId: leadId,
      eventType: CRM_EVENT_TYPES.LEAD_CONVERTED,
      afterState: { companyId, dealId, status: 'converted' },
    })

    if (lead.ownerId) {
      await this.notifications.create({
        tenant_id: tenantId,
        user_id: lead.ownerId,
        type: 'system',
        title: 'Lead converted',
        body: `"${lead.title}" converted to ${options.markClient ? 'client' : 'company/deal'}.`,
        data: { lead_id: leadId, company_id: companyId, deal_id: dealId },
      })
    }

    return { ok: true, lead: converted, companyId, dealId }
  }

  async listCompanies(tenantId: string, options: Parameters<typeof this.repos.crmCompany.list>[1]) {
    return this.repos.crmCompany.list(tenantId, options)
  }

  async getCompany(tenantId: string, id: string) {
    return this.repos.crmCompany.findById(id, tenantId)
  }

  async createCompany(
    tenantId: string,
    actorId: string,
    input: Omit<Parameters<typeof this.repos.crmCompany.create>[0], 'tenant_id'>
  ) {
    const company = await this.repos.crmCompany.create({ ...input, tenant_id: tenantId })
    await this.auditAndEmit({
      tenantId,
      actorId,
      action: 'crm.company.created',
      entityType: 'company',
      entityId: company.id,
      eventType: CRM_EVENT_TYPES.COMPANY_CREATED,
      afterState: { name: company.name, status: company.status },
    })
    return company
  }

  async updateCompany(
    tenantId: string,
    actorId: string,
    id: string,
    patch: Parameters<typeof this.repos.crmCompany.update>[2]
  ) {
    const current = await this.repos.crmCompany.findById(id, tenantId)
    if (!current) return { ok: false as const, error: 'Company not found' }

    const company = await this.repos.crmCompany.update(id, tenantId, patch)
    await this.auditAndEmit({
      tenantId,
      actorId,
      action: 'crm.company.updated',
      entityType: 'company',
      entityId: id,
      eventType: CRM_EVENT_TYPES.COMPANY_UPDATED,
      beforeState: { status: current.status, name: current.name },
      afterState: { status: company.status, name: company.name },
    })
    return { ok: true as const, company }
  }

  async listContacts(tenantId: string, options: Parameters<typeof this.repos.crmContact.list>[1]) {
    return this.repos.crmContact.list(tenantId, options)
  }

  async createContact(
    tenantId: string,
    actorId: string,
    input: Omit<Parameters<typeof this.repos.crmContact.create>[0], 'tenant_id'>
  ) {
    const contact = await this.repos.crmContact.create({ ...input, tenant_id: tenantId })
    await this.auditAndEmit({
      tenantId,
      actorId,
      action: 'crm.contact.created',
      entityType: 'contact',
      entityId: contact.id,
      eventType: CRM_EVENT_TYPES.CONTACT_CREATED,
      afterState: { name: `${contact.firstName} ${contact.lastName ?? ''}`.trim() },
    })
    return contact
  }

  async listDeals(tenantId: string, options: Parameters<typeof this.repos.crmDeal.list>[1]) {
    return this.repos.crmDeal.list(tenantId, options)
  }

  async getDeal(tenantId: string, id: string) {
    return this.repos.crmDeal.findById(id, tenantId)
  }

  async createDeal(
    tenantId: string,
    actorId: string,
    input: Record<string, unknown>
  ): Promise<{ ok: true; deal: CrmDeal } | { ok: false; error: string }> {
    await this.ensurePipeline(tenantId)
    let stageId = input.stage_id as string | undefined
    if (!stageId) {
      const stage = await this.repos.crmPipeline.getFirstOpenStage(tenantId)
      if (!stage) return { ok: false, error: 'Pipeline not configured' }
      stageId = stage.id
    }

    const deal = await this.repos.crmDeal.create({
      tenant_id: tenantId,
      title: input.title,
      value: input.value ?? null,
      currency: input.currency ?? 'USD',
      stage_id: stageId,
      company_id: input.company_id ?? null,
      lead_id: input.lead_id ?? null,
      opportunity_id: input.opportunity_id ?? null,
      owner_id: input.owner_id ?? actorId,
      expected_close_date: input.expected_close_date ?? null,
      probability: input.probability ?? null,
    })

    await this.auditAndEmit({
      tenantId,
      actorId,
      action: 'crm.deal.created',
      entityType: 'deal',
      entityId: deal.id,
      eventType: CRM_EVENT_TYPES.DEAL_CREATED,
      afterState: { title: deal.title, stageId: deal.stageId },
    })
    return { ok: true, deal }
  }

  async moveDealStage(
    tenantId: string,
    actorId: string,
    dealId: string,
    stageId: string
  ): Promise<{ ok: true; deal: CrmDeal } | { ok: false; error: string }> {
    const current = await this.repos.crmDeal.findById(dealId, tenantId)
    if (!current) return { ok: false, error: 'Deal not found' }

    const stage = await this.repos.crmPipeline.findStageById(stageId, tenantId)
    if (!stage) return { ok: false, error: 'Stage not found' }

    const deal = await this.repos.crmDeal.update(dealId, tenantId, { stage_id: stageId })
    await this.auditAndEmit({
      tenantId,
      actorId,
      action: 'crm.deal.stage_changed',
      entityType: 'deal',
      entityId: dealId,
      eventType: CRM_EVENT_TYPES.DEAL_STAGE_CHANGED,
      beforeState: { stageId: current.stageId },
      afterState: { stageId, stageName: stage.name },
    })
    return { ok: true, deal }
  }

  async listOpportunities(tenantId: string, options?: { page?: number; limit?: number; q?: string; status?: string }) {
    const result = await this.repos.lead.listByTenant(tenantId, options)
    return result
  }

  async listContracts(tenantId: string, options: Parameters<typeof this.repos.crmContract.list>[1]) {
    return this.repos.crmContract.list(tenantId, options)
  }

  async createContract(tenantId: string, actorId: string, input: Record<string, unknown>) {
    const status = (input.status as string | undefined) ?? 'draft'
    if (status === 'signed' && !input.signed_at) {
      throw new DomainError(ErrorCodes.VALIDATION, 'signed_at is required when status is signed')
    }

    const contract = await this.repos.crmContract.create({ ...input, tenant_id: tenantId })
    await this.auditAndEmit({
      tenantId,
      actorId,
      action: 'crm.contract.created',
      entityType: 'contract',
      entityId: contract.id,
      eventType: CRM_EVENT_TYPES.CONTRACT_CREATED,
      afterState: { title: contract.title, status: contract.status },
    })
    return contract
  }

  async createNote(tenantId: string, actorId: string, input: { entity_type: string; entity_id: string; body: string }) {
    const note = await this.repos.crmNote.create({
      tenant_id: tenantId,
      entity_type: input.entity_type,
      entity_id: input.entity_id,
      author_id: actorId,
      body: input.body,
    })
    await this.auditAndEmit({
      tenantId,
      actorId,
      action: 'crm.note.created',
      entityType: 'note',
      entityId: note.id,
      eventType: CRM_EVENT_TYPES.NOTE_CREATED,
      afterState: { entityType: input.entity_type, entityId: input.entity_id },
    })
    return note
  }

  async listNotes(tenantId: string, entityType: string, entityId: string, options?: { page?: number; limit?: number }) {
    return this.repos.crmNote.listByEntity(tenantId, entityType, entityId, options)
  }

  async createAttachment(tenantId: string, actorId: string, input: Record<string, unknown>) {
    return this.repos.crmAttachment.create({
      tenant_id: tenantId,
      uploaded_by: actorId,
      entity_type: input.entity_type,
      entity_id: input.entity_id,
      file_name: input.file_name,
      file_path: input.file_path,
      mime_type: input.mime_type ?? null,
      size_bytes: input.size_bytes ?? null,
    })
  }

  async listAttachments(tenantId: string, entityType: string, entityId: string) {
    return this.repos.crmAttachment.listByEntity(tenantId, entityType, entityId)
  }

  async logActivity(
    tenantId: string,
    actorId: string,
    input: {
      entity_type: string
      entity_id: string
      activity_type: CrmActivityType
      subject: string
      description?: string | null
      occurred_at?: string
    }
  ) {
    const activity = await this.repos.crmActivity.create({
      tenant_id: tenantId,
      entity_type: input.entity_type,
      entity_id: input.entity_id,
      activity_type: input.activity_type,
      subject: input.subject,
      description: input.description ?? null,
      actor_id: actorId,
      occurred_at: input.occurred_at,
    })
    await this.auditAndEmit({
      tenantId,
      actorId,
      action: 'crm.activity.logged',
      entityType: 'activity',
      entityId: activity.id,
      eventType: CRM_EVENT_TYPES.ACTIVITY_LOGGED,
      afterState: { subject: activity.subject, entityType: input.entity_type },
    })
    return activity
  }

  async listActivities(
    tenantId: string,
    entityType: string,
    entityId: string,
    options?: { page?: number; limit?: number }
  ) {
    return this.repos.crmActivity.listByEntity(tenantId, entityType, entityId, options)
  }

  async listAuditLogs(tenantId: string, options: Parameters<typeof this.repos.crmAudit.list>[1]) {
    return this.repos.crmAudit.list(tenantId, options)
  }

  private async auditAndEmit(input: {
    tenantId: string
    actorId: string
    action: string
    entityType: string
    entityId: string
    eventType: string
    beforeState?: Record<string, unknown> | null
    afterState?: Record<string, unknown> | null
  }) {
    await this.repos.crmAudit.record({
      tenant_id: input.tenantId,
      actor_id: input.actorId,
      action: input.action,
      entity_type: input.entityType,
      entity_id: input.entityId,
      before_state: input.beforeState ?? null,
      after_state: input.afterState ?? null,
    })

    await this.repos.domainEvent.emit({
      tenantId: input.tenantId,
      eventType: input.eventType,
      aggregateType: input.entityType,
      aggregateId: input.entityId,
      idempotencyKey: `${input.eventType}:${input.entityId}:${Date.now()}`,
      payload: {
        action: input.action,
        before: input.beforeState ?? null,
        after: input.afterState ?? null,
      },
      actorId: input.actorId,
    })
  }
}
