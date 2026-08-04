import { describe, expect, it, vi } from 'vitest'
import { OrganizationService } from '@/lib/services/organization.service'
import type { OrganizationSummary } from '@/modules/organization/types'
import { DEFAULT_BUSINESS_HOURS } from '@/modules/organization/validation'

const baseOrganization: OrganizationSummary = {
  id: 'tenant-1',
  name: 'Acme Agency',
  slug: 'acme-agency',
  subscriptionStatus: 'active',
  subscriptionReference: null,
  trialEndsAt: null,
  branding: { logoUrl: null, primaryColor: null, accentColor: null },
  settings: {
    timezone: 'UTC',
    currency: 'USD',
    businessHours: DEFAULT_BUSINESS_HOURS,
    settings: {},
  },
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
}

function createOrganizationService(overrides: Partial<Record<string, unknown>> = {}) {
  const repos = {
    organization: {
      findById: vi.fn(async () => baseOrganization),
      update: vi.fn(async (_tenantId: string, patch: Record<string, unknown>) => ({
        ...baseOrganization,
        name: patch.name ?? baseOrganization.name,
        settings: {
          ...baseOrganization.settings,
          timezone: patch.timezone ?? baseOrganization.settings.timezone,
          currency: patch.currency ?? baseOrganization.settings.currency,
        },
        subscriptionReference:
          patch.subscription_reference !== undefined
            ? (patch.subscription_reference as string | null)
            : baseOrganization.subscriptionReference,
      })),
      updateBranding: vi.fn(async () => ({
        logoUrl: '#logo',
        primaryColor: '#000000',
        accentColor: '#ffffff',
      })),
      updateBusinessHours: vi.fn(async () => baseOrganization.settings),
      getSubscriptionReference: vi.fn(async () => ({
        status: 'active',
        reference: 'sub_123',
        trialEndsAt: null,
        tier: 'pro',
      })),
    },
    organizationMember: {
      findById: vi.fn(async () => ({
        id: 'member-1',
        userId: 'user-2',
        email: 'member@example.com',
        fullName: 'Member',
        role: 'talent_manager',
        status: 'active',
        joinedAt: '2026-01-01T00:00:00.000Z',
        invitedAt: null,
      })),
      updateRole: vi.fn(async () => ({
        id: 'member-1',
        userId: 'user-2',
        email: 'member@example.com',
        fullName: 'Member',
        role: 'admin',
        status: 'active',
        joinedAt: '2026-01-01T00:00:00.000Z',
        invitedAt: null,
      })),
      updateStatus: vi.fn(),
      softDelete: vi.fn(),
      countAdmins: vi.fn(async () => 1),
      list: vi.fn(),
    },
    organizationDepartment: {
      findById: vi.fn(async () => null),
      create: vi.fn(),
      update: vi.fn(),
      softDelete: vi.fn(),
      list: vi.fn(),
    },
    organizationTeam: {
      findById: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      softDelete: vi.fn(),
      list: vi.fn(),
      addMember: vi.fn(),
      removeMember: vi.fn(),
      listMemberIds: vi.fn(),
    },
    organizationInvite: {
      create: vi.fn(async () => ({ id: 'invite-1' })),
      list: vi.fn(),
      findById: vi.fn(),
      revoke: vi.fn(),
    },
    organizationAudit: {
      record: vi.fn(async () => undefined),
      list: vi.fn(),
    },
    domainEvent: {
      emit: vi.fn(async () => 'event-1'),
    },
    ...overrides,
  }

  return { service: new OrganizationService(repos as never), repos }
}

describe('OrganizationService.updateOrganization', () => {
  it('updates organization and emits audit/event', async () => {
    const { service, repos } = createOrganizationService()
    const result = await service.updateOrganization('tenant-1', 'user-1', { name: 'New Name' })

    expect(result.ok).toBe(true)
    if (result.ok) expect(result.organization.name).toBe('New Name')
    expect(repos.organizationAudit.record).toHaveBeenCalled()
    expect(repos.domainEvent.emit).toHaveBeenCalled()
  })

  it('returns error when organization missing', async () => {
    const { service } = createOrganizationService({
      organization: { findById: vi.fn(async () => null) },
    })
    const result = await service.updateOrganization('tenant-1', 'user-1', { name: 'X' })
    expect(result).toEqual({ ok: false, error: 'Organization not found' })
  })
})

describe('OrganizationService.updateMember', () => {
  it('blocks self-modification', async () => {
    const { service } = createOrganizationService()
    const result = await service.updateMember(
      'tenant-1',
      'user-1',
      'member-1',
      { role: 'admin' },
      'member-1'
    )
    expect(result).toEqual({ ok: false, error: 'You cannot modify your own membership.' })
  })

  it('blocks demoting last admin', async () => {
    const { service } = createOrganizationService({
      organizationMember: {
        findById: vi.fn(async () => ({
          id: 'member-1',
          userId: 'user-2',
          email: 'admin@example.com',
          fullName: 'Admin',
          role: 'admin',
          status: 'active',
          joinedAt: null,
          invitedAt: null,
        })),
        countAdmins: vi.fn(async () => 0),
        updateRole: vi.fn(),
        updateStatus: vi.fn(),
      },
    })

    const result = await service.updateMember('tenant-1', 'user-1', 'member-1', { role: 'talent_manager' })
    expect(result).toEqual({ ok: false, error: 'Cannot remove the last admin.' })
  })
})

describe('OrganizationService.createInvite', () => {
  it('creates invite with audit trail', async () => {
    const { service, repos } = createOrganizationService()
    const result = await service.createInvite('tenant-1', 'user-1', {
      email: 'new@example.com',
      role: 'talent_manager',
    })

    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.invite.email).toBe('new@example.com')
      expect(result.inviteUrl).toContain('/invite/')
    }
    expect(repos.organizationInvite.create).toHaveBeenCalled()
    expect(repos.organizationAudit.record).toHaveBeenCalled()
  })

  it('requires company for client invites', async () => {
    const { service } = createOrganizationService()
    const result = await service.createInvite('tenant-1', 'user-1', {
      email: 'client@example.com',
      role: 'client',
    })
    expect(result).toEqual({ ok: false, error: 'Select a company for client invites.' })
  })
})

describe('OrganizationService permissions', () => {
  it('returns role permission map', () => {
    const { service } = createOrganizationService()
    const permissions = service.getAllRolePermissions()
    expect(permissions.admin).toContain('tenant:update')
    expect(permissions.freelancer).toContain('tenant:read')
  })
})
