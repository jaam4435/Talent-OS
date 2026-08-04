'use client'

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { AnalyticsCharts } from '@/modules/analytics/types'
import { formatSummaryLabel, inferChartType, toRechartsSeries } from '@/modules/analytics/charts'
import { ChartCard } from '@/modules/analytics/components/chart-card'

const COLORS = ['#2563eb', '#16a34a', '#ea580c', '#9333ea', '#0891b2', '#ca8a04']

interface AnalyticsChartsGridProps {
  charts: AnalyticsCharts
}

export function AnalyticsChartsGrid({ charts }: AnalyticsChartsGridProps) {
  const entries = Object.entries(charts)

  if (!entries.length) {
    return <p className="text-sm text-muted-foreground">No chart data available for this period.</p>
  }

  return (
    <div className="grid gap-4 xl:grid-cols-2">
      {entries.map(([seriesKey, points]) => (
        <ChartCard key={seriesKey} title={formatSummaryLabel(seriesKey)}>
          <AnalyticsChart seriesKey={seriesKey} points={points} />
        </ChartCard>
      ))}
    </div>
  )
}

function AnalyticsChart({
  seriesKey,
  points,
}: {
  seriesKey: string
  points: AnalyticsCharts[string]
}) {
  const data = toRechartsSeries(points)
  const chartType = inferChartType(seriesKey)

  if (!data.length) {
    return <p className="text-sm text-muted-foreground">No data points.</p>
  }

  return (
    <ResponsiveContainer width="100%" height="100%">
      {chartType === 'line' ? (
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="name" tick={{ fontSize: 12 }} />
          <YAxis tick={{ fontSize: 12 }} />
          <Tooltip />
          <Legend />
          <Line type="monotone" dataKey="value" stroke="#2563eb" strokeWidth={2} />
        </LineChart>
      ) : chartType === 'pie' ? (
        <PieChart>
          <Tooltip />
          <Legend />
          <Pie data={data} dataKey="value" nameKey="name" outerRadius={90} label>
            {data.map((_, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
        </PieChart>
      ) : (
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="name" tick={{ fontSize: 12 }} />
          <YAxis tick={{ fontSize: 12 }} />
          <Tooltip />
          <Legend />
          <Bar dataKey="value" fill="#2563eb" radius={[4, 4, 0, 0]} />
        </BarChart>
      )}
    </ResponsiveContainer>
  )
}
