import { DomainError, ErrorCodes } from '@/modules/core/utils/errors'
import type { ActionResult } from '@/modules/core/utils/result'
import { actionFail, actionOk, catchToActionResult } from '@/modules/core/utils/result'
import { parseSchema } from '@/modules/core/utils/validation'
import { toPortfolioItemInsertRow } from '@/lib/domains/talent/mappers/freelancer.mapper'
import type {
  PortfolioAccessContext,
  PortfolioItem,
  PortfolioItemInput,
} from '@/lib/domains/talent/types'
import { portfolioItemSchema } from '@/lib/domains/talent/validation'
import type { Repositories } from '@/lib/repositories/factory'
import type { SessionUser, TenantContext } from '@/modules/core/types/enums'
import { isManager } from '@/modules/core/services/permissions'

/** Portfolio business logic — registered in createServices(). */
export class PortfolioService {
  constructor(private readonly repos: Repositories) {}

  async assertAccess(
    freelancerId: string,
    tenant: TenantContext,
    user: SessionUser
  ): Promise<PortfolioAccessContext> {
    if (isManager(tenant.role)) {
      const freelancer = await this.repos.talent.findInTenant(freelancerId, tenant.id)
      if (!freelancer) {
        throw new DomainError(ErrorCodes.FORBIDDEN, 'FORBIDDEN')
      }
      return { tenantId: tenant.id }
    }

    const freelancer = await this.repos.talent.findOwnedByUser(freelancerId, user.id)
    if (!freelancer) {
      throw new DomainError(ErrorCodes.FORBIDDEN, 'FORBIDDEN')
    }

    return { tenantId: freelancer.tenant_id }
  }

  getItems(freelancerId: string): Promise<PortfolioItem[]> {
    return this.repos.portfolio.findByFreelancerId(freelancerId)
  }

  async addItem(
    freelancerId: string,
    input: PortfolioItemInput
  ): Promise<ActionResult<{ itemId: string }>> {
    try {
      const data = parseSchema(portfolioItemSchema, input)
      const row = toPortfolioItemInsertRow(freelancerId, data)
      const itemId = await this.repos.portfolio.create(row)
      return actionOk({ itemId })
    } catch (error) {
      return catchToActionResult(error)
    }
  }

  async deleteItem(freelancerId: string, itemId: string): Promise<ActionResult> {
    try {
      const imagePath = await this.repos.portfolio.findItemImagePath(itemId, freelancerId)

      if (imagePath) {
        await this.repos.portfolio.removeStorageFile(imagePath)
      }

      await this.repos.portfolio.delete(itemId, freelancerId)
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

      const result = await this.repos.portfolio.uploadImage(tenantId, freelancerId, file)
      return actionOk({ path: result.path, publicUrl: result.publicUrl })
    } catch (error) {
      return catchToActionResult(error)
    }
  }
}
