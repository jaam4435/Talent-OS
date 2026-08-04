import type { TalentEmploymentType, TalentLanguage, TalentMarketplaceProfile } from '@/modules/talent/types'

/** Derive a public display name from full name (first name + last initial). */
export function anonymizeDisplayName(fullName: string): string {
  const parts = fullName.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return 'Talent'
  if (parts.length === 1) return parts[0]
  const lastInitial = parts[parts.length - 1][0]
  return `${parts[0]} ${lastInitial}.`
}

export function mapMarketplaceProfile(row: {
  id: string
  full_name: string
  discipline: string
  skills: string[] | null
  tags: string[] | null
  bio: string | null
  portfolio_url: string | null
  timezone: string | null
  employment_type: string | null
  languages: unknown
  availability: string
  profile_completeness: number | null
  ai_summary: string | null
  marketplace_published_at: string | null
  updated_at: string
}): TalentMarketplaceProfile {
  return {
    id: row.id,
    displayName: anonymizeDisplayName(row.full_name),
    discipline: row.discipline,
    skills: row.skills ?? [],
    tags: row.tags ?? [],
    bio: row.bio,
    portfolioUrl: row.portfolio_url,
    timezone: row.timezone ?? null,
    employmentType: (row.employment_type ?? 'freelance') as TalentEmploymentType,
    languages: (row.languages as TalentLanguage[] | null) ?? [],
    availability: row.availability,
    profileCompleteness: row.profile_completeness ?? 0,
    aiSummary: row.ai_summary ?? null,
    publishedAt: row.marketplace_published_at,
    updatedAt: row.updated_at,
  }
}

/** Fields safe to expose on public marketplace responses. */
export const MARKETPLACE_PUBLIC_FIELDS = [
  'id',
  'displayName',
  'discipline',
  'skills',
  'tags',
  'bio',
  'portfolioUrl',
  'timezone',
  'employmentType',
  'languages',
  'availability',
  'profileCompleteness',
  'aiSummary',
  'publishedAt',
  'updatedAt',
] as const
