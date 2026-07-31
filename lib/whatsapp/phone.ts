/** Phone normalization utilities. */

export function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, '')
  return digits.startsWith('+') ? digits : `+${digits}`
}
