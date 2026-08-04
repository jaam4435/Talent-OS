import {
  createRepositories,
  createAdminRepositories,
  type Repositories,
} from '@/lib/repositories/factory'
import { ProjectService } from '@/lib/services/project.service'
import { TalentService } from '@/lib/services/talent.service'
import { AssignmentService } from '@/lib/services/assignment.service'
import { CRMService } from '@/lib/services/crm.service'
import { WorkflowService } from '@/lib/services/workflow.service'
import { FinanceService } from '@/lib/services/finance.service'
import { AnalyticsService } from '@/lib/services/analytics.service'
import { NotificationService } from '@/lib/services/notification.service'
import { AIService } from '@/lib/services/ai.service'
import { IntegrationService } from '@/lib/services/integration.service'
import { WorkflowEngineService } from '@/lib/services/workflow-engine.service'
import { WhatsAppService } from '@/lib/services/whatsapp.service'
import { KnowledgeService } from '@/lib/services/knowledge.service'
import { AgentService } from '@/lib/services/agent.service'
import { ObservabilityService } from '@/lib/services/observability.service'

export interface Services {
  project: ProjectService
  talent: TalentService
  assignment: AssignmentService
  crm: CRMService
  workflow: WorkflowService
  workflowEngine: WorkflowEngineService
  whatsapp: WhatsAppService
  knowledge: KnowledgeService
  agent: AgentService
  observability: ObservabilityService
  finance: FinanceService
  analytics: AnalyticsService
  notification: NotificationService
  ai: AIService
  integration: IntegrationService
}

function buildServices(repos: Repositories): Services {
  const notification = new NotificationService(repos)
  const workflow = new WorkflowService(repos, notification)
  const ai = new AIService(repos)
  const crm = new CRMService(repos, notification, workflow)
  const talent = new TalentService(repos)
  const project = new ProjectService(repos, workflow)
  const integration = new IntegrationService(repos, crm, ai)
  const whatsapp = new WhatsAppService(repos, integration, crm, talent, workflow, project)
  const knowledge = new KnowledgeService(repos)
  const agent = new AgentService(repos)
  const observability = new ObservabilityService(repos)

  let services!: Services
  const workflowEngine = new WorkflowEngineService(repos, async () => services)

  services = {
    notification,
    workflow,
    workflowEngine,
    whatsapp,
    knowledge,
    agent,
    observability,
    ai,
    crm,
    talent,
    project,
    assignment: new AssignmentService(repos, notification, workflow),
    finance: new FinanceService(repos),
    analytics: new AnalyticsService(repos),
    integration,
  }

  return services
}

export async function createServices(): Promise<Services> {
  return buildServices(await createRepositories())
}

export async function createAdminServices(): Promise<Services> {
  return buildServices(await createAdminRepositories())
}
