'use client'

import { useEffect, useState } from 'react'
import type { NotificationPreference } from '@/modules/notifications/types'
import { useNotifications } from '@/modules/notifications/hooks/use-notifications'
import { Button } from '@/modules/core/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/modules/core/components/ui/card'
import { Label } from '@/modules/core/components/ui/label'

export function NotificationPreferencesPanel() {
  const { api, error, isPending, run } = useNotifications()
  const [preferences, setPreferences] = useState<NotificationPreference[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    api
      .getPreferences()
      .then((data) => {
        if (!cancelled) setPreferences(data)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [api])

  function togglePreference(preference: NotificationPreference) {
    const next = preferences.map((row) =>
      row.id === preference.id ? { ...row, enabled: !row.enabled } : row
    )
    setPreferences(next)
    run(async () => {
      const updated = await api.updatePreferences([
        {
          category: preference.category,
          channel: preference.channel,
          enabled: !preference.enabled,
        },
      ])
      setPreferences(updated)
    })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Notification preferences</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading preferences…</p>
        ) : (
          <div className="space-y-3">
            {preferences.map((preference) => (
              <div key={preference.id} className="flex items-center justify-between gap-4">
                <div>
                  <Label className="capitalize">{preference.category}</Label>
                  <p className="text-xs text-muted-foreground">Channel: {preference.channel}</p>
                </div>
                <Button
                  size="sm"
                  variant={preference.enabled ? 'default' : 'outline'}
                  disabled={isPending}
                  onClick={() => togglePreference(preference)}
                >
                  {preference.enabled ? 'Enabled' : 'Disabled'}
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
