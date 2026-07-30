import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

export type AppSupabaseClient = SupabaseClient<Database>

export interface RepositoryContext {
  supabase: AppSupabaseClient
}
