import Link from 'next/link'
import { ForgotPasswordForm } from '@/modules/core/components/auth/forgot-password-form'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/modules/core/components/ui/card'
import { APP_NAME } from '@/modules/core/utils/constants'

export const metadata = { title: 'Reset password' }

export default function ForgotPasswordPage() {
  return (
    <Card>
      <CardHeader className="text-center">
        <CardTitle className="text-2xl">Reset password</CardTitle>
        <CardDescription>We will email you a link to reset your {APP_NAME} password.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <ForgotPasswordForm />
        <p className="text-center text-sm text-muted-foreground">
          <Link href="/login" className="font-medium text-foreground underline">
            Back to sign in
          </Link>
        </p>
      </CardContent>
    </Card>
  )
}
