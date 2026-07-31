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

/** API routes that bypass session auth (each handler validates its own credentials). */
export const API_PUBLIC_ROUTES = [
  '/api/health',
  '/api/openapi',
  '/api/cron',
  '/api/internal',
  '/api/webhooks',
  '/api/auth/callback',
  '/api/auth/signout',
  '/api/auth/invite',
] as const

export function isApiRoute(pathname: string): boolean {
  return pathname.startsWith('/api/')
}

export function isApiPublicRoute(pathname: string): boolean {
  return API_PUBLIC_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
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
