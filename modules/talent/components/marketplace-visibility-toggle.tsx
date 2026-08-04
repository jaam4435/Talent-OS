'use client'

import { useTransition, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/modules/core/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/modules/core/components/ui/card'
import { TalentOsApiError } from '@/lib/api/client'
import { getUserMessageForApiError } from '@/lib/api/user-messages'

interface MarketplaceVisibilityToggleProps {
  talentId: string
  visible: boolean
  publishedAt: string | null
}

export function MarketplaceVisibilityToggle({
  talentId,
  visible: initialVisible,
  publishedAt,
}: MarketplaceVisibilityToggleProps) {
  const router = useRouter()
  const [visible, setVisible] = useState(initialVisible)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function toggle() {
    setError(null)
    setMessage(null)
    startTransition(async () => {
      try {
        const response = await fetch(`/api/talent/${talentId}/marketplace`, {
          method: 'PATCH',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
            'X-API-Version': 'v1',
          },
          body: JSON.stringify({ visible: !visible }),
        })

        const json = (await response.json()) as { data?: { marketplaceVisible?: boolean }; error?: { message?: string } }
        if (!response.ok) {
          throw new TalentOsApiError(
            'INTERNAL_ERROR',
            json.error?.message ?? 'Request failed',
            response.status
          )
        }

        const nextVisible = json.data?.marketplaceVisible ?? !visible
        setVisible(nextVisible)
        setMessage(nextVisible ? 'Profile published to marketplace' : 'Profile removed from marketplace')
        router.refresh()
      } catch (err) {
        setError(getUserMessageForApiError(err))
      }
    })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Marketplace visibility</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground">
          When enabled, an anonymized version of this profile appears on the public talent marketplace.
          Email, phone, and internal notes are never exposed.
        </p>
        {publishedAt ? (
          <p className="text-xs text-muted-foreground">
            Published {new Date(publishedAt).toLocaleString()}
          </p>
        ) : null}
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        {message ? <p className="text-sm text-muted-foreground">{message}</p> : null}
        <Button
          type="button"
          variant={visible ? 'default' : 'outline'}
          disabled={isPending}
          onClick={toggle}
        >
          {visible ? 'Visible on marketplace' : 'Publish to marketplace'}
        </Button>
      </CardContent>
    </Card>
  )
}
