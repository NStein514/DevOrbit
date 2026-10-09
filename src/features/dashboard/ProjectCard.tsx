import { ArrowUpRight, Flag, Layers3, Orbit, Sparkles } from 'lucide-react'
import { Badge } from '../../components/ui/Badge'
import type { Project } from './types'

const icons = { mint: Orbit, lavender: Sparkles, peach: Layers3 }

export function ProjectCard({
  project,
  onSelect,
}: {
  project: Project
  onSelect: (project: Project) => void
}) {
  const Icon = icons[project.color]
  const progress = project.total
    ? Math.round((project.completed / project.total) * 100)
    : 0
  return (
    <button
      className={`project-card project-card--${project.color}`}
      onClick={() => onSelect(project)}
      aria-label={`Explore ${project.name}`}
    >
      <div className="project-card-top">
        <span className={`project-icon project-icon--${project.color}`}>
          <Icon size={25} strokeWidth={1.5} />
        </span>
        <Badge tone={project.status === 'In orbit' ? 'green' : 'amber'}>
          <span className="badge-dot" />
          {project.status}
        </Badge>
      </div>
      <div className="project-title">
        <h3>{project.name}</h3>
        <ArrowUpRight size={18} />
      </div>
      <p>{project.description}</p>
      <span className="project-category">{project.category}</span>
      <div className="progress-label">
        <span>Mission progress</span>
        <strong>
          {project.completed}
          <span> / {project.total}</span>
        </strong>
      </div>
      <div
        className="progress-track"
        role="progressbar"
        aria-label={`${project.name} mission progress`}
        aria-valuenow={progress}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <span style={{ width: `${progress}%` }} />
      </div>
      <div className="project-card-footer">
        <Flag size={14} />
        <span>{project.milestone}</span>
        <span>{progress}%</span>
      </div>
    </button>
  )
}
