import { withApiHandler } from '@/modules/core/api/handler'
import { createServices } from '@/lib/services/factory'
import { convertLeadSchema } from '@/modules/crm/validation'
import { AppError } from '@/modules/core/api/response'

export const POST = withApiHandler(
  { auth: 'manager', permissions: ['crm:leads:manage'], rateLimit: 'default', validate: { body: convertLeadSchema } },
  async ({ ctx, params, body }) => {
    const services = await createServices()
    const input = body as {
      create_company?: boolean
      company_name?: string
      create_deal?: boolean
      deal_title?: string
      deal_value?: number | null
      mark_client?: boolean
    }
    const result = await services.crmDemand.convertLead(ctx.tenant!.id, ctx.userId!, params!.id, {
      createCompany: input.create_company,
      companyName: input.company_name,
      createDeal: input.create_deal,
      dealTitle: input.deal_title,
      dealValue: input.deal_value,
      markClient: input.mark_client,
    })
    if (!result.ok) throw new AppError('VALIDATION_ERROR', result.error, 400)
    return result
  }
)
