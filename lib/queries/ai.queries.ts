import { createServices } from '@/lib/services/factory'

export async function getTalentMatchResults(opportunityId: string, tenantId: string) {
  const services = await createServices()
  return services.ai.getTalentMatchResults(opportunityId, tenantId)
}

export async function getProjectSummaryResult(projectId: string, tenantId: string) {
  const services = await createServices()
  return services.ai.getProjectSummaryResult(projectId, tenantId)
}

export async function getStatusAssessmentResult(projectId: string, tenantId: string) {
  const services = await createServices()
  return services.ai.getStatusAssessmentResult(projectId, tenantId)
}

export async function getShortlistSummaryResult(opportunityId: string, tenantId: string) {
  const services = await createServices()
  return services.ai.getShortlistSummaryResult(opportunityId, tenantId)
}

export async function getBriefParseResult(opportunityId: string, tenantId: string) {
  const services = await createServices()
  return services.ai.getBriefParseResult(opportunityId, tenantId)
}
