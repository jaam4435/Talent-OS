import type { UserRole } from '@/types/enums'
import { cn } from '@/lib/utils'
import { formatRole } from '@/lib/auth/roles'

const variants: Record<UserRole, string> = {
  admin: 'bg-violet-100 text-violet-800 dark:bg-violet-950 dark:text-violet-200',
  talent_manager: 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-200',
  freelancer: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200',
  client: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200',
}

export function RoleBadge({ role, className }: { role: UserRole; className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
        variants[role],
        className
      )}
    >
      {formatRole(role)}
    </span>
  )
}
