'use client'

import { useRouter } from 'next/navigation'
import { useMemo, useState } from 'react'
import type { AssignmentConflictCheck, AssignmentSuggestion } from '@/modules/assignment/types'
import { validateAllocationTarget } from '@/modules/assignment/validation'
import { useAssignments } from '@/modules/assignment/hooks/use-assignments'
import { toIsoDateTime } from '@/modules/assignment/utils/capacity-weeks'
import { Badge } from '@/modules/core/components/ui/badge'
import { Button } from '@/modules/core/components/ui/button'
import { Input } from '@/modules/core/components/ui/input'
import { Label } from '@/modules/core/components/ui/label'

interface AllocationFormProps {
  talent: Array<{ id: string; full_name: string; discipline: string }>
  projects: Array<{ id: string; title: string }>
  opportunities: Array<{ id: string; title: string }>
  initialProjectId?: string
  initialOpportunityId?: string
}

export function AllocationForm({
  talent,
  projects,
  opportunities,
  initialProjectId,
  initialOpportunityId,
}: AllocationFormProps) {
  const router = useRouter()
  const { api, error, isPending, run } = useAssignments()

  const [targetType, setTargetType] = useState<'project' | 'opportunity'>(
    initialOpportunityId ? 'opportunity' : 'project'
  )
  const [freelancerId, setFreelancerId] = useState('')
  const [projectId, setProjectId] = useState(initialProjectId ?? '')
  const [opportunityId, setOpportunityId] = useState(initialOpportunityId ?? '')
  const [title, setTitle] = useState('')
  const [allocationPct, setAllocationPct] = useState('100')
  const [startsAt, setStartsAt] = useState('')
  const [endsAt, setEndsAt] = useState('')
  const [notes, setNotes] = useState('')
  const [skillsInput, setSkillsInput] = useState('')
  const [conflicts, setConflicts] = useState<AssignmentConflictCheck[]>([])
  const [suggestions, setSuggestions] = useState<AssignmentSuggestion[]>([])
  const [formError, setFormError] = useState<string | null>(null)

  const requiredSkills = useMemo(
    () =>
      skillsInput
        .split(',')
        .map((skill) => skill.trim())
        .filter(Boolean),
    [skillsInput]
  )

  async function runConflictCheck() {
    if (!freelancerId || !startsAt || !endsAt) return
    const results = await api.checkConflicts({
      freelancer_id: freelancerId,
      starts_at: toIsoDateTime(startsAt),
      ends_at: toIsoDateTime(endsAt),
      allocation_pct: Number(allocationPct),
    })
    setConflicts(results)
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    setFormError(null)

    const targetCheck = validateAllocationTarget(
      targetType === 'project' ? projectId || null : null,
      targetType === 'opportunity' ? opportunityId || null : null
    )
    if (!targetCheck.ok) {
      setFormError(targetCheck.error)
      return
    }

    run(async () => {
      const results = await api.checkConflicts({
        freelancer_id: freelancerId,
        starts_at: toIsoDateTime(startsAt),
        ends_at: toIsoDateTime(endsAt),
        allocation_pct: Number(allocationPct),
      })
      setConflicts(results)

      if (results.some((conflict) => conflict.severity === 'error')) {
        setFormError('Resolve blocking conflicts before creating this allocation.')
        return
      }

      const allocation = await api.createAllocation({
        freelancer_id: freelancerId,
        project_id: targetType === 'project' ? projectId : null,
        opportunity_id: targetType === 'opportunity' ? opportunityId : null,
        title: title.trim(),
        allocation_pct: Number(allocationPct),
        starts_at: toIsoDateTime(startsAt),
        ends_at: toIsoDateTime(endsAt),
        notes: notes.trim() || null,
      })
      router.push(`/assignments/${allocation.id}`)
      router.refresh()
    })
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[2fr_1fr]">
      <form onSubmit={handleSubmit} className="space-y-4 rounded-lg border p-6">
        {(error || formError) && (
          <p className="text-sm text-destructive">{formError ?? error}</p>
        )}

        <div className="space-y-2">
          <Label htmlFor="title">Title</Label>
          <Input id="title" required value={title} onChange={(event) => setTitle(event.target.value)} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="freelancer">Freelancer</Label>
          <select
            id="freelancer"
            required
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            value={freelancerId}
            onChange={(event) => setFreelancerId(event.target.value)}
          >
            <option value="">Select freelancer</option>
            {talent.map((row) => (
              <option key={row.id} value={row.id}>
                {row.full_name} · {row.discipline}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <Label>Target</Label>
          <div className="flex gap-4 text-sm">
            <label className="flex items-center gap-2">
              <input
                type="radio"
                checked={targetType === 'project'}
                onChange={() => setTargetType('project')}
              />
              Project
            </label>
            <label className="flex items-center gap-2">
              <input
                type="radio"
                checked={targetType === 'opportunity'}
                onChange={() => setTargetType('opportunity')}
              />
              Opportunity
            </label>
          </div>
          {targetType === 'project' ? (
            <select
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              value={projectId}
              onChange={(event) => setProjectId(event.target.value)}
              required
            >
              <option value="">Select project</option>
              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.title}
                </option>
              ))}
            </select>
          ) : (
            <select
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              value={opportunityId}
              onChange={(event) => setOpportunityId(event.target.value)}
              required
            >
              <option value="">Select opportunity</option>
              {opportunities.map((opportunity) => (
                <option key={opportunity.id} value={opportunity.id}>
                  {opportunity.title}
                </option>
              ))}
            </select>
          )}
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor="allocation_pct">Allocation %</Label>
            <Input
              id="allocation_pct"
              type="number"
              min={1}
              max={100}
              value={allocationPct}
              onChange={(event) => setAllocationPct(event.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="starts_at">Starts</Label>
            <Input
              id="starts_at"
              type="datetime-local"
              required
              value={startsAt}
              onChange={(event) => setStartsAt(event.target.value)}
              onBlur={() => void runConflictCheck()}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="ends_at">Ends</Label>
            <Input
              id="ends_at"
              type="datetime-local"
              required
              value={endsAt}
              onChange={(event) => setEndsAt(event.target.value)}
              onBlur={() => void runConflictCheck()}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="notes">Notes</Label>
          <textarea
            id="notes"
            className="min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
          />
        </div>

        {conflicts.length ? (
          <div className="space-y-2 rounded-md border border-amber-200 bg-amber-50 p-3">
            <p className="text-sm font-medium">Conflict pre-check</p>
            {conflicts.map((conflict, index) => (
              <div key={`${conflict.conflictType}-${index}`} className="text-sm">
                <Badge variant={conflict.severity === 'error' ? 'destructive' : 'secondary'}>
                  {conflict.severity}
                </Badge>{' '}
                {conflict.message}
              </div>
            ))}
          </div>
        ) : null}

        <div className="flex gap-2">
          <Button type="submit" disabled={isPending}>
            Create allocation
          </Button>
          <Button type="button" variant="outline" disabled={isPending} onClick={() => void runConflictCheck()}>
            Run conflict check
          </Button>
        </div>
      </form>

      <aside className="space-y-4 rounded-lg border p-4">
        <div>
          <h3 className="font-medium">Suggest talent</h3>
          <p className="text-sm text-muted-foreground">
            Rank freelancers by skill match and current allocation load.
          </p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="skills">Required skills</Label>
          <Input
            id="skills"
            placeholder="react, figma, copywriting"
            value={skillsInput}
            onChange={(event) => setSkillsInput(event.target.value)}
          />
        </div>
        <Button
          type="button"
          variant="outline"
          className="w-full"
          disabled={isPending}
          onClick={() =>
            run(async () => {
              const rows = await api.suggestCandidates({
                required_skills: requiredSkills,
                starts_at: startsAt ? toIsoDateTime(startsAt) : undefined,
                ends_at: endsAt ? toIsoDateTime(endsAt) : undefined,
                limit: 8,
              })
              setSuggestions(rows)
            })
          }
        >
          Suggest candidates
        </Button>
        {suggestions.length ? (
          <ul className="space-y-3">
            {suggestions.map((row) => (
              <li key={row.freelancerId} className="rounded-md border p-3 text-sm">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-medium">{row.fullName}</p>
                    <p className="text-muted-foreground">{row.discipline}</p>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => setFreelancerId(row.freelancerId)}
                  >
                    Use
                  </Button>
                </div>
                <p className="mt-2 text-muted-foreground">
                  Match {row.skillMatchCount} · Load {row.currentAllocationPct}% · {row.availability}
                </p>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">Run suggest to see ranked freelancers.</p>
        )}
      </aside>
    </div>
  )
}
