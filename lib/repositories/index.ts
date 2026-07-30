export type {
  PaginationParams,
  PaginatedResult,
  SortParams,
  TenantScopedFilter,
  RepositoryQueryOptions,
} from '@/lib/repositories/base/types'
export { resolvePagination, toPaginatedResult } from '@/lib/repositories/base/types'

export { BaseRepository } from '@/lib/repositories/base/base.repository'
export { RepositoryCache, globalRepositoryCache } from '@/lib/repositories/base/cache'

export { createRepositoryContext, createAdminRepositoryContext } from '@/lib/repositories/context'
export type { RepositoryContext } from '@/lib/repositories/context'

export { TalentRepository } from '@/lib/repositories/talent.repository'
export type { TalentRow, TalentContactRow, TalentNameRow } from '@/lib/repositories/talent.repository'

export { ProjectRepository } from '@/lib/repositories/project.repository'
export type { ProjectRow, ProjectListItem, CreateProjectRpcInput } from '@/lib/repositories/project.repository'

export { TaskRepository } from '@/lib/repositories/task.repository'
export type { TaskRow } from '@/lib/repositories/task.repository'

export { LeadRepository } from '@/lib/repositories/lead.repository'
export type { LeadRow, LeadRecipientRow, LeadListItem, CreateLeadInput } from '@/lib/repositories/lead.repository'

export { InvoiceRepository } from '@/lib/repositories/invoice.repository'
export type { InvoiceRow, InvoiceListItem } from '@/lib/repositories/invoice.repository'

export { CompanyRepository } from '@/lib/repositories/company.repository'
export type { CompanyRow, CompanyListItem, CreateCompanyInput } from '@/lib/repositories/company.repository'

export { ShortlistRepository } from '@/lib/repositories/shortlist.repository'
export type { ShortlistRow, ShortlistItemRow } from '@/lib/repositories/shortlist.repository'

export { NotificationRepository } from '@/lib/repositories/notification.repository'
export type { NotificationRow, CreateNotificationInput } from '@/lib/repositories/notification.repository'

export { ActivityLogRepository } from '@/lib/repositories/activity-log.repository'

export {
  DashboardRepository,
  TenantMemberRepository,
  MatchScoreRepository,
  MemberInviteRepository,
} from '@/lib/repositories/dashboard.repository'
export type { DashboardSummary } from '@/lib/repositories/dashboard.repository'

export { AiRequestRepository } from '@/lib/repositories/ai-request.repository'
export type { AiRequestRow, CreateAiRequestInput, UpdateAiRequestInput } from '@/lib/repositories/ai-request.repository'

export { TenantRepository } from '@/lib/repositories/tenant.repository'
export type { TenantAiSettings } from '@/lib/repositories/tenant.repository'

export { DomainEventRepository } from '@/lib/repositories/domain-event.repository'
export type { EmitDomainEventInput } from '@/lib/repositories/domain-event.repository'

export { WorkflowRepository } from '@/lib/repositories/workflow.repository'

export { WhatsappConversationRepository } from '@/lib/repositories/whatsapp-conversation.repository'

export { KnowledgeRepository } from '@/lib/repositories/knowledge.repository'
export { KnowledgeEmbeddingRepository } from '@/lib/repositories/knowledge-embedding.repository'

export {
  IntegrationConfigRepository,
  WebhookDeliveryRepository,
  WhatsappMessageRepository,
} from '@/lib/repositories/integration.repository'
export type { N8nIntegrationConfig } from '@/lib/repositories/integration.repository'

export { createRepositories, createAdminRepositories } from '@/lib/repositories/factory'
export type { Repositories } from '@/lib/repositories/factory'
