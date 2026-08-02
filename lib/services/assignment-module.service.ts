import type { Repositories } from '@/lib/repositories/factory'
import type { PaginatedResult } from '@/lib/repositories/base/types'
import type { NotificationService } from '@/lib/services/notification.service'
import { validateAllocationTarget } from '@/modules/assignment/validation'
import {
  ASSIGNMENT_EVENT_TYPES,
  type AssignmentAllocation,
  type AssignmentCapacity,
  type AssignmentConflict,
  type AssignmentConflictCheck,
  type AssignmentHistoryEntry,
  type AssignmentRequirement,
  type AssignmentSchedule,
  type AssignmentSuggestion,
} from '@/modules/assignment/types'

export class AssignmentModuleService {
  constructor(
    private readonly repos: Repositories,
    private readonly notifications: NotificationService
  ) {}

  async listAllocations(
    tenantId: string,
    options: Parameters<typeof this.repos.assignmentAllocation.list>[1]
  ): Promise<PaginatedResult<AssignmentAllocation>> {
    return this.repos.assignmentAllocation.list(tenantId, options)
  }

  async getAllocation(tenantId: string, id: string): Promise<AssignmentAllocation | null> {
    return this.repos.assignmentAllocation.findById(id, tenantId)
  }

  async createAllocation(
    tenantId: string,
    actorId: string,
    input: Record<string, unknown>
  ): Promise<
    | { ok: true; allocation: AssignmentAllocation; conflicts: AssignmentConflictCheck[] }
    | { ok: false; error: string; conflicts?: AssignmentConflictCheck[] }
  > {
    const conflicts = await this.checkConflicts(tenantId, {
      freelancer_id: input.freelancer_id as string,
      starts_at: input.starts_at as string,
      ends_at: input.ends_at as string,
      allocation_pct: (input.allocation_pct as number) ?? 100,
    })

    const hasErrors = conflicts.some((c) => c.severity === 'error')
    if (hasErrors && !input.skip_conflict_check) {
      return { ok: false, error: 'Assignment conflicts detected', conflicts }
    }

    const projectId = (input.project_id as string | null) ?? null
    const opportunityId = (input.opportunity_id as string | null) ?? null
    const targetCheck = validateAllocationTarget(projectId, opportunityId)
    if (!targetCheck.ok) {
      return { ok: false, error: targetCheck.error }
    }

    const allocation = await this.repos.assignmentAllocation.create({
      tenant_id: tenantId,
      freelancer_id: input.freelancer_id as string,
      project_id: projectId,
      opportunity_id: opportunityId,
      title: input.title as string,
      status: (input.status as never) ?? 'planned',
      allocation_pct: (input.allocation_pct as number) ?? 100,
      starts_at: input.starts_at as string,
      ends_at: input.ends_at as string,
      notes: (input.notes as string | null) ?? null,
      created_by: actorId,
    })

    await this.recordHistory(tenantId, allocation.id, actorId, 'allocation.created', null, {
      title: allocation.title,
      status: allocation.status,
    })
    await this.persistConflicts(tenantId, allocation, conflicts)
    await this.auditAndEmit({
      tenantId,
      actorId,
      action: 'assignment.created',
      entityType: 'allocation',
      entityId: allocation.id,
      eventType: ASSIGNMENT_EVENT_TYPES.CREATED,
      afterState: { title: allocation.title, freelancerId: allocation.freelancerId },
    })

    await this.notifyFreelancer(
      tenantId,
      allocation.freelancerId,
      'New assignment',
      `You have been assigned: ${allocation.title}`
    )

    return { ok: true, allocation, conflicts }
  }

