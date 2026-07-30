import { BaseRepository } from '@/lib/repositories/base/base.repository'
import type { PaginationParams, PaginatedResult } from '@/lib/repositories/base/types'
import { toPaginatedResult } from '@/lib/repositories/base/types'
import type { Tables, Json } from '@/modules/core/types/database'

export type LeadRow = Tables<'opportunities'>
export type LeadRecipientRow = Tables<'opportunity_recipients'>

export interface CreateLeadInput {
  tenant_id: string
  created_by: string
  title: string
  description?: string | null
  budget?: number | null
  currency: string
  required_skills: string[]
  discipline?: string | null
  client_name?: string | null
  company_id?: string | null
  deadline?: string | null
  response_deadline?: string | null
  status: string
}

export interface LeadListItem {
  id: string
  title: string
  status: string
  budget: number | null
  currency: string
  client_name: string | null
  response_deadline: string | null
}

export class LeadRepository extends BaseRepository {
  async create(input: CreateLeadInput): Promise<string> {
    const { data, error } = await this.ctx.supabase
      .from('opportunities')
      .insert(input)
      .select('id')
      .single()

    this.throwIfError(error)
    this.invalidateTable('opportunities')
    if (!data?.id) this.notFound('Opportunity')
    return data.id
  }

  async findById(opportunityId: string, tenantId: string): Promise<LeadRow | null> {
    const { data } = await this.ctx.supabase
      .from('opportunities')
      .select('*')
      .eq('id', opportunityId)
      .eq('tenant_id', tenantId)
      .maybeSingle()
    return data ?? null
  }

  async findBroadcastContext(opportunityId: string, tenantId: string) {
    const { data } = await this.ctx.supabase
      .from('opportunities')
      .select('id, title, description, budget, currency, status, response_deadline')
      .eq('id', opportunityId)
      .eq('tenant_id', tenantId)
      .maybeSingle()
    return data ?? null
  }

  async updateStatus(opportunityId: string, status: string): Promise<void> {
    const { error } = await this.ctx.supabase
      .from('opportunities')
      .update({ status })
      .eq('id', opportunityId)
    this.throwIfError(error)
    this.invalidateTable('opportunities')
  }

  async updateRequirements(opportunityId: string, requirements: Json): Promise<void> {
    const { error } = await this.ctx.supabase
      .from('opportunities')
      .update({ requirements: requirements as never })
      .eq('id', opportunityId)
    this.throwIfError(error)
    this.invalidateTable('opportunities')
  }

  async findRequirements(opportunityId: string, tenantId: string) {
    const { data } = await this.ctx.supabase
      .from('opportunities')
      .select('requirements')
      .eq('id', opportunityId)
      .eq('tenant_id', tenantId)
      .maybeSingle()
    return data?.requirements ?? null
  }

  async findBriefContext(opportunityId: string) {
    const { data } = await this.ctx.supabase
      .from('opportunities')
      .select('id, tenant_id, title, description, budget, currency')
      .eq('id', opportunityId)
      .maybeSingle()
    return data ?? null
  }

  async findShortlistSummaryContext(opportunityId: string) {
    const { data } = await this.ctx.supabase
      .from('opportunities')
      .select('title, description, required_skills')
      .eq('id', opportunityId)
      .maybeSingle()
    return data ?? null
  }

  async listByTenant(tenantId: string, pagination?: PaginationParams): Promise<PaginatedResult<LeadListItem>> {
    const { limit, offset, page } = this.paginate({ ...pagination, limit: pagination?.limit ?? 50 })
    const { data, count, error } = await this.ctx.supabase
      .from('opportunities')
      .select('id, title, status, budget, currency, client_name, response_deadline', { count: 'exact' })
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    this.throwIfError(error)
    return toPaginatedResult((data ?? []) as LeadListItem[], { limit, page }, count ?? undefined)
  }

  async existsInTenant(opportunityId: string, tenantId: string): Promise<boolean> {
    const { data } = await this.ctx.supabase
      .from('opportunities')
      .select('id')
      .eq('id', opportunityId)
      .eq('tenant_id', tenantId)
      .maybeSingle()
    return Boolean(data)
  }

  async findCreator(opportunityId: string): Promise<{ created_by: string; title: string } | null> {
    const { data } = await this.ctx.supabase
      .from('opportunities')
      .select('created_by, title')
      .eq('id', opportunityId)
      .maybeSingle()
    return data ?? null
  }

  // --- Recipients ---

  async upsertRecipients(
    rows: Array<{
      opportunity_id: string
      freelancer_id: string
      tenant_id: string
      response: string
    }>
  ): Promise<Array<{ id: string; freelancer_id: string }>> {
    const { data, error } = await this.ctx.supabase
      .from('opportunity_recipients')
      .upsert(rows, { onConflict: 'opportunity_id,freelancer_id', ignoreDuplicates: false })
      .select('id, freelancer_id')

    this.throwIfError(error)
    return data ?? []
  }

  async findRecipient(opportunityId: string, freelancerId: string): Promise<LeadRecipientRow | null> {
    const { data } = await this.ctx.supabase
      .from('opportunity_recipients')
      .select('*')
      .eq('opportunity_id', opportunityId)
      .eq('freelancer_id', freelancerId)
      .maybeSingle()
    return data ?? null
  }

