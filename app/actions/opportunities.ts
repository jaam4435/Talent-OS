'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { requireManager } from '@/lib/auth/guards'
import { requirePermission } from '@/lib/auth/permissions'
import { requireTenant } from '@/lib/auth/session'
import { emitEvent } from '@/lib/integrations/events'
import {
  broadcastOpportunitySchema,
  createOpportunitySchema,
  opportunityResponseSchema,
} from '@/lib/opportunities/validation'
import type {
  BroadcastOpportunityInput,
  CreateOpportunityInput,
  OpportunityResponseInput,
} from '@/lib/opportunities/types'

export async function createOpportunity(input: CreateOpportunityInput) {
  const { tenant, user } = await requireManager()
  requirePermission(tenant.role, 'opportunities:create')

  const parsed = createOpportunitySchema.safeParse(input)
  if (!parsed.success) {
    return { ok: false as const, error: parsed.error.errors[0]?.message ?? 'Invalid input' }
  }

  const supabase = await createClient()
  const status = parsed.data.status ?? 'draft'

  let clientName = parsed.data.clientName ?? null
  if (parsed.data.companyId) {
    const { data: company } = await supabase
      .from('companies')
      .select('name')
      .eq('id', parsed.data.companyId)
      .eq('tenant_id', tenant.id)
      .maybeSingle()
    if (company) clientName = company.name
  }

  const { data, error } = await supabase
    .from('opportunities')
    .insert({
      tenant_id: tenant.id,
      created_by: user.id,
      title: parsed.data.title,
      description: parsed.data.description ?? null,
      budget: parsed.data.budget ?? null,
      currency: parsed.data.currency ?? tenant.currency,
      required_skills: parsed.data.requiredSkills,
      discipline: parsed.data.discipline ?? null,
      client_name: clientName,
      company_id: parsed.data.companyId ?? null,
      deadline: parsed.data.deadline || null,
      response_deadline: parsed.data.responseDeadline || null,
      status,
    })
    .select('id')
    .single()

  if (error) {
    return { ok: false as const, error: error.message }
  }

  revalidatePath('/opportunities')
  return { ok: true as const, opportunityId: data.id as string }
}

