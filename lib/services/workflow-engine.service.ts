import { WorkflowEngine } from '@/lib/workflows/engine'
import type { Repositories } from '@/lib/repositories/factory'
import type { Services } from '@/lib/services/factory'

export class WorkflowEngineService {
  private readonly engine: WorkflowEngine

  constructor(
    private readonly repos: Repositories,
    private readonly getServices: () => Promise<Services>
  ) {
    this.engine = new WorkflowEngine(repos.workflow, getServices)
  }

  async triggerFromDomainEvent(event: Parameters<WorkflowEngine['triggerFromDomainEvent']>[0]) {
    return this.engine.triggerFromDomainEvent(event)
  }

  async processJobQueue(limit = 50, queueName?: string) {
    return this.engine.processJobQueue(limit, queueName)
  }

  async resolveApproval(
    approvalId: string,
    userId: string,
    decision: 'approved' | 'rejected',
    note?: string
  ) {
    return this.engine.resolveApproval(approvalId, userId, decision, note)
  }

  async listPendingApprovals(userId: string, tenantId: string) {
    return this.repos.workflow.listPendingApprovals(userId, tenantId)
  }

  async retryFailedEvents(eventIds: string[]) {
    await this.repos.workflow.retryFailedEvents(eventIds)
  }

  async retryFailedJobs(jobIds: string[]) {
    await this.repos.workflow.retryFailedJobs(jobIds)
  }
}
