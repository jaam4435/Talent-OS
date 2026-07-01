'use client'

import { useState } from 'react'
import { sendMagicLink } from '@/app/actions/auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface MagicLinkFormProps {
  defaultEmail?: string
  redirectTo?: string
}

export function MagicLinkForm({ defaultEmail = '', redirectTo }: MagicLinkFormProps) {
  const [email, setEmail] = useState(defaultEmail)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const result = await sendMagicLink(email, redirectTo)
    setLoading(false)

    if (!result.success) {
      setError(result.error)
      return
    }

    setSent(true)
  }

  if (sent) {
    return (
      <p className="text-sm text-muted-foreground">
        Check <strong>{email}</strong> for a sign-in link. It expires in 24 hours.
      </p>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="magic-email">Email</Label>
        <Input
          id="magic-email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
      </div>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <Button type="submit" className="w-full" variant="secondary" disabled={loading}>
        {loading ? 'Sending link...' : 'Email me a magic link'}
      </Button>
    </form>
  )
}
