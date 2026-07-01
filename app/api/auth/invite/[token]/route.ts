import { createClient } from '@/lib/supabase/server'
import { hashInviteToken } from '@/lib/auth/invites'
import { success, handleApiError, AppError } from '@/lib/api/response'
import { formatRole } from '@/lib/auth/roles'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params
    const supabase = await createClient()
    const tokenHash = hashInviteToken(token)

    const { data, error } = await supabase.rpc('get_invite_preview', {
      p_token_hash: tokenHash,
    })

    if (error) {
      throw new AppError('INVITE_LOOKUP_FAILED', error.message, 500)
    }

    const preview = Array.isArray(data) ? data[0] : data
    if (!preview) {
      throw new AppError('NOT_FOUND', 'Invitation not found', 404)
    }

    return success({
      inviteId: preview.invite_id,
      tenantId: preview.tenant_id,
      tenantName: preview.tenant_name,
      email: preview.email,
      role: preview.role,
      roleLabel: formatRole(preview.role),
      expiresAt: preview.expires_at,
      isValid: preview.is_valid,
    })
  } catch (error) {
    return handleApiError(error)
  }
}
