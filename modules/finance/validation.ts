import { z } from 'zod'

export const listPaymentsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  status: z
    .enum(['pending', 'approved', 'processing', 'paid', 'disputed', 'canceled'])
    .optional(),
  freelancer_id: z.string().uuid().optional(),
  project_id: z.string().uuid().optional(),
})

export const approvePaymentSchema = z.object({
  notes: z.string().trim().max(2000).optional(),
})

export const markPaidSchema = z.object({
  payment_reference: z.string().trim().min(1).max(256),
})
