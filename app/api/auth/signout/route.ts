import { NextResponse } from 'next/server'
import { runInstrumentedRoute } from '@/modules/core/api/handler'
import { signOut } from '@/modules/core/api/auth.actions'

export async function POST(request: Request) {
  return runInstrumentedRoute(request, { path: '/api/auth/signout', rateLimit: 'auth' }, async () => {
    await signOut()
    return NextResponse.redirect(
      new URL('/login', process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000')
    )
  })
}
