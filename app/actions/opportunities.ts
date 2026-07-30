'use server'

import { revalidatePath } from 'next/cache'
import { requireManager } from '@/modules/core/services/guards'
import { requirePermission } from '@/modules/core/services/permissions'
import { requireTenant } from '@/modules/core/services/session'
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
import { createRepositories } from '@/lib/repositories/factory'

export async function createOpportunity(input: CreateOpportunityInput) {
  const { tenant, user } = await requireManager()
  requirePermission(tenant.role, 'opportunities:create')

  const parsed = createOpportunitySchema.safeParse(input)
  if (!parsed.success) {
    return { ok: false as const, error: parsed.error.errors[0]?.message ?? 'Invalid input' }
  }

  const repos = await createRepositories()
  const status = parsed.data.status ?? 'draft'

  let clientName = parsed.data.clientName ?? null
  if (parsed.data.companyId) {
    const name = await repos.company.findName(parsed.data.companyId, tenant.id)
    if (name) clientName = name
  }

  try {
    const opportunityId = await repos.lead.create({
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

    revalidatePath('/opportunities')
    return { ok: true as const, opportunityId }
  } catch (error) {
    return { ok: false as const, error: error instanceof Error ? error.message : 'Create failed' }
  }
}

export async function broadcastOpportunity(input: BroadcastOpportunityInput) {
  const { tenant, user } = await requireManager()
  requirePermission(tenant.role, 'opportunities:broadcast')

  const parsed = broadcastOpportunitySchema.safeParse(input)
  if (!parsed.success) {
    return { ok: false as const, error: parsed.error.errors[0]?.message ?? 'Invalid input' }
  }

  const repos = await createRepositories()
  const opportunity = await repos.lead.findBroadcastContext(parsed.data.opportunityId, tenant.id)

  if (!opportunity) {
    return { ok: false as const, error: 'Opportunity not found' }
  }

  if (!['draft', 'open'].includes(opportunity.status)) {
    return { ok: false as const, error: 'Opportunity cannot be broadcast in its current status' }
  }

  const freelancers = await repos.talent.findBroadcastTargets(tenant.id, parsed.data.freelancerIds)
  if (!freelancers.length) {
    return { ok: false as const, error: 'No valid freelancers selected' }
  }

  const recipientRows = freelancers.map((f) => ({
    opportunity_id: opportunity.id,
    freelancer_id: f.id,
    tenant_id: tenant.id,
    response: 'pending' as const,
  }))

  let insertedRecipients: Array<{ id: string; freelancer_id: string }>
  try {
    insertedRecipients = await repos.lead.upsertRecipients(recipientRows)
  } catch (error) {
    return { ok: false as const, error: error instanceof Error ? error.message : 'Broadcast failed' }
  }

  if (opportunity.status === 'draft') {
    try {
      await repos.lead.updateStatus(opportunity.id, 'open')
    } catch (error) {
      return { ok: false as const, error: error instanceof Error ? error.message : 'Status update failed' }
    }
  }

  const freelancerMap = new Map(freelancers.map((f) => [f.id, f]))
  await repos.notification.createMany(
    freelancers
      .filter((f) => f.user_id)
      .map((f) => ({
        tenant_id: tenant.id,
        user_id: f.user_id!,
        type: 'opportunity_broadcast',
        title: 'New opportunity',
        body: opportunity.title,
        data: { opportunity_id: opportunity.id, freelancer_id: f.id },
      }))
  )

  const recipientsPayload = insertedRecipients.map((r) => {
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

  return { ok: true as const, recipientCount: recipientsPayload.length }
}

export async function respondToOpportunity(input: OpportunityResponseInput) {
  const { tenant, user } = await requireTenant()
  requirePermission(tenant.role, 'opportunities:respond')

  const parsed = opportunityResponseSchema.safeParse(input)
  if (!parsed.success) {
    return { ok: false as const, error: parsed.error.errors[0]?.message ?? 'Invalid input' }
  }

  const repos = await createRepositories()
  const freelancerId = await repos.talent.findIdByUserId(user.id, tenant.id)

  if (!freelancerId) {
    return { ok: false as const, error: 'No freelancer profile linked to your account' }
  }

  const recipient = await repos.lead.findRecipient(parsed.data.opportunityId, freelancerId)
  if (!recipient) {
    return { ok: false as const, error: 'You were not invited to this opportunity' }
  }

  try {
    await repos.lead.updateRecipient(recipient.id, {
      response: parsed.data.response,
      response_note: parsed.data.note ?? null,
      responded_at: new Date().toISOString(),
    })
  } catch (error) {
    return { ok: false as const, error: error instanceof Error ? error.message : 'Response failed' }
  }

  const opportunity = await repos.lead.findCreator(parsed.data.opportunityId)
  if (opportunity?.created_by) {
    await repos.notification.create({
      tenant_id: tenant.id,
      user_id: opportunity.created_by,
      type: 'opportunity_response',
      title: 'New opportunity response',
      body: `${parsed.data.response} — ${opportunity.title}`,
      data: {
        opportunity_id: parsed.data.opportunityId,
        freelancer_id: freelancerId,
        response: parsed.data.response,
      },
    })
  }

  revalidatePath(`/opportunities/${parsed.data.opportunityId}`)
  revalidatePath(`/opportunities/${parsed.data.opportunityId}/shortlist`)

  return { ok: true as const }
}
