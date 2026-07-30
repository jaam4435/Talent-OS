import type { AppSupabaseClient } from '@/modules/core/utils/context'
import type { PortfolioItem } from '@/lib/domains/talent/types'

interface PortfolioItemRow {
  id: string
  title: string
  description: string | null
  project_url: string | null
  image_path: string | null
  sort_order: number
  created_at: string
}

export function toPortfolioItem(row: PortfolioItemRow, supabase: AppSupabaseClient): PortfolioItem {
  const imageUrl = row.image_path
    ? supabase.storage.from('portfolio').getPublicUrl(row.image_path).data.publicUrl
    : null

  return {
    id: row.id,
    title: row.title,
    description: row.description,
    projectUrl: row.project_url,
    imagePath: row.image_path,
    imageUrl,
    sortOrder: row.sort_order,
    createdAt: row.created_at,
  }
}

export function toPortfolioItems(rows: PortfolioItemRow[], supabase: AppSupabaseClient): PortfolioItem[] {
  return rows.map((row) => toPortfolioItem(row, supabase))
}
