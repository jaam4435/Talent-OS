'use client'

import { Bell, LogOut } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { SessionContext } from '@/types/enums'

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
        <p className="text-sm text-muted-foreground capitalize">
          {session.tenant?.role.replace('_', ' ') ?? 'No workspace'}
        </p>
      </div>
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" aria-label="Notifications">
          <Bell className="h-4 w-4" />
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
