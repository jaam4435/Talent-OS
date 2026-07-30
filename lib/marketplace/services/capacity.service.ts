import type { AvailabilityBlockRepository } from '@/lib/repositories/marketplace/availability-block.repository'
import type { MarketplaceProfileRepository } from '@/lib/repositories/marketplace/profile.repository'
import type { CapacityPlanningParams, CapacitySnapshot } from '@/modules/marketplace/types'
import type { CRMService } from '@/lib/services/crm.service'
import type { ProjectService } from '@/lib/services/project.service'

/** Supply/demand capacity planning — aggregates availability signals vs open work. */
export class MarketplaceCapacityService {
  constructor(
    private readonly profileRepo: MarketplaceProfileRepository,
    private readonly blocks: AvailabilityBlockRepository,
    private readonly crm: CRMService,
    private readonly project: ProjectService
  ) {}

  async getSnapshot(tenantId: string, params?: CapacityPlanningParams): Promise<CapacitySnapshot> {
    const [supply, opportunities] = await Promise.all([
      this.profileRepo.getCapacitySummary(tenantId),
      this.crm.getOpportunitiesForPage(tenantId),
    ])

    const openOpportunities = opportunities.filter((o) => o.status === 'open').length
    const activeProjects = opportunities.filter((o) => o.status === 'filled').length

    let availableCapacityPct = 0
    if (params) {
      availableCapacityPct = await this.blocks.sumCapacityInRange(
        tenantId,
        params.windowStart,
        params.windowEnd
      )
    }

    const availableCount = supply.byAvailability.available ?? 0
    const demandPressure =
      openOpportunities > availableCount * 1.5
        ? 'high'
        : openOpportunities > availableCount * 0.5
          ? 'balanced'
          : 'low'

    void this.project

    return {
      supplyTotal: supply.total,
      supplyByAvailability: supply.byAvailability,
      supplyByDiscipline: supply.byDiscipline,
      openOpportunities,
      activeProjects,
      availableCapacityPct,
      demandPressure,
    }
  }
}
