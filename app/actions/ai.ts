'use server'

import { revalidatePath } from 'next/cache'
import { requireTenant } from '@/modules/core/services/session'
import { requirePermission } from '@/modules/core/services/permissions'
import { requestTalentMatch } from '@/lib/integrations/ai/matching'

export async function runAiTalentMatch(opportunityId: string) {
  const { tenant, user } = await requireTenant()
  requirePermission(tenant.role, 'ai:match')

  try {
    const result = await requestTalentMatch({
      tenantId: tenant.id,
      opportunityId,
      actorId: user.id,
    })

    revalidatePath(`/opportunities/${opportunityId}`)
    revalidatePath(`/opportunities/${opportunityId}/shortlist`)

    return { ok: true as const, ...result }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'AI_MATCH_FAILED'
    return { ok: false as const, error: message }
  }
}
