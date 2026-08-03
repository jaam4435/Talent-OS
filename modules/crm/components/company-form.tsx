'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import type { CrmCompanyStatus } from '@/modules/crm/types'
import { useCrm } from '@/modules/crm/hooks/use-crm'
import { Button } from '@/modules/core/components/ui/button'
import { Input } from '@/modules/core/components/ui/input'
import { Label } from '@/modules/core/components/ui/label'

const COMPANY_STATUSES: CrmCompanyStatus[] = ['prospect', 'active', 'client', 'inactive']

interface CompanyFormProps {
  mode?: 'create' | 'edit'
  companyId?: string
  initial?: {
    name: string
    contactEmail?: string | null
    contactName?: string | null
    website?: string | null
    industry?: string | null
    status?: CrmCompanyStatus
    notes?: string | null
  }
}

export function CompanyForm({ mode = 'create', companyId, initial }: CompanyFormProps) {
  const router = useRouter()
  const { api, error, isPending, run } = useCrm()
  const [name, setName] = useState(initial?.name ?? '')
  const [contactEmail, setContactEmail] = useState(initial?.contactEmail ?? '')
  const [contactName, setContactName] = useState(initial?.contactName ?? '')
  const [website, setWebsite] = useState(initial?.website ?? '')
  const [industry, setIndustry] = useState(initial?.industry ?? '')
  const [status, setStatus] = useState<CrmCompanyStatus>(initial?.status ?? 'prospect')
  const [notes, setNotes] = useState(initial?.notes ?? '')

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    const payload = {
      name: name.trim(),
      contact_email: contactEmail.trim() || null,
      contact_name: contactName.trim() || null,
      website: website.trim() || null,
      industry: industry.trim() || null,
      status,
      notes: notes.trim() || null,
    }

    run(async () => {
      if (mode === 'edit' && companyId) {
        await api.updateCompany(companyId, payload)
        router.refresh()
        return
      }

      const company = await api.createCompany(payload)
      router.push(`/crm/companies/${company.id}`)
      router.refresh()
    })
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-xl space-y-4 rounded-lg border p-6">
      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <div className="space-y-2">
        <Label htmlFor="name">Company name</Label>
        <Input
          id="name"
          required
          minLength={2}
          value={name}
          onChange={(event) => setName(event.target.value)}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="contactName">Contact name</Label>
          <Input
            id="contactName"
            value={contactName}
            onChange={(event) => setContactName(event.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="contactEmail">Contact email</Label>
          <Input
            id="contactEmail"
            type="email"
            value={contactEmail}
            onChange={(event) => setContactEmail(event.target.value)}
          />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="website">Website</Label>
          <Input
            id="website"
            type="url"
            placeholder="https://"
            value={website}
            onChange={(event) => setWebsite(event.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="industry">Industry</Label>
          <Input
            id="industry"
            value={industry}
            onChange={(event) => setIndustry(event.target.value)}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="status">Status</Label>
        <select
          id="status"
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          value={status}
          onChange={(event) => setStatus(event.target.value as CrmCompanyStatus)}
        >
          {COMPANY_STATUSES.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="notes">Notes</Label>
        <textarea
          id="notes"
          className="min-h-[120px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
        />
      </div>

      <div className="flex gap-2">
        <Button type="submit" disabled={isPending}>
          {mode === 'edit' ? 'Save changes' : 'Create company'}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.back()} disabled={isPending}>
          Cancel
        </Button>
      </div>
    </form>
  )
}
