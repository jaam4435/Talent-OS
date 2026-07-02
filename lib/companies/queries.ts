import { createClient } from '@/lib/supabase/server'

export interface CompanyRow {
  id: string
  name: string
  slug: string
  contactEmail: string | null
  contactName: string | null
}

export async function listCompanies(tenantId: string): Promise<CompanyRow[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('companies')
    .select('id, name, slug, contact_email, contact_name')
    .eq('tenant_id', tenantId)
    .order('name')

  return (data ?? []).map((c) => ({
    id: c.id,
    name: c.name,
    slug: c.slug,
    contactEmail: c.contact_email,
    contactName: c.contact_name,
  }))
}

export async function getCompanyById(companyId: string, tenantId: string) {
  const supabase = await createClient()
  const { data } = await supabase
    .from('companies')
    .select('id, name, slug, contact_email, contact_name')
    .eq('id', companyId)
    .eq('tenant_id', tenantId)
    .maybeSingle()

  if (!data) return null

  return {
    id: data.id,
    name: data.name,
    slug: data.slug,
    contactEmail: data.contact_email,
    contactName: data.contact_name,
  }
}
