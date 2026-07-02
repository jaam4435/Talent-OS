'use server'

import { revalidatePath } from 'next/cache'
import { requireTenant } from '@/lib/auth/session'
import { requirePermission } from '@/lib/auth/permissions'
import { isManager } from '@/lib/auth/permissions'
import { parseBriefText, requestBriefParse } from '@/lib/integrations/ai/brief-parse'
import {
  requestProjectSummary,
  requestShortlistSummary,
} from '@/lib/integrations/ai/summary'
import { requestStatusAssessment } from '@/lib/integrations/ai/status-assessment'
import type { ParsedRequirements } from '@/lib/integrations/ai/types'

export async function parseRequirementsFromText(input: {
  title: string
  description?: string
  budget?: number
  currency?: string
}) {
  const { tenant } = await requireTenant()
  if (!isManager(tenant.role)) {
    return { ok: false as const, error: 'FORBIDDEN' }
  }
  requirePermission(tenant.role, 'ai:brief_parse')

  try {
    const result = await parseBriefText({
      title: input.title,
      description: input.description ?? null,
      budget: input.budget ?? null,
      currency: input.currency ?? tenant.currency,
    })

    return { ok: true as const, requirements: result.requirements, usedFallback: result.usedFallback }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'BRIEF_PARSE_FAILED'
    return { ok: false as const, error: message }
  }
}

export async function runBriefParse(opportunityId: string) {
  const { tenant, user } = await requireTenant()
  requirePermission(tenant.role, 'ai:brief_parse')

  try {
    const result = await requestBriefParse({
      tenantId: tenant.id,
      opportunityId,
      actorId: user.id,
    })

    revalidatePath(`/opportunities/${opportunityId}`)
    return { ok: true as const, ...result }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'BRIEF_PARSE_FAILED'
    return { ok: false as const, error: message }
  }
}

export async function runProjectSummary(projectId: string) {
  const { tenant, user } = await requireTenant()
  requirePermission(tenant.role, 'ai:summary')

  try {
    const result = await requestProjectSummary({
      tenantId: tenant.id,
      projectId,
      actorId: user.id,
    })

    revalidatePath(`/projects/${projectId}`)
    return { ok: true as const, ...result }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'SUMMARY_FAILED'
    return { ok: false as const, error: message }
  }
}

export async function runShortlistSummary(opportunityId: string) {
  const { tenant, user } = await requireTenant()
  requirePermission(tenant.role, 'ai:summary')

  try {
    const result = await requestShortlistSummary({
      tenantId: tenant.id,
      opportunityId,
      actorId: user.id,
    })

    revalidatePath(`/opportunities/${opportunityId}/shortlist`)
    return { ok: true as const, ...result }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'SUMMARY_FAILED'
    return { ok: false as const, error: message }
  }
}

export async function runStatusAssessment(projectId: string) {
  const { tenant, user } = await requireTenant()
  requirePermission(tenant.role, 'ai:status')

  try {
    const result = await requestStatusAssessment({
      tenantId: tenant.id,
      projectId,
      actorId: user.id,
    })

    revalidatePath(`/projects/${projectId}`)
    return { ok: true as const, ...result }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'STATUS_ASSESSMENT_FAILED'
    return { ok: false as const, error: message }
  }
}

export type { ParsedRequirements }
