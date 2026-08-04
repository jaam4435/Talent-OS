'use client'

import type { OrganizationMember } from '@/modules/organization/types'
import type { MemberStatus, UserRole } from '@/modules/core/types/enums'
import { useOrganizationApi } from '@/modules/organization/hooks/use-organization-api'
import { RoleBadge } from '@/modules/core/components/auth/role-badge'
import { DataTable, type DataTableColumn } from '@/modules/core/components/shared/data-table'
import { Button } from '@/modules/core/components/ui/button'
import { Badge } from '@/modules/core/components/ui/badge'

interface OrganizationMembersPanelProps {
  members: OrganizationMember[]
}

const ROLES: UserRole[] = ['admin', 'talent_manager', 'freelancer', 'client']
const STATUSES: MemberStatus[] = ['active', 'suspended']

export function OrganizationMembersPanel({ members }: OrganizationMembersPanelProps) {
  const { api, error, isPending, run } = useOrganizationApi()

  const columns: DataTableColumn<OrganizationMember>[] = [
    {
      id: 'name',
      header: 'Member',
      cell: (row) => (
        <>
          <p className="font-medium">{row.fullName ?? row.email}</p>
          <p className="text-sm text-muted-foreground">{row.email}</p>
        </>
      ),
    },
    {
      id: 'role',
      header: 'Role',
      cell: (row) => (
        <select
          className="h-9 rounded-md border border-input bg-background px-2 text-sm"
          value={row.role}
          disabled={isPending}
          onChange={(event) =>
            run(() => api.updateMember(row.id, { role: event.target.value as UserRole }))
          }
        >
          {ROLES.map((role) => (
            <option key={role} value={role}>
              {role}
            </option>
          ))}
        </select>
      ),
    },
    {
      id: 'status',
      header: 'Status',
      cell: (row) => (
        <div className="flex items-center gap-2">
          <Badge variant={row.status === 'active' ? 'secondary' : 'outline'} className="capitalize">
            {row.status}
          </Badge>
          <select
            className="h-9 rounded-md border border-input bg-background px-2 text-sm"
            value={row.status}
            disabled={isPending}
            onChange={(event) =>
              run(() => api.updateMember(row.id, { status: event.target.value as MemberStatus }))
            }
          >
            {STATUSES.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
        </div>
      ),
    },
    {
      id: 'joined',
      header: 'Joined',
      cell: (row) =>
        row.joinedAt ? new Date(row.joinedAt).toLocaleDateString() : '—',
    },
    {
      id: 'badge',
      header: '',
      cell: (row) => <RoleBadge role={row.role} />,
    },
    {
      id: 'actions',
      header: '',
      cell: (row) => (
        <Button
          variant="outline"
          size="sm"
          disabled={isPending}
          onClick={() => run(() => api.removeMember(row.id))}
        >
          Remove
        </Button>
      ),
    },
  ]

  return (
    <div className="space-y-4">
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <DataTable
        columns={columns}
        data={members}
        getRowKey={(row) => row.id}
        emptyMessage="No members found."
      />
    </div>
  )
}
