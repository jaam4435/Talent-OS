import type { AssignmentAllocation } from '@/modules/assignment/types'

export interface WeekWindow {
  label: string
  start: Date
  end: Date
}

export function getUpcomingWeeks(count = 4, from = new Date()): WeekWindow[] {
  const weeks: WeekWindow[] = []
  const cursor = startOfWeek(from)

  for (let index = 0; index < count; index += 1) {
    const start = new Date(cursor)
    start.setDate(cursor.getDate() + index * 7)
    const end = new Date(start)
    end.setDate(start.getDate() + 6)
    end.setHours(23, 59, 59, 999)

    weeks.push({
      label: `W${index + 1} (${start.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })})`,
      start,
      end,
    })
  }

  return weeks
}

export function allocationPctForWeek(allocation: AssignmentAllocation, week: WeekWindow): number {
  const startsAt = new Date(allocation.startsAt)
  const endsAt = new Date(allocation.endsAt)
  if (endsAt < week.start || startsAt > week.end) return 0
  return allocation.allocationPct
}

function startOfWeek(date: Date) {
  const result = new Date(date)
  const day = result.getDay()
  const diff = day === 0 ? -6 : 1 - day
  result.setDate(result.getDate() + diff)
  result.setHours(0, 0, 0, 0)
  return result
}

export function toIsoDateTime(value: string) {
  return new Date(value).toISOString()
}
