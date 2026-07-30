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

export interface Services {
  project: ProjectService
  talent: TalentService
  assignment: AssignmentService
  crm: CRMService
  workflow: WorkflowService
  workflowEngine: WorkflowEngineService
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

  let services!: Services
  const workflowEngine = new WorkflowEngineService(repos, async () => services)

  services = {
    notification,
    workflow,
    workflowEngine,
    ai,
    crm,
    talent: new TalentService(repos),
    project: new ProjectService(repos, workflow),
    assignment: new AssignmentService(repos, notification, workflow),
    finance: new FinanceService(repos),
    analytics: new AnalyticsService(repos),
    integration: new IntegrationService(repos, crm, ai),
  }

  return services
}

export async function createServices(): Promise<Services> {
  return buildServices(await createRepositories())
}

export async function createAdminServices(): Promise<Services> {
  return buildServices(await createAdminRepositories())
}
