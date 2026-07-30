import type { PostgrestError } from '@supabase/supabase-js'
import { DomainError, ErrorCodes } from '@/lib/core/errors'

const DUPLICATE_EMAIL_MESSAGE = 'A freelancer with this email already exists.'

export function mapSupabaseError(error: PostgrestError, duplicateMessage = DUPLICATE_EMAIL_MESSAGE): DomainError {
  if (error.code === '23505') {
    return new DomainError(ErrorCodes.DUPLICATE, duplicateMessage, error)
  }
  return new DomainError(ErrorCodes.DATABASE, error.message, error)
}

export function throwIfSupabaseError(
  error: PostgrestError | null,
  duplicateMessage?: string
): void {
  if (error) {
    throw mapSupabaseError(error, duplicateMessage)
  }
}
