import type { AvailabilityStatus, DisciplineType } from '@/modules/core/types/enums'

export interface FreelancerProfileInput {
  fullName: string
  email: string
  phone?: string
  discipline: DisciplineType
  skills: string[]
  tags?: string[]
  dayRate?: number
  currency?: string
  bio?: string
  portfolioUrl?: string
  availability?: AvailabilityStatus
  internalRating?: number
  internalNotes?: string
}

export interface FreelancerSelfProfileInput {
  bio?: string
  portfolioUrl?: string
  skills: string[]
  tags?: string[]
  availability: AvailabilityStatus
}

export interface PortfolioItemInput {
  title: string
  description?: string
  projectUrl?: string
  imagePath?: string
  sortOrder?: number
}

export interface TalentSearchParams {
  query?: string
  discipline?: DisciplineType
  availability?: AvailabilityStatus
  minRate?: number
  maxRate?: number
  minRating?: number
  sort?: 'rating' | 'name' | 'rate_asc' | 'rate_desc' | 'active'
  page?: number
  limit?: number
}

export interface PortfolioItem {
  id: string
  title: string
  description: string | null
  projectUrl: string | null
  imagePath: string | null
  imageUrl: string | null
  sortOrder: number
  createdAt: string
}

export interface RatingHistoryEntry {
  id: string
  rating: number
  note: string | null
  createdAt: string
  ratedByName: string | null
}

export interface TalentSearchQuery {
  query?: string
  discipline?: string
  availability?: string
  minRate?: number
  maxRate?: number
  minRating?: number
  sort?: string
  limit?: number
  offset?: number
}

export interface PortfolioAccessContext {
  tenantId: string
}

export interface PortfolioUploadResult {
  path: string
  publicUrl: string
}
