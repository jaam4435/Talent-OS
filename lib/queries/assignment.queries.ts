import { createServices } from '@/lib/services/factory'
import { searchTalentRoster } from '@/lib/queries/talent.queries'
import type {
  AssignmentAllocation,
  AssignmentCapacity,
  AssignmentConflict,
  AssignmentHistoryEntry,
  AssignmentRequirement,
  AssignmentSchedule,
} from '@/modules/assignment/types'

export interface AssignmentListOptions {
  page?: number
  limit?: number
  status?: string
  freelancerId?: string
  projectId?: string
  opportunityId?: string
  from?: string
  to?: string
}

export async function listAssignmentAllocations(tenantId: string, options: AssignmentListOptions = {}) {
  const services = await createServices()
  return services.assignmentModule.listAllocations(tenantId, {
    page: options.page,
    limit: options.limit,
    status: options.status,
    freelancerId: options.freelancerId,
    projectId: options.projectId,
    opportunityId: options.opportunityId,
    from: options.from,
    to: options.to,
  })
}

export async function getAssignmentAllocation(tenantId: string, id: string) {
  const services = await createServices()
  return services.assignmentModule.getAllocation(tenantId, id)
}

export async function getAssignmentAllocationDetail(tenantId: string, id: string) {
  const services = await createServices()
  const [allocation, schedules, requirements, history] = await Promise.all([
    services.assignmentModule.getAllocation(tenantId, id),
    services.assignmentModule.listSchedules(tenantId, id),
    services.assignmentModule.listRequirements(tenantId, id),
    services.assignmentModule.getHistory(tenantId, id),
  ])

  if (!allocation) return null

  return { allocation, schedules, requirements, history }
}

export async function listAssignmentConflicts(tenantId: string, freelancerId?: string) {
  const services = await createServices()
  return services.assignmentModule.listOpenConflicts(tenantId, freelancerId)
}

export async function getAssignmentCapacity(tenantId: string, freelancerId: string) {
  const services = await createServices()
  return services.assignmentModule.getCapacity(tenantId, freelancerId)
}

export async function getAssignmentCapacityOverview(tenantId: string) {
  const [talent, allocations] = await Promise.all([
    searchTalentRoster(tenantId, { limit: 50 }),
    listAssignmentAllocations(tenantId, {
      limit: 100,
      status: undefined,
    }),
  ])

  const services = await createServices()
  const capacityRows = await Promise.all(
    talent.map(async (freelancer) => {
      const capacity = await services.assignmentModule.getCapacity(tenantId, freelancer.id)
      const activeAllocations = allocations.data.filter(
        (allocation) =>
          allocation.freelancerId === freelancer.id &&
          allocation.status !== 'canceled' &&
          allocation.status !== 'completed'
      )
      const totalPct = activeAllocations.reduce((sum, row) => sum + row.allocationPct, 0)

      return {
        freelancerId: freelancer.id,
        fullName: freelancer.full_name,
        discipline: freelancer.discipline,
        availability: freelancer.availability,
        weeklyHours: capacity[0]?.weeklyHours ?? null,
        maxConcurrentAssignments: capacity[0]?.maxConcurrentAssignments ?? null,
        activeAllocationCount: activeAllocations.length,
        totalAllocationPct: totalPct,
        allocations: activeAllocations,
      }
    })
  )

  return capacityRows
}

export async function listProjectAssignments(tenantId: string, projectId: string) {
  return listAssignmentAllocations(tenantId, { projectId, limit: 20 })
}

export type AssignmentCapacityOverviewRow = Awaited<
  ReturnType<typeof getAssignmentCapacityOverview>
>[number]

export type {
  AssignmentAllocation,
  AssignmentCapacity,
  AssignmentConflict,
  AssignmentHistoryEntry,
  AssignmentRequirement,
  AssignmentSchedule,
}
