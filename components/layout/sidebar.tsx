'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  BarChart3,
  Briefcase,
  CreditCard,
  LayoutDashboard,
  Megaphone,
  Settings,
  UserCircle,
  Users,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { APP_NAME } from '@/lib/utils/constants'
import type { UserRole } from '@/types/enums'

const navItems: Array<{
  href: string
  label: string
  icon: typeof LayoutDashboard
  roles: UserRole[]
}> = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['admin', 'talent_manager', 'freelancer'] },
  { href: '/profile', label: 'My profile', icon: UserCircle, roles: ['freelancer'] },
  { href: '/talent', label: 'Talent', icon: Users, roles: ['admin', 'talent_manager'] },
  { href: '/opportunities', label: 'Opportunities', icon: Megaphone, roles: ['admin', 'talent_manager', 'freelancer'] },
  { href: '/projects', label: 'Projects', icon: Briefcase, roles: ['admin', 'talent_manager', 'freelancer'] },
  { href: '/payments', label: 'Payments', icon: CreditCard, roles: ['admin', 'talent_manager', 'freelancer'] },
  { href: '/analytics', label: 'Analytics', icon: BarChart3, roles: ['admin', 'talent_manager'] },
  { href: '/settings', label: 'Settings', icon: Settings, roles: ['admin'] },
]

interface SidebarProps {
  role: UserRole
  tenantName: string
}

export function Sidebar({ role, tenantName }: SidebarProps) {
  const pathname = usePathname()
  const items = navItems.filter((item) => item.roles.includes(role))

  return (
    <aside className="flex h-full w-64 flex-col border-r bg-card">
      <div className="flex h-16 items-center border-b px-6">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            {APP_NAME}
          </p>
          <p className="truncate text-sm font-semibold">{tenantName}</p>
        </div>
      </div>
      <nav className="flex-1 space-y-1 p-4">
        {items.map((item) => {
          const Icon = item.icon
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`)
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                active
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
              )}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </Link>
          )
        })}
      </nav>
    </aside>
  )
}
