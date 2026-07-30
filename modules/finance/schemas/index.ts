import { z } from 'zod'

export const approvePaymentSchema = z.object({
  paymentId: z.string().uuid(),
  notes: z.string().max(2000).optional(),
})

export const markPaymentPaidSchema = z.object({
  paymentId: z.string().uuid(),
  paymentReference: z.string().min(1, 'Payment reference is required').max(200),
})

export type ApprovePaymentData = z.infer<typeof approvePaymentSchema>
export type MarkPaymentPaidData = z.infer<typeof markPaymentPaidSchema>
