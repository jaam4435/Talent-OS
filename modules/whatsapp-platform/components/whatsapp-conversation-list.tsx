import Link from 'next/link'
import type { WhatsAppConversationSummary, WhatsAppObservabilitySummary } from '@/modules/whatsapp-platform/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/modules/core/components/ui/card'
import { Badge } from '@/modules/core/components/ui/badge'
import { DataTable, type DataTableColumn } from '@/modules/core/components/shared/data-table'
import { formatRelative } from '@/modules/core/utils/format'

interface WhatsAppConversationListProps {
  summary: WhatsAppObservabilitySummary
  conversations: WhatsAppConversationSummary[]
}

export function WhatsAppConversationList({ summary, conversations }: WhatsAppConversationListProps) {
  const kpis = [
    { label: 'Active conversations', value: summary.activeConversations },
    { label: 'Messages today', value: summary.messagesToday },
    { label: 'Intents handled today', value: summary.intentsHandledToday },
    { label: 'Pending approvals', value: summary.pendingApprovals },
  ]

  const columns: DataTableColumn<WhatsAppConversationSummary>[] = [
    {
      id: 'freelancer',
      header: 'Conversation',
      cell: (row) => (
        <>
          <Link href={`/whatsapp/${row.freelancerId}`} className="font-medium hover:underline">
            Freelancer {row.freelancerId.slice(0, 8)}…
          </Link>
          <p className="text-sm text-muted-foreground">{row.phone}</p>
        </>
      ),
    },
    {
      id: 'intent',
      header: 'Active intent',
      cell: (row) => row.activeIntent ?? '—',
    },
    {
      id: 'preview',
      header: 'Last message',
      cell: (row) => (
        <span className="text-sm text-muted-foreground">
          {row.memorySummary ?? 'No preview available'}
        </span>
      ),
    },
    {
      id: 'updated',
      header: 'Updated',
      cell: (row) => formatRelative(row.lastMessageAt),
    },
    {
      id: 'approval',
      header: 'Approval',
      cell: (row) =>
        row.pendingApprovalId ? (
          <Badge variant="secondary">Pending</Badge>
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    },
  ]

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {kpis.map((kpi) => (
          <Card key={kpi.label}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{kpi.label}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold">{kpi.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {conversations.length ? (
        <DataTable columns={columns} data={conversations} getRowKey={(row) => row.id} />
      ) : (
        <p className="text-sm text-muted-foreground">No WhatsApp conversations yet.</p>
      )}
    </div>
  )
}
