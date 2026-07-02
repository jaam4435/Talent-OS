'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { createOpportunity } from '@/app/actions/opportunities'
import { RequirementGatheringPanel } from '@/components/ai/requirement-gathering-panel'
import { SkillsInput } from '@/components/talent/skills-input'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { DISCIPLINES } from '@/lib/utils/constants'
import { formatSkillsForInput } from '@/lib/opportunities/validation'
import type { DisciplineType } from '@/types/enums'
import type { ParsedRequirements } from '@/lib/integrations/ai/types'

interface OpportunityFormProps {
  defaultCurrency: string
  companies?: Array<{ id: string; name: string }>
}

export function OpportunityForm({ defaultCurrency, companies = [] }: OpportunityFormProps) {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [budget, setBudget] = useState('')
  const [skills, setSkills] = useState('')
  const [discipline, setDiscipline] = useState<DisciplineType>('design')
  const [clientName, setClientName] = useState('')
  const [companyId, setCompanyId] = useState('')
  const [deadline, setDeadline] = useState('')
  const [responseDeadline, setResponseDeadline] = useState('')

  function handleSubmit(status: 'draft' | 'open') {
    setError(null)

    startTransition(async () => {
      const result = await createOpportunity({
        title,
        description: description || undefined,
        budget: budget ? Number(budget) : undefined,
        currency: defaultCurrency,
        requiredSkills: skills.split(',').map((s) => s.trim()).filter(Boolean),
        discipline,
        clientName: clientName || undefined,
        companyId: companyId || undefined,
        deadline: deadline || undefined,
        responseDeadline: responseDeadline || undefined,
        status,
      })

      if (!result.ok) {
        setError(result.error)
        return
      }

      router.push(`/opportunities/${result.opportunityId}`)
      router.refresh()
    })
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <form className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="title">Title</Label>
          <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} required />
        </div>
        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="description">Brief</Label>
          <textarea
            id="description"
            className="flex min-h-28 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="company">Company</Label>
          {companies.length ? (
            <select
              id="company"
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={companyId}
              onChange={(e) => {
                setCompanyId(e.target.value)
                const selected = companies.find((c) => c.id === e.target.value)
                if (selected) setClientName(selected.name)
              }}
            >
              <option value="">Select company (optional)</option>
              {companies.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          ) : (
            <Input id="client" value={clientName} onChange={(e) => setClientName(e.target.value)} placeholder="Client name" />
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="discipline">Discipline</Label>
          <select
            id="discipline"
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm capitalize"
            value={discipline}
            onChange={(e) => setDiscipline(e.target.value as DisciplineType)}
          >
            {DISCIPLINES.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="budget">Budget ({defaultCurrency})</Label>
          <Input
            id="budget"
            type="number"
            min="0"
            step="0.01"
            value={budget}
            onChange={(e) => setBudget(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="deadline">Project deadline</Label>
          <Input
            id="deadline"
            type="date"
            value={deadline}
            onChange={(e) => setDeadline(e.target.value)}
          />
        </div>
        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="responseDeadline">Response deadline</Label>
          <Input
            id="responseDeadline"
            type="datetime-local"
            value={responseDeadline}
            onChange={(e) => setResponseDeadline(e.target.value)}
          />
        </div>
      </div>

      <SkillsInput value={skills} onChange={setSkills} label="Required skills" />

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <div className="flex flex-wrap gap-3">
        <Button
          type="button"
          variant="outline"
          disabled={isPending}
          onClick={() => handleSubmit('draft')}
        >
          {isPending ? 'Saving...' : 'Save draft'}
        </Button>
        <Button type="button" disabled={isPending} onClick={() => handleSubmit('open')}>
          {isPending ? 'Saving...' : 'Create & open'}
        </Button>
      </div>
    </form>

      <RequirementGatheringPanel
        title={title}
        description={description}
        budget={budget}
        currency={defaultCurrency}
        onApply={(requirements: ParsedRequirements) => {
          if (requirements.skills.length) {
            setSkills(requirements.skills.join(', '))
          }
          if (!description && requirements.summary) {
            setDescription(requirements.summary)
          }
          if (!budget && requirements.budgetHint) {
            setBudget(String(requirements.budgetHint))
          }
        }}
      />
    </div>
  )
}
