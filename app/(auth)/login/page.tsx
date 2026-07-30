import Link from 'next/link'
import { Suspense } from 'react'
import { LoginForm } from '@/modules/core/components/auth/login-form'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/modules/core/components/ui/card'
import { APP_NAME } from '@/modules/core/utils/constants'

export const metadata = { title: 'Sign in' }

export default function LoginPage() {
  return (
    <Card>
      <CardHeader className="text-center">
        <CardTitle className="text-2xl">{APP_NAME}</CardTitle>
        <CardDescription>Sign in to your agency workspace</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Suspense fallback={<div className="text-sm text-muted-foreground">Loading...</div>}>
          <LoginForm />
        </Suspense>
        <p className="text-center text-sm text-muted-foreground">
          No account?{' '}
          <Link href="/signup" className="font-medium text-foreground underline">
            Create agency
          </Link>
        </p>
      </CardContent>
    </Card>
  )
}
