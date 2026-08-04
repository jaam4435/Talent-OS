import { Badge } from '@/modules/core/components/ui/badge'
import type { ProjectHealthStatus } from '@/modules/project/types'
import { cn } from '@/modules/core/utils'

const HEALTH_LABELS: Record<ProjectHealthStatus, string> = {
  on_track: 'On track',
  at_risk: 'At risk',
  blocked: 'Blocked',
  completed: 'Completed',
}

const HEALTH_VARIANTS: Record<ProjectHealthStatus, string> = {
  on_track: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200',
  at_risk: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200',
  blocked: 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-200',
  completed: 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-200',
}

export function ProjectHealthBadge({
  healthStatus,
  healthScore,
}: {
  healthStatus: ProjectHealthStatus
  healthScore: number
}) {
  return (
    <Badge variant="outline" className={cn('capitalize', HEALTH_VARIANTS[healthStatus])}>
      {HEALTH_LABELS[healthStatus]} · {healthScore}
    </Badge>
  )
}