  async updateAllocation(
    tenantId: string,
    actorId: string,
    id: string,
    patch: Record<string, unknown>
  ): Promise<
    | { ok: true; allocation: AssignmentAllocation; conflicts: AssignmentConflictCheck[] }
    | { ok: false; error: string; conflicts?: AssignmentConflictCheck[] }
  > {
    const current = await this.repos.assignmentAllocation.findById(id, tenantId)
    if (!current) return { ok: false, error: 'Allocation not found' }

    const merged = {
      freelancer_id: (patch.freelancer_id as string) ?? current.freelancerId,
      starts_at: (patch.starts_at as string) ?? current.startsAt,
      ends_at: (patch.ends_at as string) ?? current.endsAt,
      allocation_pct: (patch.allocation_pct as number) ?? current.allocationPct,
    }

    const conflicts = await this.checkConflicts(tenantId, {
      ...merged,
      exclude_allocation_id: id,
    })

    const hasErrors = conflicts.some((c) => c.severity === 'error')
    if (hasErrors && !patch.skip_conflict_check) {
      return { ok: false, error: 'Assignment conflicts detected', conflicts }
    }

    const mergedTargets = validateAllocationTarget(
      patch.project_id !== undefined ? (patch.project_id as string | null) : current.projectId,
      patch.opportunity_id !== undefined ? (patch.opportunity_id as string | null) : current.opportunityId
    )
    if (!mergedTargets.ok) {
      return { ok: false, error: mergedTargets.error }
    }

    const dbPatch: Record<string, unknown> = {}
    const fields = [
      'freelancer_id', 'project_id', 'opportunity_id', 'title', 'status',
      'allocation_pct', 'starts_at', 'ends_at', 'notes',
    ]
    for (const f of fields) {
      if (f in patch) dbPatch[f] = patch[f]
    }

    const allocation = await this.repos.assignmentAllocation.update(id, tenantId, dbPatch)
    await this.recordHistory(tenantId, id, actorId, 'allocation.updated', {
      status: current.status,
      allocationPct: current.allocationPct,
    }, {
      status: allocation.status,
      allocationPct: allocation.allocationPct,
    })

    if (patch.status && patch.status !== current.status) {
      await this.auditAndEmit({
        tenantId,
        actorId,
        action: 'assignment.status_changed',
        entityType: 'allocation',
        entityId: id,
        eventType: ASSIGNMENT_EVENT_TYPES.STATUS_CHANGED,
        beforeState: { status: current.status },
        afterState: { status: allocation.status },
      })
    } else {
      await this.auditAndEmit({
        tenantId,
        actorId,
        action: 'assignment.updated',
        entityType: 'allocation',
        entityId: id,
        eventType: ASSIGNMENT_EVENT_TYPES.UPDATED,
        beforeState: { title: current.title },
        afterState: { title: allocation.title },
      })
    }

    await this.persistConflicts(tenantId, allocation, conflicts)
    return { ok: true, allocation, conflicts }
  }

  async cancelAllocation(
    tenantId: string,
    actorId: string,
    id: string
  ): Promise<{ ok: true } | { ok: false; error: string }> {
    const current = await this.repos.assignmentAllocation.findById(id, tenantId)
    if (!current) return { ok: false, error: 'Allocation not found' }

    await this.repos.assignmentAllocation.update(id, tenantId, { status: 'canceled' })
    await this.recordHistory(tenantId, id, actorId, 'allocation.canceled', { status: current.status }, { status: 'canceled' })
    await this.auditAndEmit({
      tenantId,
      actorId,
      action: 'assignment.canceled',
      entityType: 'allocation',
      entityId: id,
      eventType: ASSIGNMENT_EVENT_TYPES.CANCELED,
      beforeState: { status: current.status },
      afterState: { status: 'canceled' },
    })
    return { ok: true }
  }

  async checkConflicts(
    tenantId: string,
    input: {
      freelancer_id: string
      starts_at: string
      ends_at: string
      allocation_pct?: number
      exclude_allocation_id?: string
    }
  ): Promise<AssignmentConflictCheck[]> {
    const rows = await this.repos.assignmentAllocation.detectConflicts(
      tenantId,
      input.freelancer_id,
      input.starts_at,
      input.ends_at,
      input.allocation_pct ?? 100,
      input.exclude_allocation_id
    )
    return rows.map((r) => ({
      conflictType: r.conflict_type as AssignmentConflictCheck['conflictType'],
      severity: r.severity as AssignmentConflictCheck['severity'],
      conflictingAllocationId: (r.conflicting_allocation_id as string | null) ?? null,
      overlappingPct: r.overlapping_pct != null ? Number(r.overlapping_pct) : null,
      message: r.message as string,
    }))
  }

