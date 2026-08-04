import { createClient } from '@/modules/core/utils/supabase/server'
import type { RepositoryContext } from '@/modules/core/utils/context'

export type { RepositoryContext } from '@/modules/core/utils/context'

export async function createRepositoryContext(): Promise<RepositoryContext> {
  return { supabase: await createClient() }
}

export async function createAdminRepositoryContext(): Promise<RepositoryContext> {
  const { createAdminClient } = await import('@/modules/core/utils/supabase/admin')
  return { supabase: createAdminClient() }
}
