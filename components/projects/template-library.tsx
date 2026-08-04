'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { ProjectTemplate } from '@/modules/project/types'
import { useProjectDelivery } from '@/modules/project/hooks/use-project-delivery'
import { Badge } from '@/modules/core/components/ui/badge'
import { Button } from '@/modules/core/components/ui/button'
import { Input } from '@/modules/core/components/ui/input'

interface FreelancerOption {
  id: string
  fullName: string
}

export function TemplateLibrary({ freelancers }: { freelancers: FreelancerOption[] }) {
  const router = useRouter()
  const { api, error, isPending, run } = useProjectDelivery()
  const [templates, setTemplates] = useState<ProjectTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null)
  const [freelancerId, setFreelancerId] = useState(freelancers[0]?.id ?? '')
  const [title, setTitle] = useState('')

  const loadTemplates = useCallback(async () => {
    setLoading(true)
    try {
      setTemplates(await api.listTemplates())
    } finally {
      setLoading(false)
    }
  }, [api])

  useEffect(() => {
    void loadTemplates()
  }, [loadTemplates])

  function handleApply(templateId: string) {
    if (!freelancerId) return
    run(async () => {
      const project = await api.applyTemplate(templateId, {
        freelancer_id: freelancerId,
        title: title.trim() || undefined,
      })
      router.push(`/projects/${project.id}`)
    })
  }

  if (loading) {
    return <p className="text-sm text-muted-foreground">Loading templates…</p>
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <label className="text-sm font-medium">Assign freelancer</label>
          <select
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            value={freelancerId}
            onChange={(event) => setFreelancerId(event.target.value)}
          >
            {freelancers.map((freelancer) => (
              <option key={freelancer.id} value={freelancer.id}>
                {freelancer.fullName}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">Project title override (optional)</label>
          <Input
            placeholder="Defaults to template name"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
          />
        </div>
      </div>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      {!templates.length ? (
        <p className="rounded-lg border p-6 text-center text-sm text-muted-foreground">
          No templates available.
        </p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {templates.map((template) => (
            <div key={template.id} className="rounded-lg border p-5">
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-semibold">{template.name}</h3>
                <Badge variant={template.isActive ? 'default' : 'secondary'}>
                  {template.isActive ? 'Active' : 'Inactive'}
                </Badge>
              </div>
              {template.description ? (
                <p className="mt-2 text-sm text-muted-foreground">{template.description}</p>
              ) : null}
              <p className="mt-2 text-xs text-muted-foreground">
                {template.defaultMilestones.length} milestones · {template.defaultTasks.length} tasks
              </p>
              <Button
                className="mt-4"
                size="sm"
                disabled={isPending || !template.isActive || !freelancerId}
                onClick={() => {
                  setSelectedTemplate(template.id)
                  handleApply(template.id)
                }}
              >
                {selectedTemplate === template.id && isPending ? 'Creating…' : 'Apply template'}
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
