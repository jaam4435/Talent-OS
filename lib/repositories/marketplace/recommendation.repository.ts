import { BaseRepository } from '@/lib/repositories/base/base.repository'
import type { Json } from '@/modules/core/types/database'
import type {
  MarketplaceRecommendation,
  MarketplaceRecommendationRow,
  RecommendationType,
} from '@/modules/marketplace/types'

function mapRecommendation(row: MarketplaceRecommendationRow): MarketplaceRecommendation {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    type: row.type,
    sourceEntityType: row.source_entity_type,
    sourceEntityId: row.source_entity_id,
    targetEntityType: row.target_entity_type,
    targetEntityId: row.target_entity_id,
    score: Number(row.score),
    rationale: row.rationale,
    metadata: row.metadata,
    expiresAt: row.expires_at,
    dismissedAt: row.dismissed_at,
    createdAt: row.created_at,
  }
}

export class MarketplaceRecommendationRepository extends BaseRepository {
  async create(
    tenantId: string,
    input: {
      type: RecommendationType
      sourceEntityType: string
      sourceEntityId: string
      targetEntityType: string
      targetEntityId: string
      score: number
      rationale?: string | null
      metadata?: Record<string, unknown>
      expiresAt?: string | null
    }
  ): Promise<string> {
    const { data, error } = await this.ctx.supabase
      .from('marketplace_recommendations')
      .insert({
        tenant_id: tenantId,
        type: input.type,
        source_entity_type: input.sourceEntityType,
        source_entity_id: input.sourceEntityId,
        target_entity_type: input.targetEntityType,
        target_entity_id: input.targetEntityId,
        score: input.score,
        rationale: input.rationale ?? null,
        metadata: (input.metadata ?? {}) as Json,
        expires_at: input.expiresAt ?? null,
      })
      .select('id')
      .single()

    this.throwIfError(error)
    if (!data?.id) this.notFound('Marketplace recommendation')
    return data.id
  }

  async listActive(
    tenantId: string,
    filters?: { type?: RecommendationType; entityType?: string; entityId?: string }
  ): Promise<MarketplaceRecommendation[]> {
    let query = this.ctx.supabase
      .from('marketplace_recommendations')
      .select('*')
      .eq('tenant_id', tenantId)
      .is('dismissed_at', null)
      .order('score', { ascending: false })

    if (filters?.type) query = query.eq('type', filters.type)
    if (filters?.entityType && filters?.entityId) {
      query = query
        .eq('source_entity_type', filters.entityType)
        .eq('source_entity_id', filters.entityId)
    }

    const { data, error } = await query
    this.throwIfError(error)
    return (data ?? []).map((row) => mapRecommendation(row as MarketplaceRecommendationRow))
  }

  async dismiss(tenantId: string, recommendationId: string): Promise<void> {
    const { error } = await this.ctx.supabase
      .from('marketplace_recommendations')
      .update({ dismissed_at: new Date().toISOString() })
      .eq('id', recommendationId)
      .eq('tenant_id', tenantId)

    this.throwIfError(error)
  }
}
