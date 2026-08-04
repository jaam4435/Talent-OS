import type { Repositories } from '@/lib/repositories/factory'
import type { Tables } from '@/modules/core/types/database'
import type { PaginatedResult } from '@/lib/repositories/base/types'
import {
  TALENT_EVENT_TYPES,
  type TalentAiProfile,
  type TalentAvailabilitySlot,
  type TalentCompleteness,
  type TalentDocument,
  type TalentExperience,
  type TalentImportBatch,
  type TalentLanguage,
  type TalentMarketplaceProfile,
  type TalentProfile,
  type TalentSkillMatch,
} from '@/modules/talent/types'
import { mapMarketplaceProfile } from '@/modules/talent/marketplace'

type TalentRow = Tables<'freelancers'>

export function mapTalentProfile(row: TalentRow): TalentProfile {
  return {
    id: row.id,
    fullName: row.full_name,
    email: row.email,
    phone: row.phone,
    discipline: row.discipline,
    skills: row.skills ?? [],
    tags: row.tags ?? [],
    dayRate: row.day_rate,
    currency: row.currency,
    bio: row.bio,
    portfolioUrl: row.portfolio_url,
    availability: row.availability,
    internalRating: row.internal_rating,
    internalNotes: row.internal_notes,
    timezone: row.timezone ?? null,
    employmentType: row.employment_type ?? 'freelance',
    languages: (row.languages as unknown as TalentLanguage[] | null) ?? [],
    aiSummary: row.ai_summary ?? null,
    profileCompleteness: row.profile_completeness ?? 0,
    cvFilePath: row.cv_file_path ?? null,
    marketplaceVisible: row.marketplace_visible ?? false,
    marketplacePublishedAt: row.marketplace_published_at ?? null,
    lastActiveAt: row.last_active_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export function computeProfileCompleteness(input: {
  row: TalentRow
  experienceCount: number
  documentCount: number
}): TalentCompleteness {
  const checks: Array<{ key: string; section: string; filled: boolean }> = [
    { key: 'full_name', section: 'basics', filled: Boolean(input.row.full_name?.trim()) },
    { key: 'email', section: 'basics', filled: Boolean(input.row.email?.trim()) },
    { key: 'phone', section: 'basics', filled: Boolean(input.row.phone?.trim()) },
    { key: 'discipline', section: 'basics', filled: Boolean(input.row.discipline) },
    { key: 'skills', section: 'skills', filled: (input.row.skills?.length ?? 0) > 0 },
    { key: 'tags', section: 'skills', filled: (input.row.tags?.length ?? 0) > 0 },
    { key: 'bio', section: 'profile', filled: Boolean(input.row.bio?.trim()) },
    { key: 'portfolio_url', section: 'profile', filled: Boolean(input.row.portfolio_url?.trim()) },
    { key: 'day_rate', section: 'rates', filled: input.row.day_rate != null },
    { key: 'timezone', section: 'location', filled: Boolean(input.row.timezone?.trim()) },
    { key: 'languages', section: 'location', filled: Array.isArray(input.row.languages) && input.row.languages.length > 0 },
    { key: 'employment_type', section: 'employment', filled: Boolean(input.row.employment_type) },
    { key: 'cv', section: 'documents', filled: Boolean(input.row.cv_file_path?.trim()) || input.documentCount > 0 },
    { key: 'experience', section: 'experience', filled: input.experienceCount > 0 },
    { key: 'ai_summary', section: 'ai', filled: Boolean(input.row.ai_summary?.trim()) },
  ]

  const sections: TalentCompleteness['sections'] = {}
  for (const check of checks) {
    if (!sections[check.section]) sections[check.section] = { filled: 0, total: 0, percent: 0 }
    sections[check.section].total += 1
    if (check.filled) sections[check.section].filled += 1
  }
  for (const section of Object.keys(sections)) {
    const s = sections[section]
    s.percent = s.total ? Math.round((s.filled / s.total) * 100) : 0
  }

  const filled = checks.filter((c) => c.filled).length
  const score = Math.round((filled / checks.length) * 100)
  const missing = checks.filter((c) => !c.filled).map((c) => c.key)

  return { score, missing, sections }
}

export class TalentModuleService {
  constructor(private readonly repos: Repositories) {}

  async listTalent(
    tenantId: string,
    options: {
      page?: number
      limit?: number
      q?: string
      discipline?: string
      availability?: string
      employmentType?: string
      timezone?: string
      minCompleteness?: number
      skills?: string[]
      tags?: string[]
      sort?: string
      minRate?: number
      maxRate?: number
      minRating?: number
    }
  ): Promise<PaginatedResult<TalentProfile>> {
    const limit = options.limit ?? 20
    const page = options.page ?? 1
    const rows = await this.repos.talent.searchAdvanced(tenantId, {
      query: options.q,
      discipline: options.discipline,
      availability: options.availability,
      employmentType: options.employmentType,
      timezone: options.timezone,
      minCompleteness: options.minCompleteness,
      skills: options.skills,
      tags: options.tags,
      sort: options.sort,
      minRate: options.minRate,
      maxRate: options.maxRate,
      minRating: options.minRating,
      limit,
      offset: (page - 1) * limit,
    })

    return {
      data: rows.map(mapTalentProfile),
      page,
      limit,
      total: rows.length,
      hasMore: rows.length === limit,
    }
  }

  async getTalent(tenantId: string, id: string): Promise<TalentProfile | null> {
    const row = await this.repos.talent.findModuleById(id, tenantId)
    return row ? mapTalentProfile(row) : null
  }

  async createTalent(
    tenantId: string,
    actorId: string,
    input: Record<string, unknown>,
    defaultCurrency = 'USD'
  ): Promise<TalentProfile> {
    const row = await this.repos.talent.createModule({
      tenant_id: tenantId,
      full_name: input.full_name,
      email: String(input.email).toLowerCase(),
      phone: input.phone ?? null,
      discipline: input.discipline,
      skills: input.skills ?? [],
      tags: input.tags ?? [],
      day_rate: input.day_rate ?? null,
      currency: input.currency ?? defaultCurrency,
      bio: input.bio ?? null,
      portfolio_url: input.portfolio_url || null,
      availability: input.availability ?? 'available',
      internal_rating: input.internal_rating ?? null,
      internal_notes: input.internal_notes ?? null,
      timezone: input.timezone ?? null,
      employment_type: input.employment_type ?? 'freelance',
      languages: input.languages ?? [],
      ai_summary: input.ai_summary ?? null,
      last_active_at: new Date().toISOString(),
    })

    const completeness = computeProfileCompleteness({ row, experienceCount: 0, documentCount: 0 })
    const updated = await this.repos.talent.updateModule(row.id, tenantId, {
      profile_completeness: completeness.score,
    })

    await this.auditAndEmit({
      tenantId,
      actorId,
      action: 'talent.created',
      entityType: 'talent',
      entityId: row.id,
      eventType: TALENT_EVENT_TYPES.CREATED,
      afterState: { fullName: row.full_name, email: row.email },
    })

    return mapTalentProfile({ ...updated, profile_completeness: completeness.score })
  }

  async updateTalent(
    tenantId: string,
    actorId: string,
    id: string,
    patch: Record<string, unknown>
  ): Promise<{ ok: true; talent: TalentProfile } | { ok: false; error: string }> {
    const current = await this.repos.talent.findModuleById(id, tenantId)
    if (!current) return { ok: false, error: 'Talent not found' }

    const dbPatch: Record<string, unknown> = { last_active_at: new Date().toISOString() }
    const fieldMap: Record<string, string> = {
      full_name: 'full_name',
      email: 'email',
      phone: 'phone',
      discipline: 'discipline',
      skills: 'skills',
      tags: 'tags',
      day_rate: 'day_rate',
      currency: 'currency',
      bio: 'bio',
      portfolio_url: 'portfolio_url',
      availability: 'availability',
      internal_rating: 'internal_rating',
      internal_notes: 'internal_notes',
      timezone: 'timezone',
      employment_type: 'employment_type',
      languages: 'languages',
      ai_summary: 'ai_summary',
      cv_file_path: 'cv_file_path',
      ai_context: 'ai_context',
    }

    for (const [key, col] of Object.entries(fieldMap)) {
      if (key in patch) dbPatch[col] = patch[key]
    }
    if ('email' in dbPatch && typeof dbPatch.email === 'string') {
      dbPatch.email = dbPatch.email.toLowerCase()
    }

    const row = await this.repos.talent.updateModule(id, tenantId, dbPatch)
    const [experienceCount, documentCount] = await Promise.all([
      this.repos.talentExperience.countByFreelancer(id, tenantId),
      this.repos.talentDocument.countByFreelancer(id, tenantId),
    ])
    const completeness = computeProfileCompleteness({ row, experienceCount, documentCount })
    const updated = await this.repos.talent.updateModule(id, tenantId, {
      profile_completeness: completeness.score,
    })

    await this.auditAndEmit({
      tenantId,
      actorId,
      action: 'talent.updated',
      entityType: 'talent',
      entityId: id,
      eventType: TALENT_EVENT_TYPES.UPDATED,
      beforeState: { fullName: current.full_name, availability: current.availability },
      afterState: { fullName: updated.full_name, availability: updated.availability, completeness: completeness.score },
    })

    return { ok: true, talent: mapTalentProfile({ ...updated, profile_completeness: completeness.score }) }
  }

  async deleteTalent(
    tenantId: string,
    actorId: string,
    id: string
  ): Promise<{ ok: true } | { ok: false; error: string }> {
    const current = await this.repos.talent.findModuleById(id, tenantId)
    if (!current) return { ok: false, error: 'Talent not found' }

    await this.repos.talent.softDelete(id, tenantId)
    await this.auditAndEmit({
      tenantId,
      actorId,
      action: 'talent.deleted',
      entityType: 'talent',
      entityId: id,
      eventType: TALENT_EVENT_TYPES.DELETED,
      beforeState: { fullName: current.full_name },
    })
    return { ok: true }
  }

  async getCompleteness(tenantId: string, id: string): Promise<TalentCompleteness | null> {
    const row = await this.repos.talent.findModuleById(id, tenantId)
    if (!row) return null
    const [experienceCount, documentCount] = await Promise.all([
      this.repos.talentExperience.countByFreelancer(id, tenantId),
      this.repos.talentDocument.countByFreelancer(id, tenantId),
    ])
    return computeProfileCompleteness({ row, experienceCount, documentCount })
  }

  async getAiProfile(tenantId: string, id: string): Promise<TalentAiProfile | null> {
    const row = await this.repos.talent.findModuleById(id, tenantId)
    if (!row) return null

    const [experienceCount, documentCount] = await Promise.all([
      this.repos.talentExperience.countByFreelancer(id, tenantId),
      this.repos.talentDocument.countByFreelancer(id, tenantId),
    ])

    return {
      talentId: id,
      summary: row.ai_summary ?? null,
      context: (row.ai_context as Record<string, unknown>) ?? {},
      profile: {
        name: row.full_name,
        discipline: row.discipline,
        skills: row.skills ?? [],
        tags: row.tags ?? [],
        languages: (row.languages as unknown as TalentLanguage[]) ?? [],
        employmentType: row.employment_type ?? 'freelance',
        timezone: row.timezone ?? null,
        availability: row.availability,
        rates: { dayRate: row.day_rate, currency: row.currency },
        experienceCount,
        documentCount,
        portfolioUrl: row.portfolio_url,
        completeness: row.profile_completeness ?? 0,
      },
    }
  }

  async matchSkills(
    tenantId: string,
    skills: string[],
    discipline?: string,
    limit = 20
  ): Promise<TalentSkillMatch[]> {
    const rows = await this.repos.talent.matchSkills(tenantId, skills, discipline ?? null, limit)
    return rows.map((r) => ({
      freelancerId: r.freelancer_id,
      fullName: r.full_name,
      discipline: r.discipline,
      dayRate: r.day_rate,
      internalRating: r.internal_rating,
      skillMatchCount: r.skill_match_count,
      matchRatio: Number(r.match_ratio),
    }))
  }

  async listExperience(tenantId: string, talentId: string): Promise<TalentExperience[]> {
    return this.repos.talentExperience.listByFreelancer(talentId, tenantId)
  }

  async addExperience(
    tenantId: string,
    actorId: string,
    talentId: string,
    input: Record<string, unknown>
  ): Promise<{ ok: true; experience: TalentExperience } | { ok: false; error: string }> {
    const talent = await this.repos.talent.findModuleById(talentId, tenantId)
    if (!talent) return { ok: false, error: 'Talent not found' }

    const experience = await this.repos.talentExperience.create({
      tenant_id: tenantId,
      freelancer_id: talentId,
      company: input.company as string,
      title: input.title as string,
      description: (input.description as string | null) ?? null,
      starts_on: input.starts_on as string,
      ends_on: (input.ends_on as string | null) ?? null,
      skills: (input.skills as string[]) ?? [],
      sort_order: (input.sort_order as number) ?? 0,
    })

    await this.refreshCompleteness(tenantId, actorId, talentId)
    await this.auditAndEmit({
      tenantId,
      actorId,
      action: 'talent.experience.added',
      entityType: 'experience',
      entityId: experience.id,
      eventType: TALENT_EVENT_TYPES.EXPERIENCE_ADDED,
      afterState: { company: experience.company, title: experience.title },
    })

    return { ok: true, experience }
  }

  async updateExperience(
    tenantId: string,
    actorId: string,
    talentId: string,
    experienceId: string,
    patch: Record<string, unknown>
  ): Promise<{ ok: true; experience: TalentExperience } | { ok: false; error: string }> {
    const current = await this.repos.talentExperience.findById(experienceId, tenantId)
    if (!current || current.freelancerId !== talentId) return { ok: false, error: 'Experience not found' }

    const experience = await this.repos.talentExperience.update(experienceId, tenantId, patch)
    await this.refreshCompleteness(tenantId, actorId, talentId)
    await this.auditAndEmit({
      tenantId,
      actorId,
      action: 'talent.experience.updated',
      entityType: 'experience',
      entityId: experienceId,
      eventType: TALENT_EVENT_TYPES.EXPERIENCE_UPDATED,
      beforeState: { title: current.title },
      afterState: { title: experience.title },
    })
    return { ok: true, experience }
  }

  async deleteExperience(
    tenantId: string,
    actorId: string,
    talentId: string,
    experienceId: string
  ): Promise<{ ok: true } | { ok: false; error: string }> {
    const current = await this.repos.talentExperience.findById(experienceId, tenantId)
    if (!current || current.freelancerId !== talentId) return { ok: false, error: 'Experience not found' }

    await this.repos.talentExperience.softDelete(experienceId, tenantId)
    await this.refreshCompleteness(tenantId, actorId, talentId)
    return { ok: true }
  }

  async listDocuments(tenantId: string, talentId: string): Promise<TalentDocument[]> {
    return this.repos.talentDocument.listByFreelancer(talentId, tenantId)
  }

  async addDocument(
    tenantId: string,
    actorId: string,
    talentId: string,
    input: Record<string, unknown>
  ): Promise<{ ok: true; document: TalentDocument } | { ok: false; error: string }> {
    const talent = await this.repos.talent.findModuleById(talentId, tenantId)
    if (!talent) return { ok: false, error: 'Talent not found' }

    const document = await this.repos.talentDocument.create({
      tenant_id: tenantId,
      freelancer_id: talentId,
      doc_type: (input.doc_type as never) ?? 'other',
      file_name: input.file_name as string,
      file_path: input.file_path as string,
      mime_type: (input.mime_type as string | null) ?? null,
      size_bytes: (input.size_bytes as number | null) ?? null,
    })

    if (document.docType === 'cv') {
      await this.repos.talent.updateModule(talentId, tenantId, { cv_file_path: document.filePath })
    }

    await this.refreshCompleteness(tenantId, actorId, talentId)
    await this.auditAndEmit({
      tenantId,
      actorId,
      action: 'talent.document.added',
      entityType: 'document',
      entityId: document.id,
      eventType: TALENT_EVENT_TYPES.DOCUMENT_ADDED,
      afterState: { docType: document.docType, fileName: document.fileName },
    })

    return { ok: true, document }
  }

  async deleteDocument(
    tenantId: string,
    actorId: string,
    talentId: string,
    documentId: string
  ): Promise<{ ok: true } | { ok: false; error: string }> {
    const current = await this.repos.talentDocument.findById(documentId, tenantId)
    if (!current || current.freelancerId !== talentId) return { ok: false, error: 'Document not found' }

    await this.repos.talentDocument.softDelete(documentId, tenantId)
    await this.refreshCompleteness(tenantId, actorId, talentId)
    return { ok: true }
  }

  async listAvailability(
    tenantId: string,
    talentId: string,
    range?: { from: string; to: string }
  ): Promise<TalentAvailabilitySlot[]> {
    return this.repos.talentAvailability.listByFreelancer(talentId, tenantId, range)
  }

  async addAvailabilitySlot(
    tenantId: string,
    actorId: string,
    talentId: string,
    input: Record<string, unknown>
  ): Promise<{ ok: true; slot: TalentAvailabilitySlot } | { ok: false; error: string }> {
    const talent = await this.repos.talent.findModuleById(talentId, tenantId)
    if (!talent) return { ok: false, error: 'Talent not found' }

    const slot = await this.repos.talentAvailability.create({
      tenant_id: tenantId,
      freelancer_id: talentId,
      starts_at: input.starts_at as string,
      ends_at: input.ends_at as string,
      status: (input.status as never) ?? 'available',
      notes: (input.notes as string | null) ?? null,
    })

    await this.auditAndEmit({
      tenantId,
      actorId,
      action: 'talent.availability.updated',
      entityType: 'availability',
      entityId: slot.id,
      eventType: TALENT_EVENT_TYPES.AVAILABILITY_UPDATED,
      afterState: { startsAt: slot.startsAt, endsAt: slot.endsAt, status: slot.status },
    })

    return { ok: true, slot }
  }

  async updateAvailabilitySlot(
    tenantId: string,
    actorId: string,
    talentId: string,
    slotId: string,
    patch: Record<string, unknown>
  ): Promise<{ ok: true; slot: TalentAvailabilitySlot } | { ok: false; error: string }> {
    const current = await this.repos.talentAvailability.findById(slotId, tenantId)
    if (!current || current.freelancerId !== talentId) return { ok: false, error: 'Slot not found' }

    const slot = await this.repos.talentAvailability.update(slotId, tenantId, patch)
    await this.auditAndEmit({
      tenantId,
      actorId,
      action: 'talent.availability.updated',
      entityType: 'availability',
      entityId: slotId,
      eventType: TALENT_EVENT_TYPES.AVAILABILITY_UPDATED,
      beforeState: { status: current.status },
      afterState: { status: slot.status },
    })
    return { ok: true, slot }
  }

  async deleteAvailabilitySlot(
    tenantId: string,
    actorId: string,
    talentId: string,
    slotId: string
  ): Promise<{ ok: true } | { ok: false; error: string }> {
    const current = await this.repos.talentAvailability.findById(slotId, tenantId)
    if (!current || current.freelancerId !== talentId) return { ok: false, error: 'Slot not found' }

    await this.repos.talentAvailability.softDelete(slotId, tenantId)
    return { ok: true }
  }

  async importCsv(
    tenantId: string,
    actorId: string,
    rows: Array<Record<string, unknown>>,
    fileName = 'import.csv',
    defaultCurrency = 'USD'
  ): Promise<TalentImportBatch> {
    const batch = await this.repos.talentImport.create({
      tenant_id: tenantId,
      uploaded_by: actorId,
      file_name: fileName,
      total_rows: rows.length,
    })

    const errors: Array<{ row: number; message: string }> = []
    let successCount = 0

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i]
      try {
        if (!row.full_name || !row.email || !row.discipline || !Array.isArray(row.skills) || row.skills.length === 0) {
          throw new Error('Missing required fields: full_name, email, discipline, skills')
        }
        await this.createTalent(tenantId, actorId, {
          ...row,
          currency: defaultCurrency,
        })
        successCount += 1
      } catch (error) {
        errors.push({
          row: i + 1,
          message: error instanceof Error ? error.message : 'Import failed',
        })
      }
    }

    const completed = await this.repos.talentImport.complete(batch.id, tenantId, {
      status: errors.length === rows.length ? 'failed' : 'completed',
      success_count: successCount,
      error_count: errors.length,
      errors,
    })

    await this.auditAndEmit({
      tenantId,
      actorId,
      action: 'talent.import.completed',
      entityType: 'import',
      entityId: batch.id,
      eventType: TALENT_EVENT_TYPES.IMPORT_COMPLETED,
      afterState: {
        successCount,
        errorCount: errors.length,
        totalRows: rows.length,
      },
    })

    return completed
  }

  async listAuditLogs(tenantId: string, options: Parameters<typeof this.repos.talentAudit.list>[1]) {
    return this.repos.talentAudit.list(tenantId, options)
  }

  async listMarketplaceProfiles(options: {
    page?: number
    limit?: number
    q?: string
    discipline?: string
    availability?: string
  }): Promise<PaginatedResult<TalentMarketplaceProfile>> {
    const result = await this.repos.talent.listMarketplaceProfiles(options)
    return {
      ...result,
      data: result.data.map(mapMarketplaceProfile),
    }
  }

  async getMarketplaceProfile(id: string): Promise<TalentMarketplaceProfile | null> {
    const row = await this.repos.talent.findMarketplaceProfile(id)
    return row ? mapMarketplaceProfile(row) : null
  }

  async setMarketplaceVisibility(
    tenantId: string,
    actorId: string,
    id: string,
    visible: boolean
  ): Promise<{ ok: true; talent: TalentProfile } | { ok: false; error: string }> {
    const current = await this.repos.talent.findModuleById(id, tenantId)
    if (!current) return { ok: false, error: 'Talent not found' }

    const now = visible ? new Date().toISOString() : null
    const row = await this.repos.talent.updateModule(id, tenantId, {
      marketplace_visible: visible,
      marketplace_published_at: visible ? now : null,
    })

    await this.auditAndEmit({
      tenantId,
      actorId,
      action: visible ? 'talent.marketplace.published' : 'talent.marketplace.unpublished',
      entityType: 'talent',
      entityId: id,
      eventType: visible
        ? TALENT_EVENT_TYPES.MARKETPLACE_PUBLISHED
        : TALENT_EVENT_TYPES.MARKETPLACE_UNPUBLISHED,
      beforeState: { marketplaceVisible: current.marketplace_visible ?? false },
      afterState: { marketplaceVisible: visible, publishedAt: now },
    })

    return { ok: true, talent: mapTalentProfile(row) }
  }

  private async refreshCompleteness(tenantId: string, actorId: string, talentId: string) {
    const row = await this.repos.talent.findModuleById(talentId, tenantId)
    if (!row) return

    const [experienceCount, documentCount] = await Promise.all([
      this.repos.talentExperience.countByFreelancer(talentId, tenantId),
      this.repos.talentDocument.countByFreelancer(talentId, tenantId),
    ])
    const completeness = computeProfileCompleteness({ row, experienceCount, documentCount })
    await this.repos.talent.updateModule(talentId, tenantId, {
      profile_completeness: completeness.score,
    })

    await this.auditAndEmit({
      tenantId,
      actorId,
      action: 'talent.completeness.updated',
      entityType: 'talent',
      entityId: talentId,
      eventType: TALENT_EVENT_TYPES.COMPLETENESS_UPDATED,
      afterState: { score: completeness.score },
    })
  }

  private async auditAndEmit(input: {
    tenantId: string
    actorId: string
    action: string
    entityType: string
    entityId: string
    eventType: string
    beforeState?: Record<string, unknown> | null
    afterState?: Record<string, unknown> | null
  }) {
    await this.repos.talentAudit.record({
      tenant_id: input.tenantId,
      actor_id: input.actorId,
      action: input.action,
      entity_type: input.entityType,
      entity_id: input.entityId,
      before_state: input.beforeState ?? null,
      after_state: input.afterState ?? null,
    })

    await this.repos.domainEvent.emit({
      tenantId: input.tenantId,
      eventType: input.eventType,
      aggregateType: input.entityType,
      aggregateId: input.entityId,
      idempotencyKey: `${input.eventType}:${input.entityId}:${Date.now()}`,
      actorId: input.actorId,
      payload: {
        action: input.action,
        before: input.beforeState ?? null,
        after: input.afterState ?? null,
      },
    })
  }
}
