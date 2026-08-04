'use client'

import { useState } from 'react'
import { Building2, Mail, Users, UsersRound } from 'lucide-react'
import { useOrganizationApi } from '@/modules/organization/hooks/use-organization-api'
import { StatCard } from '@/modules/core/components/shared/page-header'
import { Button } from '@/modules/core/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/modules/core/components/ui/card'
import { Input } from '@/modules/core/components/ui/input'
import { Label } from '@/modules/core/components/ui/label'

interface OrganizationOverviewCardsProps {
  memberCount: number
  pendingInvites: number
  departmentCount: number
  teamCount: number
}

export function OrganizationOverviewCards({
  memberCount,
  pendingInvites,
  departmentCount,
  teamCount,
}: OrganizationOverviewCardsProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      <StatCard title="Members" value={memberCount} icon={Users} />
      <StatCard title="Pending invites" value={pendingInvites} icon={Mail} />
      <StatCard title="Departments" value={departmentCount} icon={Building2} />
      <StatCard title="Teams" value={teamCount} icon={UsersRound} />
    </div>
  )
}

interface OrganizationGeneralFormProps {
  initial: {
    name: string
    timezone: string
    currency: string
  }
}

export function OrganizationGeneralForm({ initial }: OrganizationGeneralFormProps) {
  const { api, error, isPending, run } = useOrganizationApi()
  const [name, setName] = useState(initial.name)
  const [timezone, setTimezone] = useState(initial.timezone)
  const [currency, setCurrency] = useState(initial.currency)

  return (
    <OrganizationFormShell
      title="General settings"
      description="Workspace name, timezone, and currency."
      error={error}
      isPending={isPending}
      onSubmit={(event) => {
        event.preventDefault()
        run(() => api.updateOrganization({ name, timezone, currency }))
      }}
    >
      <FormField label="Organization name" id="org-name" value={name} onChange={setName} />
      <FormField label="Timezone" id="org-timezone" value={timezone} onChange={setTimezone} />
      <FormField
        label="Currency"
        id="org-currency"
        value={currency}
        onChange={(value) => setCurrency(value.toUpperCase())}
        maxLength={3}
      />
    </OrganizationFormShell>
  )
}

interface OrganizationBrandingFormProps {
  initial: {
    logoUrl: string | null
    primaryColor: string | null
    accentColor: string | null
  }
}

export function OrganizationBrandingForm({ initial }: OrganizationBrandingFormProps) {
  const { api, error, isPending, run } = useOrganizationApi()
  const [logoUrl, setLogoUrl] = useState(initial.logoUrl ?? '')
  const [primaryColor, setPrimaryColor] = useState(initial.primaryColor ?? '')
  const [accentColor, setAccentColor] = useState(initial.accentColor ?? '')

  return (
    <OrganizationFormShell
      title="Branding"
      description="Logo URL and accent colors for your workspace."
      error={error}
      isPending={isPending}
      onSubmit={(event) => {
        event.preventDefault()
        run(() =>
          api.updateBranding({
            logo_url: logoUrl || null,
            primary_color: primaryColor || null,
            accent_color: accentColor || null,
          })
        )
      }}
    >
      <FormField label="Logo URL" id="brand-logo" value={logoUrl} onChange={setLogoUrl} />
      <FormField
        label="Primary color"
        id="brand-primary"
        value={primaryColor}
        onChange={setPrimaryColor}
        placeholder="#2563eb"
      />
      <FormField
        label="Accent color"
        id="brand-accent"
        value={accentColor}
        onChange={setAccentColor}
        placeholder="#7c3aed"
      />
    </OrganizationFormShell>
  )
}

function OrganizationFormShell({
  title,
  description,
  error,
  isPending,
  onSubmit,
  children,
}: {
  title: string
  description: string
  error: string | null
  isPending: boolean
  onSubmit: (event: React.FormEvent) => void
  children: React.ReactNode
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <p className="text-sm text-muted-foreground">{description}</p>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">{children}</div>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <Button type="submit" disabled={isPending}>
            {isPending ? 'Saving…' : 'Save changes'}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}

function FormField({
  label,
  id,
  value,
  onChange,
  placeholder,
  maxLength,
}: {
  label: string
  id: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
  maxLength?: number
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        value={value}
        placeholder={placeholder}
        maxLength={maxLength}
        onChange={(event) => onChange(event.target.value)}
      />
    </div>
  )
}
