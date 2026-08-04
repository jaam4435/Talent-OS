import Link from 'next/link'
import type {
  WhatsAppAuditEntry,
  WhatsAppConversationSummary,
  WhatsAppMemoryEntry,
} from '@/modules/whatsapp-platform/types'
import { Badge } from '@/modules/core/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/modules/core/components/ui/card'
import { formatDateTime, formatRelative } from '@/modules/core/utils/format'

interface WhatsAppConversationDetailProps {
  conversation: WhatsAppConversationSummary
  memory: WhatsAppMemoryEntry[]
  audit: WhatsAppAuditEntry[]
}

export function WhatsAppConversationDetail({
  conversation,
  memory,
  audit,
}: WhatsAppConversationDetailProps) {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <CardTitle>WhatsApp conversation</CardTitle>
              <p className="text-sm text-muted-foreground">
                {conversation.phone} · Last active {formatRelative(conversation.lastMessageAt)}
              </p>
            </div>
            {conversation.pendingApprovalId ? (
              <Badge variant="secondary">Pending approval</Badge>
            ) : null}
          </div>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div>
            <p className="text-sm font-medium">Freelancer</p>
            <Link href={`/talent/${conversation.freelancerId}`} className="text-sm hover:underline">
              View talent profile
            </Link>
          </div>
          <div>
            <p className="text-sm font-medium">Active intent</p>
            <p className="text-sm text-muted-foreground">{conversation.activeIntent ?? '—'}</p>
          </div>
          {conversation.activeEntityType && conversation.activeEntityId ? (
            <div className="md:col-span-2">
              <p className="text-sm font-medium">Active entity</p>
              <p className="text-sm text-muted-foreground">
                {conversation.activeEntityType} · {conversation.activeEntityId}
              </p>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Message thread</h2>
        {memory.length ? (
          <ul className="space-y-3">
            {memory.map((entry) => (
              <li key={entry.id} className="rounded-md border p-4">
                <div className="flex items-center justify-between gap-2">
                  <Badge variant="outline" className="capitalize">
                    {entry.role}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {formatDateTime(entry.createdAt)}
                  </span>
                </div>
                <p className="mt-2 text-sm">{entry.content}</p>
                {entry.intent ? (
                  <p className="mt-2 text-xs text-muted-foreground">Intent: {entry.intent}</p>
                ) : null}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">No memory entries recorded for this conversation.</p>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Audit log</h2>
        {audit.length ? (
          <ul className="space-y-3">
            {audit.map((entry) => (
              <li key={entry.id} className="rounded-md border p-4 text-sm">
                <p className="font-medium">{entry.action}</p>
                <p className="text-muted-foreground">
                  {entry.entityType} · {formatDateTime(entry.createdAt)}
                </p>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">No audit entries for this conversation.</p>
        )}
      </section>
    </div>
  )
}
