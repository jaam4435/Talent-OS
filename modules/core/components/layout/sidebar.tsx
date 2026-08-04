'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useMemo, useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { cn } from '@/modules/core/utils'
import { APP_NAME } from '@/modules/core/utils/constants'
import type { UserRole } from '@/modules/core/types/enums'
import {
  getActiveNavGroupIds,
  getNavGroupsForRole,
  isNavItemActive,
  type NavItemConfig,
} from '@/modules/core/components/navigation/nav-config'

interface SidebarProps {
  role: UserRole
  tenantName: string
}

function NavLink({ item, pathname }: { item: NavItemConfig; pathname: string }) {
  const Icon = item.icon
  const active = isNavItemActive(pathname, item.href)

  return (
    <Link
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
}

export function Sidebar({ role, tenantName }: SidebarProps) {
  const pathname = usePathname()
  const groups = useMemo(() => getNavGroupsForRole(role), [role])
  const activeGroupIds = useMemo(() => getActiveNavGroupIds(pathname, role), [pathname, role])
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})

  function isGroupExpanded(groupId: string) {
    if (expanded[groupId] !== undefined) return expanded[groupId]
    return activeGroupIds.includes(groupId)
  }

  function toggleGroup(groupId: string) {
    setExpanded((current) => ({
      ...current,
      [groupId]: !isGroupExpanded(groupId),
    }))
  }

  const homeGroup = groups.find((group) => group.id === 'home')
  const sectionGroups = groups.filter((group) => group.id !== 'home')

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
      <nav className="flex-1 space-y-4 overflow-y-auto p-4">
        {homeGroup ? (
          <div className="space-y-1">
            {homeGroup.items.map((item) => (
              <NavLink key={item.id} item={item} pathname={pathname} />
            ))}
          </div>
        ) : null}

        {sectionGroups.map((group) => {
          const open = isGroupExpanded(group.id)
          return (
            <div key={group.id}>
              <button
                type="button"
                onClick={() => toggleGroup(group.id)}
                className="flex w-full items-center justify-between px-3 py-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground"
              >
                {group.label}
                <ChevronDown
                  className={cn('h-4 w-4 transition-transform', open && 'rotate-180')}
                  aria-hidden
                />
              </button>
              {open ? (
                <div className="mt-1 space-y-1">
                  {group.items.map((item) => (
                    <NavLink key={item.id} item={item} pathname={pathname} />
                  ))}
                </div>
              ) : null}
            </div>
          )
        })}
      </nav>
    </aside>
  )
}
