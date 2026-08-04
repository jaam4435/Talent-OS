'use client'

import { Button } from '@/modules/core/components/ui/button'
import { Input } from '@/modules/core/components/ui/input'
import { Label } from '@/modules/core/components/ui/label'
import { cn } from '@/modules/core/utils'

export type FilterBarField =
  | {
      id: string
      label: string
      type: 'text'
      placeholder?: string
      defaultValue?: string
      colSpan?: number
    }
  | {
      id: string
      label: string
      type: 'select'
      options: Array<{ value: string; label: string }>
      defaultValue?: string
      colSpan?: number
    }

interface FilterBarProps {
  fields: FilterBarField[]
  onFieldChange: (id: string, value: string) => void
  onClear: () => void
  className?: string
}

export function FilterBar({ fields, onFieldChange, onClear, className }: FilterBarProps) {
  return (
    <div className={cn('mb-6 grid gap-4 rounded-lg border p-4 md:grid-cols-4 lg:grid-cols-6', className)}>
      {fields.map((field) => (
        <div
          key={field.id}
          className={cn(
            'space-y-2',
            field.colSpan === 2 && 'md:col-span-2',
            field.type === 'text' && !field.colSpan && 'md:col-span-2'
          )}
        >
          <Label htmlFor={field.id}>{field.label}</Label>
          {field.type === 'text' ? (
            <Input
              id={field.id}
              defaultValue={field.defaultValue ?? ''}
              placeholder={field.placeholder}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  onFieldChange(field.id, (event.target as HTMLInputElement).value)
                }
              }}
            />
          ) : (
            <select
              id={field.id}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              defaultValue={field.defaultValue ?? ''}
              onChange={(event) => onFieldChange(field.id, event.target.value)}
            >
              {field.options.map((option) => (
                <option key={option.value || 'all'} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          )}
        </div>
      ))}
      <div className="flex items-end">
        <Button type="button" variant="outline" className="w-full" onClick={onClear}>
          Clear
        </Button>
      </div>
    </div>
  )
}
