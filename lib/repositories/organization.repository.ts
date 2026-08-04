import { BaseRepository } from '@/lib/repositories/base/base.repository'
import type { Json } from '@/modules/core/types/database'
import type {
  BusinessHoursSchedule,
  OrganizationBranding,
  OrganizationSettings,
  OrganizationSummary,
  OrganizationSubscriptionReference,
} from '@/modules/organization/types'
import { DEFAULT_BUSINESS_HOURS } from '@/modules/organization/validation'

interface TenantRow {
  id: string
  name: string
  slug: string
  logo_url: string | null
  timezone: string
  currency: string
  settings: Json
  subscription_status: string
  subscription_reference: string | null
  trial_ends_at: string | null
  primary_color: string | null
  accent_color: string | null
  business_hours: Json
  created_at: string
  updated_at: string
  deleted_at: string | null
}

function mapBusinessHours(raw: unknown): BusinessHoursSchedule {
  if (raw && typeof raw === 'object' && 'monday' in (raw as object)) {
    return raw as BusinessHoursSchedule
  }
  return DEFAULT_BUSINESS_HOURS
}

function mapOrganization(row: TenantRow): OrganizationSummary {
  const settings = (row.settings ?? {}) as Record<string, unknown>
  const subscription = (settings.subscription ?? {}) as Record<string, unknown>

  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    subscriptionStatus: row.subscription_status,
    subscriptionReference: row.subscription_reference,
    trialEndsAt: row.trial_ends_at,
    branding: {
      logoUrl: row.logo_url,
      primaryColor: row.primary_color,
      accentColor: row.accent_color,
    },
    settings: {
      timezone: row.timezone,
      currency: row.currency,
      businessHours: mapBusinessHours(row.business_hours),
      settings,
    },
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export class OrganizationRepository extends BaseRepository {
  async findById(tenantId: string): Promise<OrganizationSummary | null> {
    const { data, error } = await this.ctx.supabase
      .from('tenants')
      .select(
        'id, name, slug, logo_url, timezone, currency, settings, subscription_status, subscription_reference, trial_ends_at, primary_color, accent_color, business_hours, created_at, updated_at, deleted_at'
      )
      .eq('id', tenantId)
      .is('deleted_at', null)
      .maybeSingle()

    this.throwIfError(error)
    if (!data) return null
    return mapOrganization(data as TenantRow)
  }

  async update(
    tenantId: string,
    patch: {
      name?: string
      timezone?: string
      currency?: string
      subscription_reference?: string | null
    }
  ): Promise<OrganizationSummary> {
    const { data, error } = await this.ctx.supabase
      .from('tenants')
      .update(patch)
      .eq('id', tenantId)
      .is('deleted_at', null)
      .select(
        'id, name, slug, logo_url, timezone, currency, settings, subscription_status, subscription_reference, trial_ends_at, primary_color, accent_color, business_hours, created_at, updated_at, deleted_at'
      )
      .single()

    this.throwIfError(error)
    this.invalidateTable('tenants')
    return mapOrganization(data as TenantRow)
  }

  async updateBranding(
    tenantId: string,
    branding: Partial<{
      logo_url: string | null
      primary_color: string | null
      accent_color: string | null
    }>
  ): Promise<OrganizationBranding> {
    const { data, error } = await this.ctx.supabase
      .from('tenants')
      .update(branding)
      .eq('id', tenantId)
      .is('deleted_at', null)
      .select('logo_url, primary_color, accent_color')
      .single()

    this.throwIfError(error)
    this.invalidateTable('tenants')
    if (!data) this.notFound('Organization')
    return {
      logoUrl: data.logo_url,
      primaryColor: data.primary_color,
      accentColor: data.accent_color,
    }
  }

  async updateBusinessHours(
    tenantId: string,
    businessHours: BusinessHoursSchedule
  ): Promise<OrganizationSettings> {
    const { data, error } = await this.ctx.supabase
      .from('tenants')
      .update({ business_hours: businessHours as unknown as Json })
      .eq('id', tenantId)
      .is('deleted_at', null)
      .select('timezone, currency, business_hours, settings')
      .single()

    this.throwIfError(error)
    this.invalidateTable('tenants')
    if (!data) this.notFound('Organization')
    const settings = (data.settings ?? {}) as Record<string, unknown>
    return {
      timezone: data.timezone,
      currency: data.currency,
      businessHours: mapBusinessHours(data.business_hours),
      settings,
    }
  }

  async getSubscriptionReference(tenantId: string): Promise<OrganizationSubscriptionReference> {
    const { data, error } = await this.ctx.supabase
      .from('tenants')
      .select('subscription_status, subscription_reference, trial_ends_at, settings')
      .eq('id', tenantId)
      .is('deleted_at', null)
      .maybeSingle()

    this.throwIfError(error)
    if (!data) this.notFound('Organization')

    const settings = (data.settings ?? {}) as Record<string, unknown>
    const subscription = (settings.subscription ?? {}) as Record<string, unknown>

    return {
      status: data.subscription_status,
      reference: data.subscription_reference,
      trialEndsAt: data.trial_ends_at,
      tier: typeof subscription.tier === 'string' ? subscription.tier : null,
    }
  }
}
