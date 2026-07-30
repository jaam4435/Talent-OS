import { NextResponse } from 'next/server'
import { validateSystemAuth } from '@/lib/integrations/system-auth'
import { processOverdueMilestones } from '@/lib/integrations/ai/status-assessment'

export async function GET(request: Request) {
  const auth = validateSystemAuth(request.headers.get('authorization'), 'cron')
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  const result = await processOverdueMilestones()
  return NextResponse.json(result)
}
