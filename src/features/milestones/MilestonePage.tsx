import { useEffect, useState } from 'react'
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import {
  ArrowLeft,
  CalendarDays,
  CheckCheck,
  Download,
  Flag,
  Plus,
  Rocket,
  Search,
  Upload,
} from 'lucide-react'
import { useWorkspace } from '../workspace/context'
import {
  boardPath,
  bugsPath,
  downloadWorkspace,
  milestoneProgress,
  milestonesPath,
  milestoneStatuses,
  newId,
  type Milestone,
  type MilestoneDraft,
  type Project,
} from '../workspace/model'
import { ImportWorkspace } from '../workspace/WorkspaceDialogs'
import { ConfirmDialog } from '../kanban/ConfirmDialog'
import { MilestoneCard } from './MilestoneCard'
import { MilestoneDetails } from './MilestoneDetails'
import { MilestoneEditor } from './MilestoneEditor'
import { isOverdue, localToday, milestoneStatusNames } from './presentation'
import './milestones.css'

type Editor =
  | { type: 'new' }
  | { type: 'edit'; milestone: Milestone }
  | { type: 'delete'; milestone: Milestone }
  | { type: 'import' }

export function MilestoneLanding() {
  const { workspace } = useWorkspace()
  return <Navigate to={milestonesPath(workspace.projects[0])} replace />
}
export function MilestonePage() {
  const { workspace } = useWorkspace()
  const { projectId, milestoneId } = useParams()
  const project = workspace.projects.find((item) => item.id === projectId)
  if (!project)
    return (
      <div className="board-not-found">
        <h1>This project has left orbit.</h1>
        <p>
          It may have been deleted, or this browser has a different workspace.
        </p>
        <Link className="button button--primary" to="/milestones">
          Open milestones
        </Link>
      </div>
    )
  return (
    <MilestoneView
      key={`${project.id}/${milestoneId ?? ''}`}
      project={project}
      milestoneId={milestoneId}
    />
  )
}
function MilestoneView({
  project,
  milestoneId,
}: {
  project: Project
  milestoneId?: string
}) {
  const { workspace, update, blocked, error } = useWorkspace()
  const navigate = useNavigate()
  const [editor, setEditor] = useState<Editor | null>(null)
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState('all')
  const [sort, setSort] = useState('target')
  const [announcement, setAnnouncement] = useState('')
  const [today, setToday] = useState(localToday)
  // Refresh date-only deadlines after midnight or after returning to the tab.
  useEffect(() => {
    const refresh = () => setToday(localToday())
    const timer = window.setInterval(refresh, 60000)
    window.addEventListener('focus', refresh)
    return () => {
      clearInterval(timer)
      window.removeEventListener('focus', refresh)
    }
  }, [])
  const selected = project.milestones.find((item) => item.id === milestoneId)
  const listPath = milestonesPath(project)
  const close = () => setEditor(null)
  const filtered = query.trim() !== '' || filter !== 'all'
  const reset = () => {
    setQuery('')
    setFilter('all')
  }
  const milestones = project.milestones
    .filter(
      (item) =>
        `${item.title} ${item.description}`
          .toLowerCase()
          .includes(query.trim().toLowerCase()) &&
        (filter === 'all' ||
          (filter === 'overdue'
            ? isOverdue(item, today)
            : item.status === filter)),
    )
    .sort(
      (a, b) =>
        (sort === 'target'
          ? (a.targetDate || '9999').localeCompare(b.targetDate || '9999')
          : 0) ||
        b.updatedAt.localeCompare(a.updatedAt) ||
        a.id.localeCompare(b.id),
    )
  const change = (recipe: (milestones: Milestone[]) => Milestone[]) =>
    update((current) => ({
      ...current,
      projects: current.projects.map((item) =>
        item.id === project.id
          ? { ...item, milestones: recipe(item.milestones) }
          : item,
      ),
    }))
  function save(draft: MilestoneDraft): string | undefined {
    const original = editor?.type === 'edit' ? editor.milestone : undefined
    const latest =
      original && project.milestones.find((item) => item.id === original.id)
    if (original && (!latest || latest.updatedAt !== original.updatedAt))
      return 'This milestone changed in another tab or was removed. Close and reopen the editor before saving.'
    if (!original && project.milestones.length >= 100)
      return 'This project has reached its limit of 100 milestones.'
    const taskIds = new Set(
      project.boards.flatMap((board) =>
        board.columns.flatMap((column) => column.tasks.map((task) => task.id)),
      ),
    )
    const bugIds = new Set(project.bugs.map((bug) => bug.id))
    if (
      draft.taskIds.some((id) => !taskIds.has(id)) ||
      draft.bugIds.some((id) => !bugIds.has(id))
    )
      return 'Some selected work was removed in another tab. Close and reopen the editor to refresh the available work.'
    const timestamp = new Date().toISOString()
    const milestone: Milestone = {
      ...draft,
      id: original?.id ?? newId(),
      status: original?.status ?? 'planned',
      createdAt: original?.createdAt ?? timestamp,
      updatedAt: timestamp,
      completedAt: original?.completedAt ?? '',
    }
    if (
      !change((items) =>
        original
          ? items.map((item) => (item.id === original.id ? milestone : item))
          : [...items, milestone],
      )
    )
      return 'The milestone could not be saved. Check the workspace message and try again.'
    if (!original) navigate(`${listPath}/${milestone.id}`)
    else setAnnouncement('Milestone updated.')
  }
  function setStatus(milestone: Milestone, status: Milestone['status']) {
    if (
      status === 'completed' &&
      milestoneProgress(project, milestone).remaining > 0
    )
      return
    const timestamp = new Date().toISOString()
    if (
      change((items) =>
        items.map((item) =>
          item.id === milestone.id
            ? {
                ...item,
                status,
                completedAt: status === 'completed' ? timestamp : '',
                updatedAt: timestamp,
              }
            : item,
        ),
      )
    )
      setAnnouncement(
        `Milestone is now ${milestoneStatusNames[status].toLowerCase()}.`,
      )
  }
  return (
    <div className="milestones-page">
      <div className="board-context">
        <Link to="/#projects">
          <ArrowLeft size={14} />
          Projects
        </Link>
        <span>/</span>
        <select
          aria-label="Project"
          value={project.id}
          onChange={(event) =>
            navigate(milestonesPath({ id: event.target.value }))
          }
        >
          {workspace.projects.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
            </option>
          ))}
        </select>
        <div className="milestone-context-links">
          <Link to={boardPath(project)}>Kanban board</Link>
          <Link to={bugsPath(project)}>Bug tracking</Link>
          <Link to={`/projects/${project.id}/github`}>GitHub</Link>
          <Link to={`/projects/${project.id}/changelog`}>Changelogs</Link>
        </div>
      </div>
      {milestoneId ? (
        selected ? (
          <MilestoneDetails
            project={project}
            milestone={selected}
            blocked={blocked}
            onEdit={() => setEditor({ type: 'edit', milestone: selected })}
            onDelete={() => setEditor({ type: 'delete', milestone: selected })}
            onStatus={(status) => setStatus(selected, status)}
          />
        ) : (
          <div className="board-not-found">
            <h1>This milestone has left orbit.</h1>
            <p>It may have been deleted or removed by a workspace import.</p>
            <Link className="button button--primary" to={listPath}>
              Back to milestones
            </Link>
          </div>
        )
      ) : (
        <>
          <div className="page-heading">
            <div>
              <p className="eyebrow">
                <Flag size={14} /> SMALL CHECKPOINTS. BIG POSSIBILITIES.
              </p>
              <h1>
                Milestones<span>.</span>
              </h1>
              <p>
                Give your next launch a destination. Watch the pieces come
                together.
              </p>
            </div>
            <button
              className="button button--primary"
              disabled={blocked || project.milestones.length >= 100}
              onClick={() => setEditor({ type: 'new' })}
            >
              <Plus size={16} /> New milestone
            </button>
          </div>
          <div className="milestone-summary" aria-label="Milestone summary">
            <div>
              <Flag size={20} />
              <span>
                Planned
                <strong>
                  {
                    project.milestones.filter(
                      (item) => item.status === 'planned',
                    ).length
                  }
                </strong>
              </span>
            </div>
            <div>
              <Rocket size={20} />
              <span>
                In progress
                <strong>
                  {
                    project.milestones.filter(
                      (item) => item.status === 'active',
                    ).length
                  }
                </strong>
              </span>
            </div>
            <div>
              <CheckCheck size={20} />
              <span>
                Completed
                <strong>
                  {
                    project.milestones.filter(
                      (item) => item.status === 'completed',
                    ).length
                  }
                </strong>
              </span>
            </div>
            <div className="milestone-summary-overdue">
              <CalendarDays size={20} />
              <span>
                Overdue
                <strong>
                  {
                    project.milestones.filter((item) => isOverdue(item, today))
                      .length
                  }
                </strong>
              </span>
            </div>
          </div>
          <div className="milestone-list-heading">
            <div>
              <h2>Your launch calendar</h2>
              <p>A clear goal, a little progress, one step at a time.</p>
            </div>
            <div className="milestone-actions">
              <button
                className="icon-button"
                aria-label="Export workspace"
                title="Export all workspace data"
                onClick={() => downloadWorkspace(workspace)}
              >
                <Download size={17} />
              </button>
              <button
                className="icon-button"
                aria-label="Import workspace"
                onClick={() => setEditor({ type: 'import' })}
              >
                <Upload size={17} />
              </button>
            </div>
          </div>
          <div className="milestone-filters">
            <label className="board-search">
              <Search size={16} />
              <input
                type="search"
                aria-label="Search milestones"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Find your next checkpoint…"
              />
            </label>
            <label className="filter-select">
              <span className="sr-only">Filter milestones</span>
              <select
                value={filter}
                onChange={(event) => setFilter(event.target.value)}
              >
                <option value="all">All milestones</option>
                {milestoneStatuses.map((status) => (
                  <option key={status} value={status}>
                    {milestoneStatusNames[status]}
                  </option>
                ))}
                <option value="overdue">Overdue</option>
              </select>
            </label>
            <label className="filter-select">
              <span className="sr-only">Sort milestones</span>
              <select
                value={sort}
                onChange={(event) => setSort(event.target.value)}
              >
                <option value="target">Target date</option>
                <option value="updated">Recently updated</option>
              </select>
            </label>
            {filtered && (
              <button className="text-button" onClick={reset}>
                Clear filters
              </button>
            )}
          </div>
          <p className="milestone-results" role="status">
            {milestones.length} of {project.milestones.length} milestones shown
          </p>
          {milestones.length ? (
            <ul className="milestone-grid" aria-label="Milestones">
              {milestones.map((milestone) => (
                <MilestoneCard
                  key={milestone.id}
                  project={project}
                  milestone={milestone}
                />
              ))}
            </ul>
          ) : (
            <div className="milestone-empty">
              <span className="milestone-empty-icon">
                <Flag size={32} />
              </span>
              <h2>
                {project.milestones.length
                  ? 'No checkpoints in this view.'
                  : 'Every launch starts with a destination.'}
              </h2>
              <p>
                {project.milestones.length
                  ? 'Try another search or clear your filters.'
                  : 'Plan a release, polish a feature, or set a personal goal. Link the work that will get you there.'}
              </p>
              {project.milestones.length ? (
                <button className="button button--outline" onClick={reset}>
                  Show all milestones
                </button>
              ) : (
                <button
                  className="button button--primary"
                  disabled={blocked}
                  onClick={() => setEditor({ type: 'new' })}
                >
                  <Plus size={15} /> Create your first milestone
                </button>
              )}
            </div>
          )}
          {project.milestones.length >= 100 && (
            <p className="form-warning">
              This project has reached its limit of 100 milestones. Export a
              backup before removing old milestones.
            </p>
          )}
        </>
      )}
      <div className="board-bottom-note">
        <span className={error ? 'unsaved-state' : ''}>
          <span className="status-dot" />
          {error ? 'Check workspace storage notice' : 'Saved in this browser'} ·
          Milestones are included in workspace backups.
        </span>
      </div>
      <p className="sr-only" role="status">
        {announcement}
      </p>
      {(editor?.type === 'new' || editor?.type === 'edit') && (
        <MilestoneEditor
          project={project}
          milestone={editor.type === 'edit' ? editor.milestone : undefined}
          onSave={save}
          onClose={close}
        />
      )}
      {editor?.type === 'delete' && (
        <ConfirmDialog
          title="Delete milestone?"
          onClose={close}
          onConfirm={() => {
            const saved = change((items) =>
              items.filter((item) => item.id !== editor.milestone.id),
            )
            if (saved) navigate(listPath)
            return saved
          }}
        >
          <p>
            “{editor.milestone.title}” will be permanently removed. Linked tasks
            and bug reports will remain. This cannot be undone.
          </p>
        </ConfirmDialog>
      )}
      {editor?.type === 'import' && (
        <ImportWorkspace
          onClose={close}
          onImported={() => navigate('/milestones')}
        />
      )}
    </div>
  )
}
