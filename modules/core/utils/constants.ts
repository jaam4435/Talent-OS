export const APP_NAME = 'TalentOS'

export const PUBLIC_ROUTES = [
  '/login',
  '/signup',
  '/invite',
  '/forgot-password',
  '/api/auth/callback',
  '/api/auth/signout',
  '/api/auth/invite',
  '/api/webhooks',
] as const

/** System routes authenticated via bearer secret in route handlers, not session cookies. */
export const SYSTEM_ROUTES = ['/api/cron', '/api/internal', '/api/health'] as const

export function matchesRoutePrefix(pathname: string, routes: readonly string[]): boolean {
  return routes.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  )
}

export function isSystemRoute(pathname: string): boolean {
  return matchesRoutePrefix(pathname, SYSTEM_ROUTES)
}

export function isPublicOrSystemRoute(pathname: string): boolean {
  return (
    pathname === '/' ||
    matchesRoutePrefix(pathname, PUBLIC_ROUTES) ||
    isSystemRoute(pathname)
  )
}

export const ADMIN_ONLY_ROUTES = [
  '/settings',
  '/settings/team',
  '/settings/billing',
  '/settings/integrations',
] as const

export const MANAGER_ONLY_ROUTES = ['/talent', '/analytics'] as const

export const DISCIPLINES = [
  'design',
  'video',
  'copy',
  'motion',
  'brand',
  'other',
] as const

export const USER_ROLES = ['admin', 'talent_manager', 'freelancer', 'client'] as const

/** Routes blocked for client users (agency-only features) */
export const CLIENT_RESTRICTED_ROUTES = [
  '/talent',
  '/analytics',
  '/settings',
  '/opportunities/new',
  '/projects/new',
  '/payments',
] as const
