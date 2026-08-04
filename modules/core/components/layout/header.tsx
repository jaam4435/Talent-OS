'use client'

import Link from 'next/link'
import { Bell, LogOut } from 'lucide-react'
import { RoleBadge } from '@/modules/core/components/auth/role-badge'
import { Button } from '@/modules/core/components/ui/button'
import type { SessionContext } from '@/modules/core/types/enums'

interface HeaderProps {
  session: SessionContext
}

export function Header({ session }: HeaderProps) {
  return (
    <header className="flex h-16 items-center justify-between border-b bg-background px-6">
      <div>
        <h1 className="text-lg font-semibold">
          Welcome{session.user.fullName ? `, ${session.user.fullName}` : ''}
        </h1>
        <div className="mt-1 flex items-center gap-2">
          {session.tenant ? <RoleBadge role={session.tenant.role} /> : null}
          <p className="text-sm text-muted-foreground">{session.tenant?.name ?? 'No workspace'}</p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" aria-label="Notifications" asChild>
          <Link href="/notifications">
            <Bell className="h-4 w-4" />
          </Link>
        </Button>
        <form action="/api/auth/signout" method="post">
          <Button variant="outline" size="sm" type="submit">
            <LogOut className="mr-2 h-4 w-4" />
            Sign out
          </Button>
        </form>
      </div>
    </header>
  )
}
