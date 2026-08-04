import { z } from 'zod'

export const milestoneInputSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  amount: z.number().min(0, 'Amount must be zero or greater'),
  dueDate: z.string().optional(),
})

export const createProjectSchema = z.object({
  freelancerId: z.string().uuid(),
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  clientName: z.string().optional(),
  companyId: z.string().uuid().optional(),
  budget: z.number().min(0).optional(),
  currency: z.string().length(3).optional(),
  opportunityId: z.string().uuid().optional(),
  shortlistId: z.string().uuid().optional(),
  status: z.enum(['draft', 'active']).optional(),
  milestones: z.array(milestoneInputSchema).min(1, 'At least one milestone is required'),
})

export function validateMilestoneBudget(
  milestones: Array<{ amount: number }>,
  budget?: number
): string | null {
  const total = milestones.reduce((sum, m) => sum + m.amount, 0)
  if (budget != null && total > budget) {
    return `Milestone total (${total}) exceeds project budget (${budget})`
  }
  return null
}
