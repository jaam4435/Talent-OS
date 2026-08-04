export type TalentEmploymentType = 'freelance' | 'contract' | 'part_time' | 'full_time'
export type TalentDocumentType = 'cv' | 'certificate' | 'reference' | 'portfolio' | 'other'
export type TalentSlotStatus = 'available' | 'busy' | 'unavailable' | 'booked'
export type TalentImportStatus = 'pending' | 'processing' | 'completed' | 'failed'

export type TalentEntityType =
  | 'talent'
  | 'experience'
  | 'document'
  | 'availability'
  | 'import'

export interface TalentLanguage {
  code: string
  level?: 'basic' | 'conversational' | 'fluent' | 'native'
}

export interface TalentProfile {
  id: string
  fullName: string
  email: string
  phone: string | null
  discipline: string
  skills: string[]
  tags: string[]
  dayRate: number | null
  currency: string
  bio: string | null
  portfolioUrl: string | null
  availability: string
  internalRating: number | null
  internalNotes: string | null
  timezone: string | null
  employmentType: TalentEmploymentType
  languages: TalentLanguage[]
  aiSummary: string | null
  profileCompleteness: number
  cvFilePath: string | null
  lastActiveAt: string | null
  createdAt: string
  updatedAt: string
}

export interface TalentExperience {
  id: string
  freelancerId: string
  company: string
  title: string
  description: string | null
  startsOn: string
  endsOn: string | null
  skills: string[]
  sortOrder: number
  createdAt: string
  updatedAt: string
}

export interface TalentDocument {
  id: string
  freelancerId: string
  docType: TalentDocumentType
  fileName: string
  filePath: string
  mimeType: string | null
  sizeBytes: number | null
  createdAt: string
  updatedAt: string
}

export interface TalentAvailabilitySlot {
  id: string
  freelancerId: string
  startsAt: string
  endsAt: string
  status: TalentSlotStatus
  notes: string | null
  createdAt: string
  updatedAt: string
}

export interface TalentImportBatch {
  id: string
  fileName: string
  status: TalentImportStatus
  totalRows: number
  successCount: number
  errorCount: number
  errors: Array<{ row: number; message: string }>
  createdAt: string
  completedAt: string | null
}

export interface TalentSkillMatch {
  freelancerId: string
  fullName: string
  discipline: string
  dayRate: number | null
  internalRating: number | null
  skillMatchCount: number
  matchRatio: number
}

export interface TalentCompleteness {
  score: number
  missing: string[]
  sections: Record<string, { filled: number; total: number; percent: number }>
}

export interface TalentAiProfile {
  talentId: string
  summary: string | null
  context: Record<string, unknown>
  profile: {
    name: string
    discipline: string
    skills: string[]
    tags: string[]
    languages: TalentLanguage[]
    employmentType: TalentEmploymentType
    timezone: string | null
    availability: string
    rates: { dayRate: number | null; currency: string }
    experienceCount: number
    documentCount: number
    portfolioUrl: string | null
    completeness: number
  }
}

export interface TalentAuditEntry {
  id: string
  action: string
  entityType: string
  entityId: string
  actorId: string | null
  beforeState: Record<string, unknown> | null
  afterState: Record<string, unknown> | null
  metadata: Record<string, unknown>
  createdAt: string
}

export const TALENT_EVENT_TYPES = {
  CREATED: 'talent.created',
  UPDATED: 'talent.updated',
  DELETED: 'talent.deleted',
  EXPERIENCE_ADDED: 'talent.experience.added',
  EXPERIENCE_UPDATED: 'talent.experience.updated',
  DOCUMENT_ADDED: 'talent.document.added',
  AVAILABILITY_UPDATED: 'talent.availability.updated',
  IMPORT_COMPLETED: 'talent.import.completed',
  COMPLETENESS_UPDATED: 'talent.completeness.updated',
} as const

/** AI/MCP entity descriptors for tool routing */
export const TALENT_AI_ENTITIES = {
  talent: { table: 'freelancers', contextField: 'ai_context' },
  experience: { table: 'talent_experience', contextField: null },
  document: { table: 'talent_documents', contextField: null },
} as const
