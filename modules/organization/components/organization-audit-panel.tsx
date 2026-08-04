'use client'

import type { OrganizationAuditEntry } from '@/modules/organization/types'
import { DataTable, type DataTableColumn } from '@/modules/core/components/shared/data-table'

interface OrganizationAuditPanelProps {
  entries: OrganizationAuditEntry[]
}

export function OrganizationAuditPanel({ entries }: OrganizationAuditPanelProps) {
  const columns: DataTableColumn<OrganizationAuditEntry>[] = [
    {
      id: 'when',
      header: 'When',
      cell: (row) => new Date(row.createdAt).toLocaleString(),
    },
    { id: 'action', header: 'Action', cell: (row) => row.action },
    {
      id: 'entity',
      header: 'Entity',
      cell: (row) => `${row.entityType} · ${row.entityId.slice(0, 8)}…`,
    },
  ]

  return (
    <DataTable
      columns={columns}
      data={entries}
      getRowKey={(row) => row.id}
      emptyMessage="No audit entries yet."
    />
  )
}
