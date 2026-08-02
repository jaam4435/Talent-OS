export type CrmLeadStatus = 'new' | 'contacted' | 'qualified' | 'unqualified' | 'converted'
export type CrmCompanyStatus = 'prospect' | 'active' | 'client' | 'inactive'
export type CrmActivityType = 'call' | 'email' | 'meeting' | 'note' | 'task' | 'other'
export type CrmContractStatus = 'draft' | 'sent' | 'signed' | 'expired' | 'canceled'
export type CrmStageOutcome = 'open' | 'won' | 'lost'

export type CrmEntityType =
  | 'lead'
  | 'company'
  | 'contact'
  | 'deal'
  | 'contract'
  | 'opportunity'

export interface CrmLead {
  id: string
  title: string
  source: string | null
  status: CrmLeadStatus
  companyId: string | null
  contactId: string | null
  ownerId: string | null
  valueEstimate: number | null
  currency: string
  description: string | null
  convertedAt: string | null
  createdAt: string
  updatedAt: string
}

export interface CrmCompany {
  id: string
  name: string
  slug: string
  status: CrmCompanyStatus
  contactEmail: string | null
  contactName: string | null
  website: string | null
  industry: string | null
  notes: string | null
  createdAt: string
  updatedAt: string
}

export interface CrmContact {
  id: string
  companyId: string | null
  firstName: string
  lastName: string | null
  email: string | null
  phone: string | null
  jobTitle: string | null
  isPrimary: boolean
  createdAt: string
  updatedAt: string
}

export interface CrmPipelineStage {
  id: string
  name: string
  slug: string
  sortOrder: number
  outcome: CrmStageOutcome
  color: string | null
}

export interface CrmDeal {
  id: string
  title: string
  value: number | null
  currency: string
  stageId: string
  stageName?: string
  companyId: string | null
  leadId: string | null
  opportunityId: string | null
  ownerId: string | null
  expectedCloseDate: string | null
  probability: number | null
  createdAt: string
  updatedAt: string
}

export interface CrmPipelineBoard {
  stages: Array<CrmPipelineStage & { deals: CrmDeal[] }>
  totals: { count: number; value: number }
}

export interface CrmContract {
  id: string
  title: string
  status: CrmContractStatus
  dealId: string | null
  companyId: string | null
  value: number | null
  currency: string
  startsOn: string | null
  endsOn: string | null
  signedAt: string | null
  createdAt: string
  updatedAt: string
}

export interface CrmNote {
  id: string
  entityType: string
  entityId: string
  authorId: string | null
  body: string
  createdAt: string
  updatedAt: string
}

export interface CrmAttachment {
  id: string
  entityType: string
  entityId: string
  fileName: string
  filePath: string
  mimeType: string | null
  sizeBytes: number | null
  createdAt: string
}

export interface CrmActivity {
  id: string
  entityType: string
  entityId: string
  activityType: CrmActivityType
  subject: string
  description: string | null
  actorId: string | null
  occurredAt: string
  createdAt: string
}

export interface CrmAuditEntry {
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

export const CRM_EVENT_TYPES = {
  LEAD_CREATED: 'crm.lead.created',
  LEAD_STATUS_CHANGED: 'crm.lead.status_changed',
  LEAD_CONVERTED: 'crm.lead.converted',
  COMPANY_CREATED: 'crm.company.created',
  COMPANY_UPDATED: 'crm.company.updated',
  CONTACT_CREATED: 'crm.contact.created',
  DEAL_CREATED: 'crm.deal.created',
  DEAL_STAGE_CHANGED: 'crm.deal.stage_changed',
  CONTRACT_CREATED: 'crm.contract.created',
  CONTRACT_SIGNED: 'crm.contract.signed',
  NOTE_CREATED: 'crm.note.created',
  ACTIVITY_LOGGED: 'crm.activity.logged',
} as const

/** AI/MCP entity descriptors for tool routing */
export const CRM_AI_ENTITIES = {
  lead: { table: 'crm_leads', contextField: 'ai_context' },
  deal: { table: 'crm_deals', contextField: 'ai_context' },
  company: { table: 'companies', contextField: 'ai_context' },
  contact: { table: 'crm_contacts', contextField: 'ai_context' },
} as const
