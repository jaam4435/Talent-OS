import Link from 'next/link'
import { SignupForm } from '@/modules/core/components/auth/signup-form'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/modules/core/components/ui/card'
import { APP_NAME } from '@/modules/core/utils/constants'

export const metadata = { title: 'Create agency' }

export default function SignupPage() {
  return (
    <Card>
      <CardHeader className="text-center">
        <CardTitle className="text-2xl">Create your agency</CardTitle>
        <CardDescription>Get started with {APP_NAME} in minutes</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <SignupForm />
        <p className="text-center text-sm text-muted-foreground">
          Already have an account?{' '}
          <Link href="/login" className="font-medium text-foreground underline">
            Sign in
          </Link>
        </p>
      </CardContent>
    </Card>
  )
}
