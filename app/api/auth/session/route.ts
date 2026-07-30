import { getSession } from '@/modules/core/services/session'
import { success, handleApiError } from '@/modules/core/api/response'

export async function GET() {
  try {
    const session = await getSession()
    if (!session) {
      return success(null)
    }
    return success(session)
  } catch (err) {
    return handleApiError(err)
  }
}