  async suggestCandidates(
    tenantId: string,
    actorId: string,
    skills: string[] = [],
    startsAt?: string,
    endsAt?: string,
    limit = 10
  ): Promise<AssignmentSuggestion[]> {
    const rows = await this.repos.assignmentAllocation.suggestCandidates(
      tenantId,
      skills,
      startsAt,
      endsAt,
      limit
    )

    await this.auditAndEmit({
      tenantId,
      actorId,
      action: 'assignment.suggestion.generated',
      entityType: 'allocation',
      entityId: tenantId,
      eventType: ASSIGNMENT_EVENT_TYPES.SUGGESTION_GENERATED,
      afterState: { skillCount: skills.length, resultCount: rows.length },
    })

    return rows.map((r) => ({
      freelancerId: r.freelancer_id,
      fullName: r.full_name,
      discipline: r.discipline,
      dayRate: r.day_rate,
      internalRating: r.internal_rating,
      skillMatchCount: r.skill_match_count,
      currentAllocationPct: r.current_allocation_pct,
      availability: r.availability,
    }))
  }

  async listOpenConflicts(tenantId: string, freelancerId?: string): Promise<AssignmentConflict[]> {
    return this.repos.assignmentConflict.listOpen(tenantId, freelancerId)
  }

  async resolveConflict(
    tenantId: string,
    actorId: string,
    conflictId: string
  ): Promise<{ ok: true; conflict: AssignmentConflict } | { ok: false; error: string }> {
    const conflict = await this.repos.assignmentConflict.resolve(conflictId, tenantId)
    await this.auditAndEmit({
      tenantId,
      actorId,
      action: 'assignment.conflict.resolved',
      entityType: 'conflict',
      entityId: conflictId,
      eventType: ASSIGNMENT_EVENT_TYPES.CONFLICT_RESOLVED,
      afterState: { conflictType: conflict.conflictType },
    })
    return { ok: true, conflict }
  }

  async getCapacity(tenantId: string, freelancerId: string): Promise<AssignmentCapacity[]> {
    return this.repos.assignmentCapacity.listByFreelancer(freelancerId, tenantId)
  }

  async setCapacity(
    tenantId: string,
    actorId: string,
    input: Record<string, unknown>
  ): Promise<AssignmentCapacity> {
    const capacity = await this.repos.assignmentCapacity.create({
      tenant_id: tenantId,
      freelancer_id: input.freelancer_id as string,
      weekly_hours: (input.weekly_hours as number) ?? 40,
      max_concurrent_assignments: (input.max_concurrent_assignments as number) ?? 3,
      effective_from: (input.effective_from as string) ?? new Date().toISOString().slice(0, 10),
      effective_to: (input.effective_to as string | null) ?? null,
    })

    await this.auditAndEmit({
      tenantId,
      actorId,
      action: 'assignment.capacity.updated',
      entityType: 'capacity',
      entityId: capacity.id,
      eventType: ASSIGNMENT_EVENT_TYPES.CAPACITY_UPDATED,
      afterState: {
        weeklyHours: capacity.weeklyHours,
        maxConcurrentAssignments: capacity.maxConcurrentAssignments,
      },
    })

    return capacity
  }

  async listSchedules(tenantId: string, allocationId: string): Promise<AssignmentSchedule[]> {
    const allocation = await this.repos.assignmentAllocation.findById(allocationId, tenantId)
    if (!allocation) return []
    return this.repos.assignmentSchedule.listByAllocation(allocationId, tenantId)
  }

  async addSchedule(
    tenantId: string,
    actorId: string,
    allocationId: string,
    input: Record<string, unknown>
  ): Promise<{ ok: true; schedule: AssignmentSchedule } | { ok: false; error: string }> {
    const allocation = await this.repos.assignmentAllocation.findById(allocationId, tenantId)
    if (!allocation) return { ok: false, error: 'Allocation not found' }

    const schedule = await this.repos.assignmentSchedule.create({
      tenant_id: tenantId,
      allocation_id: allocationId,
      starts_at: input.starts_at as string,
      ends_at: input.ends_at as string,
      hours: (input.hours as number) ?? 0,
      notes: (input.notes as string | null) ?? null,
    })

    await this.auditAndEmit({
      tenantId,
      actorId,
      action: 'assignment.schedule.added',
      entityType: 'schedule',
      entityId: schedule.id,
      eventType: ASSIGNMENT_EVENT_TYPES.SCHEDULE_ADDED,
      afterState: { allocationId, startsAt: schedule.startsAt },
    })

    return { ok: true, schedule }
  }

