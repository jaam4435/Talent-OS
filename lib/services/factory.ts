import {
  createRepositories,
  createAdminRepositories,
  type Repositories,
} from '@/lib/repositories/factory'
import { ProjectService } from '@/lib/services/project.service'
import { TalentService } from '@/lib/services/talent.service'
import { PortfolioService } from '@/lib/services/portfolio.service'
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
import { EventPlatformService } from '@/lib/services/event-platform.service'
import { MarketplaceService } from '@/lib/services/marketplace.service'
import { StorageService } from '@/lib/services/storage.service'
import type { McpExecutionContext } from '@/lib/mcp/types'

export interface Services {
  project: ProjectService
  talent: TalentService
  portfolio: PortfolioService
  assignment: AssignmentService
  crm: CRMService
  workflow: WorkflowService
  workflowEngine: WorkflowEngineService
  whatsapp: WhatsAppService
  knowledge: KnowledgeService
  agent: AgentService
  finance: FinanceService
  analytics: AnalyticsService
  notification: NotificationService
  ai: AIService
  integration: IntegrationService
  marketplace: MarketplaceService
  storage: StorageService
  eventPlatform: EventPlatformService
}

function buildServices(repos: Repositories): Services {
  const eventPlatform = new EventPlatformService(repos)
  const notification = new NotificationService(repos, eventPlatform)
  const workflow = new WorkflowService(repos, notification)
  const ai = new AIService(repos)
  const crm = new CRMService(repos, notification, workflow)
  const talent = new TalentService(repos)
  const portfolio = new PortfolioService(repos)
  const project = new ProjectService(repos, workflow)
  const integration = new IntegrationService(repos, crm, ai)
  const whatsapp = new WhatsAppService(repos, integration, crm, talent, workflow, project)
  const knowledge = new KnowledgeService(repos, workflow)
  const agent = new AgentService(repos)
  const storage = new StorageService(repos)

  let services!: Services
  const workflowEngine = new WorkflowEngineService(repos, async () => services)

  services = {
    notification,
    workflow,
    workflowEngine,
    whatsapp,
    knowledge,
    agent,
    ai,
    crm,
    talent,
    portfolio,
    project,
    assignment: new AssignmentService(repos, notification, workflow),
    finance: new FinanceService(repos, workflow),
    analytics: new AnalyticsService(repos),
    integration,
    storage,
    eventPlatform,
    marketplace: null as unknown as MarketplaceService,
  }

  services.marketplace = new MarketplaceService(repos, talent, ai, services.assignment)

  return services
}

export async function createServices(): Promise<Services> {
  return buildServices(await createRepositories())
}

export async function createAdminServices(): Promise<Services> {
  return buildServices(await createAdminRepositories())
}

/** Service graph for MCP tool adapters — uses admin context with tenant scoping in handlers. */
export async function createMcpServices(_context?: McpExecutionContext): Promise<Services> {
  return createAdminServices()
}
