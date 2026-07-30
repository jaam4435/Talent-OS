import type { PaymentStatus } from '@/modules/core/types/enums'

export interface ApprovePaymentInput {
  paymentId: string
  notes?: string
}

export interface MarkPaymentPaidInput {
  paymentId: string
  paymentReference: string
}

export interface PaymentListItem {
  id: string
  amount: number
  currency: string
  status: PaymentStatus | string
  created_at: string
  freelancer_id: string
}
