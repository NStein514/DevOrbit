import {
  ArrowUpRight,
  Bug,
  CalendarDays,
  CheckCheck,
  Flag,
  Layers3,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import {
  milestoneProgress,
  milestonesPath,
  type Milestone,
  type Project,
} from '../workspace/model'
import {
  formatTargetDate,
  isOverdue,
  milestoneStatusNames,
} from './presentation'

export function MilestoneProgress({
  project,
  milestone,
}: {
  project: Project
  milestone: Milestone
}) {
  const progress = milestoneProgress(project, milestone)
  return (
    <div className="milestone-progress">
      <div className="milestone-progress-label">
        <span>
          {progress.total
            ? `${progress.completed} of ${progress.total} items complete`
            : 'No work linked yet'}
        </span>
        <strong>{progress.total ? `${progress.percent}%` : '—'}</strong>
      </div>
      <div
        className="progress-track"
        role="progressbar"
        aria-label={`Progress for ${milestone.title}`}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={progress.percent}
        aria-valuetext={
          progress.total
            ? `${progress.completed} of ${progress.total} items complete`
            : 'No work linked'
        }
      >
        <span style={{ width: `${progress.percent}%` }} />
      </div>
      <div className="milestone-work-counts">
        <span>
          <Layers3 size={13} />
          {progress.taskDone}/{progress.taskTotal} tasks
        </span>
        <span>
          <Bug size={13} />
          {progress.bugDone}/{progress.bugTotal} bugs
        </span>
      </div>
    </div>
  )
}
export function MilestoneCard({
  project,
  milestone,
}: {
  project: Project
  milestone: Milestone
}) {
  return (
    <li className="milestone-card">
      <div className="milestone-card-top">
        <span className="milestone-icon">
          {milestone.status === 'completed' ? (
            <CheckCheck size={21} />
          ) : (
            <Flag size={21} />
          )}
        </span>
        <span
          className={`milestone-status milestone-status--${milestone.status}`}
        >
          {milestoneStatusNames[milestone.status]}
        </span>
      </div>
      <Link
        className="milestone-title-link"
        to={`${milestonesPath(project)}/${milestone.id}`}
        aria-label={`Open milestone ${milestone.title}`}
      >
        <h2>{milestone.title}</h2>
        <ArrowUpRight size={16} />
      </Link>
      <p className="milestone-card-description">
        {milestone.description || 'A little focus for your next big step.'}
      </p>
      <MilestoneProgress project={project} milestone={milestone} />
      <div
        className={`milestone-date ${isOverdue(milestone) ? 'milestone-overdue' : ''}`}
      >
        <CalendarDays size={14} />
        {milestone.targetDate ? (
          <time dateTime={milestone.targetDate}>
            {formatTargetDate(milestone.targetDate)}
          </time>
        ) : (
          <span>No target date</span>
        )}
        {isOverdue(milestone) && (
          <span className="milestone-overdue-label">Overdue</span>
        )}
      </div>
    </li>
  )
}
