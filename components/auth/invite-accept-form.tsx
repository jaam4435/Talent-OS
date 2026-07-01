'use client'

import { useEffect, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { acceptInvite } from '@/app/actions/auth'
import { MagicLinkForm } from '@/components/auth/magic-link-form'
import { RoleBadge } from '@/components/auth/role-badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { UserRole } from '@/types/enums'

interface InvitePreview {
  tenantName: string
  email: string
  role: UserRole
  roleLabel: string
  expiresAt: string
  isValid: boolean
}

export function InviteAcceptForm({ token }: { token: string }) {
  const router = useRouter()
  const [preview, setPreview] = useState<InvitePreview | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [isPending, startTransition] = useTransition()

  useEffect(() => {
    async function load() {
      const response = await fetch(`/api/auth/invite/${token}`)
      if (!response.ok) {
        setLoadError('Invitation not found.')
        return
      }

      const json = (await response.json()) as { data: InvitePreview }
      setPreview(json.data)
      if (!json.data.isValid) {
        setLoadError('This invitation has expired or was revoked.')
      }
    }

    void load()
  }, [token])

  function handleAccept() {
    setError(null)
    startTransition(async () => {
      const result = await acceptInvite({ token, password, fullName })
      if (!result.success) {
        if (result.error === 'PASSWORD_REQUIRED' && 'email' in result) {
          setError('Create a password to finish setting up your account.')
          return
        }
        setError(result.error)
        return
      }

      router.push('/dashboard')
      router.refresh()
    })
  }

  if (loadError) {
    return <p className="text-sm text-destructive">{loadError}</p>
  }

  if (!preview) {
    return <p className="text-sm text-muted-foreground">Loading invitation...</p>
  }

  return (
    <div className="space-y-6">
      <div className="rounded-lg border p-4">
        <p className="text-sm text-muted-foreground">You are joining</p>
        <p className="text-lg font-semibold">{preview.tenantName}</p>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <span className="text-sm">{preview.email}</span>
          <RoleBadge role={preview.role} />
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          Expires {new Date(preview.expiresAt).toLocaleDateString()}
        </p>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="fullName">Your name</Label>
          <Input
            id="fullName"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Optional"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="invite-password">Password</Label>
          <Input
            id="invite-password"
            type="password"
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Required if you do not have an account"
          />
        </div>
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        <Button className="w-full" onClick={handleAccept} disabled={isPending}>
          {isPending ? 'Joining workspace...' : 'Accept invitation'}
        </Button>
      </div>

      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-card px-2 text-muted-foreground">Or use magic link</span>
        </div>
      </div>

      <MagicLinkForm defaultEmail={preview.email} redirectTo="/dashboard" />
    </div>
  )
}
