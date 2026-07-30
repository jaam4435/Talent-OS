import { z } from 'zod'
import { isDomainError } from '@/modules/core/utils/errors'
import type { Repositories } from '@/lib/repositories/factory'
import type {
  BroadcastOpportunityInput,
  CreateOpportunityInput,
  OpportunityResponseInput,
} from '@/lib/opportunities/types'
import type { Tables } from '@/modules/core/types/database'
import type { NotificationService } from '@/lib/services/notification.service'
import type { WorkflowService } from '@/lib/services/workflow.service'

const createCompanySchema = z.object({
  name: z.string().min(1, 'Company name is required'),
  contactEmail: z.string().email().optional().or(z.literal('')),
  contactName: z.string().optional(),
  website: z.string().url().optional().or(z.literal('')),
})

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

export class CRMService {
  constructor(
    private readonly repos: Repositories,
    private readonly notifications: NotificationService,
    private readonly workflow: WorkflowService
  ) {}

  async listCompanies(tenantId: string) {
    return this.repos.company.listByTenant(tenantId)
  }

  async getCompanyById(companyId: string, tenantId: string) {
    return this.repos.company.findById(companyId, tenantId)
  }

  async createCompany(
    tenantId: string,
    input: z.infer<typeof createCompanySchema>
  ): Promise<{ ok: true; companyId: string } | { ok: false; error: string }> {
    const parsed = createCompanySchema.safeParse(input)
    if (!parsed.success) {
      return { ok: false, error: parsed.error.errors[0]?.message ?? 'Invalid input' }
    }

    try {
      const companyId = await this.repos.company.create({
        tenant_id: tenantId,
        name: parsed.data.name,
        slug: slugify(parsed.data.name),
        contact_email: parsed.data.contactEmail || null,
        contact_name: parsed.data.contactName || null,
        website: parsed.data.website || null,
      })
      return { ok: true, companyId }
    } catch (error) {
      if (isDomainError(error) && error.code === 'DUPLICATE') {
        return { ok: false, error: error.message }
      }
      return { ok: false, error: error instanceof Error ? error.message : 'Create failed' }
    }
  }

  async createOpportunity(
    tenantId: string,
    userId: string,
    tenantCurrency: string,
    input: CreateOpportunityInput
  ): Promise<{ ok: true; opportunityId: string } | { ok: false; error: string }> {
    let clientName = input.clientName ?? null
    if (input.companyId) {
      const name = await this.repos.company.findName(input.companyId, tenantId)
      if (name) clientName = name
    }

    try {
      const opportunityId = await this.repos.lead.create({
        tenant_id: tenantId,
        created_by: userId,
        title: input.title,
        description: input.description ?? null,
        budget: input.budget ?? null,
        currency: input.currency ?? tenantCurrency,
        required_skills: input.requiredSkills,
        discipline: input.discipline ?? null,
        client_name: clientName,
        company_id: input.companyId ?? null,
        deadline: input.deadline || null,
        response_deadline: input.responseDeadline || null,
        status: input.status ?? 'draft',
      })
      return { ok: true, opportunityId }
    } catch (error) {
      return { ok: false, error: error instanceof Error ? error.message : 'Create failed' }
    }
  }

  async respondToOpportunity(
    tenantId: string,
    userId: string | null,
    freelancerId: string,
    input: OpportunityResponseInput
  ): Promise<{ ok: true } | { ok: false; error: string }> {
    const recipient = await this.repos.lead.findRecipient(input.opportunityId, freelancerId)
    if (!recipient) {
      return { ok: false, error: 'You were not invited to this opportunity' }
    }

    try {
      await this.repos.lead.updateRecipient(recipient.id, {
        response: input.response,
        response_note: input.note ?? null,
        responded_at: new Date().toISOString(),
      })
    } catch (error) {
      return { ok: false, error: error instanceof Error ? error.message : 'Response failed' }
    }

    const opportunity = await this.repos.lead.findCreator(input.opportunityId)
    if (opportunity?.created_by) {
      await this.notifications.create({
        tenant_id: tenantId,
        user_id: opportunity.created_by,
        type: 'opportunity_response',
        title: 'New opportunity response',
        body: `${input.response} — ${opportunity.title}`,
        data: {
          opportunity_id: input.opportunityId,
          freelancer_id: freelancerId,
          response: input.response,
        },
      })
    }

    await this.workflow.emitEvent({
      tenantId,
      eventType: 'opportunity.response',
      aggregateType: 'opportunity',
      aggregateId: input.opportunityId,
      idempotencyKey: `opportunity-response:${input.opportunityId}:${freelancerId}`,
      actorId: userId,
      payload: {
        opportunity_id: input.opportunityId,
        freelancer_id: freelancerId,
        response: input.response,
        note: input.note ?? null,
        created_by: opportunity?.created_by ?? null,
      },
    })

    return { ok: true }
  }

