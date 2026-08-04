'use client'

import { useState } from 'react'
import type { OrganizationDepartment } from '@/modules/organization/types'
import { useOrganizationApi } from '@/modules/organization/hooks/use-organization-api'
import { DataTable, type DataTableColumn } from '@/modules/core/components/shared/data-table'
import { Button } from '@/modules/core/components/ui/button'
import { Input } from '@/modules/core/components/ui/input'
import { Label } from '@/modules/core/components/ui/label'

interface OrganizationDepartmentsPanelProps {
  departments: OrganizationDepartment[]
}

export function OrganizationDepartmentsPanel({ departments }: OrganizationDepartmentsPanelProps) {
  const { api, error, isPending, run } = useOrganizationApi()
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')

  const columns: DataTableColumn<OrganizationDepartment>[] = [
    { id: 'name', header: 'Name', cell: (row) => row.name },
    { id: 'slug', header: 'Slug', cell: (row) => row.slug },
    {
      id: 'description',
      header: 'Description',
      cell: (row) => row.description ?? '—',
    },
    {
      id: 'actions',
      header: '',
      cell: (row) => (
        <Button
          variant="outline"
          size="sm"
          disabled={isPending}
          onClick={() => run(() => api.deleteDepartment(row.id))}
        >
          Delete
        </Button>
      ),
    },
  ]

  return (
    <div className="space-y-6">
      <form
        className="grid gap-4 rounded-lg border p-4 md:grid-cols-3"
        onSubmit={(event) => {
          event.preventDefault()
          run(async () => {
            await api.createDepartment({
              name,
              description: description || null,
            })
            setName('')
            setDescription('')
          })
        }}
      >
        <div className="space-y-2 md:col-span-1">
          <Label htmlFor="dept-name">Department name</Label>
          <Input id="dept-name" value={name} onChange={(e) => setName(e.target.value)} required />
        </div>
        <div className="space-y-2 md:col-span-1">
          <Label htmlFor="dept-desc">Description</Label>
          <Input
            id="dept-desc"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>
        <div className="flex items-end">
          <Button type="submit" disabled={isPending}>
            Add department
          </Button>
        </div>
      </form>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <DataTable
        columns={columns}
        data={departments}
        getRowKey={(row) => row.id}
        emptyMessage="No departments yet."
      />
    </div>
  )
}
