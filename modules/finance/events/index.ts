/** Canonical finance domain event type strings. */
export const FinanceEvents = {
  PAYMENT_APPROVED: 'payment.approved',
  PAYMENT_PAID: 'payment.paid',
  PAYMENT_DISPUTED: 'payment.disputed',
} as const

export type FinanceEventType = (typeof FinanceEvents)[keyof typeof FinanceEvents]
