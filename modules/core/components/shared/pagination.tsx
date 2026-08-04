'use client'

import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/modules/core/components/ui/button'
import { cn } from '@/modules/core/utils'

interface PaginationProps {
  page: number
  hasMore: boolean
  pathname: string
  className?: string
}

export function Pagination({ page, hasMore, pathname, className }: PaginationProps) {
  const searchParams = useSearchParams()

  function hrefFor(nextPage: number) {
    const params = new URLSearchParams(searchParams.toString())
    if (nextPage <= 1) params.delete('page')
    else params.set('page', String(nextPage))
    const query = params.toString()
    return query ? `${pathname}?${query}` : pathname
  }

  const showPrev = page > 1
  const showNext = hasMore

  if (!showPrev && !showNext) return null

  return (
    <div className={cn('mt-6 flex items-center justify-between', className)}>
      <p className="text-sm text-muted-foreground">Page {page}</p>
      <div className="flex gap-2">
        {showPrev ? (
          <Button variant="outline" size="sm" asChild>
            <Link href={hrefFor(page - 1)}>
              <ChevronLeft className="mr-1 h-4 w-4" />
              Previous
            </Link>
          </Button>
        ) : null}
        {showNext ? (
          <Button variant="outline" size="sm" asChild>
            <Link href={hrefFor(page + 1)}>
              Next
              <ChevronRight className="ml-1 h-4 w-4" />
            </Link>
          </Button>
        ) : null}
      </div>
    </div>
  )
}
