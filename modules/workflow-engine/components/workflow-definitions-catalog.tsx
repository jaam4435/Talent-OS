import type { WorkflowDefinitionRecord } from '@/modules/workflow-engine/types'
import { Badge } from '@/modules/core/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/modules/core/components/ui/card'
import { DataTable, type DataTableColumn } from '@/modules/core/components/shared/data-table'

interface RegistryDefinition {
  id: string
  name: string
  description: string | null
  triggerEventType: string
  queue: string
  stepCount: number
  hasCompensation: boolean
  isBusinessWorkflow?: boolean
}

interface WorkflowDefinitionsCatalogProps {
  registry: RegistryDefinition[]
  stored: WorkflowDefinitionRecord[]
}

export function WorkflowDefinitionsCatalog({ registry, stored }: WorkflowDefinitionsCatalogProps) {
  const registryColumns: DataTableColumn<RegistryDefinition>[] = [
    {
      id: 'name',
      header: 'Workflow',
      cell: (row) => (
        <>
          <p className="font-medium">{row.name}</p>
          <p className="text-sm text-muted-foreground">{row.id}</p>
        </>
      ),
    },
    {
      id: 'trigger',
      header: 'Trigger',
      cell: (row) => row.triggerEventType,
    },
    {
      id: 'steps',
      header: 'Steps',
      cell: (row) => row.stepCount,
    },
    {
      id: 'tags',
      header: 'Tags',
      cell: (row) => (
        <div className="flex flex-wrap gap-1">
          <Badge variant="outline">{row.queue}</Badge>
          {row.isBusinessWorkflow ? <Badge variant="secondary">Business</Badge> : null}
          {row.hasCompensation ? <Badge variant="secondary">Compensation</Badge> : null}
        </div>
      ),
    },
  ]

  const storedColumns: DataTableColumn<WorkflowDefinitionRecord>[] = [
    {
      id: 'name',
      header: 'Custom workflow',
      cell: (row) => (
        <>
          <p className="font-medium">{row.name}</p>
          <p className="text-sm text-muted-foreground">{row.id}</p>
        </>
      ),
    },
    { id: 'category', header: 'Category', cell: (row) => row.category },
    { id: 'trigger', header: 'Trigger', cell: (row) => row.triggerEventType },
    {
      id: 'status',
      header: 'Status',
      cell: (row) => (
        <Badge variant={row.isActive ? 'secondary' : 'outline'}>
          {row.isActive ? 'Active' : 'Inactive'}
        </Badge>
      ),
    },
  ]

  return (
    <div className="space-y-8">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Built-in registry</CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable columns={registryColumns} data={registry} getRowKey={(row) => row.id} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Tenant custom definitions</CardTitle>
        </CardHeader>
        <CardContent>
          {stored.length ? (
            <DataTable columns={storedColumns} data={stored} getRowKey={(row) => row.id} />
          ) : (
            <p className="text-sm text-muted-foreground">No custom workflow definitions stored yet.</p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
