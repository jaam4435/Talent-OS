'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { signInWithPassword } from '@/app/actions/auth'
import { MagicLinkForm } from '@/components/auth/magic-link-form'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'

type AuthMode = 'password' | 'magic'

export function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [mode, setMode] = useState<AuthMode>('password')
  const [email, setEmail] = useState(searchParams.get('email') ?? '')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const result = await signInWithPassword({ email, password })

    if (!result.success) {
      setError(result.error)
      setLoading(false)
      return
    }

    router.push(searchParams.get('redirect') ?? '/dashboard')
    router.refresh()
  }

  const redirectTo = searchParams.get('redirect') ?? '/dashboard'

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2 rounded-lg bg-muted p-1">
        {(['password', 'magic'] as const).map((tab) => (
          <button
            key={tab}
            type="button"
            className={cn(
              'rounded-md px-3 py-2 text-sm font-medium transition-colors',
              mode === tab ? 'bg-background shadow-sm' : 'text-muted-foreground'
            )}
            onClick={() => setMode(tab)}
          >
            {tab === 'password' ? 'Password' : 'Magic link'}
          </button>
        ))}
      </div>

      {mode === 'password' ? (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="password">Password</Label>
              <Link href="/forgot-password" className="text-xs text-muted-foreground underline">
                Forgot password?
              </Link>
            </div>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Signing in...' : 'Sign in'}
          </Button>
        </form>
      ) : (
        <MagicLinkForm defaultEmail={email} redirectTo={redirectTo} />
      )}
    </div>
  )
}
