import { requireTenant } from '@/modules/core/services/session'
import { createClient } from '@/modules/core/utils/supabase/server'
import { success, handleApiError } from '@/modules/core/api/response'

export async function GET() {
  try {
    const { tenant } = await requireTenant()
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('v_dashboard_summary')
      .select('*')
      .eq('tenant_id', tenant.id)
      .maybeSingle()

    if (error) throw error
    return success(data)
  } catch (err) {
    return handleApiError(err)
  }
}
