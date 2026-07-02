'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { requireManager } from '@/lib/auth/guards'
import { requirePermission } from '@/lib/auth/permissions'

const createCompanySchema = z.object({
  name: z.string().min(1, 'Company name is required'),
  contactEmail: z.string().email().optional().or(z.literal('')),
  contactName: z.string().optional(),
  website: z.string().url().optional().or(z.literal('')),
})

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

export async function createCompany(input: z.infer<typeof createCompanySchema>) {
  const { tenant } = await requireManager()
  requirePermission(tenant.role, 'companies:create')

  const parsed = createCompanySchema.safeParse(input)
  if (!parsed.success) {
    return { ok: false as const, error: parsed.error.errors[0]?.message ?? 'Invalid input' }
  }

  const supabase = await createClient()
  const slug = slugify(parsed.data.name)

  const { data, error } = await supabase
    .from('companies')
    .insert({
      tenant_id: tenant.id,
      name: parsed.data.name,
      slug,
      contact_email: parsed.data.contactEmail || null,
      contact_name: parsed.data.contactName || null,
      website: parsed.data.website || null,
    })
    .select('id')
    .single()

  if (error) {
    if (error.code === '23505') {
      return { ok: false as const, error: 'A company with this name already exists.' }
    }
    return { ok: false as const, error: error.message }
  }

  revalidatePath('/companies')
  return { ok: true as const, companyId: data.id as string }
}
