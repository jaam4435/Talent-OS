import { withApiHandler } from '@/modules/core/api/handler'
import { createServices } from '@/lib/services/factory'
import { csvImportSchema } from '@/modules/talent/validation'

export const POST = withApiHandler(
  { auth: 'manager', permissions: ['talent:import'], rateLimit: 'default', validate: { body: csvImportSchema } },
  async ({ ctx, body }) => {
    const services = await createServices()
    const input = body as { rows: Array<Record<string, unknown>>; file_name?: string }
    const batch = await services.talentModule.importCsv(
      ctx.tenant!.id,
      ctx.userId!,
      input.rows,
      input.file_name ?? 'import.csv',
      ctx.tenant!.currency
    )
    return { payload: batch }
  }
)
