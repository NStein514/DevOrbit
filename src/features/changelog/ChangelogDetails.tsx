import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowLeft,
  Bug,
  CheckCheck,
  Copy,
  Download,
  Layers3,
  Pencil,
  RotateCcw,
  Trash2,
} from 'lucide-react'
import { changelogPath, type Changelog, type Project } from '../workspace/model'
import { formatDate } from '../bugs/presentation'
import { formatTargetDate } from '../milestones/presentation'
import { MarkdownPreview } from './MarkdownPreview'
import {
  downloadMarkdown,
  releaseFilename,
  releaseMarkdown,
} from './generation'
export function ChangelogDetails({
  project,
  entry,
  blocked,
  onEdit,
  onDelete,
  onStatus,
}: {
  project: Project
  entry: Changelog
  blocked: boolean
  onEdit: () => void
  onDelete: () => void
  onStatus: () => void
}) {
  const [copyStatus, setCopyStatus] = useState('')
  async function copy() {
    try {
      await navigator.clipboard.writeText(releaseMarkdown(entry))
      setCopyStatus('Markdown copied.')
    } catch {
      setCopyStatus(
        'Clipboard access is unavailable. Use Download Markdown instead.',
      )
    }
  }
  const tasks = entry.sources.filter((source) => source.kind === 'task').length,
    bugs = entry.sources.length - tasks
  return (
    <>
      <Link className="text-link changelog-back" to={changelogPath(project)}>
        <ArrowLeft size={15} /> All changelogs
      </Link>
      <div className="page-heading changelog-detail-heading">
        <div>
          <p className="eyebrow">EVERY LAUNCH HAS A STORY</p>
          <h1>{entry.title}</h1>
          <p>
            Created {formatDate(entry.createdAt)} · Updated{' '}
            {formatDate(entry.updatedAt)}
          </p>
        </div>
        <div className="changelog-actions">
          {entry.status === 'draft' && (
            <button
              className="button button--outline"
              disabled={blocked}
              onClick={onEdit}
            >
              <Pencil size={15} /> Edit changelog
            </button>
          )}
          <button
            className="icon-button"
            aria-label={`Delete changelog ${entry.version}`}
            disabled={blocked}
            onClick={onDelete}
          >
            <Trash2 size={17} />
          </button>
        </div>
      </div>
      <div className="changelog-detail-layout">
        <div className="changelog-notes-panel">
          <header>
            <h2>Release notes</h2>
            <div className="changelog-actions">
              <button className="text-button" onClick={() => void copy()}>
                <Copy size={14} /> Copy Markdown
              </button>
              <button
                className="text-button"
                onClick={() =>
                  downloadMarkdown(
                    releaseMarkdown(entry),
                    releaseFilename(entry.version),
                  )
                }
              >
                <Download size={15} /> Download Markdown
              </button>
            </div>
          </header>
          {copyStatus && (
            <p role="status" className="changelog-copy-status">
              {copyStatus}
            </p>
          )}
          <div className="changelog-notes-content">
            {entry.notes.trim() ? (
              <MarkdownPreview notes={releaseMarkdown(entry)} />
            ) : (
              <div className="changelog-empty-notes">
                <Pencil size={28} />
                <h3>Make this release your own.</h3>
                <p>
                  Add highlights, breaking changes, or anything your users need
                  to know.
                </p>
                <button
                  className="button button--outline"
                  disabled={blocked}
                  onClick={onEdit}
                >
                  Write release notes
                </button>
              </div>
            )}
          </div>
        </div>
        <aside className="changelog-flight-log" aria-label="Release details">
          <div className="changelog-log-heading">
            <h2>Flight log</h2>
            <span
              className={`changelog-status changelog-status--${entry.status}`}
            >
              {entry.status === 'released' ? 'Released' : 'Draft'}
            </span>
          </div>
          <dl>
            <dt>Version</dt>
            <dd>{entry.version}</dd>
            <dt>Release date</dt>
            <dd>
              <time dateTime={entry.releaseDate}>
                {formatTargetDate(entry.releaseDate)}
              </time>
            </dd>
            <dt>Selected work</dt>
            <dd>
              {tasks} {tasks === 1 ? 'task' : 'tasks'} · {bugs}{' '}
              {bugs === 1 ? 'bug' : 'bugs'}
            </dd>
            {entry.releasedAt && (
              <>
                <dt>Marked released</dt>
                <dd>{formatDate(entry.releasedAt)}</dd>
              </>
            )}
          </dl>
          <button
            className={`button ${entry.status === 'draft' ? 'button--primary' : 'button--outline'}`}
            disabled={
              blocked || (entry.status === 'draft' && !entry.notes.trim())
            }
            onClick={onStatus}
          >
            {entry.status === 'draft' ? (
              <CheckCheck size={16} />
            ) : (
              <RotateCcw size={15} />
            )}{' '}
            {entry.status === 'draft' ? 'Mark as released' : 'Return to draft'}
          </button>
          <p className="changelog-help">
            {entry.status === 'draft'
              ? 'Review your notes, then record this release in your local history. Add notes before releasing an empty draft.'
              : 'This release is preserved. Return it to draft to make changes.'}
          </p>
          <p className="changelog-help changelog-local-note">
            Release status is local to DevOrbit. Copy or download Markdown to
            share it; no GitHub release is created.
          </p>
        </aside>
      </div>
      <section className="changelog-snapshot-panel">
        <div>
          <h2>Work behind this release</h2>
          <p>
            Saved when the draft was generated. These references remain even if
            the original work changes or is removed.
          </p>
        </div>
        {entry.sources.length ? (
          <ul>
            {entry.sources.map((source) => {
              const bug =
                source.kind === 'bug'
                  ? project.bugs.find((bug) => bug.id === source.id)
                  : undefined
              const board =
                source.kind === 'task'
                  ? project.boards.find((board) =>
                      board.columns.some((column) =>
                        column.tasks.some((task) => task.id === source.id),
                      ),
                    )
                  : undefined
              const url = bug
                ? `/projects/${project.id}/bugs/${source.id}`
                : board
                  ? `/projects/${project.id}/boards/${board.id}#task-${source.id}`
                  : null
              return (
                <li key={`${source.kind}:${source.id}`}>
                  {source.kind === 'bug' ? (
                    <Bug size={16} />
                  ) : (
                    <Layers3 size={16} />
                  )}
                  <div>
                    {url ? (
                      <Link to={url}>{source.title}</Link>
                    ) : (
                      <span>{source.title}</span>
                    )}
                    <small>
                      {source.kind === 'task' ? 'Task' : 'Bug'} snapshot
                      {url ? '' : ' · Source removed'}
                    </small>
                  </div>
                  <span className="changelog-category">{source.category}</span>
                </li>
              )
            })}
          </ul>
        ) : (
          <p className="changelog-help">
            A hand-written release with no linked work.
          </p>
        )}
      </section>
    </>
  )
}
