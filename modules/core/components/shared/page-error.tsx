'use client'

import { AlertCircle, RotateCcw } from 'lucide-react'
import { Button } from '@/modules/core/components/ui/button'
import { cn } from '@/modules/core/utils'

interface PageErrorProps {
  title?: string
  message?: string
  onRetry?: () => void
  className?: string
}

export function PageError({
  title = 'Something went wrong',
  message = 'We could not load this page. Please try again.',
  onRetry,
  className,
}: PageErrorProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center rounded-lg border border-destructive/30 bg-destructive/5 p-12 text-center',
        className
      )}
      role="alert"
    >
      <AlertCircle className="mb-4 h-10 w-10 text-destructive" aria-hidden />
      <h2 className="text-lg font-semibold">{title}</h2>
      <p className="mt-2 max-w-md text-sm text-muted-foreground">{message}</p>
      {onRetry ? (
        <Button variant="outline" className="mt-6" onClick={onRetry}>
          <RotateCcw className="mr-2 h-4 w-4" />
          Try again
        </Button>
      ) : null}
    </div>
  )
}
