'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import type { CrmLeadStatus } from '@/modules/crm/types'
import { useCrm } from '@/modules/crm/hooks/use-crm'
import { Button } from '@/modules/core/components/ui/button'
import { Input } from '@/modules/core/components/ui/input'
import { Label } from '@/modules/core/components/ui/label'

const LEAD_STATUSES: CrmLeadStatus[] = ['new', 'contacted', 'qualified', 'unqualified']

interface LeadFormProps {
  mode?: 'create' | 'edit'
  leadId?: string
  initial?: {
    title: string
    source?: string | null
    status?: CrmLeadStatus
    valueEstimate?: number | null
    currency?: string
    description?: string | null
  }
}

export function LeadForm({ mode = 'create', leadId, initial }: LeadFormProps) {
  const router = useRouter()
  const { api, error, isPending, run } = useCrm()
  const [title, setTitle] = useState(initial?.title ?? '')
  const [source, setSource] = useState(initial?.source ?? '')
  const [status, setStatus] = useState<CrmLeadStatus>(initial?.status ?? 'new')
  const [valueEstimate, setValueEstimate] = useState(
    initial?.valueEstimate != null ? String(initial.valueEstimate) : ''
  )
  const [currency, setCurrency] = useState(initial?.currency ?? 'USD')
  const [description, setDescription] = useState(initial?.description ?? '')

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    const payload = {
      title: title.trim(),
      source: source.trim() || null,
      status,
      value_estimate: valueEstimate ? Number(valueEstimate) : null,
      currency,
      description: description.trim() || null,
    }

    run(async () => {
      if (mode === 'edit' && leadId) {
        await api.updateLead(leadId, payload)
        router.refresh()
        return
      }

      const lead = await api.createLead(payload)
      router.push(`/crm/leads/${lead.id}`)
      router.refresh()
    })
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-xl space-y-4 rounded-lg border p-6">
      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <div className="space-y-2">
        <Label htmlFor="title">Title</Label>
        <Input
          id="title"
          required
          minLength={2}
          value={title}
          onChange={(event) => setTitle(event.target.value)}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="source">Source</Label>
          <Input
            id="source"
            value={source}
            onChange={(event) => setSource(event.target.value)}
            placeholder="Referral, inbound, event..."
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="status">Status</Label>
          <select
            id="status"
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            value={status}
            onChange={(event) => setStatus(event.target.value as CrmLeadStatus)}
          >
            {LEAD_STATUSES.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="value">Estimated value</Label>
          <Input
            id="value"
            type="number"
            min={0}
            step="0.01"
            value={valueEstimate}
            onChange={(event) => setValueEstimate(event.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="currency">Currency</Label>
          <Input
            id="currency"
            maxLength={3}
            value={currency}
            onChange={(event) => setCurrency(event.target.value.toUpperCase())}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <textarea
          id="description"
          className="min-h-[120px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
        />
      </div>

      <div className="flex gap-2">
        <Button type="submit" disabled={isPending}>
          {mode === 'edit' ? 'Save changes' : 'Create lead'}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.back()} disabled={isPending}>
          Cancel
        </Button>
      </div>
    </form>
  )
}
