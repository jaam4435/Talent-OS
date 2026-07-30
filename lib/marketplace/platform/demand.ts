import type { CRMService } from '@/lib/services/crm.service'
import type { ProjectService } from '@/lib/services/project.service'
import type { MarketplaceInviteService } from '@/lib/marketplace/services/invite.service'

/** Demand-side marketplace context: clients, projects, opportunities, invitations. */
export interface DemandPlatform {
  /** Companies and opportunities — delegates to CRMService (no duplicate logic). */
  readonly crm: CRMService
  /** Project delivery — delegates to ProjectService. */
  readonly project: ProjectService
  /** Marketplace-specific gig invitations with proposals. */
  readonly invite: MarketplaceInviteService
}

export function createDemandPlatform(services: DemandPlatform): DemandPlatform {
  return services
}
