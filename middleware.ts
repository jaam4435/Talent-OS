import { NextResponse, type NextRequest } from 'next/server'
import { updateSession } from '@/modules/core/utils/supabase/middleware'
import { ACTIVE_TENANT_COOKIE } from '@/modules/core/services/tenant-context'
import {
  ADMIN_ONLY_ROUTES,
  CLIENT_RESTRICTED_ROUTES,
  MANAGER_ONLY_ROUTES,
  PUBLIC_ROUTES,
  isApiPublicRoute,
  isApiRoute,
} from '@/modules/core/utils/constants'

function isPublicRoute(pathname: string) {
  return (
    PUBLIC_ROUTES.some((route) => pathname === route || pathname.startsWith(`${route}/`)) ||
    isApiPublicRoute(pathname)
  )
}

function matchesRoute(pathname: string, routes: readonly string[]) {
  return routes.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  )
}

function apiUnauthorizedResponse(request: NextRequest) {
  return NextResponse.json(
    { error: { code: 'UNAUTHORIZED', message: 'Authentication required' } },
    {
      status: 401,
      headers: {
        'X-API-Version': 'v1',
        'Content-Type': 'application/json',
      },
    }
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

  if (isPublicRoute(pathname) || pathname === '/') {
    return response
  }

  if (!supabaseUrl || !supabaseKey) {
    if (process.env.NODE_ENV === 'production' || process.env.VERCEL_ENV === 'production') {
      if (isApiRoute(pathname)) {
        return NextResponse.json(
          { error: { code: 'SERVICE_UNAVAILABLE', message: 'Auth service not configured' } },
          { status: 503 }
        )
      }
      return new NextResponse('Service Unavailable', { status: 503 })
    }
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
    if (isApiRoute(pathname)) {
      return apiUnauthorizedResponse(request)
    }
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
    if (isApiRoute(pathname)) {
      return NextResponse.json(
        { error: { code: 'FORBIDDEN', message: 'Admin access required' } },
        { status: 403, headers: { 'X-API-Version': 'v1' } }
      )
    }
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  if (
    matchesRoute(pathname, MANAGER_ONLY_ROUTES) &&
    membership?.role !== 'admin' &&
    membership?.role !== 'talent_manager'
  ) {
    if (isApiRoute(pathname)) {
      return NextResponse.json(
        { error: { code: 'FORBIDDEN', message: 'Manager access required' } },
        { status: 403, headers: { 'X-API-Version': 'v1' } }
      )
    }
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  if (
    membership?.role === 'client' &&
    matchesRoute(pathname, CLIENT_RESTRICTED_ROUTES)
  ) {
    if (isApiRoute(pathname)) {
      return NextResponse.json(
        { error: { code: 'FORBIDDEN', message: 'Insufficient permissions' } },
        { status: 403, headers: { 'X-API-Version': 'v1' } }
      )
    }
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  if (membership?.role === 'freelancer' && pathname.startsWith('/settings')) {
    if (isApiRoute(pathname)) {
      return NextResponse.json(
        { error: { code: 'FORBIDDEN', message: 'Insufficient permissions' } },
        { status: 403, headers: { 'X-API-Version': 'v1' } }
      )
    }
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  return response
}

export const config = {
  matcher: ['/((?!_next/static|_next/image).*)'],
}
