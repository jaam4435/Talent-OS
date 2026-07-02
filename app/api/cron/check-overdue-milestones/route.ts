import { NextResponse } from 'next/server'
import { processOverdueMilestones } from '@/lib/integrations/ai/status-assessment'

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const result = await processOverdueMilestones()
  return NextResponse.json(result)
}
