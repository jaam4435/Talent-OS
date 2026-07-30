'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { requireManager } from '@/modules/core/services/guards'
import { requirePermission } from '@/modules/core/services/permissions'
import { createRepositories } from '@/lib/repositories/factory'
import { isDomainError } from '@/modules/core/utils/errors'

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

  const repos = await createRepositories()

  try {
    const companyId = await repos.company.create({
      tenant_id: tenant.id,
      name: parsed.data.name,
      slug: slugify(parsed.data.name),
      contact_email: parsed.data.contactEmail || null,
      contact_name: parsed.data.contactName || null,
      website: parsed.data.website || null,
    })

    revalidatePath('/companies')
    return { ok: true as const, companyId }
  } catch (error) {
    if (isDomainError(error) && error.code === 'DUPLICATE') {
      return { ok: false as const, error: error.message }
    }
    return { ok: false as const, error: error instanceof Error ? error.message : 'Create failed' }
  }
}
