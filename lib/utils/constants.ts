export const APP_NAME = 'TalentOS'

export const PUBLIC_ROUTES = [
  '/login',
  '/signup',
  '/invite',
  '/forgot-password',
  '/api/auth/callback',
  '/api/webhooks',
] as const

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

export const USER_ROLES = ['admin', 'talent_manager', 'freelancer'] as const
