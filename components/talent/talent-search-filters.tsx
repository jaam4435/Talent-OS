'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/modules/core/components/ui/button'
import { Input } from '@/modules/core/components/ui/input'
import { Label } from '@/modules/core/components/ui/label'
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

  return (
    <div className="mb-6 grid gap-4 rounded-lg border p-4 md:grid-cols-4 lg:grid-cols-6">
      <div className="space-y-2 md:col-span-2">
        <Label htmlFor="q">Search</Label>
        <Input
          id="q"
          defaultValue={searchParams.get('q') ?? ''}
          placeholder="Name, skill, tag..."
          onKeyDown={(e) => {
            if (e.key === 'Enter') updateParam('q', (e.target as HTMLInputElement).value)
          }}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="discipline">Discipline</Label>
        <select
          id="discipline"
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm capitalize"
          defaultValue={searchParams.get('discipline') ?? ''}
          onChange={(e) => updateParam('discipline', e.target.value)}
        >
          <option value="">All</option>
          {DISCIPLINES.map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="availability">Availability</Label>
        <select
          id="availability"
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm capitalize"
          defaultValue={searchParams.get('availability') ?? ''}
          onChange={(e) => updateParam('availability', e.target.value)}
        >
          <option value="">All</option>
          <option value="available">Available</option>
          <option value="busy">Busy</option>
          <option value="unavailable">Unavailable</option>
        </select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="sort">Sort</Label>
        <select
          id="sort"
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          defaultValue={searchParams.get('sort') ?? 'rating'}
          onChange={(e) => updateParam('sort', e.target.value)}
        >
          <option value="rating">Rating</option>
          <option value="name">Name</option>
          <option value="rate_asc">Rate (low)</option>
          <option value="rate_desc">Rate (high)</option>
          <option value="active">Last active</option>
        </select>
      </div>
      <div className="flex items-end">
        <Button
          type="button"
          variant="outline"
          className="w-full"
          onClick={() => router.push('/talent')}
        >
          Clear
        </Button>
      </div>
    </div>
  )
}
