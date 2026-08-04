import { redirect } from 'next/navigation'

export default function TeamSettingsRedirectPage() {
  redirect('/organization/members')
}
