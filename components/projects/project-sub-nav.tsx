'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/modules/core/utils'

const TAB_SUFFIXES = [
  { suffix: '', label: 'Overview', exact: true },
  { suffix: '/tasks', label: 'Tasks' },
  { suffix: '/deliverables', label: 'Deliverables' },
  { suffix: '/timeline', label: 'Timeline' },
] as const

export function ProjectSubNav({ projectId }: { projectId: string }) {
  const pathname = usePathname()
  const base = `/projects/${projectId}`

  return (
    <nav className="mb-6 flex flex-wrap gap-2 border-b pb-4">
      {TAB_SUFFIXES.map((tab) => {
        const href = `${base}${tab.suffix}`
        const active = tab.exact
          ? pathname === href
          : pathname === href || pathname.startsWith(`${href}/`)
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              'rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
              active
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
            )}
          >
            {tab.label}
          </Link>
        )
      })}
    </nav>
  )
}
