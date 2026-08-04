import { createServices } from '@/lib/services/factory'

export async function getOrganizationSummary(tenantId: string) {
  const services = await createServices()
  return services.organization.getOrganization(tenantId)
}

export async function getOrganizationSubscription(tenantId: string) {
  const services = await createServices()
  return services.organization.getSubscriptionReference(tenantId)
}

export async function listOrganizationMembers(
  tenantId: string,
  options?: { page?: number; limit?: number; q?: string; status?: string; role?: string }
) {
  const services = await createServices()
  return services.organization.listMembers(tenantId, options ?? {})
}

export async function listOrganizationInvites(
  tenantId: string,
  options?: { page?: number; limit?: number; q?: string }
) {
  const services = await createServices()
  return services.organization.listInvites(tenantId, options ?? {})
}

export async function listOrganizationDepartments(
  tenantId: string,
  options?: { page?: number; limit?: number; q?: string }
) {
  const services = await createServices()
  return services.organization.listDepartments(tenantId, options ?? {})
}

export async function listOrganizationTeams(
  tenantId: string,
  options?: { page?: number; limit?: number; q?: string; departmentId?: string }
) {
  const services = await createServices()
  return services.organization.listTeams(tenantId, options ?? {})
}

export async function listOrganizationAuditLogs(
  tenantId: string,
  options?: { page?: number; limit?: number; action?: string; entityType?: string }
) {
  const services = await createServices()
  return services.organization.listAuditLogs(tenantId, options ?? {})
}

export async function getOrganizationOverviewCounts(tenantId: string) {
  const services = await createServices()
  const [members, invites, departments, teams] = await Promise.all([
    services.organization.listMembers(tenantId, { limit: 1 }),
    services.organization.listInvites(tenantId, { limit: 1 }),
    services.organization.listDepartments(tenantId, { limit: 1 }),
    services.organization.listTeams(tenantId, { limit: 1 }),
  ])

  return {
    memberCount: members.total ?? members.data.length,
    pendingInvites: invites.total ?? invites.data.length,
    departmentCount: departments.total ?? departments.data.length,
    teamCount: teams.total ?? teams.data.length,
  }
}
