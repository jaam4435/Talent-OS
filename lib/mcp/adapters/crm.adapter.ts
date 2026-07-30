import type { CrmToolInputs } from '@/lib/mcp/servers/crm.server'
import { mcpErr, mcpOk, paginate, type McpToolHandlerFn } from '@/lib/mcp/adapters/helpers'

function asInput<T>(input: unknown): T {
  return input as T
}

export const CRM_ADAPTER_HANDLERS: Record<string, McpToolHandlerFn> = {
  crm_list_companies: async (input, ctx) => {
    const { query, page, limit } = asInput<CrmToolInputs['crm_list_companies']>(input)
    const { tenantId } = ctx.execution
    let companies = await ctx.services.crm.listCompanies(tenantId)
    if (query) {
      const q = query.toLowerCase()
      companies = companies.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          (c.contactName?.toLowerCase().includes(q) ?? false) ||
          (c.contactEmail?.toLowerCase().includes(q) ?? false)
      )
    }
    return mcpOk(paginate(companies, page, limit))
  },

  crm_get_company: async (input, ctx) => {
    const { company_id } = asInput<CrmToolInputs['crm_get_company']>(input)
    const company = await ctx.services.crm.getCompanyById(company_id, ctx.execution.tenantId)
    if (!company) return mcpErr('Company not found', 'NOT_FOUND')
    return mcpOk(company)
  },

  crm_create_company: async (input, ctx) => {
    const data = asInput<CrmToolInputs['crm_create_company']>(input)
    const result = await ctx.services.crm.createCompany(ctx.execution.tenantId, {
      name: data.name,
      contactEmail: data.contact_email,
      contactName: data.contact_name,
      website: data.website,
    })
    if (!result.ok) return mcpErr(result.error)
    return mcpOk({ id: result.companyId })
  },

  crm_update_company: async (input, ctx) => {
    const data = asInput<CrmToolInputs['crm_update_company']>(input)
    const result = await ctx.services.crm.updateCompany(data.company_id, ctx.execution.tenantId, {
      name: data.name,
      contactEmail: data.contact_email,
      contactName: data.contact_name,
      website: data.website,
      notes: data.notes,
    })
    if (!result.ok) return mcpErr(result.error)
    return mcpOk({ id: data.company_id, success: true })
  },

  crm_search_companies: async (input, ctx) => {
    const { query, page, limit } = asInput<CrmToolInputs['crm_search_companies']>(input)
    const companies = await ctx.services.crm.searchCompanies(ctx.execution.tenantId, query)
    return mcpOk(paginate(companies, page, limit))
  },
}
