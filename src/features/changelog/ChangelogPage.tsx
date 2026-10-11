import { useState } from 'react'
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import {
  ArrowLeft,
  ArrowUpRight,
  CheckCheck,
  Download,
  FileText,
  Plus,
  Search,
  Upload,
} from 'lucide-react'
import { useWorkspace } from '../workspace/context'
import {
  boardPath,
  changelogPath,
  downloadWorkspace,
  type Changelog,
  type ChangelogDraft,
  type ChangelogSource,
  type Project,
} from '../workspace/model'
import { Modal } from '../../components/ui/Modal'
import { ImportWorkspace } from '../workspace/WorkspaceDialogs'
import { formatTargetDate } from '../milestones/presentation'
import { ChangelogDetails } from './ChangelogDetails'
import { ChangelogEditor } from './ChangelogEditor'
import { ChangelogGenerator } from './ChangelogGenerator'
import {
  assertCurrent,
  completedWork,
  createChangelog,
  downloadMarkdown,
  projectMarkdown,
  reviseChangelog,
} from './generation'
import './changelog.css'
type Editor =
  | { type: 'generate' }
  | { type: 'edit' | 'delete' | 'status'; entry: Changelog }
  | { type: 'import' }
export default function ChangelogPage() {
  const { workspace } = useWorkspace(),
    { projectId, changelogId } = useParams()
  if (!projectId)
    return <Navigate to={changelogPath(workspace.projects[0])} replace />
  const project = workspace.projects.find((project) => project.id === projectId)
  if (!project)
    return (
      <div className="board-not-found">
        <h1>This project has left orbit.</h1>
        <Link className="button button--primary" to="/changelog">
          Open changelogs
        </Link>
      </div>
    )
  return (
    <ChangelogView
      key={`${project.id}/${changelogId ?? ''}`}
      project={project}
      changelogId={changelogId}
    />
  )
}
function ChangelogView({
  project,
  changelogId,
}: {
  project: Project
  changelogId?: string
}) {
  const { workspace, update, blocked, error: storageError } = useWorkspace(),
    navigate = useNavigate()
  const [editor, setEditor] = useState<Editor | null>(null),
    [query, setQuery] = useState(''),
    [filter, setFilter] = useState('all'),
    [sort, setSort] = useState('date'),
    [error, setError] = useState(''),
    [announcement, setAnnouncement] = useState('')
  const selected = project.changelogs.find((entry) => entry.id === changelogId),
    path = changelogPath(project)
  const close = () => {
    setEditor(null)
    setError('')
  }
  const released = project.changelogs.filter(
      (entry) => entry.status === 'released',
    ).length,
    ready = completedWork(project).filter(
      (source) => !source.previouslyReleased,
    ).length
  const entries = project.changelogs
    .filter(
      (entry) =>
        (filter === 'all' || entry.status === filter) &&
        `${entry.title} ${entry.version} ${entry.notes}`
          .toLowerCase()
          .includes(query.trim().toLowerCase()),
    )
    .sort(
      (a, b) =>
        (sort === 'date' ? b.releaseDate.localeCompare(a.releaseDate) : 0) ||
        b.updatedAt.localeCompare(a.updatedAt) ||
        a.id.localeCompare(b.id),
    )
  function change(recipe: (current: Project) => Project): string | undefined {
    let failure = '',
      found = false
    const saved = update((current) => ({
      ...current,
      projects: current.projects.map((item) => {
        if (item.id !== project.id) return item
        found = true
        try {
          return recipe(item)
        } catch (error) {
          failure =
            error instanceof Error
              ? error.message
              : 'The changelog could not be saved.'
          return item
        }
      }),
    }))
    if (!saved)
      return 'The change could not be saved. Check the workspace message.'
    if (!found) return 'This project was removed. Choose another project.'
    return failure || undefined
  }
  function generate(
    metadata: Omit<ChangelogDraft, 'notes'>,
    sources: ChangelogSource[],
    includeReleased: boolean,
  ) {
    let created: Changelog | undefined
    const failure = change((current) => {
      created = createChangelog(current, metadata, sources, includeReleased)
      return { ...current, changelogs: [...current.changelogs, created] }
    })
    if (failure) return failure
    if (created) navigate(`${path}/${created.id}`)
  }
  function save(draft: ChangelogDraft) {
    if (editor?.type !== 'edit') return 'Open a draft to edit.'
    const failure = change((current) => {
      const revised = reviseChangelog(current, editor.entry, draft)
      return {
        ...current,
        changelogs: current.changelogs.map((entry) =>
          entry.id === editor.entry.id ? revised : entry,
        ),
      }
    })
    if (!failure) setAnnouncement('Changelog saved.')
    return failure
  }
  function confirm() {
    if (editor?.type !== 'delete' && editor?.type !== 'status') return
    const original = editor.entry
    const failure = change((current) => {
      const latest = assertCurrent(current, original)
      if (editor.type === 'delete')
        return {
          ...current,
          changelogs: current.changelogs.filter(
            (entry) => entry.id !== original.id,
          ),
        }
      if (latest.status === 'draft' && !latest.notes.trim())
        throw new Error(
          'Add release notes before marking this draft as released.',
        )
      const timestamp = new Date().toISOString()
      return {
        ...current,
        changelogs: current.changelogs.map((entry) =>
          entry.id === original.id
            ? {
                ...entry,
                status: entry.status === 'draft' ? 'released' : 'draft',
                releasedAt: entry.status === 'draft' ? timestamp : '',
                updatedAt: timestamp,
              }
            : entry,
        ),
      }
    })
    if (failure) {
      setError(failure)
      return
    }
    if (editor.type === 'delete') navigate(path)
    else
      setAnnouncement(
        original.status === 'draft'
          ? 'Release recorded in DevOrbit.'
          : 'Changelog returned to draft.',
      )
    close()
  }
  return (
    <div className="changelog-page">
      <div className="board-context">
        <Link to="/#projects">
          <ArrowLeft size={14} /> Projects
        </Link>
        <span>/</span>
        <select
          aria-label="Project"
          value={project.id}
          onChange={(event) =>
            navigate(changelogPath({ id: event.target.value }))
          }
        >
          {workspace.projects.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
            </option>
          ))}
        </select>
        <div className="changelog-context-links">
          <Link to={boardPath(project)}>Kanban board</Link>
          <Link to={`/projects/${project.id}/milestones`}>Milestones</Link>
          <Link to={`/projects/${project.id}/github`}>GitHub</Link>
        </div>
      </div>
      {changelogId ? (
        selected ? (
          <ChangelogDetails
            project={project}
            entry={selected}
            blocked={blocked}
            onEdit={() => setEditor({ type: 'edit', entry: selected })}
            onDelete={() => setEditor({ type: 'delete', entry: selected })}
            onStatus={() => setEditor({ type: 'status', entry: selected })}
          />
        ) : (
          <div className="board-not-found">
            <h1>This changelog has left orbit.</h1>
            <Link className="button button--primary" to={path}>
              Back to changelogs
            </Link>
          </div>
        )
      ) : (
        <>
          <div className="page-heading">
            <div>
              <p className="eyebrow">
                <FileText size={14} /> SMALL WINS. WORTH SHARING.
              </p>
              <h1>
                Changelogs<span>.</span>
              </h1>
              <p>
                Turn the work you finished into the story of your next release.
              </p>
            </div>
            <button
              className="button button--primary"
              disabled={blocked || project.changelogs.length >= 100}
              onClick={() => setEditor({ type: 'generate' })}
            >
              <Plus size={16} /> Generate changelog
            </button>
          </div>
          <div className="changelog-summary" aria-label="Changelog summary">
            <div>
              <FileText size={21} />
              <span>
                <small>Drafts in progress</small>
                <strong>{project.changelogs.length - released}</strong>
              </span>
            </div>
            <div>
              <CheckCheck size={22} />
              <span>
                <small>Releases recorded</small>
                <strong>{released}</strong>
              </span>
            </div>
            <div>
              <ArrowUpRight size={23} />
              <span>
                <small>Finished work to share</small>
                <strong>{ready}</strong>
              </span>
            </div>
          </div>
          <div className="changelog-section-heading">
            <div>
              <h2>Your launch history</h2>
              <p>Draft, refine, and keep a record of every release.</p>
            </div>
            <div className="changelog-actions">
              <button
                className="button button--outline"
                disabled={!released}
                onClick={() =>
                  downloadMarkdown(projectMarkdown(project), 'CHANGELOG.md')
                }
              >
                <Download size={15} /> Export released notes
              </button>
              <button
                className="icon-button"
                aria-label="Export workspace"
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
          <div className="changelog-filters">
            <label className="board-search">
              <Search size={16} />
              <input
                type="search"
                aria-label="Search changelogs"
                placeholder="Find a version, highlight, or release…"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
            </label>
            <select
              aria-label="Filter changelogs"
              value={filter}
              onChange={(event) => setFilter(event.target.value)}
            >
              <option value="all">All changelogs</option>
              <option value="draft">Drafts</option>
              <option value="released">Released</option>
            </select>
            <select
              aria-label="Sort changelogs"
              value={sort}
              onChange={(event) => setSort(event.target.value)}
            >
              <option value="date">Release date</option>
              <option value="updated">Recently updated</option>
            </select>
            {(query || filter !== 'all') && (
              <button
                className="text-button"
                onClick={() => {
                  setQuery('')
                  setFilter('all')
                }}
              >
                Clear filters
              </button>
            )}
          </div>
          <p className="changelog-results" role="status">
            {entries.length} of {project.changelogs.length} changelogs shown
          </p>
          {entries.length ? (
            <ul className="changelog-list" aria-label="Changelogs">
              {entries.map((entry) => (
                <li key={entry.id}>
                  <span className="changelog-entry-icon">
                    <FileText size={21} />
                  </span>
                  <div className="changelog-card-main">
                    <div className="changelog-card-meta">
                      <span className="changelog-version">{entry.version}</span>
                      <span
                        className={`changelog-status changelog-status--${entry.status}`}
                      >
                        {entry.status === 'released' ? 'Released' : 'Draft'}
                      </span>
                    </div>
                    <Link
                      to={`${path}/${entry.id}`}
                      aria-label={`Open changelog ${entry.version}`}
                    >
                      <h2>{entry.title}</h2>
                    </Link>
                    <p>
                      {entry.sources.length} work items ·{' '}
                      <time dateTime={entry.releaseDate}>
                        {formatTargetDate(entry.releaseDate)}
                      </time>
                    </p>
                  </div>
                  <Link
                    className="icon-button"
                    aria-label={`View release ${entry.version}`}
                    to={`${path}/${entry.id}`}
                  >
                    <ArrowUpRight size={19} />
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <div className="changelog-empty">
              <span>
                <FileText size={32} />
              </span>
              <h2>
                {project.changelogs.length
                  ? 'No releases in this view.'
                  : 'Every little launch deserves a story.'}
              </h2>
              <p>
                {project.changelogs.length
                  ? 'Clear your filters to see your launch history.'
                  : 'Choose completed tasks and fixed bugs, then make the notes your own.'}
              </p>
              {!project.changelogs.length && (
                <button
                  className="button button--outline"
                  disabled={blocked}
                  onClick={() => setEditor({ type: 'generate' })}
                >
                  Create your first changelog
                </button>
              )}
            </div>
          )}
          {project.changelogs.length >= 100 && (
            <p className="form-warning">
              This project has reached its limit of 100 changelogs. Export a
              backup before removing old entries.
            </p>
          )}
        </>
      )}
      <div className="board-bottom-note">
        <span>
          <span className="status-dot" />
          {storageError
            ? 'Check workspace storage notice'
            : 'Saved in this browser'}{' '}
          · Changelogs are included in workspace backups.
        </span>
      </div>
      <p className="sr-only" role="status">
        {announcement}
      </p>
      {editor?.type === 'generate' && (
        <ChangelogGenerator
          project={project}
          onClose={close}
          onGenerate={generate}
        />
      )}
      {editor?.type === 'edit' && (
        <ChangelogEditor entry={editor.entry} onClose={close} onSave={save} />
      )}
      {(editor?.type === 'delete' || editor?.type === 'status') && (
        <Modal
          title={
            editor.type === 'delete'
              ? 'Delete changelog?'
              : editor.entry.status === 'draft'
                ? 'Mark as released?'
                : 'Return to draft?'
          }
          onClose={close}
        >
          <div className="editor-form">
            <p>
              {editor.type === 'delete'
                ? `Delete ${editor.entry.version} from your launch history? Tasks, bugs, and milestones will remain. Its work will no longer count toward this release. This cannot be undone.`
                : editor.entry.status === 'draft'
                  ? 'Record this release in DevOrbit and preserve its notes. It will be included in released Markdown exports. This does not publish a GitHub release.'
                  : 'Make this release editable again. Its work becomes available for new changelogs, and this entry is omitted from released exports until you release it again.'}
            </p>
            {error && (
              <p className="form-error" role="alert">
                {error}
              </p>
            )}
            <footer className="modal-actions">
              <button className="button button--outline" onClick={close}>
                Cancel
              </button>
              <button
                className={`button ${editor.type === 'delete' ? 'button--danger' : 'button--primary'}`}
                disabled={blocked}
                onClick={confirm}
              >
                {editor.type === 'delete'
                  ? 'Confirm deletion'
                  : editor.entry.status === 'draft'
                    ? 'Confirm release'
                    : 'Confirm return to draft'}
              </button>
            </footer>
          </div>
        </Modal>
      )}
      {editor?.type === 'import' && (
        <ImportWorkspace
          onClose={close}
          onImported={() => navigate('/changelog')}
        />
      )}
    </div>
  )
}
