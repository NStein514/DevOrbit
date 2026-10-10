import { Flag } from 'lucide-react'
import { Link, useParams } from 'react-router-dom'
import { useWorkspace } from '../workspace/context'
import { milestonesPath } from '../workspace/model'

export function RelatedMilestones({
  taskId,
  bugId,
}: {
  taskId?: string
  bugId?: string
}) {
  const { projectId } = useParams()
  const { workspace } = useWorkspace()
  const project = workspace.projects.find((project) => project.id === projectId)
  const milestones =
    project?.milestones.filter(
      (milestone) =>
        (taskId && milestone.taskIds.includes(taskId)) ||
        (bugId && milestone.bugIds.includes(bugId)),
    ) ?? []
  if (!project || !milestones.length) return null
  return (
    <div className="related-milestones">
      <span>
        <Flag size={14} /> Milestones
      </span>
      {milestones.map((milestone) => (
        <Link
          key={milestone.id}
          to={`${milestonesPath(project)}/${milestone.id}`}
        >
          {milestone.title}
        </Link>
      ))}
    </div>
  )
}
