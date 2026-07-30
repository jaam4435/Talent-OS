import { NextResponse, type NextRequest } from 'next/server'
import { updateSession } from '@/modules/core/utils/supabase/middleware'
import { ACTIVE_TENANT_COOKIE } from '@/modules/core/services/tenant-context'
import {
  ADMIN_ONLY_ROUTES,
  CLIENT_RESTRICTED_ROUTES,
  isPublicOrSystemRoute,
  MANAGER_ONLY_ROUTES,
} from '@/modules/core/utils/constants'

function matchesRoute(pathname: string, routes: readonly string[]) {
  return routes.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  )
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon') ||
    pathname.match(/\.(svg|png|jpg|jpeg|gif|webp)$/)
  ) {
    return NextResponse.next()
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  const response = await updateSession(request)

  if (isPublicOrSystemRoute(pathname)) {
    return response
  }

  if (!supabaseUrl || !supabaseKey) {
    return response
  }

  const { createServerClient } = await import('@supabase/ssr')
  const supabase = createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll() {},
    },
  })

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('redirect', pathname)
    return NextResponse.redirect(loginUrl)
  }

  const activeTenantId = request.cookies.get(ACTIVE_TENANT_COOKIE)?.value

  let membershipQuery = supabase
    .from('tenant_members')
    .select('role, tenant_id')
    .eq('user_id', user.id)
    .eq('status', 'active')

  if (activeTenantId) {
    membershipQuery = membershipQuery.eq('tenant_id', activeTenantId)
  }

  const { data: membership } = await membershipQuery.limit(1).maybeSingle()

  if (membership?.tenant_id) {
    response.headers.set('X-Tenant-ID', membership.tenant_id)
    response.headers.set('X-User-Role', membership.role)
  }

  if (matchesRoute(pathname, ADMIN_ONLY_ROUTES) && membership?.role !== 'admin') {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  if (
    matchesRoute(pathname, MANAGER_ONLY_ROUTES) &&
    membership?.role !== 'admin' &&
    membership?.role !== 'talent_manager'
  ) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  if (
    membership?.role === 'client' &&
    matchesRoute(pathname, CLIENT_RESTRICTED_ROUTES)
  ) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  if (membership?.role === 'freelancer' && pathname.startsWith('/settings')) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  return response
}

export const config = {
  matcher: ['/((?!_next/static|_next/image).*)'],
}
