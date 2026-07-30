import type { FinanceToolInputs } from '@/lib/mcp/servers/finance.server'
import { mcpErr, mcpOk, type McpToolHandlerFn } from '@/lib/mcp/adapters/helpers'

function asInput<T>(input: unknown): T {
  return input as T
}

export const FINANCE_ADAPTER_HANDLERS: Record<string, McpToolHandlerFn> = {
  finance_list_payments: async (input, ctx) => {
    const data = asInput<FinanceToolInputs['finance_list_payments']>(input)
    const result = await ctx.services.finance.listPayments(ctx.execution.tenantId, {
      status: data.status,
      freelancerId: data.freelancer_id,
      page: data.page,
      limit: data.limit,
    })
    return mcpOk(result)
  },

  finance_get_payment: async (input, ctx) => {
    const { payment_id } = asInput<FinanceToolInputs['finance_get_payment']>(input)
    const payment = await ctx.services.finance.getPaymentById(payment_id, ctx.execution.tenantId)
    if (!payment) return mcpErr('Payment not found', 'NOT_FOUND')
    return mcpOk(payment)
  },

  finance_approve_payment: async (input, ctx) => {
    const data = asInput<FinanceToolInputs['finance_approve_payment']>(input)
    const result = await ctx.services.finance.approvePayment(ctx.execution.tenantId, ctx.execution.userId, {
      paymentId: data.payment_id,
      notes: data.notes,
    })
    if (!result.ok) return mcpErr(result.error)
    return mcpOk({ id: data.payment_id, success: true })
  },

  finance_mark_paid: async (input, ctx) => {
    const data = asInput<FinanceToolInputs['finance_mark_paid']>(input)
    const result = await ctx.services.finance.markPaymentPaid(ctx.execution.tenantId, ctx.execution.userId, {
      paymentId: data.payment_id,
      paymentReference: data.payment_reference,
    })
    if (!result.ok) return mcpErr(result.error)
    return mcpOk({ id: data.payment_id, success: true })
  },

  finance_dispute_payment: async (input, ctx) => {
    const data = asInput<FinanceToolInputs['finance_dispute_payment']>(input)
    const result = await ctx.services.finance.disputePayment(ctx.execution.tenantId, ctx.execution.userId, {
      paymentId: data.payment_id,
      disputeReason: data.dispute_reason,
    })
    if (!result.ok) return mcpErr(result.error)
    return mcpOk({ id: data.payment_id, success: true })
  },

  finance_export_payments: async (input, ctx) => {
    const data = asInput<FinanceToolInputs['finance_export_payments']>(input)
    const result = await ctx.services.finance.exportPayments(ctx.execution.tenantId, {
      fromDate: data.from_date,
      toDate: data.to_date,
      status: data.status,
    })
    return mcpOk(result)
  },

  finance_payment_aging: async (_input, ctx) => {
    const aging = await ctx.services.finance.getPaymentAging(ctx.execution.tenantId)
    return mcpOk(aging)
  },
}
