'use client'

import { useState } from 'react'
import type { OrganizationDepartment, OrganizationMember, OrganizationTeam } from '@/modules/organization/types'
import { useOrganizationApi } from '@/modules/organization/hooks/use-organization-api'
import { DataTable, type DataTableColumn } from '@/modules/core/components/shared/data-table'
import { Button } from '@/modules/core/components/ui/button'
import { Input } from '@/modules/core/components/ui/input'
import { Label } from '@/modules/core/components/ui/label'

interface OrganizationTeamsPanelProps {
  teams: OrganizationTeam[]
  departments: OrganizationDepartment[]
  members: OrganizationMember[]
}

export function OrganizationTeamsPanel({
  teams,
  departments,
  members,
}: OrganizationTeamsPanelProps) {
  const { api, error, isPending, run } = useOrganizationApi()
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [departmentId, setDepartmentId] = useState('')
  const [memberAssignments, setMemberAssignments] = useState<Record<string, string>>({})

  const columns: DataTableColumn<OrganizationTeam>[] = [
    { id: 'name', header: 'Team', cell: (row) => row.name },
    {
      id: 'department',
      header: 'Department',
      cell: (row) =>
        departments.find((dept) => dept.id === row.departmentId)?.name ?? '—',
    },
    { id: 'members', header: 'Members', cell: (row) => row.memberCount },
    {
      id: 'assign',
      header: 'Add member',
      cell: (row) => (
        <div className="flex gap-2">
          <select
            className="h-9 rounded-md border border-input bg-background px-2 text-sm"
            value={memberAssignments[row.id] ?? ''}
            onChange={(event) =>
              setMemberAssignments((current) => ({
                ...current,
                [row.id]: event.target.value,
              }))
            }
          >
            <option value="">Select member</option>
            {members.map((member) => (
              <option key={member.id} value={member.id}>
                {member.fullName ?? member.email}
              </option>
            ))}
          </select>
          <Button
            variant="outline"
            size="sm"
            disabled={isPending || !memberAssignments[row.id]}
            onClick={() =>
              run(async () => {
                const memberId = memberAssignments[row.id]
                if (!memberId) return
                await api.addTeamMember(row.id, memberId)
                setMemberAssignments((current) => ({ ...current, [row.id]: '' }))
              })
            }
          >
            Add
          </Button>
        </div>
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
          onClick={() => run(() => api.deleteTeam(row.id))}
        >
          Delete
        </Button>
      ),
    },
  ]

  return (
    <div className="space-y-6">
      <form
        className="grid gap-4 rounded-lg border p-4 md:grid-cols-4"
        onSubmit={(event) => {
          event.preventDefault()
          run(async () => {
            await api.createTeam({
              name,
              description: description || null,
              department_id: departmentId || null,
            })
            setName('')
            setDescription('')
            setDepartmentId('')
          })
        }}
      >
        <div className="space-y-2">
          <Label htmlFor="team-name">Team name</Label>
          <Input id="team-name" value={name} onChange={(e) => setName(e.target.value)} required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="team-desc">Description</Label>
          <Input id="team-desc" value={description} onChange={(e) => setDescription(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="team-dept">Department</Label>
          <select
            id="team-dept"
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            value={departmentId}
            onChange={(e) => setDepartmentId(e.target.value)}
          >
            <option value="">None</option>
            {departments.map((dept) => (
              <option key={dept.id} value={dept.id}>
                {dept.name}
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-end">
          <Button type="submit" disabled={isPending}>
            Add team
          </Button>
        </div>
      </form>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <DataTable columns={columns} data={teams} getRowKey={(row) => row.id} emptyMessage="No teams yet." />
    </div>
  )
}
