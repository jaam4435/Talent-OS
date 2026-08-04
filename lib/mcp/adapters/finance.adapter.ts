import { createServices } from '@/lib/services/factory'
import type { FinanceToolInputs, FinanceToolName } from '@/lib/mcp/servers/finance.server'
import type { McpExecutionContext, McpToolCallResult } from '@/lib/mcp/types'

export async function invokeFinanceTool<TName extends FinanceToolName>(
  toolName: TName,
  input: FinanceToolInputs[TName],
  context: McpExecutionContext
): Promise<McpToolCallResult> {
  const services = await createServices()

  switch (toolName) {
    case 'finance_list_payments': {
      const params = input as FinanceToolInputs['finance_list_payments']
      const result = await services.financeModule.listPayments(
        context.tenantId,
        context.role,
        context.userId,
        {
          page: params.page,
          limit: params.limit,
          status: params.status as never,
          freelancerId: params.freelancer_id,
          projectId: params.project_id,
        }
      )
      return { content: result as never }
    }

    case 'finance_get_payment': {
      const params = input as FinanceToolInputs['finance_get_payment']
      const payment = await services.financeModule.getPayment(
        context.tenantId,
        context.role,
        context.userId,
        params.payment_id
      )
      if (!payment) {
        return { content: { error: 'Payment not found' } as never, isError: true }
      }
      return { content: payment as never }
    }

    case 'finance_approve_payment': {
      const params = input as FinanceToolInputs['finance_approve_payment']
      const result = await services.financeModule.approvePayment(
        context.tenantId,
        params.payment_id,
        context.userId,
        params.notes
      )
      if (!result.ok) {
        return { content: { error: result.error } as never, isError: true }
      }
      return { content: result.payment as never }
    }

    case 'finance_mark_paid': {
      const params = input as FinanceToolInputs['finance_mark_paid']
      const result = await services.financeModule.markPaymentPaid(
        context.tenantId,
        params.payment_id,
        context.userId,
        params.payment_reference
      )
      if (!result.ok) {
        return { content: { error: result.error } as never, isError: true }
      }
      return { content: result.payment as never }
    }

    default:
      return {
        content: {
          error: 'Tool adapter not implemented',
          tool: toolName,
        } as never,
        isError: true,
      }
  }
}