  async updateRecipient(
    recipientId: string,
    patch: { response: string; response_note?: string | null; responded_at: string }
  ): Promise<void> {
    const { error } = await this.ctx.supabase
      .from('opportunity_recipients')
      .update(patch)
      .eq('id', recipientId)
    this.throwIfError(error)
  }

  async listInterestedFreelancerIds(opportunityId: string): Promise<string[]> {
    const { data } = await this.ctx.supabase
      .from('opportunity_recipients')
      .select('freelancer_id')
      .eq('opportunity_id', opportunityId)
      .eq('response', 'interested')
    return (data ?? []).map((r) => r.freelancer_id)
  }

  async listRecipientsByOpportunity(opportunityId: string): Promise<Array<{ freelancer_id: string; response: string }>> {
    const { data } = await this.ctx.supabase
      .from('opportunity_recipients')
      .select('freelancer_id, response')
      .eq('opportunity_id', opportunityId)
    return data ?? []
  }

  async listRecipientsDetailed(opportunityId: string): Promise<
    Array<{
      id: string
      response: string
      freelancer_id: string
      whatsapp_sent_at: string | null
      whatsapp_delivered: boolean | null
    }>
  > {
    const { data } = await this.ctx.supabase
      .from('opportunity_recipients')
      .select('id, response, freelancer_id, whatsapp_sent_at, whatsapp_delivered')
      .eq('opportunity_id', opportunityId)
    return data ?? []
  }

  async countByResponse(opportunityId: string, response: string): Promise<number> {
    const { count } = await this.ctx.supabase
      .from('opportunity_recipients')
      .select('id', { count: 'exact', head: true })
      .eq('opportunity_id', opportunityId)
      .eq('response', response)
    return count ?? 0
  }

  async listRecipientFreelancerIds(opportunityId: string): Promise<string[]> {
    const { data } = await this.ctx.supabase
      .from('opportunity_recipients')
      .select('freelancer_id')
      .eq('opportunity_id', opportunityId)
    return (data ?? []).map((r) => r.freelancer_id)
  }

  async findMatchContext(opportunityId: string) {
    const { data } = await this.ctx.supabase
      .from('opportunities')
      .select(
        'id, tenant_id, title, description, required_skills, discipline, budget, currency, client_name'
      )
      .eq('id', opportunityId)
      .maybeSingle()
    return data ?? null
  }

  async findForProjectDefaults(opportunityId: string, tenantId: string) {
    const { data } = await this.ctx.supabase
      .from('opportunities')
      .select('id, title, description, client_name, company_id, budget, currency')
      .eq('id', opportunityId)
      .eq('tenant_id', tenantId)
      .maybeSingle()
    return data ?? null
  }

  async findShortlistHeader(opportunityId: string, tenantId: string) {
    const { data } = await this.ctx.supabase
      .from('opportunities')
      .select('id, title, status, description, budget, client_name')
      .eq('id', opportunityId)
      .eq('tenant_id', tenantId)
      .maybeSingle()
    return data ?? null
  }

  async findPendingRecipient(tenantId: string, freelancerId: string) {
    const { data } = await this.ctx.supabase
      .from('opportunity_recipients')
      .select('id, opportunity_id, response')
      .eq('tenant_id', tenantId)
      .eq('freelancer_id', freelancerId)
      .eq('response', 'pending')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    return data ?? null
  }

  async listPendingRecipientsForFreelancer(tenantId: string, freelancerId: string, limit = 10) {
    const { data, error } = await this.ctx.supabase
      .from('opportunity_recipients')
      .select('id, opportunity_id, response, created_at, opportunities(title, status)')
      .eq('tenant_id', tenantId)
      .eq('freelancer_id', freelancerId)
      .eq('response', 'pending')
      .order('created_at', { ascending: false })
      .limit(limit)

    this.throwIfError(error)
    return (data ?? []).map((row) => ({
      recipient_id: row.id as string,
      opportunity_id: row.opportunity_id as string,
      title: (row.opportunities as { title?: string } | null)?.title ?? 'Opportunity',
      created_at: row.created_at as string,
    }))
  }

  async updateRecipientResponse(
    recipientId: string,
    patch: { response: string; responded_at: string; response_note?: string }
  ): Promise<void> {
    const { error } = await this.ctx.supabase
      .from('opportunity_recipients')
      .update(patch)
      .eq('id', recipientId)
    this.throwIfError(error)
  }

  async markWhatsAppDelivered(recipientId: string): Promise<void> {
    const { error } = await this.ctx.supabase
      .from('opportunity_recipients')
      .update({ whatsapp_delivered: true })
      .eq('id', recipientId)
    this.throwIfError(error)
  }

  async updateRecipientWhatsAppSent(
    recipientId: string,
    patch: { whatsapp_sent_at: string; whatsapp_delivered: boolean }
  ): Promise<void> {
    const { error } = await this.ctx.supabase
      .from('opportunity_recipients')
      .update(patch)
      .eq('id', recipientId)
    this.throwIfError(error)
  }
}
