'use client'

import Link from 'next/link'
import { LogOut, UserCircle } from 'lucide-react'
import { RoleBadge } from '@/modules/core/components/auth/role-badge'
import { CommandPalette } from '@/modules/core/components/navigation/command-palette'
import { NotificationBell } from '@/modules/notifications/components/notification-bell'
import { Button } from '@/modules/core/components/ui/button'
import type { SessionContext } from '@/modules/core/types/enums'

interface HeaderProps {
  session: SessionContext
}

export function Header({ session }: HeaderProps) {
  return (
    <header className="flex h-16 items-center justify-between border-b bg-background px-4 md:px-6">
      <div className="min-w-0">
        <h1 className="truncate text-lg font-semibold">
          Welcome{session.user.fullName ? `, ${session.user.fullName}` : ''}
        </h1>
        <div className="mt-1 flex items-center gap-2">
          {session.tenant ? <RoleBadge role={session.tenant.role} /> : null}
          <p className="truncate text-sm text-muted-foreground">
            {session.tenant?.name ?? 'No workspace'}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <CommandPalette />
        <NotificationBell />
        <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex">
          <Link href="/profile">
            <UserCircle className="mr-2 h-4 w-4" />
            Profile
          </Link>
        </Button>
        <form action="/api/auth/signout" method="post">
          <Button variant="outline" size="sm" type="submit">
            <LogOut className="mr-2 h-4 w-4" />
            <span className="hidden sm:inline">Sign out</span>
          </Button>
        </form>
      </div>
    </header>
  )
}
