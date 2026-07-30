import { BaseRepository } from '@/lib/repositories/base/base.repository'
import type { Json } from '@/modules/core/types/database'
import type { MarketplaceVisibility, PublicTalentProfile } from '@/modules/marketplace/types'

export class MarketplaceProfileRepository extends BaseRepository {
  async publish(
    tenantId: string,
    freelancerId: string,
    input: {
      marketplaceVisibility: MarketplaceVisibility
      publicSlug?: string | null
      marketplaceHeadline?: string | null
      marketplaceBio?: string | null
    }
  ): Promise<void> {
    const { error } = await this.ctx.supabase
      .from('freelancers')
      .update({
        marketplace_visibility: input.marketplaceVisibility,
        public_slug: input.publicSlug ?? null,
        marketplace_headline: input.marketplaceHeadline ?? null,
        marketplace_bio: input.marketplaceBio ?? null,
        marketplace_published_at:
          input.marketplaceVisibility === 'marketplace' ? new Date().toISOString() : null,
      })
      .eq('id', freelancerId)
      .eq('tenant_id', tenantId)

    this.throwIfError(error)
    this.invalidateTable('freelancers')
  }

  async unpublish(tenantId: string, freelancerId: string): Promise<void> {
    const { error } = await this.ctx.supabase
      .from('freelancers')
      .update({
        marketplace_visibility: 'private',
        marketplace_published_at: null,
      })
      .eq('id', freelancerId)
      .eq('tenant_id', tenantId)

    this.throwIfError(error)
    this.invalidateTable('freelancers')
  }

  async findPublishedById(tenantId: string, freelancerId: string): Promise<PublicTalentProfile | null> {
    const { data } = await this.ctx.supabase
      .from('freelancers')
      .select(
        'id, public_slug, full_name, discipline, skills, marketplace_headline, marketplace_bio, day_rate, currency, availability'
      )
      .eq('id', freelancerId)
      .eq('tenant_id', tenantId)
      .in('marketplace_visibility', ['tenant', 'marketplace'])
      .maybeSingle()

    if (!data) return null

    return {
      id: data.id as string,
      publicSlug: (data.public_slug as string) ?? data.id,
      fullName: data.full_name as string,
      discipline: data.discipline as string,
      skills: (data.skills as string[]) ?? [],
      marketplaceHeadline: data.marketplace_headline as string | null,
      marketplaceBio: data.marketplace_bio as string | null,
      dayRate: data.day_rate as number | null,
      currency: data.currency as string,
      availability: data.availability as string,
      publicRating: null,
      portfolioPreview: [],
    }
  }

  async findByPublicSlug(slug: string): Promise<{ profile: PublicTalentProfile; tenantId: string } | null> {
    const { data } = await this.ctx.supabase
      .from('freelancers')
      .select(
        'id, tenant_id, public_slug, full_name, discipline, skills, marketplace_headline, marketplace_bio, day_rate, currency, availability, marketplace_visibility'
      )
      .eq('public_slug', slug)
      .eq('marketplace_visibility', 'marketplace')
      .maybeSingle()

    if (!data?.public_slug) return null

    return {
      tenantId: data.tenant_id as string,
      profile: {
        id: data.id as string,
        publicSlug: data.public_slug as string,
        fullName: data.full_name as string,
        discipline: data.discipline as string,
        skills: (data.skills as string[]) ?? [],
        marketplaceHeadline: data.marketplace_headline as string | null,
        marketplaceBio: data.marketplace_bio as string | null,
        dayRate: data.day_rate as number | null,
        currency: data.currency as string,
        availability: data.availability as string,
        publicRating: null,
        portfolioPreview: [],
      },
    }
  }

