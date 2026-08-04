'use client'

import { useState } from 'react'
import type { OrganizationInvite } from '@/modules/organization/types'
import type { UserRole } from '@/modules/core/types/enums'
import { ROLE_DESCRIPTIONS } from '@/modules/core/services/roles'
import { useOrganizationApi } from '@/modules/organization/hooks/use-organization-api'
import { RoleBadge } from '@/modules/core/components/auth/role-badge'
import { DataTable, type DataTableColumn } from '@/modules/core/components/shared/data-table'
import { Button } from '@/modules/core/components/ui/button'
import { Input } from '@/modules/core/components/ui/input'
import { Label } from '@/modules/core/components/ui/label'

interface OrganizationInvitationsPanelProps {
  invites: OrganizationInvite[]
  companies?: Array<{ id: string; name: string }>
}

export function OrganizationInvitationsPanel({
  invites,
  companies = [],
}: OrganizationInvitationsPanelProps) {
  const { api, error, isPending, run } = useOrganizationApi()
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<UserRole>('talent_manager')
  const [companyId, setCompanyId] = useState('')
  const [inviteUrl, setInviteUrl] = useState<string | null>(null)

  const columns: DataTableColumn<OrganizationInvite>[] = [
    { id: 'email', header: 'Email', cell: (row) => row.email },
    {
      id: 'role',
      header: 'Role',
      cell: (row) => <RoleBadge role={row.role} />,
    },
    {
      id: 'expires',
      header: 'Expires',
      cell: (row) => (
        <>
          {new Date(row.expiresAt).toLocaleDateString()}
          {row.isExpired ? ' · Expired' : ''}
        </>
      ),
    },
    {
      id: 'actions',
      header: '',
      cell: (row) => (
        <Button
          variant="outline"
          size="sm"
          disabled={isPending}
          onClick={() => run(() => api.revokeInvite(row.id))}
        >
          Revoke
        </Button>
      ),
    },
  ]

  return (
    <div className="space-y-6">
      <form
        className="space-y-4 rounded-lg border p-4"
        onSubmit={(event) => {
          event.preventDefault()
          setInviteUrl(null)
          run(async () => {
            const result = await api.createInvite({
              email,
              role,
              company_id: role === 'client' ? companyId || undefined : undefined,
            })
            setInviteUrl(result.invite_url)
            setEmail('')
            setCompanyId('')
          })
        }}
      >
        <div>
          <h3 className="font-medium">Invite team member</h3>
          <p className="text-sm text-muted-foreground">
            Invitations expire in 7 days. Share the link with your teammate.
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
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
              <option value="admin">Admin</option>
            </select>
            <p className="text-xs text-muted-foreground">{ROLE_DESCRIPTIONS[role]}</p>
          </div>
          {role === 'client' ? (
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="invite-company">Company</Label>
              <select
                id="invite-company"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={companyId}
                onChange={(e) => setCompanyId(e.target.value)}
                required
              >
                <option value="">Select company</option>
                {companies.map((company) => (
                  <option key={company.id} value={company.id}>
                    {company.name}
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
          {isPending ? 'Creating invite…' : 'Create invite'}
        </Button>
      </form>

      <DataTable
        columns={columns}
        data={invites}
        getRowKey={(row) => row.id}
        emptyMessage="No pending invitations."
      />
    </div>
  )
}
