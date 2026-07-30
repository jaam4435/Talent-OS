import { createRepositoryContext, createAdminRepositoryContext } from '@/lib/repositories/context'
import { TalentRepository } from '@/lib/repositories/talent.repository'
import { ProjectRepository } from '@/lib/repositories/project.repository'
import { TaskRepository } from '@/lib/repositories/task.repository'
import { LeadRepository } from '@/lib/repositories/lead.repository'
import { InvoiceRepository } from '@/lib/repositories/invoice.repository'
import { CompanyRepository } from '@/lib/repositories/company.repository'
import { ShortlistRepository } from '@/lib/repositories/shortlist.repository'
import { NotificationRepository } from '@/lib/repositories/notification.repository'
import { ActivityLogRepository } from '@/lib/repositories/activity-log.repository'
import {
  DashboardRepository,
  MatchScoreRepository,
  MemberInviteRepository,
  TenantMemberRepository,
} from '@/lib/repositories/dashboard.repository'
import { AiRequestRepository } from '@/lib/repositories/ai-request.repository'
import { TenantRepository } from '@/lib/repositories/tenant.repository'
import { DomainEventRepository } from '@/lib/repositories/domain-event.repository'
import {
  IntegrationConfigRepository,
  WebhookDeliveryRepository,
  WhatsappMessageRepository,
} from '@/lib/repositories/integration.repository'
import { PortfolioRepository } from '@/lib/domains/talent/repositories/portfolio.repository'
import { RatingRepository } from '@/lib/domains/talent/repositories/rating.repository'
import { WorkflowRepository } from '@/lib/repositories/workflow.repository'
import { WhatsappConversationRepository } from '@/lib/repositories/whatsapp-conversation.repository'
import { KnowledgeRepository } from '@/lib/repositories/knowledge.repository'
import { KnowledgeEmbeddingRepository } from '@/lib/repositories/knowledge-embedding.repository'
import {
  AgentConfigRepository,
  AgentInstructionRepository,
} from '@/lib/repositories/agent.repository'
import {
  AgentSessionRepository,
  AgentMemoryRepository,
  AgentMessageRepository,
} from '@/lib/repositories/agent-session.repository'

export interface Repositories {
  talent: TalentRepository
  project: ProjectRepository
  task: TaskRepository
  lead: LeadRepository
  invoice: InvoiceRepository
  company: CompanyRepository
  shortlist: ShortlistRepository
  notification: NotificationRepository
  activityLog: ActivityLogRepository
  dashboard: DashboardRepository
  tenantMember: TenantMemberRepository
  memberInvite: MemberInviteRepository
  matchScore: MatchScoreRepository
  aiRequest: AiRequestRepository
  tenant: TenantRepository
  domainEvent: DomainEventRepository
  integration: IntegrationConfigRepository
  webhookDelivery: WebhookDeliveryRepository
  whatsapp: WhatsappMessageRepository
  portfolio: PortfolioRepository
  rating: RatingRepository
  workflow: WorkflowRepository
  whatsappConversation: WhatsappConversationRepository
  knowledge: KnowledgeRepository
  knowledgeEmbedding: KnowledgeEmbeddingRepository
  agentConfig: AgentConfigRepository
  agentInstruction: AgentInstructionRepository
  agentSession: AgentSessionRepository
  agentMemory: AgentMemoryRepository
  agentMessage: AgentMessageRepository
}

function buildRepositories(ctx: Awaited<ReturnType<typeof createRepositoryContext>>): Repositories {
  return {
    talent: new TalentRepository(ctx),
    project: new ProjectRepository(ctx),
    task: new TaskRepository(ctx),
    lead: new LeadRepository(ctx),
    invoice: new InvoiceRepository(ctx),
    company: new CompanyRepository(ctx),
    shortlist: new ShortlistRepository(ctx),
    notification: new NotificationRepository(ctx),
    activityLog: new ActivityLogRepository(ctx),
    dashboard: new DashboardRepository(ctx),
    tenantMember: new TenantMemberRepository(ctx),
    memberInvite: new MemberInviteRepository(ctx),
    matchScore: new MatchScoreRepository(ctx),
    aiRequest: new AiRequestRepository(ctx),
    tenant: new TenantRepository(ctx),
    domainEvent: new DomainEventRepository(ctx),
    integration: new IntegrationConfigRepository(ctx),
    webhookDelivery: new WebhookDeliveryRepository(ctx),
    whatsapp: new WhatsappMessageRepository(ctx),
    portfolio: new PortfolioRepository(ctx),
    rating: new RatingRepository(ctx),
    workflow: new WorkflowRepository(ctx),
    whatsappConversation: new WhatsappConversationRepository(ctx),
    knowledge: new KnowledgeRepository(ctx),
    knowledgeEmbedding: new KnowledgeEmbeddingRepository(ctx),
    agentConfig: new AgentConfigRepository(ctx),
    agentInstruction: new AgentInstructionRepository(ctx),
    agentSession: new AgentSessionRepository(ctx),
    agentMemory: new AgentMemoryRepository(ctx),
    agentMessage: new AgentMessageRepository(ctx),
  }
}

export async function createRepositories(): Promise<Repositories> {
  return buildRepositories(await createRepositoryContext())
}

export async function createAdminRepositories(): Promise<Repositories> {
  return buildRepositories(await createAdminRepositoryContext())
}