export async function broadcastOpportunity(input: BroadcastOpportunityInput) {
  const { tenant, user } = await requireManager()
  requirePermission(tenant.role, 'opportunities:broadcast')

  const parsed = broadcastOpportunitySchema.safeParse(input)
  if (!parsed.success) {
    return { ok: false as const, error: parsed.error.errors[0]?.message ?? 'Invalid input' }
  }

  const supabase = await createClient()

  const { data: opportunity } = await supabase
    .from('opportunities')
    .select('id, title, description, budget, currency, status, response_deadline')
    .eq('id', parsed.data.opportunityId)
    .eq('tenant_id', tenant.id)
    .maybeSingle()

  if (!opportunity) {
    return { ok: false as const, error: 'Opportunity not found' }
  }

  if (!['draft', 'open'].includes(opportunity.status)) {
    return { ok: false as const, error: 'Opportunity cannot be broadcast in its current status' }
  }

  const { data: freelancers } = await supabase
    .from('freelancers')
    .select('id, full_name, phone, user_id, email')
    .eq('tenant_id', tenant.id)
    .in('id', parsed.data.freelancerIds)

  if (!freelancers?.length) {
    return { ok: false as const, error: 'No valid freelancers selected' }
  }

  const recipientRows = freelancers.map((f) => ({
    opportunity_id: opportunity.id,
    freelancer_id: f.id,
    tenant_id: tenant.id,
    response: 'pending' as const,
  }))

  const { data: insertedRecipients, error: recipientError } = await supabase
    .from('opportunity_recipients')
    .upsert(recipientRows, { onConflict: 'opportunity_id,freelancer_id', ignoreDuplicates: false })
    .select('id, freelancer_id')

  if (recipientError) {
    return { ok: false as const, error: recipientError.message }
  }

  if (opportunity.status === 'draft') {
    const { error: statusError } = await supabase
      .from('opportunities')
      .update({ status: 'open' })
      .eq('id', opportunity.id)

    if (statusError) {
      return { ok: false as const, error: statusError.message }
    }
  }

  const freelancerMap = new Map(freelancers.map((f) => [f.id, f]))
  const notifications = freelancers
    .filter((f) => f.user_id)
    .map((f) => ({
      tenant_id: tenant.id,
      user_id: f.user_id!,
      type: 'opportunity_broadcast',
      title: 'New opportunity',
      body: opportunity.title,
      data: {
        opportunity_id: opportunity.id,
        freelancer_id: f.id,
      },
    }))

  if (notifications.length) {
    await supabase.from('notifications').insert(notifications)
  }

  const recipientsPayload = (insertedRecipients ?? []).map((r) => {
    const freelancer = freelancerMap.get(r.freelancer_id)
    return {
      recipient_id: r.id,
      freelancer_id: r.freelancer_id,
      full_name: freelancer?.full_name ?? 'Freelancer',
      phone: freelancer?.phone ?? null,
      email: freelancer?.email ?? null,
    }
  })

  await emitEvent({
    tenantId: tenant.id,
    eventType: 'opportunity.broadcast',
    aggregateType: 'opportunity',
    aggregateId: opportunity.id,
    idempotencyKey: `opp-broadcast:${opportunity.id}:${Date.now()}`,
    actorId: user.id,
    payload: {
      opportunity_id: opportunity.id,
      title: opportunity.title,
      description: opportunity.description,
      budget: opportunity.budget,
      currency: opportunity.currency,
      response_deadline: opportunity.response_deadline,
      agency_name: tenant.name,
      agency_slug: tenant.slug,
      recipients: recipientsPayload,
    },
  })

  revalidatePath('/opportunities')
  revalidatePath(`/opportunities/${opportunity.id}`)
  revalidatePath(`/opportunities/${opportunity.id}/shortlist`)

  return {
    ok: true as const,
    recipientCount: recipientsPayload.length,
  }
}

export async function respondToOpportunity(input: OpportunityResponseInput) {
  const { tenant, user } = await requireTenant()
  requirePermission(tenant.role, 'opportunities:respond')

  const parsed = opportunityResponseSchema.safeParse(input)
  if (!parsed.success) {
    return { ok: false as const, error: parsed.error.errors[0]?.message ?? 'Invalid input' }
  }

  const supabase = await createClient()

  const { data: freelancer } = await supabase
    .from('freelancers')
    .select('id')
    .eq('user_id', user.id)
    .eq('tenant_id', tenant.id)
    .maybeSingle()

  if (!freelancer) {
    return { ok: false as const, error: 'No freelancer profile linked to your account' }
  }

  const { data: recipient } = await supabase
    .from('opportunity_recipients')
    .select('id, opportunity_id')
    .eq('opportunity_id', parsed.data.opportunityId)
    .eq('freelancer_id', freelancer.id)
    .maybeSingle()

  if (!recipient) {
    return { ok: false as const, error: 'You were not invited to this opportunity' }
  }

  const { error } = await supabase
    .from('opportunity_recipients')
    .update({
      response: parsed.data.response,
      response_note: parsed.data.note ?? null,
      responded_at: new Date().toISOString(),
    })
    .eq('id', recipient.id)

  if (error) {
    return { ok: false as const, error: error.message }
  }

  const { data: opportunity } = await supabase
    .from('opportunities')
    .select('created_by, title')
    .eq('id', parsed.data.opportunityId)
    .maybeSingle()

  if (opportunity?.created_by) {
    await supabase.from('notifications').insert({
      tenant_id: tenant.id,
      user_id: opportunity.created_by,
      type: 'opportunity_response',
      title: 'New opportunity response',
      body: `${parsed.data.response} — ${opportunity.title}`,
      data: {
        opportunity_id: parsed.data.opportunityId,
        freelancer_id: freelancer.id,
        response: parsed.data.response,
      },
    })
  }

  revalidatePath(`/opportunities/${parsed.data.opportunityId}`)
  revalidatePath(`/opportunities/${parsed.data.opportunityId}/shortlist`)

  return { ok: true as const }
}
