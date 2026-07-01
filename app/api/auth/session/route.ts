import { getSession } from '@/lib/auth/session'
import { success, handleApiError } from '@/lib/api/response'

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
