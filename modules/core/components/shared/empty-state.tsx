import type { LucideIcon } from 'lucide-react'
import { cn } from '@/modules/core/utils'

interface EmptyStateProps {
  title: string
  description: string
  action?: React.ReactNode
  icon?: LucideIcon
  className?: string
}

export function EmptyState({ title, description, action, icon: Icon, className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center rounded-lg border border-dashed p-12 text-center',
        className
      )}
    >
      {Icon ? <Icon className="mb-4 h-10 w-10 text-muted-foreground" aria-hidden /> : null}
      <h3 className="text-lg font-semibold">{title}</h3>
      <p className="mt-2 max-w-sm text-sm text-muted-foreground">{description}</p>
      {action ? <div className="mt-6">{action}</div> : null}
    </div>
  )
}
