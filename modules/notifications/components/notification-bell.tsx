'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Bell } from 'lucide-react'
import { Button } from '@/modules/core/components/ui/button'
import { notificationsApi } from '@/lib/api/notifications-api'

export function NotificationBell() {
  const [unreadCount, setUnreadCount] = useState(0)

  useEffect(() => {
    let cancelled = false
    notificationsApi
      .list({ page: 1, limit: 1 })
      .then((result) => {
        if (!cancelled) setUnreadCount(result.meta.unreadCount ?? 0)
      })
      .catch(() => {
        if (!cancelled) setUnreadCount(0)
      })
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <Button variant="ghost" size="icon" aria-label="Notifications" className="relative" asChild>
      <Link href="/notifications">
        <Bell className="h-4 w-4" />
        {unreadCount > 0 ? (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-medium text-primary-foreground">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        ) : null}
      </Link>
    </Button>
  )
}
