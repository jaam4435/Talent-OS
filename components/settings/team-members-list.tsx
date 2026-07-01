'use client'

import { useEffect, useState, useTransition } from 'react'
import { revokeTeamInvite } from '@/app/actions/auth'
import { RoleBadge } from '@/components/auth/role-badge'
import { Button } from '@/components/ui/button'
import type { UserRole } from '@/types/enums'

interface MemberRow {
  id: string
  email: string
  fullName: string | null
  role: UserRole
  roleLabel: string
  status: string
  joinedAt: string | null
}

interface InviteRow {
  id: string
  email: string
  role: UserRole
  roleLabel: string
  expiresAt: string
  isExpired: boolean
}

export function TeamMembersList() {
  const [members, setMembers] = useState<MemberRow[]>([])
  const [invites, setInvites] = useState<InviteRow[]>([])
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  async function load() {
    const response = await fetch('/api/team/members')
    if (!response.ok) {
      setError('Failed to load team.')
      return
    }

    const json = (await response.json()) as {
      data: { members: MemberRow[]; pendingInvites: InviteRow[] }
    }

    setMembers(json.data.members)
    setInvites(json.data.pendingInvites)
  }

  useEffect(() => {
    void load()
  }, [])

  function handleRevoke(inviteId: string) {
    startTransition(async () => {
      const result = await revokeTeamInvite(inviteId)
      if (!result.success) {
        setError(result.error)
        return
      }
      await load()
    })
  }

  if (error) {
    return <p className="text-sm text-destructive">{error}</p>
  }

  return (
    <div className="space-y-6">
      <div className="rounded-lg border">
        <div className="border-b p-4 font-medium">Active members</div>
        <ul className="divide-y">
          {members.map((member) => (
            <li key={member.id} className="flex items-center justify-between gap-4 p-4">
              <div>
                <p className="font-medium">{member.fullName ?? member.email}</p>
                <p className="text-sm text-muted-foreground">{member.email}</p>
              </div>
              <RoleBadge role={member.role} />
            </li>
          ))}
        </ul>
      </div>

      <div className="rounded-lg border">
        <div className="border-b p-4 font-medium">Pending invitations</div>
        {!invites.length ? (
          <p className="p-4 text-sm text-muted-foreground">No pending invites.</p>
        ) : (
          <ul className="divide-y">
            {invites.map((invite) => (
              <li key={invite.id} className="flex items-center justify-between gap-4 p-4">
                <div>
                  <p className="font-medium">{invite.email}</p>
                  <p className="text-sm text-muted-foreground">
                    Expires {new Date(invite.expiresAt).toLocaleDateString()}
                    {invite.isExpired ? ' · Expired' : ''}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <RoleBadge role={invite.role} />
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={isPending}
                    onClick={() => handleRevoke(invite.id)}
                  >
                    Revoke
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
