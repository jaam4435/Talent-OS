import type { DisciplineType, OpportunityStatus } from '@/modules/core/types/enums'

export interface CreateOpportunityInput {
  title: string
  description?: string
  budget?: number
  currency?: string
  requiredSkills: string[]
  discipline?: DisciplineType
  clientName?: string
  companyId?: string
  deadline?: string
  responseDeadline?: string
  status?: 'draft' | 'open'
}

export interface BroadcastOpportunityInput {
  opportunityId: string
  freelancerIds: string[]
}

export interface OpportunityResponseInput {
  opportunityId: string
  response: 'interested' | 'declined'
  note?: string
}
