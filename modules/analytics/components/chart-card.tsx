'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/modules/core/components/ui/card'
import { cn } from '@/modules/core/utils'

interface ChartCardProps {
  title: string
  children: React.ReactNode
  className?: string
}

export function ChartCard({ title, children, className }: ChartCardProps) {
  return (
    <Card className={cn(className)}>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent className="h-[280px]">{children}</CardContent>
    </Card>
  )
}

export function ChartCardSkeleton({ title }: { title?: string }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{title ?? 'Loading chart'}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[280px] animate-pulse rounded-md bg-muted" />
      </CardContent>
    </Card>
  )
}
