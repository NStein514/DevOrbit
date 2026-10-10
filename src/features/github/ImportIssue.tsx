import { useState, type FormEvent } from 'react'
import { Modal } from '../../components/ui/Modal'
import type { Project } from '../workspace/model'
import type { GitHubItem } from '../../../shared/github'
import type { ImportDraft } from './import'

export function ImportIssue({
  project,
  issue,
  onClose,
  onSave,
}: {
  project: Project
  issue: GitHubItem
  onClose: () => void
  onSave: (draft: ImportDraft) => string | undefined
}) {
  const [kind, setKind] = useState<'task' | 'bug'>('task')
  const [boardId, setBoardId] = useState(project.boards[0].id)
  const board =
    project.boards.find((b) => b.id === boardId) ?? project.boards[0]
  const [columnId, setColumnId] = useState(
    board.columns.find((c) => c.completed === (issue.state === 'closed'))?.id ??
      board.columns[0].id,
  )
  const [error, setError] = useState('')
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const failure = onSave({
      kind,
      title: String(form.get('title')),
      description: String(form.get('description')),
      boardId: board.id,
      columnId,
    })
    if (failure) setError(failure)
    else onClose()
  }
  return (
    <Modal title={`Import issue #${issue.number}`} onClose={onClose}>
      <form className="editor-form" onSubmit={submit}>
        <p className="github-import-note">
          Create a local copy. Future edits in DevOrbit and GitHub stay
          independent. GitHub labels are copied up to the workspace limits.
        </p>
        {(issue.title.length > 120 ||
          issue.body.length > 10000 ||
          issue.labels.length > 12 ||
          issue.labels.some((l) => l.length > 30)) && (
          <p className="form-warning">
            This issue exceeds workspace limits. Review the shortened title,
            description, and labels before importing.
          </p>
        )}
        <label>
          Import as
          <select
            aria-label="Import as"
            value={kind}
            onChange={(e) => setKind(e.target.value as 'task' | 'bug')}
          >
            <option value="task">Kanban task</option>
            <option value="bug">Bug report</option>
          </select>
        </label>
        <label>
          Title
          <input
            name="title"
            required
            maxLength={120}
            defaultValue={issue.title.slice(0, 120)}
            autoFocus
          />
        </label>
        <label>
          Description
          <textarea
            name="description"
            maxLength={10000}
            rows={5}
            defaultValue={issue.body.slice(0, 10000)}
          />
        </label>
        {kind === 'task' && (
          <div className="form-row">
            <label>
              Board
              <select
                value={board.id}
                onChange={(e) => {
                  const next = project.boards.find(
                    (b) => b.id === e.target.value,
                  )!
                  setBoardId(next.id)
                  setColumnId(
                    next.columns.find(
                      (c) => c.completed === (issue.state === 'closed'),
                    )?.id ?? next.columns[0].id,
                  )
                }}
              >
                {project.boards.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Column
              <select
                value={columnId}
                onChange={(e) => setColumnId(e.target.value)}
              >
                {board.columns.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>
          </div>
        )}
        <p className="github-import-note">
          {kind === 'bug'
            ? `This ${issue.state} issue becomes a ${issue.state === 'closed' ? 'Closed' : 'Open'} bug with Medium severity.`
            : 'Task completion follows the destination column you choose.'}
        </p>
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        <footer className="modal-actions">
          <button
            type="button"
            className="button button--outline"
            onClick={onClose}
          >
            Cancel
          </button>
          <button className="button button--primary" type="submit">
            Import issue
          </button>
        </footer>
      </form>
    </Modal>
  )
}
