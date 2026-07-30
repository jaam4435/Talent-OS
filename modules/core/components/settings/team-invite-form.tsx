'use client'

import { useState, useTransition } from 'react'
import { inviteTeamMember } from '@/modules/core/api/auth.actions'
import { ROLE_DESCRIPTIONS } from '@/modules/core/services/roles'
import { Button } from '@/modules/core/components/ui/button'
import { Input } from '@/modules/core/components/ui/input'
import { Label } from '@/modules/core/components/ui/label'
import type { UserRole } from '@/modules/core/types/enums'

interface TeamInviteFormProps {
  companies?: Array<{ id: string; name: string }>
}

export function TeamInviteForm({ companies = [] }: TeamInviteFormProps) {
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<UserRole>('talent_manager')
  const [companyId, setCompanyId] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [inviteUrl, setInviteUrl] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setInviteUrl(null)

    startTransition(async () => {
      const result = await inviteTeamMember({
        email,
        role,
        companyId: role === 'client' ? companyId || undefined : undefined,
      })
      if (!result.success) {
        setError(result.error)
        return
      }

      setInviteUrl(result.inviteUrl)
      setEmail('')
      setCompanyId('')
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded-lg border p-4">
      <div>
        <h3 className="font-medium">Invite team member</h3>
        <p className="text-sm text-muted-foreground">
          Invitations expire in 7 days. Share the link with your teammate.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="invite-email">Email</Label>
          <Input
            id="invite-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="invite-role">Role</Label>
          <select
            id="invite-role"
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            value={role}
            onChange={(e) => setRole(e.target.value as UserRole)}
          >
            <option value="talent_manager">Talent Manager</option>
            <option value="freelancer">Talent</option>
            <option value="client">Client</option>
          </select>
          <p className="text-xs text-muted-foreground">{ROLE_DESCRIPTIONS[role]}</p>
        </div>
        {role === 'client' ? (
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="invite-company">Company</Label>
            <select
              id="invite-company"
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={companyId}
              onChange={(e) => setCompanyId(e.target.value)}
              required
            >
              <option value="">Select company</option>
              {companies.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        ) : null}
      </div>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      {inviteUrl ? (
        <div className="rounded-md bg-muted p-3 text-sm">
          <p className="font-medium">Invite link created</p>
          <code className="mt-2 block break-all text-xs">{inviteUrl}</code>
        </div>
      ) : null}

      <Button type="submit" disabled={isPending}>
        {isPending ? 'Sending invite...' : 'Create invite'}
      </Button>
    </form>
  )
}
