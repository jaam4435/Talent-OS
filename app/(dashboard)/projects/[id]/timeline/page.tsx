import { TimelineFeed } from '@/components/projects/timeline-feed'

export const metadata = { title: 'Project timeline' }

export default async function ProjectTimelinePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  return (
    <div>
      <h2 className="mb-4 text-lg font-semibold">Timeline</h2>
      <TimelineFeed projectId={id} />
    </div>
  )
}