  async searchMarketplace(
    tenantId: string,
    params: {
      query?: string
      discipline?: string
      availability?: string
      minRate?: number
      maxRate?: number
      limit?: number
      offset?: number
    }
  ): Promise<{ data: PublicTalentProfile[]; count: number }> {
    let query = this.ctx.supabase
      .from('freelancers')
      .select(
        'id, public_slug, full_name, discipline, skills, marketplace_headline, marketplace_bio, day_rate, currency, availability',
        { count: 'exact' }
      )
      .eq('tenant_id', tenantId)
      .in('marketplace_visibility', ['tenant', 'marketplace'])

    if (params.discipline) query = query.eq('discipline', params.discipline)
    if (params.availability) query = query.eq('availability', params.availability)
    if (params.minRate != null) query = query.gte('day_rate', params.minRate)
    if (params.maxRate != null) query = query.lte('day_rate', params.maxRate)
    if (params.query?.trim()) {
      query = query.or(
        `full_name.ilike.%${params.query}%,marketplace_headline.ilike.%${params.query}%`
      )
    }

    const limit = params.limit ?? 20
    const offset = params.offset ?? 0
    const { data, error, count } = await query
      .order('marketplace_published_at', { ascending: false, nullsFirst: false })
      .range(offset, offset + limit - 1)

    this.throwIfError(error)

    const profiles = (data ?? []).map((row) => ({
      id: row.id as string,
      publicSlug: (row.public_slug as string) ?? row.id,
      fullName: row.full_name as string,
      discipline: row.discipline as string,
      skills: (row.skills as string[]) ?? [],
      marketplaceHeadline: row.marketplace_headline as string | null,
      marketplaceBio: row.marketplace_bio as string | null,
      dayRate: row.day_rate as number | null,
      currency: row.currency as string,
      availability: row.availability as string,
      publicRating: null,
      portfolioPreview: [],
    }))

    return { data: profiles, count: count ?? profiles.length }
  }

  async findPortfolioItemFreelancerId(portfolioItemId: string, tenantId: string): Promise<string | null> {
    const { data } = await this.ctx.supabase
      .from('freelancer_portfolio_items')
      .select('freelancer_id')
      .eq('id', portfolioItemId)
      .maybeSingle()

    if (!data?.freelancer_id) return null

    const { data: freelancer } = await this.ctx.supabase
      .from('freelancers')
      .select('id')
      .eq('id', data.freelancer_id)
      .eq('tenant_id', tenantId)
      .maybeSingle()

    return freelancer?.id ?? null
  }

  async updatePortfolioVisibility(
    portfolioItemId: string,
    freelancerId: string,
    isMarketplaceVisible: boolean,
    featured?: boolean
  ): Promise<void> {
    const patch: { is_marketplace_visible: boolean; featured?: boolean } = {
      is_marketplace_visible: isMarketplaceVisible,
    }
    if (featured !== undefined) patch.featured = featured

    const { error } = await this.ctx.supabase
      .from('freelancer_portfolio_items')
      .update(patch)
      .eq('id', portfolioItemId)
      .eq('freelancer_id', freelancerId)

    this.throwIfError(error)
  }

  async listMarketplacePortfolio(freelancerId: string) {
    const { data, error } = await this.ctx.supabase
      .from('freelancer_portfolio_items')
      .select('id, title, description, project_url, image_path, featured')
      .eq('freelancer_id', freelancerId)
      .eq('is_marketplace_visible', true)
      .order('featured', { ascending: false })
      .order('sort_order')

    this.throwIfError(error)
    return (data ?? []).map((row) => ({
      id: row.id as string,
      title: row.title as string,
      description: row.description as string | null,
      imageUrl: row.image_path as string | null,
      projectUrl: row.project_url as string | null,
      featured: Boolean(row.featured),
    }))
  }

  async getCapacitySummary(tenantId: string) {
    const { data, error } = await this.ctx.supabase
      .from('freelancers')
      .select('availability, discipline')
      .eq('tenant_id', tenantId)
      .in('marketplace_visibility', ['tenant', 'marketplace'])

    this.throwIfError(error)

    const byAvailability: Record<string, number> = {}
    const byDiscipline: Record<string, number> = {}
    for (const row of data ?? []) {
      const avail = row.availability as string
      const disc = row.discipline as string
      byAvailability[avail] = (byAvailability[avail] ?? 0) + 1
      byDiscipline[disc] = (byDiscipline[disc] ?? 0) + 1
    }

    return { total: data?.length ?? 0, byAvailability, byDiscipline }
  }
}
