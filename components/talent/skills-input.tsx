'use client'

import { useState } from 'react'
import { X } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { parseSkillsInput } from '@/lib/talent/validation'

interface SkillsInputProps {
  value: string
  onChange: (value: string) => void
  label?: string
}

export function SkillsInput({ value, onChange, label = 'Skills' }: SkillsInputProps) {
  const [draft, setDraft] = useState('')
  const skills = parseSkillsInput(value)

  function addSkill() {
    const next = parseSkillsInput(`${value}, ${draft}`)
    onChange(next.join(', '))
    setDraft('')
  }

  function removeSkill(skill: string) {
    onChange(skills.filter((s) => s !== skill).join(', '))
  }

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">{label}</label>
      <div className="flex gap-2">
        <Input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="e.g. figma, branding"
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              addSkill()
            }
          }}
        />
        <Button type="button" variant="outline" onClick={addSkill}>
          Add
        </Button>
      </div>
      <div className="flex flex-wrap gap-2">
        {skills.map((skill) => (
          <Badge key={skill} variant="secondary" className="gap-1 pr-1">
            {skill}
            <button type="button" onClick={() => removeSkill(skill)} aria-label={`Remove ${skill}`}>
              <X className="h-3 w-3" />
            </button>
          </Badge>
        ))}
      </div>
      <input type="hidden" name="skills" value={value} />
    </div>
  )
}
