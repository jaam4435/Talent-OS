'use client'

import { useState, useTransition } from 'react'
import {
  reviewMilestone,
  submitMilestone,
  updateMilestoneStatus,
} from '@/app/actions/milestones'
import { updateProjectStatus, updateProjectStatusAsFreelancer } from '@/app/actions/projects'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { MANAGER_STATUS_TRANSITIONS } from '@/lib/projects/types'
import type { MilestoneRow } from '@/lib/projects/types'
import type { ProjectStatus, UserRole } from '@/types/enums'

interface ProjectTrackerProps {
  projectId: string
  status: ProjectStatus
  role: UserRole
  milestones: MilestoneRow[]
  budget: number | null
  currency: string
}

export function ProjectTracker({
  projectId,
  status,
  role,
  milestones,
  budget,
  currency,
}: ProjectTrackerProps) {
  const [note, setNote] = useState('')
  const [revisionNote, setRevisionNote] = useState('')
  const [isPending, startTransition] = useTransition()

  const milestoneTotal = milestones.reduce((sum, m) => sum + Number(m.amount), 0)
  const completed = milestones.filter((m) => m.status === 'approved').length
  const isManager = role === 'admin' || role === 'talent_manager'

  function changeStatus(next: ProjectStatus) {
    startTransition(async () => {
      if (isManager) {
        await updateProjectStatus(projectId, next)
      } else {
        await updateProjectStatusAsFreelancer(projectId, next)
      }
    })
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-4">
        <Stat label="Milestones" value={`${completed}/${milestones.length} approved`} />
        <Stat
          label="Milestone value"
          value={`${currency} ${milestoneTotal.toLocaleString()}`}
        />
        <Stat
          label="Budget"
          value={budget != null ? `${currency} ${budget.toLocaleString()}` : '—'}
        />
        <Stat label="Status" value={status.replace('_', ' ')} />
      </div>

      {isManager ? (
        <div className="flex flex-wrap gap-2">
          {(MANAGER_STATUS_TRANSITIONS[status] ?? []).map((next) => (
            <Button
              key={next}
              size="sm"
              variant="outline"
              disabled={isPending}
              onClick={() => changeStatus(next)}
            >
              Mark {next.replace('_', ' ')}
            </Button>
          ))}
        </div>
      ) : status === 'active' ? (
        <Button size="sm" variant="outline" disabled={isPending} onClick={() => changeStatus('in_review')}>
          Submit project for review
        </Button>
      ) : null}

      <div className="rounded-lg border">
        <div className="border-b p-4 font-medium">Milestone timeline</div>
        <ul className="divide-y">
          {milestones.map((milestone) => (
            <li key={milestone.id} className="space-y-3 p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-medium">{milestone.title}</p>
                  {milestone.description ? (
                    <p className="text-sm text-muted-foreground">{milestone.description}</p>
                  ) : null}
                  <p className="mt-1 text-sm text-muted-foreground">
                    {currency} {Number(milestone.amount).toLocaleString()}
                    {milestone.dueDate ? ` · Due ${milestone.dueDate}` : ''}
                  </p>
                </div>
                <Badge variant="secondary" className="capitalize">
                  {milestone.status.replace('_', ' ')}
                </Badge>
              </div>

              {role === 'freelancer' && ['pending', 'in_progress', 'revision'].includes(milestone.status) ? (
                <div className="space-y-2">
                  {milestone.status === 'pending' ? (
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={isPending}
                      onClick={() =>
                        startTransition(async () => {
                          await updateMilestoneStatus(milestone.id, 'in_progress')
                        })
                      }
                    >
                      Start work
                    </Button>
                  ) : null}
                  <Input
                    placeholder="Submission note (optional)"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                  />
                  <Button
                    size="sm"
                    disabled={isPending}
                    onClick={() =>
                      startTransition(async () => {
                        await submitMilestone(milestone.id, note)
                        setNote('')
                      })
                    }
                  >
                    Submit milestone
                  </Button>
                </div>
              ) : null}

              {isManager && milestone.status === 'submitted' ? (
                <div className="space-y-2">
                  <Input
                    placeholder="Revision feedback (required for revision)"
                    value={revisionNote}
                    onChange={(e) => setRevisionNote(e.target.value)}
                  />
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      disabled={isPending}
                      onClick={() =>
                        startTransition(async () => {
                          await reviewMilestone(milestone.id, 'approve')
                        })
                      }
                    >
                      Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={isPending}
                      onClick={() =>
                        startTransition(async () => {
                          await reviewMilestone(milestone.id, 'revision', revisionNote)
                          setRevisionNote('')
                        })
                      }
                    >
                      Request revision
                    </Button>
                  </div>
                </div>
              ) : null}

              {milestone.submissionNote ? (
                <p className="text-sm text-muted-foreground">Submission: {milestone.submissionNote}</p>
              ) : null}
              {milestone.reviewNote ? (
                <p className="text-sm text-muted-foreground">Review: {milestone.reviewNote}</p>
              ) : null}
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border p-4">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 text-lg font-semibold capitalize">{value}</p>
    </div>
  )
}
