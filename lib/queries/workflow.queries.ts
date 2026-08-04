import { createServices } from '@/lib/services/factory'

export async function getWorkflowObservability(tenantId: string) {
  const services = await createServices()
  const summary = await services.workflowEngineModule.getObservabilitySummary(tenantId)
  const businessWorkflows = services.workflowEngineModule.listBuiltinDefinitions()
  return { summary, businessWorkflows }
}

export async function listWorkflowRuns(
  tenantId: string,
  options?: {
    page?: number
    limit?: number
    status?: string
    workflowId?: string
    triggerEventType?: string
  }
) {
  const services = await createServices()
  return services.workflowEngineModule.listRuns(tenantId, options ?? {})
}

export async function getWorkflowRun(tenantId: string, runId: string) {
  const services = await createServices()
  return services.workflowEngineModule.getRun(tenantId, runId)
}

export async function getWorkflowRunDetail(tenantId: string, runId: string) {
  const services = await createServices()
  const [run, history, jobs] = await Promise.all([
    services.workflowEngineModule.getRun(tenantId, runId),
    services.workflowEngineModule.listExecutionHistory(tenantId, { runId, limit: 50 }),
    services.workflowEngineModule.listJobs(tenantId, { runId, limit: 50 }),
  ])

  if (!run) return null
  return { run, history: history.data, jobs: jobs.data }
}

export async function listWorkflowJobs(
  tenantId: string,
  options?: { page?: number; limit?: number; runId?: string; status?: string; queueName?: string }
) {
  const services = await createServices()
  return services.workflowEngineModule.listJobs(tenantId, options ?? {})
}

export async function listWorkflowApprovals(userId: string, tenantId: string) {
  const services = await createServices()
  return services.workflowEngineModule.listPendingApprovals(userId, tenantId)
}

export async function listWorkflowDefinitions(tenantId: string) {
  const services = await createServices()
  const [registry, stored] = await Promise.all([
    Promise.resolve(services.workflowEngineModule.listRegistryDefinitions()),
    services.workflowEngineModule.listStoredDefinitions(tenantId, { limit: 50 }),
  ])
  return { registry, stored: stored.data }
}

export async function listWorkflowCompensations(
  tenantId: string,
  options?: { page?: number; limit?: number; runId?: string; status?: string }
) {
  const services = await createServices()
  return services.workflowEngineModule.listCompensations(tenantId, options ?? {})
}
