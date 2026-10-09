import { useState } from 'react'
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import {
  ArrowLeft,
  ArrowUpRight,
  Bug,
  CheckCheck,
  CircleDot,
  Download,
  Orbit,
  Plus,
  Search,
  ShieldAlert,
  Upload,
} from 'lucide-react'
import { useWorkspace } from '../workspace/context'
import {
  boardPath,
  bugsPath,
  bugSeverities,
  bugStatuses,
  downloadWorkspace,
  isActiveBug,
  newId,
  type BugDraft,
  type BugReport,
  type Project,
} from '../workspace/model'
import { ImportWorkspace } from '../workspace/WorkspaceDialogs'
import { ConfirmDialog } from '../kanban/ConfirmDialog'
import { BugEditor } from './BugEditor'
import { BugDetails } from './BugDetails'
import {
  bugReference,
  formatDate,
  severityNames,
  statusNames,
} from './presentation'
import './bugs.css'

type Editor =
  | { type: 'new' }
  | { type: 'edit'; bug: BugReport }
  | { type: 'delete'; bug: BugReport }
  | { type: 'import' }

export function BugLanding() {
  const { workspace } = useWorkspace()
  return <Navigate to={bugsPath(workspace.projects[0])} replace />
}

export function BugPage() {
  const { workspace } = useWorkspace()
  const { projectId, bugId } = useParams()
  const project = workspace.projects.find((project) => project.id === projectId)
  if (!project)
    return (
      <div className="board-not-found">
        <h1>This project has left orbit.</h1>
        <p>
          It may have been deleted, or this browser has a different workspace.
        </p>
        <Link className="button button--primary" to="/bugs">
          Open bug tracking
        </Link>
      </div>
    )
  return (
    <BugView
      key={`${project.id}/${bugId ?? ''}`}
      project={project}
      bugId={bugId}
    />
  )
}

