'use client'

import { useCallback, useEffect, useState } from 'react'
import type { NotificationItem } from '@/modules/notifications/types'
import { useNotifications } from '@/modules/notifications/hooks/use-notifications'
import { Badge } from '@/modules/core/components/ui/badge'
import { Button } from '@/modules/core/components/ui/button'
import { formatDateTime } from '@/modules/core/utils/format'
import { cn } from '@/modules/core/utils'

export function NotificationInbox() {
  const { api, error, isPending, run } = useNotifications()
  const [items, setItems] = useState<NotificationItem[]>([])
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(false)
  const [unreadOnly, setUnreadOnly] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(true)

  const loadPage = useCallback(
    async (nextPage: number, replace = false) => {
      setLoading(true)
      try {
        const result = await api.list({ page: nextPage, limit: 20, unread_only: unreadOnly })
        setItems((current) => (replace ? result.data : [...current, ...result.data]))
        setPage(nextPage)
        setHasMore(result.meta.hasMore)
        setUnreadCount(result.meta.unreadCount)
      } finally {
        setLoading(false)
      }
    },
    [api, unreadOnly]
  )

  useEffect(() => {
    void loadPage(1, true)
  }, [loadPage])

  function handleMarkRead(item: NotificationItem) {
    if (item.readAt) return
    run(async () => {
      await api.markRead(item.id)
      setItems((current) =>
        current.map((row) =>
          row.id === item.id ? { ...row, readAt: new Date().toISOString() } : row
        )
      )
      setUnreadCount((count) => Math.max(0, count - 1))
    })
  }

  function handleMarkAllRead() {
    run(async () => {
      await api.markAllRead()
      setItems((current) =>
        current.map((row) => ({ ...row, readAt: row.readAt ?? new Date().toISOString() }))
      )
      setUnreadCount(0)
    })
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant={unreadOnly ? 'default' : 'outline'}
            onClick={() => setUnreadOnly((value) => !value)}
          >
            {unreadOnly ? 'Showing unread' : 'Show unread only'}
          </Button>
          {unreadCount > 0 ? (
            <Badge variant="secondary">{unreadCount} unread</Badge>
          ) : null}
        </div>
        <Button size="sm" variant="outline" disabled={isPending || unreadCount === 0} onClick={handleMarkAllRead}>
          Mark all read
        </Button>
      </div>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      {!items.length && !loading ? (
        <p className="rounded-lg border p-8 text-center text-sm text-muted-foreground">
          {unreadOnly ? 'No unread notifications.' : 'No notifications yet.'}
        </p>
      ) : (
        <div className="rounded-lg border">
          <ul className="divide-y">
            {items.map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  className={cn(
                    'flex w-full flex-col gap-1 p-4 text-left transition-colors hover:bg-muted/40',
                    !item.readAt && 'bg-muted/20'
                  )}
                  onClick={() => handleMarkRead(item)}
                >
                  <div className="flex items-start justify-between gap-3">
                    <p className="font-medium">{item.title}</p>
                    {!item.readAt ? <Badge variant="secondary">Unread</Badge> : null}
                  </div>
                  {item.body ? <p className="text-sm text-muted-foreground">{item.body}</p> : null}
                  <p className="text-xs text-muted-foreground">{formatDateTime(item.createdAt)}</p>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {hasMore ? (
        <div className="flex justify-center">
          <Button
            variant="outline"
            disabled={loading || isPending}
            onClick={() => void loadPage(page + 1)}
          >
            Load more
          </Button>
        </div>
      ) : null}
    </div>
  )
}
