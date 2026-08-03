'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Briefcase,
  GitBranch,
  LayoutDashboard,
  Megaphone,
  UserCircle,
  Bell,
  Users,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { UserRole } from '@/modules/core/types/enums'
import { cn } from '@/modules/core/utils'
import { isManager } from '@/modules/core/services/permissions'

interface MobileNavItem {
  href: string
  label: string
  icon: LucideIcon
  match: (pathname: string) => boolean
}

function itemsForRole(role: UserRole): MobileNavItem[] {
  const dashboard: MobileNavItem = {
    href: '/dashboard',
    label: 'Home',
    icon: LayoutDashboard,
    match: (pathname) => pathname === '/dashboard',
  }
  const projects: MobileNavItem = {
    href: '/projects',
    label: 'Projects',
    icon: Briefcase,
    match: (pathname) => pathname.startsWith('/projects'),
  }
  const notifications: MobileNavItem = {
    href: '/notifications',
    label: 'Alerts',
    icon: Bell,
    match: (pathname) => pathname.startsWith('/notifications'),
  }

  if (isManager(role)) {
    return [
      dashboard,
      projects,
      {
        href: '/crm/pipeline',
        label: 'Pipeline',
        icon: GitBranch,
        match: (pathname) => pathname.startsWith('/crm'),
      },
      {
        href: '/talent',
        label: 'Talent',
        icon: Users,
        match: (pathname) => pathname.startsWith('/talent'),
      },
      notifications,
    ]
  }

  return [
    dashboard,
    projects,
    {
      href: '/opportunities',
      label: 'Demand',
      icon: Megaphone,
      match: (pathname) => pathname.startsWith('/opportunities'),
    },
    notifications,
    {
      href: '/profile',
      label: 'Profile',
      icon: UserCircle,
      match: (pathname) => pathname.startsWith('/profile'),
    },
  ]
}

export function MobileNav({ role }: { role: UserRole }) {
  const pathname = usePathname()
  const items = itemsForRole(role)

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t bg-background md:hidden">
      <ul className="grid grid-cols-5">
        {items.map((item) => {
          const Icon = item.icon
          const active = item.match(pathname)
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                className={cn(
                  'flex flex-col items-center gap-1 px-2 py-2 text-xs',
                  active ? 'text-primary' : 'text-muted-foreground'
                )}
              >
                <Icon className="h-5 w-5" />
                <span>{item.label}</span>
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