function BugView({ project, bugId }: { project: Project; bugId?: string }) {
  const { workspace, update, blocked, error } = useWorkspace()
  const navigate = useNavigate()
  const [editor, setEditor] = useState<Editor | null>(null)
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState('all')
  const [severity, setSeverity] = useState('all')
  const [label, setLabel] = useState('')
  const [sort, setSort] = useState('updated')
  const [announcement, setAnnouncement] = useState('')
  const listPath = bugsPath(project)
  const selected = project.bugs.find((bug) => bug.id === bugId)
  const close = () => setEditor(null)
  const filtered =
    query.trim() !== '' ||
    status !== 'all' ||
    severity !== 'all' ||
    label !== ''
  const resetFilters = () => {
    setQuery('')
    setStatus('all')
    setSeverity('all')
    setLabel('')
  }
  const labels = [...new Set(project.bugs.flatMap((bug) => bug.labels))].sort()
  const visible = project.bugs
    .filter((bug) => {
      const text = [
        bugReference(bug),
        bug.title,
        bug.description,
        bug.steps,
        bug.expected,
        bug.actual,
        bug.environment,
        ...bug.labels,
      ]
        .join(' ')
        .toLowerCase()
      return (
        (!query.trim() || text.includes(query.trim().toLowerCase())) &&
        (status === 'all' ||
          (status === 'active' ? isActiveBug(bug) : bug.status === status)) &&
        (severity === 'all' || bug.severity === severity) &&
        (!label || bug.labels.includes(label))
      )
    })
    .sort((a, b) => {
      if (sort === 'severity') {
        const difference =
          bugSeverities.indexOf(b.severity) - bugSeverities.indexOf(a.severity)
        if (difference) return difference
      }
      return (
        (sort === 'created'
          ? b.createdAt.localeCompare(a.createdAt)
          : b.updatedAt.localeCompare(a.updatedAt)) || a.id.localeCompare(b.id)
      )
    })

  // Always change the latest workspace so board/task updates are preserved.
  const changeBugs = (change: (bugs: BugReport[]) => BugReport[]) =>
    update((current) => ({
      ...current,
      projects: current.projects.map((item) =>
        item.id === project.id ? { ...item, bugs: change(item.bugs) } : item,
      ),
    }))
  function setBugStatus(bug: BugReport, next: BugReport['status']) {
    if (
      changeBugs((bugs) =>
        bugs.map((item) =>
          item.id === bug.id
            ? { ...item, status: next, updatedAt: new Date().toISOString() }
            : item,
        ),
      )
    )
      setAnnouncement(`${bug.title} is now ${statusNames[next].toLowerCase()}.`)
  }
  function saveBug(draft: BugDraft): string | undefined {
    const original = editor?.type === 'edit' ? editor.bug : undefined
    const latest =
      original && project.bugs.find((bug) => bug.id === original.id)
    if (original && (!latest || latest.updatedAt !== original.updatedAt))
      return 'This report changed in another tab or was removed. Close this editor and reopen the report before saving.'
    if (!original && project.bugs.length >= 1000)
      return 'This project has reached its limit of 1,000 bug reports.'
    const timestamp = new Date().toISOString()
    const bug: BugReport = {
      ...draft,
      id: original?.id ?? newId(),
      createdAt: original?.createdAt ?? timestamp,
      updatedAt: timestamp,
    }
    if (
      !changeBugs((bugs) =>
        original
          ? bugs.map((item) => (item.id === bug.id ? bug : item))
          : [...bugs, bug],
      )
    )
      return 'The report could not be saved. Check the workspace message and try again.'
    if (!original) navigate(`${listPath}/${bug.id}`)
    else setAnnouncement('Bug report updated.')
  }

  return (
    <div className="bugs-page">
      <div className="board-context">
        <Link to="/#projects">
          <ArrowLeft size={14} /> Projects
        </Link>
        <span>/</span>
        <select
          aria-label="Project"
          value={project.id}
          onChange={(event) => navigate(bugsPath({ id: event.target.value }))}
        >
          {workspace.projects.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
            </option>
          ))}
        </select>
        <Link className="text-link bug-board-link" to={boardPath(project)}>
          Kanban board <ArrowUpRight size={14} />
        </Link>
      </div>
      {bugId ? (
        selected ? (
          <BugDetails
            bug={selected}
            listPath={listPath}
            blocked={blocked}
            onEdit={() => setEditor({ type: 'edit', bug: selected })}
            onDelete={() => setEditor({ type: 'delete', bug: selected })}
            onStatus={(status) => setBugStatus(selected, status)}
          />
        ) : (
          <div className="board-not-found">
            <h1>This report has left orbit.</h1>
            <p>It may have been deleted or removed by a workspace import.</p>
            <Link className="button button--primary" to={listPath}>
              Back to bug reports
            </Link>
          </div>
        )
      ) : (
        <>
          <div className="page-heading">
            <div>
              <p className="eyebrow">
                <Bug size={14} /> A CLEARER PATH TO LIFTOFF
              </p>
              <h1>
                Bug tracking<span>.</span>
              </h1>
              <p>Catch the unexpected. Keep your next launch on course.</p>
            </div>
            <button
              className="button button--primary"
              disabled={blocked || project.bugs.length >= 1000}
              onClick={() => setEditor({ type: 'new' })}
            >
              <Plus size={16} /> Report a bug
            </button>
          </div>
          <div className="bug-summary" aria-label="Bug summary">
            <div>
              <span className="bug-stat-icon">
                <Bug size={19} />
              </span>
              <div>
                <p>Total reports</p>
                <strong>{project.bugs.length}</strong>
                <small>in this project</small>
              </div>
            </div>
            <div>
              <span className="bug-stat-icon">
                <CircleDot size={19} />
              </span>
              <div>
                <p>Active bugs</p>
                <strong>{project.bugs.filter(isActiveBug).length}</strong>
                <small>open or in progress</small>
              </div>
            </div>
            <div>
              <span className="bug-stat-icon bug-stat-critical">
                <ShieldAlert size={19} />
              </span>
              <div>
                <p>Critical & active</p>
                <strong>
                  {
                    project.bugs.filter(
                      (bug) => isActiveBug(bug) && bug.severity === 'critical',
                    ).length
                  }
                </strong>
                <small>need your attention</small>
              </div>
            </div>
            <div>
              <span className="bug-stat-icon">
                <CheckCheck size={19} />
              </span>
              <div>
                <p>Resolved & closed</p>
                <strong>
                  {project.bugs.filter((bug) => !isActiveBug(bug)).length}
                </strong>
                <small>closer to a clean flight</small>
              </div>
            </div>
          </div>
          <section
            className="bug-register"
            aria-labelledby="bug-register-title"
          >
            <header className="bug-register-heading">
              <div>
                <h2 id="bug-register-title">
                  Your issue radar <span>{project.bugs.length}</span>
                </h2>
                <p>Good reports make the next fix a little easier.</p>
              </div>
              <div className="bug-actions">
                <button
                  className="icon-button"
                  aria-label="Export workspace"
                  title="Export all projects, boards and bugs"
                  onClick={() => downloadWorkspace(workspace)}
                >
                  <Download size={17} />
                </button>
                <button
                  className="icon-button"
                  aria-label="Import workspace"
                  title="Import workspace backup"
                  onClick={() => setEditor({ type: 'import' })}
                >
                  <Upload size={17} />
                </button>
              </div>
            </header>
            <div className="bug-filters">
              <label className="board-search">
                <Search size={16} />
                <input
                  type="search"
                  aria-label="Search bugs"
                  placeholder="Search reports, steps, labels…"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                />
              </label>
              <label className="filter-select">
                <span className="sr-only">Filter by status</span>
                <select
                  value={status}
                  onChange={(event) => setStatus(event.target.value)}
                >
                  <option value="all">All statuses</option>
                  <option value="active">Active bugs</option>
                  {bugStatuses.map((value) => (
                    <option key={value} value={value}>
                      {statusNames[value]}
                    </option>
                  ))}
                </select>
              </label>
              <label className="filter-select">
                <span className="sr-only">Filter by severity</span>
                <select
                  value={severity}
                  onChange={(event) => setSeverity(event.target.value)}
                >
                  <option value="all">All severities</option>
                  {bugSeverities.map((value) => (
                    <option key={value} value={value}>
                      {severityNames[value]}
                    </option>
                  ))}
                </select>
              </label>
              <label className="filter-select">
                <span className="sr-only">Filter by label</span>
                <select
                  value={label}
                  onChange={(event) => setLabel(event.target.value)}
                >
                  <option value="">All labels</option>
                  {labels.map((value) => (
                    <option key={value}>{value}</option>
                  ))}
                </select>
              </label>
              <label className="filter-select">
                <span className="sr-only">Sort bugs</span>
                <select
                  value={sort}
                  onChange={(event) => setSort(event.target.value)}
                >
                  <option value="updated">Recently updated</option>
                  <option value="created">Newest reported</option>
                  <option value="severity">Highest severity</option>
                </select>
              </label>
            </div>
            <div className="bug-results">
              <span role="status">
                {visible.length} of {project.bugs.length} reports
                {filtered ? ' match your filters' : ''}
              </span>
              {filtered && (
                <button className="text-button" onClick={resetFilters}>
                  Clear filters
                </button>
              )}
            </div>
            {visible.length > 0 ? (
              <>
                <div className="bug-list-heading" aria-hidden="true">
                  <span>REPORT</span>
                  <span>SEVERITY</span>
                  <span>STATUS</span>
                  <span>UPDATED</span>
                </div>
                <ul className="bug-list" aria-label="Bug reports">
                  {visible.map((bug) => (
                    <li key={bug.id} className="bug-row">
                      <Link
                        className="bug-report-link"
                        to={`${listPath}/${bug.id}`}
                        aria-label={`Open bug ${bug.title}`}
                      >
                        <span className="bug-reference">
                          {bugReference(bug)}
                        </span>
                        <h3>{bug.title}</h3>
                        {bug.description && <p>{bug.description}</p>}
                        <span className="bug-labels">
                          {bug.labels.map((label) => (
                            <span key={label}>{label}</span>
                          ))}
                        </span>
                      </Link>
                      <span className={`bug-severity severity-${bug.severity}`}>
                        <span />
                        {severityNames[bug.severity]}
                      </span>
                      <select
                        className={`bug-status status-${bug.status}`}
                        aria-label={`Status for ${bug.title}`}
                        disabled={blocked}
                        value={bug.status}
                        onChange={(event) =>
                          setBugStatus(
                            bug,
                            event.target.value as BugReport['status'],
                          )
                        }
                      >
                        {bugStatuses.map((value) => (
                          <option key={value} value={value}>
                            {statusNames[value]}
                          </option>
                        ))}
                      </select>
                      <time
                        className="bug-updated"
                        dateTime={bug.updatedAt}
                        title={new Date(bug.updatedAt).toLocaleString()}
                      >
                        {formatDate(bug.updatedAt)}
                      </time>
                    </li>
                  ))}
                </ul>
              </>
            ) : (
              <div className="bug-empty">
                <span className="bug-empty-orbit">
                  <Orbit size={38} strokeWidth={1.2} />
                </span>
                <h3>
                  {project.bugs.length
                    ? 'No signals in this view.'
                    : 'A clear sky. A fresh start.'}
                </h3>
                <p>
                  {project.bugs.length
                    ? 'Try a different search or clear your filters to see every report.'
                    : 'Found something unexpected? Capture the details here and give your next fix a place to start.'}
                </p>
                {project.bugs.length ? (
                  <button
                    className="button button--outline"
                    onClick={resetFilters}
                  >
                    Show all reports
                  </button>
                ) : (
                  <button
                    className="button button--primary"
                    disabled={blocked}
                    onClick={() => setEditor({ type: 'new' })}
                  >
                    <Plus size={15} /> Report your first bug
                  </button>
                )}
              </div>
            )}
          </section>
          {project.bugs.length >= 1000 && (
            <p className="form-warning">
              This project has reached its limit of 1,000 reports. Export a
              backup before removing old reports.
            </p>
          )}
        </>
      )}
      <div className="board-bottom-note">
        <span className={error ? 'unsaved-state' : ''}>
          <span className="status-dot" />
          {error ? 'Check workspace storage notice' : 'Saved in this browser'} ·
          Bug reports are included in workspace backups.
        </span>
        <span>A little clarity. A smoother landing.</span>
      </div>
      <p className="sr-only" role="status">
        {announcement}
      </p>
      {(editor?.type === 'new' || editor?.type === 'edit') && (
        <BugEditor
          bug={editor.type === 'edit' ? editor.bug : undefined}
          onSave={saveBug}
          onClose={close}
        />
      )}
      {editor?.type === 'delete' && (
        <ConfirmDialog
          title="Delete bug?"
          onClose={close}
          onConfirm={() => {
            const saved = changeBugs((bugs) =>
              bugs.filter((bug) => bug.id !== editor.bug.id),
            )
            if (saved) navigate(listPath)
            return saved
          }}
        >
          <p>
            “{editor.bug.title}” and its report details will be permanently
            removed. This cannot be undone. Your Kanban tasks will remain.
          </p>
        </ConfirmDialog>
      )}
      {editor?.type === 'import' && (
        <ImportWorkspace onClose={close} onImported={() => navigate('/bugs')} />
      )}
    </div>
  )
}
