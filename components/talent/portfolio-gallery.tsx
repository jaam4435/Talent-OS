'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { ExternalLink, Trash2 } from 'lucide-react'
import { addPortfolioItem, deletePortfolioItem, uploadPortfolioImage } from '@/app/actions/portfolio'
import { Button } from '@/modules/core/components/ui/button'
import { Input } from '@/modules/core/components/ui/input'
import { Label } from '@/modules/core/components/ui/label'
import type { PortfolioItem } from '@/lib/talent/types'

interface PortfolioGalleryProps {
  freelancerId: string
  items: PortfolioItem[]
  canEdit: boolean
}

export function PortfolioGallery({ freelancerId, items, canEdit }: PortfolioGalleryProps) {
  const router = useRouter()
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [projectUrl, setProjectUrl] = useState('')
  const [imagePath, setImagePath] = useState<string | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    const formData = new FormData()
    formData.append('file', file)

    const result = await uploadPortfolioImage(freelancerId, formData)
    if (!result.ok) {
      setError(result.error)
      return
    }

    setImagePath(result.path)
    setImagePreview(result.publicUrl)
  }

  function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    startTransition(async () => {
      const result = await addPortfolioItem(freelancerId, {
        title,
        description: description || undefined,
        projectUrl: projectUrl || undefined,
        imagePath: imagePath ?? undefined,
      })

      if (!result.ok) {
        setError(result.error)
        return
      }

      setTitle('')
      setDescription('')
      setProjectUrl('')
      setImagePath(null)
      setImagePreview(null)
      router.refresh()
    })
  }

  function handleDelete(itemId: string) {
    startTransition(async () => {
      await deletePortfolioItem(freelancerId, itemId)
      router.refresh()
    })
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((item) => (
          <div key={item.id} className="overflow-hidden rounded-lg border">
            {item.imageUrl ? (
              <div className="relative aspect-video bg-muted">
                <Image src={item.imageUrl} alt={item.title} fill className="object-cover" />
              </div>
            ) : (
              <div className="flex aspect-video items-center justify-center bg-muted text-sm text-muted-foreground">
                No image
              </div>
            )}
            <div className="space-y-2 p-4">
              <div className="flex items-start justify-between gap-2">
                <h4 className="font-medium">{item.title}</h4>
                {canEdit ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    disabled={isPending}
                    onClick={() => handleDelete(item.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                ) : null}
              </div>
              {item.description ? (
                <p className="text-sm text-muted-foreground">{item.description}</p>
              ) : null}
              {item.projectUrl ? (
                <a
                  href={item.projectUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
                >
                  View project <ExternalLink className="h-3 w-3" />
                </a>
              ) : null}
            </div>
          </div>
        ))}
      </div>

      {!items.length ? (
        <p className="text-sm text-muted-foreground">No portfolio items yet.</p>
      ) : null}

      {canEdit ? (
        <form onSubmit={handleAdd} className="space-y-4 rounded-lg border p-4">
          <h4 className="font-medium">Add portfolio item</h4>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="item-title">Title</Label>
              <Input id="item-title" value={title} onChange={(e) => setTitle(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="item-url">Project URL</Label>
              <Input
                id="item-url"
                type="url"
                value={projectUrl}
                onChange={(e) => setProjectUrl(e.target.value)}
                placeholder="https://"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="item-desc">Description</Label>
            <Input id="item-desc" value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="item-image">Cover image</Label>
            <Input id="item-image" type="file" accept="image/*" onChange={handleFileChange} />
            {imagePreview ? (
              <p className="text-xs text-muted-foreground">Image uploaded</p>
            ) : null}
          </div>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <Button type="submit" disabled={isPending}>
            {isPending ? 'Adding...' : 'Add to portfolio'}
          </Button>
        </form>
      ) : null}
    </div>
  )
}
