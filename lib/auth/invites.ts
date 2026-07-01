import { createHash, randomBytes } from 'crypto'

const INVITE_TTL_DAYS = 7

export function generateInviteToken(): string {
  return randomBytes(32).toString('base64url')
}

export function hashInviteToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}

export function getInviteExpiryDate(): Date {
  const expires = new Date()
  expires.setDate(expires.getDate() + INVITE_TTL_DAYS)
  return expires
}

export function buildInviteUrl(token: string): string {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
  return `${base.replace(/\/$/, '')}/invite/${token}`
}
