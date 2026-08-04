'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { FilterBar, type FilterBarField } from '@/modules/core/components/shared/filter-bar'

interface CrmListFiltersProps {
  pathname: string
  fields: FilterBarField[]
}

export function CrmListFilters({ pathname, fields }: CrmListFiltersProps) {
  const router = useRouter()
  const searchParams = useSearchParams()

  function updateParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString())
    if (value) params.set(key, value)
    else params.delete(key)
    params.delete('page')
    router.push(`${pathname}?${params.toString()}`)
  }

  return (
    <FilterBar
      fields={fields.map((field) => ({
        ...field,
        defaultValue: field.defaultValue ?? searchParams.get(field.id) ?? '',
      }))}
      onFieldChange={updateParam}
      onClear={() => router.push(pathname)}
    />
  )
}
