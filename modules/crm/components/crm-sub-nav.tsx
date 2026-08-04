'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/modules/core/utils'

const LINKS = [
  { href: '/crm/pipeline', label: 'Pipeline' },
  { href: '/crm/leads', label: 'Leads' },
  { href: '/crm/companies', label: 'Companies' },
  { href: '/crm/contracts', label: 'Contracts' },
] as const

export function CrmSubNav() {
  const pathname = usePathname()

  return (
    <nav className="mb-6 flex flex-wrap gap-2 border-b pb-4">
      {LINKS.map((link) => {
        const active = pathname === link.href || pathname.startsWith(`${link.href}/`)
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
