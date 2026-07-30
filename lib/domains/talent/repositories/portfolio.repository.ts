import type { RepositoryContext } from '@/lib/core/context'
import { DomainError, ErrorCodes } from '@/lib/core/errors'
import { throwIfSupabaseError } from '@/lib/core/supabase-errors'
import { toPortfolioItems } from '@/lib/domains/talent/mappers/portfolio.mapper'
import type { PortfolioItemInsertRow } from '@/lib/domains/talent/mappers/freelancer.mapper'
import type { PortfolioItem, PortfolioUploadResult } from '@/lib/domains/talent/types'

const MAX_UPLOAD_BYTES = 10 * 1024 * 1024
const PORTFOLIO_BUCKET = 'portfolio'

export class PortfolioRepository {
  constructor(private readonly ctx: RepositoryContext) {}

  async findByFreelancerId(freelancerId: string): Promise<PortfolioItem[]> {
    const { data } = await this.ctx.supabase
      .from('freelancer_portfolio_items')
      .select('id, title, description, project_url, image_path, sort_order, created_at')
      .eq('freelancer_id', freelancerId)
      .order('sort_order')
      .order('created_at', { ascending: false })

    return toPortfolioItems(data ?? [], this.ctx.supabase)
  }

  async create(row: PortfolioItemInsertRow): Promise<string> {
    const { data, error } = await this.ctx.supabase
      .from('freelancer_portfolio_items')
      .insert(row)
      .select('id')
      .single()

    throwIfSupabaseError(error)

    if (!data?.id) {
      throw new DomainError(ErrorCodes.DATABASE, 'Failed to create portfolio item')
    }

    return data.id
  }

  async findItemImagePath(itemId: string, freelancerId: string): Promise<string | null> {
    const { data } = await this.ctx.supabase
      .from('freelancer_portfolio_items')
      .select('image_path')
      .eq('id', itemId)
      .eq('freelancer_id', freelancerId)
      .maybeSingle()

    return data?.image_path ?? null
  }

  async delete(itemId: string, freelancerId: string): Promise<void> {
    const { error } = await this.ctx.supabase
      .from('freelancer_portfolio_items')
      .delete()
      .eq('id', itemId)
      .eq('freelancer_id', freelancerId)

    throwIfSupabaseError(error)
  }

  async removeStorageFile(path: string): Promise<void> {
    await this.ctx.supabase.storage.from(PORTFOLIO_BUCKET).remove([path])
  }

  async uploadImage(
    tenantId: string,
    freelancerId: string,
    file: File
  ): Promise<PortfolioUploadResult> {
    if (file.size > MAX_UPLOAD_BYTES) {
      throw new DomainError(ErrorCodes.VALIDATION, 'File must be under 10MB')
    }

    const ext = file.name.split('.').pop() ?? 'jpg'
    const path = `${tenantId}/${freelancerId}/${crypto.randomUUID()}.${ext}`

    const { error } = await this.ctx.supabase.storage.from(PORTFOLIO_BUCKET).upload(path, file, {
      upsert: false,
      contentType: file.type,
    })

    if (error) {
      throw new DomainError(ErrorCodes.DATABASE, error.message, error)
    }

    const {
      data: { publicUrl },
    } = this.ctx.supabase.storage.from(PORTFOLIO_BUCKET).getPublicUrl(path)

    return { path, publicUrl }
  }
}
