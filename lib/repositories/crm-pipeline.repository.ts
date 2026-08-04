import { BaseRepository } from '@/lib/repositories/base/base.repository'
import type { CrmPipelineStage } from '@/modules/crm/types'

export class CrmPipelineRepository extends BaseRepository {
  async ensureDefaultStages(tenantId: string): Promise<void> {
    const { error } = await this.ctx.supabase.rpc('seed_crm_pipeline_stages', {
      p_tenant_id: tenantId,
    })
    this.throwIfError(error)
  }

  async listStages(tenantId: string): Promise<CrmPipelineStage[]> {
    const { data, error } = await this.ctx.supabase
      .from('crm_pipeline_stages')
      .select('id, name, slug, sort_order, outcome, color')
      .eq('tenant_id', tenantId)
      .is('deleted_at', null)
      .order('sort_order')

    this.throwIfError(error)
    return (data ?? []).map((row) => ({
      id: row.id,
      name: row.name,
      slug: row.slug,
      sortOrder: row.sort_order,
      outcome: row.outcome as CrmPipelineStage['outcome'],
      color: row.color,
    }))
  }

  async findStageById(id: string, tenantId: string): Promise<CrmPipelineStage | null> {
    const { data, error } = await this.ctx.supabase
      .from('crm_pipeline_stages')
      .select('id, name, slug, sort_order, outcome, color')
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .is('deleted_at', null)
      .maybeSingle()

    this.throwIfError(error)
    if (!data) return null
    return {
      id: data.id,
      name: data.name,
      slug: data.slug,
      sortOrder: data.sort_order,
      outcome: data.outcome as CrmPipelineStage['outcome'],
      color: data.color,
    }
  }

  async getFirstOpenStage(tenantId: string): Promise<CrmPipelineStage | null> {
    const { data, error } = await this.ctx.supabase
      .from('crm_pipeline_stages')
      .select('id, name, slug, sort_order, outcome, color')
      .eq('tenant_id', tenantId)
      .eq('outcome', 'open')
      .is('deleted_at', null)
      .order('sort_order')
      .limit(1)
      .maybeSingle()

    this.throwIfError(error)
    if (!data) return null
    return {
      id: data.id,
      name: data.name,
      slug: data.slug,
      sortOrder: data.sort_order,
      outcome: data.outcome as CrmPipelineStage['outcome'],
      color: data.color,
    }
  }
}
