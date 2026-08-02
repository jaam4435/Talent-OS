import type { AnalyticsDashboard } from '@/modules/analytics/types'

export const ANALYTICS_DASHBOARD_LINKS = [
  {
    id: 'summary' as const,
    href: '/analytics/summary',
    label: 'Summary',
    description: 'Cross-domain KPI overview across all analytics modules.',
  },
  {
    id: 'organizations' as const,
    href: '/analytics/organizations',
    label: 'Organizations',
    description: 'Members, teams, departments, and invitation metrics.',
  },
  {
    id: 'projects' as const,
    href: '/analytics/projects',
    label: 'Projects',
    description: 'Project status, health scores, and delivery trends.',
  },
  {
    id: 'talent' as const,
    href: '/analytics/talent',
    label: 'Talent',
    description: 'Roster discipline mix, availability, and ratings.',
  },
  {
    id: 'utilization' as const,
    href: '/analytics/utilization',
    label: 'Utilization',
    description: 'Allocation hours, capacity, and scheduling conflicts.',
  },
  {
    id: 'revenue' as const,
    href: '/analytics/revenue',
    label: 'Revenue',
    description: 'Paid and pending payments with aging breakdowns.',
  },
  {
    id: 'delivery' as const,
    href: '/analytics/delivery',
    label: 'Delivery',
    description: 'Milestone progress and deliverable submission rates.',
  },
  {
    id: 'ai_usage' as const,
    href: '/analytics/ai-usage',
    label: 'AI usage',
    description: 'Token consumption and cost by provider and model.',
  },
  {
    id: 'workflows' as const,
    href: '/analytics/workflows',
    label: 'Workflows',
    description: 'Run volume, failure rates, and execution duration.',
  },
] as const

export type AnalyticsDashboardLink = (typeof ANALYTICS_DASHBOARD_LINKS)[number]

export function getDashboardLink(id: AnalyticsDashboard) {
  return ANALYTICS_DASHBOARD_LINKS.find((link) => link.id === id)
}
