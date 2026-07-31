import type {
  FreelancerProfileData,
  FreelancerSelfProfileData,
  PortfolioItemData,
} from '@/lib/domains/talent/validation'

export interface FreelancerInsertRow {
  tenant_id: string
  full_name: string
  email: string
  phone: string | null
  discipline: string
  skills: string[]
  tags: string[]
  day_rate: number | null
  currency: string
  bio: string | null
  portfolio_url: string | null
  availability: string
  internal_rating: number | null
  internal_notes: string | null
}

export interface FreelancerUpdateRow {
  full_name: string
  email: string
  phone: string | null
  discipline: string
  skills: string[]
  tags: string[]
  day_rate: number | null
  currency: string
  bio: string | null
  portfolio_url: string | null
  availability: string
  internal_rating: number | null
  internal_notes: string | null
  last_active_at: string
}

export interface FreelancerSelfUpdateRow {
  bio: string | null
  portfolio_url: string | null
  skills: string[]
  tags: string[]
  availability: string
  last_active_at: string
}

export interface PortfolioItemInsertRow {
  freelancer_id: string
  title: string
  description: string | null
  project_url: string | null
  image_path: string | null
  sort_order: number
}

export function toFreelancerInsertRow(
  tenantId: string,
  data: FreelancerProfileData,
  defaultCurrency: string
): FreelancerInsertRow {
  return {
    tenant_id: tenantId,
    full_name: data.fullName,
    email: data.email.toLowerCase(),
    phone: data.phone ?? null,
    discipline: data.discipline,
    skills: data.skills,
    tags: data.tags ?? [],
    day_rate: data.dayRate ?? null,
    currency: data.currency ?? defaultCurrency,
    bio: data.bio ?? null,
    portfolio_url: data.portfolioUrl || null,
    availability: data.availability ?? 'available',
    internal_rating: data.internalRating ?? null,
    internal_notes: data.internalNotes ?? null,
  }
}

export function toFreelancerUpdateRow(
  data: FreelancerProfileData,
  defaultCurrency: string
): FreelancerUpdateRow {
  return {
    full_name: data.fullName,
    email: data.email.toLowerCase(),
    phone: data.phone ?? null,
    discipline: data.discipline,
    skills: data.skills,
    tags: data.tags ?? [],
    day_rate: data.dayRate ?? null,
    currency: data.currency ?? defaultCurrency,
    bio: data.bio ?? null,
    portfolio_url: data.portfolioUrl || null,
    availability: data.availability ?? 'available',
    internal_rating: data.internalRating ?? null,
    internal_notes: data.internalNotes ?? null,
    last_active_at: new Date().toISOString(),
  }
}

export function toFreelancerSelfUpdateRow(data: FreelancerSelfProfileData): FreelancerSelfUpdateRow {
  return {
    bio: data.bio ?? null,
    portfolio_url: data.portfolioUrl || null,
    skills: data.skills,
    tags: data.tags ?? [],
    availability: data.availability,
    last_active_at: new Date().toISOString(),
  }
}

export function toPortfolioItemInsertRow(
  freelancerId: string,
  data: PortfolioItemData
): PortfolioItemInsertRow {
  return {
    freelancer_id: freelancerId,
    title: data.title,
    description: data.description ?? null,
    project_url: data.projectUrl || null,
    image_path: data.imagePath ?? null,
    sort_order: data.sortOrder ?? 0,
  }
}
