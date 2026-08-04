'use client'

import { Pagination } from '@/modules/core/components/shared/pagination'

interface TalentPaginationProps {
  page: number
  hasMore: boolean
}

export function TalentPagination({ page, hasMore }: TalentPaginationProps) {
  return <Pagination page={page} hasMore={hasMore} pathname="/talent" />
}