  /** Respond to the freelancer's most recent pending opportunity invite (WhatsApp + unified path). */
  async respondToPendingOpportunity(
    tenantId: string,
    userId: string | null,
    freelancerId: string,
    response: 'interested' | 'declined',
    note: string
  ): Promise<
    | { ok: true; opportunityId: string; recipientId: string }
    | { ok: false; error: string }
  > {
    const recipient = await this.findPendingRecipient(tenantId, freelancerId)
    if (!recipient) {
      return { ok: false, error: 'no_pending_opportunity' }
    }

    const result = await this.respondToOpportunity(tenantId, userId, freelancerId, {
      opportunityId: recipient.opportunity_id,
      response,
      note,
    })

    if (!result.ok) {
      return result
    }

    return {
      ok: true,
      opportunityId: recipient.opportunity_id,
      recipientId: recipient.id,
    }
  }

  async getOpportunitiesForPage(tenantId: string) {
    const result = await this.repos.lead.listByTenant(tenantId)
    return result.data
  }

  async getOpportunityDetail(opportunityId: string, tenantId: string) {
    return this.repos.lead.findById(opportunityId, tenantId)
  }

  async getOpportunityPageData(
    opportunityId: string,
    tenantId: string,
    userId: string,
    isManager: boolean
  ) {
    const opportunity = await this.repos.lead.findById(opportunityId, tenantId)
    if (!opportunity) return null

    const recipients = await this.repos.lead.listRecipientsDetailed(opportunityId)
    const freelancerIds = recipients.map((r) => r.freelancer_id)

    const [freelancers, roster, ownFreelancerId] = await Promise.all([
      freelancerIds.length ? this.repos.talent.findByIds(freelancerIds, 'id, full_name, email') : [],
      isManager ? this.repos.talent.listBroadcastRoster(tenantId) : [],
      isManager ? null : this.repos.talent.findIdByUserId(userId, tenantId),
    ])

    const freelancerMap = new Map(freelancers.map((f) => [f.id as string, f]))
    const ownRecipient =
      !isManager && ownFreelancerId
        ? recipients.find((r) => r.freelancer_id === ownFreelancerId) ?? null
        : null

    return {
      opportunity: opportunity as Tables<'opportunities'>,
      recipients,
      freelancerMap,
      roster,
      ownRecipient,
      freelancerIds,
    }
  }

  async getShortlistPageHeader(opportunityId: string, tenantId: string) {
    const [opportunity, interestedCount] = await Promise.all([
      this.repos.lead.findShortlistHeader(opportunityId, tenantId),
      this.repos.lead.countByResponse(opportunityId, 'interested'),
    ])
    return { opportunity, interestedCount }
  }

  async getMatchContext(opportunityId: string) {
    return this.repos.lead.findMatchContext(opportunityId)
  }

  async listRecipientFreelancerIds(opportunityId: string) {
    return this.repos.lead.listRecipientFreelancerIds(opportunityId)
  }

  async updateRequirements(opportunityId: string, requirements: import('@/lib/integrations/ai/types').ParsedRequirements) {
    await this.repos.lead.updateRequirements(opportunityId, requirements as unknown as import('@/modules/core/types/database').Json)
  }

  async findBriefContext(opportunityId: string) {
    return this.repos.lead.findBriefContext(opportunityId)
  }

  async existsInTenant(opportunityId: string, tenantId: string) {
    return this.repos.lead.existsInTenant(opportunityId, tenantId)
  }

  async findRequirements(opportunityId: string, tenantId: string) {
    return this.repos.lead.findRequirements(opportunityId, tenantId)
  }

  async findShortlistSummaryContext(opportunityId: string) {
    return this.repos.lead.findShortlistSummaryContext(opportunityId)
  }

  async findPendingRecipient(tenantId: string, freelancerId: string) {
    return this.repos.lead.findPendingRecipient(tenantId, freelancerId)
  }

  async updateRecipientResponse(
    recipientId: string,
    patch: { response: string; responded_at: string; response_note?: string }
  ) {
    await this.repos.lead.updateRecipientResponse(recipientId, patch)
  }

  async markWhatsAppDelivered(recipientId: string) {
    await this.repos.lead.markWhatsAppDelivered(recipientId)
  }

  async updateRecipientWhatsAppSent(
    recipientId: string,
    patch: { whatsapp_sent_at: string; whatsapp_delivered: boolean }
  ) {
    await this.repos.lead.updateRecipientWhatsAppSent(recipientId, patch)
  }

  async searchCompanies(tenantId: string, query: string) {
    const companies = await this.listCompanies(tenantId)
    const q = query.toLowerCase()
    return companies.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        (c.contactName?.toLowerCase().includes(q) ?? false) ||
        (c.contactEmail?.toLowerCase().includes(q) ?? false)
    )
  }

  async updateCompany(
    companyId: string,
    tenantId: string,
    input: {
      name?: string
      contactEmail?: string
      contactName?: string
      website?: string
      notes?: string
    }
  ): Promise<{ ok: true } | { ok: false; error: string }> {
    const existing = await this.getCompanyById(companyId, tenantId)
    if (!existing) return { ok: false, error: 'Company not found' }

    await this.repos.company.update(companyId, tenantId, {
      name: input.name,
      contact_email: input.contactEmail ?? undefined,
      contact_name: input.contactName ?? undefined,
      website: input.website ?? undefined,
      notes: input.notes ?? undefined,
    })
    return { ok: true }
  }
}

export type { BroadcastOpportunityInput, CreateOpportunityInput }
