import { DomainError, ErrorCodes } from '@/lib/core/errors'
import type { ActionResult } from '@/lib/core/result'
import { actionFail, actionOk, catchToActionResult } from '@/lib/core/result'
import { parseSchema } from '@/lib/core/validation'
import { toPortfolioItemInsertRow } from '@/lib/domains/talent/mappers/freelancer.mapper'
import type { FreelancerRepository } from '@/lib/domains/talent/repositories/freelancer.repository'
import type { PortfolioRepository } from '@/lib/domains/talent/repositories/portfolio.repository'
import type {
  PortfolioAccessContext,
  PortfolioItem,
  PortfolioItemInput,
} from '@/lib/domains/talent/types'
import { portfolioItemSchema } from '@/lib/domains/talent/validation'
import type { SessionUser, TenantContext } from '@/types/enums'
import { isManager } from '@/lib/auth/permissions'

export class PortfolioService {
  constructor(
    private readonly freelancers: FreelancerRepository,
    private readonly portfolio: PortfolioRepository
  ) {}

  async assertAccess(
    freelancerId: string,
    tenant: TenantContext,
    user: SessionUser
  ): Promise<PortfolioAccessContext> {
    if (isManager(tenant.role)) {
      const freelancer = await this.freelancers.findInTenant(freelancerId, tenant.id)
      if (!freelancer) {
        throw new DomainError(ErrorCodes.FORBIDDEN, 'FORBIDDEN')
      }
      return { tenantId: tenant.id }
    }

    const freelancer = await this.freelancers.findOwnedByUser(freelancerId, user.id)
    if (!freelancer) {
      throw new DomainError(ErrorCodes.FORBIDDEN, 'FORBIDDEN')
    }

    return { tenantId: freelancer.tenant_id }
  }

  getItems(freelancerId: string): Promise<PortfolioItem[]> {
    return this.portfolio.findByFreelancerId(freelancerId)
  }

  async addItem(freelancerId: string, input: PortfolioItemInput): Promise<ActionResult<{ itemId: string }>> {
    try {
      const data = parseSchema(portfolioItemSchema, input)
      const row = toPortfolioItemInsertRow(freelancerId, data)
      const itemId = await this.portfolio.create(row)
      return actionOk({ itemId })
    } catch (error) {
      return catchToActionResult(error)
    }
  }

  async deleteItem(freelancerId: string, itemId: string): Promise<ActionResult> {
    try {
      const imagePath = await this.portfolio.findItemImagePath(itemId, freelancerId)

      if (imagePath) {
        await this.portfolio.removeStorageFile(imagePath)
      }

      await this.portfolio.delete(itemId, freelancerId)
      return actionOk()
    } catch (error) {
      return catchToActionResult(error)
    }
  }

  async uploadImage(
    freelancerId: string,
    tenantId: string,
    formData: FormData
  ): Promise<ActionResult<{ path: string; publicUrl: string }>> {
    try {
      const file = formData.get('file')
      if (!(file instanceof File)) {
        return actionFail('No file provided')
      }

      const result = await this.portfolio.uploadImage(tenantId, freelancerId, file)
      return actionOk({ path: result.path, publicUrl: result.publicUrl })
    } catch (error) {
      return catchToActionResult(error)
    }
  }
}