  async listRequirements(tenantId: string, allocationId: string): Promise<AssignmentRequirement[]> {
    const allocation = await this.repos.assignmentAllocation.findById(allocationId, tenantId)
    if (!allocation) return []
    return this.repos.assignmentRequirement.listByAllocation(allocationId, tenantId)
  }

  async addRequirement(
    tenantId: string,
    actorId: string,
    allocationId: string,
    input: Record<string, unknown>
  ): Promise<{ ok: true; requirement: AssignmentRequirement } | { ok: false; error: string }> {
    const allocation = await this.repos.assignmentAllocation.findById(allocationId, tenantId)
    if (!allocation) return { ok: false, error: 'Allocation not found' }

    const requirement = await this.repos.assignmentRequirement.create({
      tenant_id: tenantId,
      allocation_id: allocationId,
      required_skills: (input.required_skills as string[]) ?? [],
      min_hours: (input.min_hours as number | null) ?? null,
      description: (input.description as string | null) ?? null,
    })

    return { ok: true, requirement }
  }

  async getHistory(tenantId: string, allocationId: string): Promise<AssignmentHistoryEntry[]> {
    const allocation = await this.repos.assignmentAllocation.findById(allocationId, tenantId)
    if (!allocation) return []
    return this.repos.assignmentHistory.listByAllocation(allocationId, tenantId)
  }

  async listAuditLogs(tenantId: string, options: Parameters<typeof this.repos.assignmentAudit.list>[1]) {
    return this.repos.assignmentAudit.list(tenantId, options)
  }

  private async persistConflicts(
    tenantId: string,
    allocation: AssignmentAllocation,
    conflicts: AssignmentConflictCheck[]
  ) {
    for (const c of conflicts) {
      const recorded = await this.repos.assignmentConflict.record({
        tenant_id: tenantId,
        freelancer_id: allocation.freelancerId,
        conflict_type: c.conflictType,
        severity: c.severity,
        allocation_id_a: allocation.id,
        allocation_id_b: c.conflictingAllocationId,
        details: { message: c.message, overlappingPct: c.overlappingPct },
      })

      if (c.severity === 'error' && allocation.createdBy) {
        await this.notifications.create({
          tenant_id: tenantId,
          user_id: allocation.createdBy,
          type: 'system',
          title: 'Assignment conflict',
          body: c.message,
          data: { conflict_id: recorded.id, allocation_id: allocation.id },
        })
      }
    }
  }

  private async recordHistory(
    tenantId: string,
    allocationId: string,
    actorId: string,
    action: string,
    before: Record<string, unknown> | null,
    after: Record<string, unknown> | null
  ) {
    await this.repos.assignmentHistory.record({
      tenant_id: tenantId,
      allocation_id: allocationId,
      action,
      actor_id: actorId,
      before_state: before,
      after_state: after,
    })
  }

  private async notifyFreelancer(tenantId: string, freelancerId: string, title: string, body: string) {
    const userId = await this.repos.talent.findUserIdByFreelancerId(freelancerId)
    if (!userId) return
    await this.notifications.create({
      tenant_id: tenantId,
      user_id: userId,
      type: 'system',
      title,
      body,
      data: { freelancer_id: freelancerId },
    })
  }

  private async auditAndEmit(input: {
    tenantId: string
    actorId: string
    action: string
    entityType: string
    entityId: string
    eventType: string
    beforeState?: Record<string, unknown> | null
    afterState?: Record<string, unknown> | null
  }) {
    await this.repos.assignmentAudit.record({
      tenant_id: input.tenantId,
      actor_id: input.actorId,
      action: input.action,
      entity_type: input.entityType,
      entity_id: input.entityId,
      before_state: input.beforeState ?? null,
      after_state: input.afterState ?? null,
    })

    await this.repos.domainEvent.emit({
      tenantId: input.tenantId,
      eventType: input.eventType,
      aggregateType: input.entityType,
      aggregateId: input.entityId,
      idempotencyKey: `${input.eventType}:${input.entityId}:${Date.now()}`,
      actorId: input.actorId,
      payload: {
        action: input.action,
        before: input.beforeState ?? null,
        after: input.afterState ?? null,
      },
    })
  }
}
