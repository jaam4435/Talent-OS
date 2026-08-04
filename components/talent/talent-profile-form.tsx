'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { createFreelancer, updateFreelancer, updateOwnFreelancerProfile } from '@/app/actions/freelancers'
import { SkillsInput } from '@/components/talent/skills-input'
import { Button } from '@/modules/core/components/ui/button'
import { Input } from '@/modules/core/components/ui/input'
import { Label } from '@/modules/core/components/ui/label'
import { DISCIPLINES } from '@/modules/core/utils/constants'
import { formatSkillsForInput } from '@/lib/talent/validation'
import type { FreelancerProfileInput } from '@/lib/talent/types'
import type { AvailabilityStatus, DisciplineType } from '@/modules/core/types/enums'

interface TalentProfileFormProps {
  mode: 'create' | 'edit'
  freelancerId?: string
  defaultCurrency: string
  initial?: Partial<FreelancerProfileInput>
  showManagerFields?: boolean
}

export function TalentProfileForm({
  mode,
  freelancerId,
  defaultCurrency,
  initial,
  showManagerFields = true,
}: TalentProfileFormProps) {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const [fullName, setFullName] = useState(initial?.fullName ?? '')
  const [email, setEmail] = useState(initial?.email ?? '')
  const [phone, setPhone] = useState(initial?.phone ?? '')
  const [discipline, setDiscipline] = useState<DisciplineType>(initial?.discipline ?? 'design')
  const [skills, setSkills] = useState(formatSkillsForInput(initial?.skills ?? []))
  const [tags, setTags] = useState(formatSkillsForInput(initial?.tags ?? []))
  const [dayRate, setDayRate] = useState(initial?.dayRate?.toString() ?? '')
  const [bio, setBio] = useState(initial?.bio ?? '')
  const [portfolioUrl, setPortfolioUrl] = useState(initial?.portfolioUrl ?? '')
  const [availability, setAvailability] = useState<AvailabilityStatus>(
    initial?.availability ?? 'available'
  )
  const [internalRating, setInternalRating] = useState(initial?.internalRating?.toString() ?? '')
  const [internalNotes, setInternalNotes] = useState(initial?.internalNotes ?? '')

  function buildInput(): FreelancerProfileInput {
    return {
      fullName,
      email,
      phone: phone || undefined,
      discipline,
      skills: skills.split(',').map((s) => s.trim()).filter(Boolean),
      tags: tags.split(',').map((s) => s.trim()).filter(Boolean),
      dayRate: dayRate ? Number(dayRate) : undefined,
      currency: defaultCurrency,
      bio: bio || undefined,
      portfolioUrl: portfolioUrl || undefined,
      availability,
      internalRating: internalRating ? Number(internalRating) : undefined,
      internalNotes: internalNotes || undefined,
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    startTransition(async () => {
      if (mode === 'edit' && !showManagerFields) {
        const result = await updateOwnFreelancerProfile({
          bio: bio || undefined,
          portfolioUrl: portfolioUrl || undefined,
          skills: skills.split(',').map((s) => s.trim()).filter(Boolean),
          tags: tags.split(',').map((s) => s.trim()).filter(Boolean),
          availability,
        })
        if (!result.ok) {
          setError(result.error)
          return
        }
        router.refresh()
        return
      }

      const input = buildInput()
      const result =
        mode === 'create'
          ? await createFreelancer(input)
          : await updateFreelancer(freelancerId!, input)

      if (!result.ok) {
        setError(result.error)
        return
      }

      if (mode === 'create' && 'freelancerId' in result) {
        router.push(`/talent/${result.freelancerId}`)
      } else {
        router.push(`/talent/${freelancerId}`)
      }
      router.refresh()
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2">
        {showManagerFields ? (
          <>
            <div className="space-y-2">
              <Label htmlFor="fullName">Full name</Label>
              <Input id="fullName" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone (WhatsApp)</Label>
              <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="discipline">Discipline</Label>
              <select
                id="discipline"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={discipline}
                onChange={(e) => setDiscipline(e.target.value as DisciplineType)}
              >
                {DISCIPLINES.map((d) => (
                  <option key={d} value={d}>
                    {d.charAt(0).toUpperCase() + d.slice(1)}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="dayRate">Day rate ({defaultCurrency})</Label>
              <Input
                id="dayRate"
                type="number"
                min="0"
                step="0.01"
                value={dayRate}
                onChange={(e) => setDayRate(e.target.value)}
              />
            </div>
          </>
        ) : null}
        <div className="space-y-2">
          <Label htmlFor="availability">Availability</Label>
          <select
            id="availability"
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm capitalize"
            value={availability}
            onChange={(e) => setAvailability(e.target.value as AvailabilityStatus)}
          >
            <option value="available">Available</option>
            <option value="busy">Busy</option>
            <option value="unavailable">Unavailable</option>
          </select>
        </div>
      </div>

      <SkillsInput value={skills} onChange={setSkills} />
      <SkillsInput value={tags} onChange={setTags} label="Tags" />

      <div className="space-y-2">
        <Label htmlFor="bio">Bio</Label>
        <textarea
          id="bio"
          className="flex min-h-24 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          value={bio}
          onChange={(e) => setBio(e.target.value)}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="portfolioUrl">Portfolio URL</Label>
        <Input
          id="portfolioUrl"
          type="url"
          placeholder="https://"
          value={portfolioUrl}
          onChange={(e) => setPortfolioUrl(e.target.value)}
        />
      </div>

      {showManagerFields ? (
        <div className="rounded-lg border p-4 space-y-4">
          <h3 className="font-medium">Internal (managers only)</h3>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="rating">Rating (1–5)</Label>
              <Input
                id="rating"
                type="number"
                min="1"
                max="5"
                step="0.5"
                value={internalRating}
                onChange={(e) => setInternalRating(e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="notes">Internal notes</Label>
            <textarea
              id="notes"
              className="flex min-h-20 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={internalNotes}
              onChange={(e) => setInternalNotes(e.target.value)}
            />
          </div>
        </div>
      ) : null}

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <Button type="submit" disabled={isPending}>
        {isPending ? 'Saving...' : mode === 'create' ? 'Create profile' : 'Save changes'}
      </Button>
    </form>
  )
}
