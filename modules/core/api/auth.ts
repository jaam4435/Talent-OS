import { AppError } from '@/modules/core/api/response'
import { isProduction } from '@/lib/env'
import { requireAdmin, requireManager } from '@/modules/core/services/guards'
import { requirePermission } from '@/modules/core/services/permissions'
import { getSession, requireSession, requireTenant } from '@/modules/core/services/session'
import {
  createRequestContext,
  enrichContextFromSession,
  type ApiRequestContext,
} from '@/modules/core/api/context'

export type ApiAuthMode =
  | 'none'
  | 'optional'
  | 'session'
  | 'tenant'
  | 'admin'
  | 'manager'
  | 'cron'

export async function authenticateRequest(
  request: Request,
  mode: ApiAuthMode
): Promise<ApiRequestContext> {
  const ctx = createRequestContext(request)

  if (mode === 'none') return ctx

  if (mode === 'cron') {
    const secret = process.env.CRON_SECRET
    if (isProduction() && (!secret || secret.length < 16)) {
      throw new AppError('CRON_UNAUTHORIZED', 'Cron secret not configured', 503)
    }
    const authHeader = request.headers.get('authorization')
    if (authHeader !== `Bearer ${secret}`) {
      throw new AppError('CRON_UNAUTHORIZED', 'Invalid cron authorization', 401)
    }
    return ctx
  }

  if (mode === 'optional') {
    const session = await getSession()
    return session ? enrichContextFromSession(ctx, session) : ctx
  }

  if (mode === 'session') {
    const session = await requireSession()
    return enrichContextFromSession(ctx, session)
  }

  if (mode === 'tenant') {
    const session = await requireTenant()
    return enrichContextFromSession(ctx, session)
  }

  if (mode === 'admin') {
    const { tenant, user, permissions } = await requireAdmin()
    return enrichContextFromSession(ctx, {
      user,
      tenant,
      permissions,
    })
  }

  if (mode === 'manager') {
    const { tenant, user, permissions } = await requireManager()
    return enrichContextFromSession(ctx, {
      user,
      tenant,
      permissions,
    })
  }

  return ctx
}

export function authorizePermissions(ctx: ApiRequestContext, permissions: string[]): void {
  if (!ctx.tenant) {
    throw new AppError('NO_TENANT', 'Tenant context required', 403)
  }
  for (const permission of permissions) {
    requirePermission(ctx.tenant.role, permission)
  }
}
