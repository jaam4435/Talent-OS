'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { FilterBar, type FilterBarField } from '@/modules/core/components/shared/filter-bar'

export function WorkflowRunsFilters() {
  const router = useRouter()
  const searchParams = useSearchParams()

  function updateParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString())
    if (value) params.set(key, value)
    else params.delete(key)
    params.delete('page')
    router.push(`/workflows/runs?${params.toString()}`)
  }

  const fields: FilterBarField[] = [
    {
      id: 'status',
      label: 'Status',
      type: 'select',
      defaultValue: searchParams.get('status') ?? '',
      options: [
        { value: '', label: 'All' },
        { value: 'running', label: 'Running' },
        { value: 'completed', label: 'Completed' },
        { value: 'failed', label: 'Failed' },
        { value: 'waiting_approval', label: 'Waiting approval' },
      ],
    },
    {
      id: 'workflow_id',
      label: 'Workflow ID',
      type: 'text',
      placeholder: 'wf-project-creation',
      defaultValue: searchParams.get('workflow_id') ?? '',
      colSpan: 2,
    },
  ]

  return (
    <FilterBar
      fields={fields}
      onFieldChange={updateParam}
      onClear={() => router.push('/workflows/runs')}
    />
  )
}
