import { describe, expect, it, vi } from 'vitest'
import { WhatsAppPlatformModuleService } from '@/lib/services/whatsapp-platform-module.service'
import { WHATSAPP_PLATFORM_INTENTS } from '@/modules/whatsapp-platform/types'
import { detectIntent, entityIdFromIntent } from '@/lib/whatsapp/intents'
import type { ConversationContext } from '@/lib/whatsapp/types'

describe('WhatsAppPlatformModuleService', () => {
  it('lists all platform intents', () => {
    expect(WHATSAPP_PLATFORM_INTENTS).toContain('assignment.accept')
    expect(WHATSAPP_PLATFORM_INTENTS).toContain('deliverable.submit')
    expect(WHATSAPP_PLATFORM_INTENTS).toContain('approval.approve')
  })

  it('accepts assignment via existing AssignmentModuleService', async () => {
    const assignmentModule = {
      updateAllocation: vi.fn(async () => ({
        ok: true,
        allocation: { id: 'alloc-1', status: 'confirmed' },
        conflicts: [],
      })),
    }
    const repos = {
      whatsappAudit: { record: vi.fn(async () => undefined) },
    }
    const service = new WhatsAppPlatformModuleService(
      repos as never,
      {} as never,
      {} as never,
      {} as never,
      assignmentModule as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never
    )

    const result = await service.acceptAssignment('tenant-1', 'user-1', 'alloc-1')
    expect(result.ok).toBe(true)
    expect(assignmentModule.updateAllocation).toHaveBeenCalledWith(
      'tenant-1',
      'user-1',
      'alloc-1',
      { status: 'confirmed' }
    )
    expect(repos.whatsappAudit.record).toHaveBeenCalled()
  })

  it('executes create opportunity command', async () => {
    const crm = {
      createOpportunity: vi.fn(async () => ({ ok: true, opportunityId: 'opp-1' })),
    }
    const repos = {
      whatsappAudit: { record: vi.fn(async () => undefined) },
    }
    const service = new WhatsAppPlatformModuleService(
      repos as never,
      {} as never,
      crm as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never
    )

    const result = await service.executeCommand('tenant-1', 'user-1', 'USD', {
      intent: 'opportunity.create',
      payload: { title: 'New brief', required_skills: ['design'] },
    })

    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.data.opportunity_id).toBe('opp-1')
    }
  })

  it('records inbound memory on processInboundMessage', async () => {
    const whatsapp = {
      processInboundMessage: vi.fn(async () => ({
        waMessageId: 'msg-1',
        intent: 'help',
        handler: { handled: true, intent: 'help', data: { menu: [] } },
      })),
    }
    const repos = {
      whatsappMemory: { append: vi.fn(async () => ({ id: 'mem-1' })) },
      whatsappAudit: { record: vi.fn(async () => undefined) },
      whatsappConversation: {
        getByFreelancer: vi.fn(async () => ({
          id: 'conv-1',
          tenantId: 'tenant-1',
          freelancerId: 'fl-1',
          phone: '+1234',
          activeIntent: null,
          activeEntityType: null,
          activeEntityId: null,
          memorySummary: null,
          pendingApprovalId: null,
          lastMessageAt: new Date().toISOString(),
        })),
      },
    }
    const service = new WhatsAppPlatformModuleService(
      repos as never,
      whatsapp as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never
    )

    await service.processInboundMessage({
      message: {
        waMessageId: 'msg-1',
        phone: '+1234',
        phoneNumberId: 'pn-1',
        body: 'HELP',
        messageType: 'text',
      },
      tenantId: 'tenant-1',
      freelancer: { id: 'fl-1', full_name: 'Alex' },
      services: {} as never,
    })

    expect(repos.whatsappMemory.append).toHaveBeenCalledWith(
      expect.objectContaining({
        role: 'user',
        content: 'HELP',
        intent: 'help',
        conversation_id: 'conv-1',
      })
    )
  })
})

describe('WhatsApp intent detection', () => {
  const baseContext: ConversationContext = {
    id: 'conv-1',
    tenantId: 't1',
    freelancerId: 'f1',
    phone: '+1',
    activeIntent: null,
    activeEntityType: 'allocation',
    activeEntityId: 'alloc-1',
    context: {},
    lastMessageAt: new Date().toISOString(),
  }

  it('detects assignment accept keyword', () => {
    const intent = detectIntent('ACCEPT ASSIGNMENT', null)
    expect(intent.intent).toBe('assignment.accept')
  })

  it('boosts YES to assignment accept from context', () => {
    const intent = detectIntent('YES', baseContext)
    expect(intent.intent).toBe('assignment.accept')
    expect(entityIdFromIntent(intent, baseContext)).toBe('alloc-1')
  })

  it('routes long free text to agent query', () => {
    const intent = detectIntent('What is the status of my current project?', null)
    expect(intent.intent).toBe('agent.query')
  })
})
