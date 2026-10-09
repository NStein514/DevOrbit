import { useState, type FormEvent } from 'react'
import { Modal } from '../../components/ui/Modal'
import { useWorkspace } from './context'
import { workspaceSchema, type Workspace } from './model'

export function EntityEditor({
  title,
  initialName = '',
  initialDescription = '',
  onSave,
  onClose,
}: {
  title: string
  initialName?: string
  initialDescription?: string
  onSave: (name: string, description: string) => boolean
  onClose: () => void
}) {
  const [error, setError] = useState('')
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const name = String(form.get('name')).trim()
    if (!name) {
      setError('A name is required.')
      return
    }
    if (onSave(name, String(form.get('description')).trim())) onClose()
    else
      setError('Your changes could not be saved. Check the workspace message.')
  }
  return (
    <Modal title={title} onClose={onClose}>
      <form className="editor-form" onSubmit={submit}>
        <label>
          Name
          <input
            name="name"
            required
            maxLength={120}
            defaultValue={initialName}
            autoFocus
          />
        </label>
        <label>
          Description
          <textarea
            name="description"
            rows={3}
            maxLength={1000}
            defaultValue={initialDescription}
          />
        </label>
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
            Save {title.toLowerCase().includes('project') ? 'project' : 'board'}
          </button>
        </footer>
      </form>
    </Modal>
  )
}

export function ImportWorkspace({
  onClose,
  onImported,
}: {
  onClose: () => void
  onImported?: () => void
}) {
  const { replace } = useWorkspace()
  const [candidate, setCandidate] = useState<Workspace | null>(null)
  const [error, setError] = useState('')
  const [confirmed, setConfirmed] = useState(false)
  return (
    <Modal title="Import workspace" onClose={onClose}>
      <div className="editor-form">
        <p className="confirmation-copy">
          Restore a DevOrbit JSON backup. Importing replaces all projects,
          boards, and bug reports in this browser. Export your current workspace
          first if you want to keep it.
        </p>
        <label>
          Workspace JSON file
          <input
            type="file"
            accept=".json,application/json"
            onChange={async (event) => {
              const file = event.target.files?.[0]
              setCandidate(null)
              setConfirmed(false)
              setError('')
              if (!file) return
              if (file.size > 3_000_000) {
                setError('Choose a backup smaller than 3 MB.')
                return
              }
              try {
                const result = workspaceSchema.safeParse(
                  JSON.parse(await file.text()),
                )
                if (!result.success) {
                  setError(
                    'This file is not a valid DevOrbit version 1 workspace. Nothing has been changed.',
                  )
                  return
                }
                setCandidate(result.data)
              } catch {
                setError(
                  'The file could not be read as JSON. Nothing has been changed.',
                )
              }
            }}
          />
        </label>
        {candidate && (
          <>
            <p>
              {candidate.projects.length} projects ·{' '}
              {candidate.projects.reduce(
                (sum, project) => sum + project.boards.length,
                0,
              )}{' '}
              boards ·{' '}
              {candidate.projects.reduce(
                (sum, project) => sum + project.bugs.length,
                0,
              )}{' '}
              bug reports found.
            </p>
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={confirmed}
                onChange={(event) => setConfirmed(event.target.checked)}
              />
              <span>Replace my current workspace with this backup</span>
            </label>
          </>
        )}
        {error && (
          <p role="alert" className="form-error">
            {error}
          </p>
        )}
        <footer className="modal-actions">
          <button className="button button--outline" onClick={onClose}>
            Cancel
          </button>
          <button
            className="button button--primary"
            disabled={!candidate || !confirmed}
            onClick={() => {
              if (candidate && replace(candidate)) {
                onClose()
                onImported?.()
              }
            }}
          >
            Import and replace
          </button>
        </footer>
      </div>
    </Modal>
  )
}
