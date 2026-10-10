import {
  ArrowLeft,
  ArrowUpRight,
  Bug,
  CalendarDays,
  Check,
  CheckCheck,
  Circle,
  Layers3,
  Pencil,
  Play,
  RotateCcw,
  Trash2,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import {
  boardPath,
  bugsPath,
  isActiveBug,
  milestoneProgress,
  milestonesPath,
  type Milestone,
  type Project,
} from '../workspace/model'
import { formatDate } from '../bugs/presentation'
import { MilestoneProgress } from './MilestoneCard'
import {
  formatTargetDate,
  isOverdue,
  milestoneStatusNames,
} from './presentation'

export function MilestoneDetails({
  project,
  milestone,
  blocked,
  onEdit,
  onDelete,
  onStatus,
}: {
  project: Project
  milestone: Milestone
  blocked: boolean
  onEdit: () => void
  onDelete: () => void
  onStatus: (status: Milestone['status']) => void
}) {
  const progress = milestoneProgress(project, milestone)
  const tasks = project.boards.flatMap((board) =>
    board.columns.flatMap((column) =>
      column.tasks
        .filter((task) => milestone.taskIds.includes(task.id))
        .map((task) => ({ task, board, column })),
    ),
  )
  const bugs = project.bugs.filter((bug) => milestone.bugIds.includes(bug.id))
  return (
    <>
      <Link className="text-link milestone-back" to={milestonesPath(project)}>
        <ArrowLeft size={15} /> All milestones
      </Link>
      <div className="page-heading milestone-detail-heading">
        <div>
          <p className="eyebrow">YOUR NEXT CHECKPOINT</p>
          <h1>{milestone.title}</h1>
          <p>
            Created {formatDate(milestone.createdAt)} · Updated{' '}
            {formatDate(milestone.updatedAt)}
          </p>
        </div>
        <div className="milestone-actions">
          <button
            className="button button--outline"
            disabled={blocked}
            onClick={onEdit}
          >
            <Pencil size={15} /> Edit milestone
          </button>
          <button
            className="icon-button milestone-delete"
            disabled={blocked}
            aria-label={`Delete milestone ${milestone.title}`}
            onClick={onDelete}
          >
            <Trash2 size={17} />
          </button>
        </div>
      </div>
      <div className="milestone-detail-layout">
        <div className="milestone-main-panel">
          <section className="milestone-description">
            <h2>The mission</h2>
            <p>
              {milestone.description ||
                'Describe the goal and what a successful launch looks like.'}
            </p>
          </section>
          <section
            className="milestone-linked-work"
            aria-labelledby="linked-work-heading"
          >
            <header>
              <div>
                <h2 id="linked-work-heading">
                  Linked work <span>{progress.total}</span>
                </h2>
                <p>Live progress from your boards and bug reports.</p>
              </div>
              <button
                className="text-button"
                disabled={blocked}
                onClick={onEdit}
              >
                Manage work
              </button>
            </header>
            {progress.total ? (
              <ul aria-label="Milestone work">
                {tasks.map(({ task, board, column }) => (
                  <li key={task.id}>
                    <span
                      className={`work-completion ${column.completed ? 'is-complete' : ''}`}
                    >
                      {column.completed ? (
                        <Check size={16} />
                      ) : (
                        <Circle size={16} />
                      )}
                    </span>
                    <Link
                      to={`${boardPath(project, board)}#task-${task.id}`}
                      aria-label={`Open task ${task.title}`}
                    >
                      <strong>{task.title}</strong>
                      <small>
                        <Layers3 size={12} />
                        {board.name} · {column.name}
                      </small>
                    </Link>
                    <span className="work-state">
                      {column.completed ? 'Done' : 'To do'}
                    </span>
                    <ArrowUpRight size={14} />
                  </li>
                ))}
                {bugs.map((bug) => (
                  <li key={bug.id}>
                    <span
                      className={`work-completion ${!isActiveBug(bug) ? 'is-complete' : ''}`}
                    >
                      {!isActiveBug(bug) ? (
                        <Check size={16} />
                      ) : (
                        <Circle size={16} />
                      )}
                    </span>
                    <Link
                      to={`${bugsPath(project)}/${bug.id}`}
                      aria-label={`Open bug ${bug.title}`}
                    >
                      <strong>{bug.title}</strong>
                      <small>
                        <Bug size={12} />
                        {bug.severity} severity · {bug.status.replace('-', ' ')}
                      </small>
                    </Link>
                    <span className="work-state">
                      {!isActiveBug(bug) ? 'Done' : 'To do'}
                    </span>
                    <ArrowUpRight size={14} />
                  </li>
                ))}
              </ul>
            ) : (
              <div className="milestone-no-work">
                <Layers3 size={28} />
                <h3>Give this goal a little direction.</h3>
                <p>
                  Link tasks from any board in this project, or add the bugs
                  that need fixing before launch.
                </p>
                <button
                  className="button button--outline"
                  disabled={blocked}
                  onClick={onEdit}
                >
                  Link work
                </button>
              </div>
            )}
          </section>
        </div>
        <aside
          className="milestone-flight-plan"
          aria-label="Milestone progress and status"
        >
          <div className="flight-plan-heading">
            <h2>Flight plan</h2>
            <span
              className={`milestone-status milestone-status--${milestone.status}`}
            >
              {milestoneStatusNames[milestone.status]}
            </span>
          </div>
          <MilestoneProgress project={project} milestone={milestone} />
          <p className="milestone-property-label">Target date</p>
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
            {isOverdue(milestone) && <span>Overdue</span>}
          </div>
          {milestone.completedAt && (
            <p className="milestone-completed-date">
              Completed {formatDate(milestone.completedAt)}
            </p>
          )}
          <div className="milestone-state-actions">
            {milestone.status === 'planned' && (
              <button
                className="button button--outline"
                disabled={blocked}
                onClick={() => onStatus('active')}
              >
                <Play size={14} /> Start milestone
              </button>
            )}
            {milestone.status !== 'completed' ? (
              <button
                className="button button--primary"
                disabled={blocked || progress.remaining > 0}
                onClick={() => onStatus('completed')}
              >
                <CheckCheck size={16} /> Complete milestone
              </button>
            ) : (
              <button
                className="button button--outline"
                disabled={blocked}
                onClick={() => onStatus('active')}
              >
                <RotateCcw size={14} /> Reopen milestone
              </button>
            )}
            {milestone.status === 'active' && (
              <button
                className="text-button"
                disabled={blocked}
                onClick={() => onStatus('planned')}
              >
                Return to planned
              </button>
            )}
          </div>
          <p className="milestone-hint">
            {progress.remaining
              ? `${progress.remaining} ${progress.remaining === 1 ? 'item remains' : 'items remain'}. Finish all linked work before completing this milestone.`
              : progress.total
                ? 'All linked work is done. Complete the milestone when you are ready.'
                : 'No work is linked. You can complete this milestone manually for goals without tasks.'}
          </p>
          <p className="milestone-reopen-note">
            Progress follows completed task columns and resolved or closed bugs.
            Reopening linked work automatically returns a completed milestone to
            In progress.
          </p>
        </aside>
      </div>
    </>
  )
}
