export const FINANCE_EVENT_TYPES = {
  APPROVED: 'finance.payment.approved',
  PAID: 'finance.payment.paid',
} as const

export type FinancePaymentStatus =
  | 'pending'
  | 'approved'
  | 'processing'
  | 'paid'
  | 'disputed'
  | 'canceled'

export interface FinancePayment {
  id: string
  milestoneId: string
  projectId: string
  freelancerId: string
  amount: number
  currency: string
  status: FinancePaymentStatus
  paymentReference: string | null
  approvedBy: string | null
  approvedAt: string | null
  paidAt: string | null
  notes: string | null
  createdAt: string
  updatedAt: string
}

export interface FinanceAuditEntry {
  id: string
  paymentId: string
  action: string
  actorId: string | null
  beforeState: Record<string, unknown> | null
  afterState: Record<string, unknown> | null
  metadata: Record<string, unknown>
  createdAt: string
}

export interface FinanceTimelineEvent {
  id: string
  label: string
  status: FinancePaymentStatus | 'created'
  occurredAt: string
  actorId?: string | null
  detail?: string | null
}

export interface FinancePaymentDetail extends FinancePayment {
  auditLogs: FinanceAuditEntry[]
  timeline: FinanceTimelineEvent[]
}

export interface FinancePaymentListItem extends FinancePayment {
  freelancerName?: string | null
}
