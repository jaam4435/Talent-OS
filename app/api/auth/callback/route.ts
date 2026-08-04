import { NextResponse } from 'next/server'
import { runInstrumentedRoute } from '@/modules/core/api/handler'
import { createClient } from '@/modules/core/utils/supabase/server'

export async function GET(request: Request) {
  return runInstrumentedRoute(request, { path: '/api/auth/callback', rateLimit: 'auth' }, async () => {
    const { searchParams, origin } = new URL(request.url)
    const code = searchParams.get('code')
    const next = searchParams.get('next') ?? '/dashboard'

    if (code) {
      const supabase = await createClient()
      const { error } = await supabase.auth.exchangeCodeForSession(code)
      if (!error) {
        return NextResponse.redirect(`${origin}${next}`)
      }
    }

    return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`)
  })
}
