'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { FilterBar, type FilterBarField } from '@/modules/core/components/shared/filter-bar'

interface AssignmentListFiltersProps {
  pathname?: string
}

export function AssignmentListFilters({ pathname = '/assignments' }: AssignmentListFiltersProps) {
  const router = useRouter()
  const searchParams = useSearchParams()

  function updateParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString())
    if (value) params.set(key, value)
    else params.delete(key)
    params.delete('page')
    router.push(`${pathname}?${params.toString()}`)
  }

  const fields: FilterBarField[] = [
    {
      id: 'status',
      label: 'Status',
      type: 'select',
      defaultValue: searchParams.get('status') ?? '',
      options: [
        { value: '', label: 'All' },
        { value: 'planned', label: 'Planned' },
        { value: 'confirmed', label: 'Confirmed' },
        { value: 'active', label: 'Active' },
        { value: 'completed', label: 'Completed' },
        { value: 'canceled', label: 'Canceled' },
      ],
    },
    {
      id: 'freelancer_id',
      label: 'Freelancer ID',
      type: 'text',
      placeholder: 'UUID',
      defaultValue: searchParams.get('freelancer_id') ?? '',
      colSpan: 2,
    },
    {
      id: 'project_id',
      label: 'Project ID',
      type: 'text',
      placeholder: 'UUID',
      defaultValue: searchParams.get('project_id') ?? '',
      colSpan: 2,
    },
  ]

  return (
    <FilterBar
      fields={fields}
      onFieldChange={updateParam}
      onClear={() => router.push(pathname)}
    />
  )
}
