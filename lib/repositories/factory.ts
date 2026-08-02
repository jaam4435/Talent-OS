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
import { ObservabilityRepository } from '@/lib/repositories/observability.repository'
import { PlatformFeatureRepository } from '@/lib/repositories/platform-feature.repository'
import { PlatformConfigRepository } from '@/lib/repositories/platform-config.repository'
import { OrganizationRepository } from '@/lib/repositories/organization.repository'
import { OrganizationDepartmentRepository } from '@/lib/repositories/organization-department.repository'
import { OrganizationTeamRepository } from '@/lib/repositories/organization-team.repository'
import { OrganizationMemberRepository } from '@/lib/repositories/organization-member.repository'
import { OrganizationInviteRepository } from '@/lib/repositories/organization-invite.repository'
import { OrganizationAuditRepository } from '@/lib/repositories/organization-audit.repository'
import { CrmAuditRepository } from '@/lib/repositories/crm-audit.repository'
import { CrmCompanyRepository } from '@/lib/repositories/crm-company.repository'
import { CrmLeadRepository } from '@/lib/repositories/crm-lead.repository'
import { CrmContactRepository } from '@/lib/repositories/crm-contact.repository'
import { CrmPipelineRepository } from '@/lib/repositories/crm-pipeline.repository'
import { CrmDealRepository } from '@/lib/repositories/crm-deal.repository'
import { CrmContractRepository } from '@/lib/repositories/crm-contract.repository'
import {
  CrmNoteRepository,
  CrmAttachmentRepository,
  CrmActivityRepository,
} from '@/lib/repositories/crm-collateral.repository'
import { TalentAuditRepository } from '@/lib/repositories/talent-audit.repository'
import { TalentExperienceRepository } from '@/lib/repositories/talent-experience.repository'
import { TalentDocumentRepository } from '@/lib/repositories/talent-documents.repository'
import { TalentAvailabilityRepository } from '@/lib/repositories/talent-availability.repository'
import { TalentImportRepository } from '@/lib/repositories/talent-import.repository'
import { ProjectAuditRepository } from '@/lib/repositories/project-audit.repository'
import { ProjectMilestoneRepository } from '@/lib/repositories/project-milestone.repository'
import { ProjectTaskRepository } from '@/lib/repositories/project-task.repository'
import { ProjectDeliverableRepository } from '@/lib/repositories/project-deliverable.repository'
import { ProjectAssetRepository } from '@/lib/repositories/project-asset.repository'
import { ProjectCommentRepository } from '@/lib/repositories/project-comment.repository'
import { ProjectDependencyRepository } from '@/lib/repositories/project-dependency.repository'
import { ProjectTemplateRepository } from '@/lib/repositories/project-template.repository'
import { ProjectTimelineRepository } from '@/lib/repositories/project-timeline.repository'
import { AssignmentAuditRepository } from '@/lib/repositories/assignment-audit.repository'
import { AssignmentAllocationRepository } from '@/lib/repositories/assignment-allocation.repository'
import { AssignmentCapacityRepository } from '@/lib/repositories/assignment-capacity.repository'
import { AssignmentScheduleRepository } from '@/lib/repositories/assignment-schedule.repository'
import { AssignmentRequirementRepository } from '@/lib/repositories/assignment-requirement.repository'
import { AssignmentConflictRepository } from '@/lib/repositories/assignment-conflict.repository'
import { AssignmentHistoryRepository } from '@/lib/repositories/assignment-history.repository'
import { WorkflowDefinitionRepository } from '@/lib/repositories/workflow-definition.repository'
import { WorkflowExecutionHistoryRepository } from '@/lib/repositories/workflow-execution-history.repository'
import { WorkflowCompensationRepository } from '@/lib/repositories/workflow-compensation.repository'
import { WorkflowAuditRepository } from '@/lib/repositories/workflow-audit.repository'
import { WhatsappAuditRepository } from '@/lib/repositories/whatsapp-audit.repository'
import { WhatsappMemoryRepository } from '@/lib/repositories/whatsapp-memory.repository'
import { WhatsappApprovalGateRepository } from '@/lib/repositories/whatsapp-approval-gate.repository'

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
  observability: ObservabilityRepository
  platformFeature: PlatformFeatureRepository
  platformConfig: PlatformConfigRepository
  organization: OrganizationRepository
  organizationDepartment: OrganizationDepartmentRepository
  organizationTeam: OrganizationTeamRepository
  organizationMember: OrganizationMemberRepository
  organizationInvite: OrganizationInviteRepository
  organizationAudit: OrganizationAuditRepository
  crmAudit: CrmAuditRepository
  crmCompany: CrmCompanyRepository
  crmLead: CrmLeadRepository
  crmContact: CrmContactRepository
  crmPipeline: CrmPipelineRepository
  crmDeal: CrmDealRepository
  crmContract: CrmContractRepository
  crmNote: CrmNoteRepository
  crmAttachment: CrmAttachmentRepository
  crmActivity: CrmActivityRepository
  talentAudit: TalentAuditRepository
  talentExperience: TalentExperienceRepository
  talentDocument: TalentDocumentRepository
  talentAvailability: TalentAvailabilityRepository
  talentImport: TalentImportRepository
  projectAudit: ProjectAuditRepository
  projectMilestone: ProjectMilestoneRepository
  projectTask: ProjectTaskRepository
  projectDeliverable: ProjectDeliverableRepository
  projectAsset: ProjectAssetRepository
  projectComment: ProjectCommentRepository
  projectDependency: ProjectDependencyRepository
  projectTemplate: ProjectTemplateRepository
  projectTimeline: ProjectTimelineRepository
  assignmentAudit: AssignmentAuditRepository
  assignmentAllocation: AssignmentAllocationRepository
  assignmentCapacity: AssignmentCapacityRepository
  assignmentSchedule: AssignmentScheduleRepository
  assignmentRequirement: AssignmentRequirementRepository
  assignmentConflict: AssignmentConflictRepository
  assignmentHistory: AssignmentHistoryRepository
  workflowDefinition: WorkflowDefinitionRepository
  workflowExecutionHistory: WorkflowExecutionHistoryRepository
  workflowCompensation: WorkflowCompensationRepository
  workflowAudit: WorkflowAuditRepository
  whatsappAudit: WhatsappAuditRepository
  whatsappMemory: WhatsappMemoryRepository
  whatsappApprovalGate: WhatsappApprovalGateRepository
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
    observability: new ObservabilityRepository(ctx),
    platformFeature: new PlatformFeatureRepository(ctx),
    platformConfig: new PlatformConfigRepository(ctx),
    organization: new OrganizationRepository(ctx),
    organizationDepartment: new OrganizationDepartmentRepository(ctx),
    organizationTeam: new OrganizationTeamRepository(ctx),
    organizationMember: new OrganizationMemberRepository(ctx),
    organizationInvite: new OrganizationInviteRepository(ctx),
    organizationAudit: new OrganizationAuditRepository(ctx),
    crmAudit: new CrmAuditRepository(ctx),
    crmCompany: new CrmCompanyRepository(ctx),
    crmLead: new CrmLeadRepository(ctx),
    crmContact: new CrmContactRepository(ctx),
    crmPipeline: new CrmPipelineRepository(ctx),
    crmDeal: new CrmDealRepository(ctx),
    crmContract: new CrmContractRepository(ctx),
    crmNote: new CrmNoteRepository(ctx),
    crmAttachment: new CrmAttachmentRepository(ctx),
    crmActivity: new CrmActivityRepository(ctx),
    talentAudit: new TalentAuditRepository(ctx),
    talentExperience: new TalentExperienceRepository(ctx),
    talentDocument: new TalentDocumentRepository(ctx),
    talentAvailability: new TalentAvailabilityRepository(ctx),
    talentImport: new TalentImportRepository(ctx),
    projectAudit: new ProjectAuditRepository(ctx),
    projectMilestone: new ProjectMilestoneRepository(ctx),
    projectTask: new ProjectTaskRepository(ctx),
    projectDeliverable: new ProjectDeliverableRepository(ctx),
    projectAsset: new ProjectAssetRepository(ctx),
    projectComment: new ProjectCommentRepository(ctx),
    projectDependency: new ProjectDependencyRepository(ctx),
    projectTemplate: new ProjectTemplateRepository(ctx),
    projectTimeline: new ProjectTimelineRepository(ctx),
    assignmentAudit: new AssignmentAuditRepository(ctx),
    assignmentAllocation: new AssignmentAllocationRepository(ctx),
    assignmentCapacity: new AssignmentCapacityRepository(ctx),
    assignmentSchedule: new AssignmentScheduleRepository(ctx),
    assignmentRequirement: new AssignmentRequirementRepository(ctx),
    assignmentConflict: new AssignmentConflictRepository(ctx),
    assignmentHistory: new AssignmentHistoryRepository(ctx),
    workflowDefinition: new WorkflowDefinitionRepository(ctx),
    workflowExecutionHistory: new WorkflowExecutionHistoryRepository(ctx),
    workflowCompensation: new WorkflowCompensationRepository(ctx),
    workflowAudit: new WorkflowAuditRepository(ctx),
    whatsappAudit: new WhatsappAuditRepository(ctx),
    whatsappMemory: new WhatsappMemoryRepository(ctx),
    whatsappApprovalGate: new WhatsappApprovalGateRepository(ctx),
  }
}

export async function createRepositories(): Promise<Repositories> {
  return buildRepositories(await createRepositoryContext())
}

export async function createAdminRepositories(): Promise<Repositories> {
  return buildRepositories(await createAdminRepositoryContext())
}
