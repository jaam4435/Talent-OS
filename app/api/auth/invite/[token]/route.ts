import { withApiHandler } from '@/modules/core/api/handler'
import { AppError } from '@/modules/core/api/response'
import { createClient } from '@/modules/core/utils/supabase/server'
import { hashInviteToken } from '@/modules/core/services/invites'
import { formatRole } from '@/modules/core/services/roles'

export const GET = withApiHandler(
  { auth: 'none', rateLimit: 'auth' },
  async ({ params }) => {
    const token = params?.token
    if (!token) {
      throw new AppError('VALIDATION_ERROR', 'Invite token is required', 400)
    }

    const supabase = await createClient()
    const tokenHash = hashInviteToken(token)

    const { data, error } = await supabase.rpc('get_invite_preview', {
      p_token_hash: tokenHash,
    })

    if (error) {
      throw new AppError('INTERNAL_ERROR', error.message, 500)
    }

    const preview = Array.isArray(data) ? data[0] : data
    if (!preview) {
      throw new AppError('NOT_FOUND', 'Invitation not found', 404)
    }

    return {
      inviteId: preview.invite_id,
      tenantId: preview.tenant_id,
      tenantName: preview.tenant_name,
      email: preview.email,
      role: preview.role,
      roleLabel: formatRole(preview.role),
      expiresAt: preview.expires_at,
      isValid: preview.is_valid,
    }
  }
)
