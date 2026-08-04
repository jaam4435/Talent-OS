'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/modules/core/utils'

const LINKS = [
  { href: '/organization', label: 'Overview', exact: true },
  { href: '/organization/members', label: 'Members' },
  { href: '/organization/invitations', label: 'Invitations' },
  { href: '/organization/departments', label: 'Departments' },
  { href: '/organization/teams', label: 'Teams' },
  { href: '/organization/audit', label: 'Audit log' },
] as const

export function OrganizationSubNav() {
  const pathname = usePathname()

  return (
    <nav className="mb-6 flex flex-wrap gap-2 border-b pb-4">
      {LINKS.map((link) => {
        const active = link.exact
          ? pathname === link.href
          : pathname === link.href || pathname.startsWith(`${link.href}/`)
        return (
          <Link
            key={link.href}
            href={link.href}
            className={cn(
              'rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
              active
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
            )}
          >
            {link.label}
          </Link>
        )
      })}
    </nav>
  )
}
