'use client'

import { useMemo, useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createProject } from '@/app/actions/projects'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { validateMilestoneBudget } from '@/lib/projects/validation'
import type { MilestoneInput } from '@/lib/projects/types'

interface CreateProjectFormProps {
  freelancers: Array<{ id: string; full_name: string; email: string }>
  companies?: Array<{ id: string; name: string }>
  defaults?: {
    freelancerId?: string
    title?: string
    description?: string
    clientName?: string
    companyId?: string
    budget?: number
    currency?: string
    opportunityId?: string
    shortlistId?: string
  }
}

function emptyMilestone(): MilestoneInput {
  return { title: '', amount: 0, description: '', dueDate: '' }
}

export function CreateProjectForm({ freelancers, companies = [], defaults }: CreateProjectFormProps) {
  const router = useRouter()
  const [freelancerId, setFreelancerId] = useState(defaults?.freelancerId ?? '')
  const [title, setTitle] = useState(defaults?.title ?? '')
  const [description, setDescription] = useState(defaults?.description ?? '')
  const [companyId, setCompanyId] = useState(defaults?.companyId ?? '')
  const [clientName, setClientName] = useState(defaults?.clientName ?? '')
  const [budget, setBudget] = useState(defaults?.budget?.toString() ?? '')
  const [milestones, setMilestones] = useState<MilestoneInput[]>([emptyMilestone()])
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const milestoneTotal = useMemo(
    () => milestones.reduce((sum, m) => sum + (Number(m.amount) || 0), 0),
    [milestones]
  )

  const budgetNumber = budget ? Number(budget) : undefined
  const budgetWarning = validateMilestoneBudget(
    milestones.map((m) => ({ amount: Number(m.amount) || 0 })),
    budgetNumber
  )

  function updateMilestone(index: number, patch: Partial<MilestoneInput>) {
    setMilestones((rows) => rows.map((row, i) => (i === index ? { ...row, ...patch } : row)))
  }

  function addMilestone() {
    setMilestones((rows) => [...rows, emptyMilestone()])
  }

  function removeMilestone(index: number) {
    setMilestones((rows) => (rows.length <= 1 ? rows : rows.filter((_, i) => i !== index)))
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (budgetWarning) {
      setError(budgetWarning)
      return
    }

    startTransition(async () => {
      const result = await createProject({
        freelancerId,
        title,
        description: description || undefined,
        clientName: clientName || undefined,
        companyId: companyId || undefined,
        budget: budgetNumber,
        currency: defaults?.currency,
        opportunityId: defaults?.opportunityId,
        shortlistId: defaults?.shortlistId,
        milestones: milestones.map((m) => ({
          title: m.title,
          description: m.description || undefined,
          amount: Number(m.amount) || 0,
          dueDate: m.dueDate || undefined,
        })),
      })

      if (!result.ok) {
        setError(result.error)
        return
      }

      router.push(`/projects/${result.projectId}`)
      router.refresh()
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="title">Project title</Label>
          <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} required />
        </div>
        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="freelancer">Assigned freelancer</Label>
          <select
            id="freelancer"
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            value={freelancerId}
            onChange={(e) => setFreelancerId(e.target.value)}
            required
          >
            <option value="">Select freelancer</option>
            {freelancers.map((f) => (
              <option key={f.id} value={f.id}>
                {f.full_name} ({f.email})
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="company">Company</Label>
          <select
            id="company"
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            value={companyId}
            onChange={(e) => {
              const id = e.target.value
              setCompanyId(id)
              const company = companies.find((c) => c.id === id)
              if (company) setClientName(company.name)
            }}
          >
            <option value="">Select company (optional)</option>
            {companies.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="client">Client name</Label>
          <Input
            id="client"
            value={clientName}
            onChange={(e) => setClientName(e.target.value)}
            placeholder={companyId ? 'Synced from company' : 'Or enter manually'}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="budget">Budget</Label>
          <Input
            id="budget"
            type="number"
            min="0"
            step="0.01"
            value={budget}
            onChange={(e) => setBudget(e.target.value)}
          />
        </div>
        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="description">Brief / description</Label>
          <textarea
            id="description"
            className="flex min-h-24 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-medium">Milestones</h3>
            <p className="text-sm text-muted-foreground">
              Total: {milestoneTotal.toLocaleString()}
              {budgetNumber != null ? ` / ${budgetNumber.toLocaleString()} budget` : ''}
            </p>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={addMilestone}>
            Add milestone
          </Button>
        </div>

        <div className="space-y-3">
          {milestones.map((milestone, index) => (
            <div key={index} className="grid gap-3 rounded-lg border p-4 md:grid-cols-4">
              <div className="space-y-2 md:col-span-2">
                <Label>Title</Label>
                <Input
                  value={milestone.title}
                  onChange={(e) => updateMilestone(index, { title: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Amount</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={milestone.amount}
                  onChange={(e) => updateMilestone(index, { amount: Number(e.target.value) })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Due date</Label>
                <Input
                  type="date"
                  value={milestone.dueDate ?? ''}
                  onChange={(e) => updateMilestone(index, { dueDate: e.target.value })}
                />
              </div>
              <div className="space-y-2 md:col-span-4">
                <Label>Description</Label>
                <Input
                  value={milestone.description ?? ''}
                  onChange={(e) => updateMilestone(index, { description: e.target.value })}
                />
              </div>
              {milestones.length > 1 ? (
                <div className="md:col-span-4">
                  <Button type="button" variant="ghost" size="sm" onClick={() => removeMilestone(index)}>
                    Remove
                  </Button>
                </div>
              ) : null}
            </div>
          ))}
        </div>
      </div>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <div className="flex gap-3">
        <Button type="submit" disabled={isPending}>
          {isPending ? 'Creating project...' : 'Create project'}
        </Button>
        <Button type="button" variant="outline" asChild>
          <Link href="/projects">Cancel</Link>
        </Button>
      </div>
    </form>
  )
}
