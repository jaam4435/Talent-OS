'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { FilterBar, type FilterBarField } from '@/modules/core/components/shared/filter-bar'
import { DISCIPLINES } from '@/modules/core/utils/constants'

export function TalentSearchFilters() {
  const router = useRouter()
  const searchParams = useSearchParams()

  function updateParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString())
    if (value) params.set(key, value)
    else params.delete(key)
    params.delete('page')
    router.push(`/talent?${params.toString()}`)
  }

  const fields: FilterBarField[] = [
    {
      id: 'q',
      label: 'Search',
      type: 'text',
      placeholder: 'Name, skill, tag...',
      defaultValue: searchParams.get('q') ?? '',
      colSpan: 2,
    },
    {
      id: 'discipline',
      label: 'Discipline',
      type: 'select',
      defaultValue: searchParams.get('discipline') ?? '',
      options: [
        { value: '', label: 'All' },
        ...DISCIPLINES.map((discipline) => ({ value: discipline, label: discipline })),
      ],
    },
    {
      id: 'availability',
      label: 'Availability',
      type: 'select',
      defaultValue: searchParams.get('availability') ?? '',
      options: [
        { value: '', label: 'All' },
        { value: 'available', label: 'Available' },
        { value: 'busy', label: 'Busy' },
        { value: 'unavailable', label: 'Unavailable' },
      ],
    },
    {
      id: 'sort',
      label: 'Sort',
      type: 'select',
      defaultValue: searchParams.get('sort') ?? 'rating',
      options: [
        { value: 'rating', label: 'Rating' },
        { value: 'name', label: 'Name' },
        { value: 'rate_asc', label: 'Rate (low)' },
        { value: 'rate_desc', label: 'Rate (high)' },
        { value: 'active', label: 'Last active' },
      ],
    },
  ]

  return (
    <FilterBar
      fields={fields}
      onFieldChange={updateParam}
      onClear={() => router.push('/talent')}
    />
  )
}
