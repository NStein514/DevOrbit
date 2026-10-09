import { useState, type FormEvent } from 'react'
import { Modal } from '../../components/ui/Modal'
import {
  bugSeverities,
  bugStatuses,
  type BugDraft,
  type BugReport,
} from '../workspace/model'
import { severityNames, statusNames } from './presentation'

export function BugEditor({
  bug,
  onSave,
  onClose,
}: {
  bug?: BugReport
  onSave: (draft: BugDraft) => string | undefined
  onClose: () => void
}) {
  const [error, setError] = useState('')
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const text = (key: string) => String(form.get(key) ?? '').trim()
    const title = text('title')
    const labels = [
      ...new Set(
        text('labels')
          .split(',')
          .map((label) => label.trim())
          .filter(Boolean),
      ),
    ]
    if (!title) {
      setError('Give your bug a title.')
      return
    }
    if (labels.length > 12 || labels.some((label) => label.length > 30)) {
      setError('Use up to 12 labels, with at most 30 characters each.')
      return
    }
    const failure = onSave({
      title,
      labels,
      description: text('description'),
      steps: text('steps'),
      expected: text('expected'),
      actual: text('actual'),
      environment: text('environment'),
      status: text('status') as BugDraft['status'],
      severity: text('severity') as BugDraft['severity'],
    })
    if (failure) setError(failure)
    else onClose()
  }
  return (
    <Modal title={bug ? 'Edit bug' : 'Report a bug'} onClose={onClose}>
      <form className="editor-form bug-editor" onSubmit={submit}>
        <label>
          Title
          <input
            name="title"
            autoFocus
            required
            maxLength={120}
            defaultValue={bug?.title}
            placeholder="What isn’t working as expected?"
          />
        </label>
        <div className="form-row">
          <label>
            Severity
            <select name="severity" defaultValue={bug?.severity ?? 'medium'}>
              {bugSeverities.map((value) => (
                <option key={value} value={value}>
                  {severityNames[value]}
                </option>
              ))}
            </select>
          </label>
          <label>
            Status
            <select name="status" defaultValue={bug?.status ?? 'open'}>
              {bugStatuses.map((value) => (
                <option key={value} value={value}>
                  {statusNames[value]}
                </option>
              ))}
            </select>
          </label>
        </div>
        <p className="bug-form-hint">
          Severity describes the impact: Low for cosmetic issues, Medium for a
          workaround, High for a broken feature, Critical for a blocker or data
          loss.
        </p>
        <label>
          Description
          <textarea
            name="description"
            rows={3}
            maxLength={10000}
            defaultValue={bug?.description}
            placeholder="A little context goes a long way."
          />
        </label>
        <label>
          Steps to reproduce
          <textarea
            name="steps"
            rows={4}
            maxLength={10000}
            defaultValue={bug?.steps}
            placeholder={'1. Open…\n2. Select…\n3. Notice…'}
          />
        </label>
        <label>
          Expected behavior
          <textarea
            name="expected"
            rows={2}
            maxLength={10000}
            defaultValue={bug?.expected}
            placeholder="What should happen?"
          />
        </label>
        <label>
          Actual behavior
          <textarea
            name="actual"
            rows={2}
            maxLength={10000}
            defaultValue={bug?.actual}
            placeholder="What happens instead?"
          />
        </label>
        <label>
          Environment
          <input
            name="environment"
            maxLength={1000}
            defaultValue={bug?.environment}
            placeholder="Browser, OS, app version, device…"
          />
        </label>
        <label>
          Labels
          <input
            name="labels"
            aria-label="Labels"
            maxLength={400}
            defaultValue={bug?.labels.join(', ')}
            placeholder="frontend, regression, release"
            aria-describedby="bug-labels-hint"
          />
          <small id="bug-labels-hint">
            Separate labels with commas. Up to 12 labels.
          </small>
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
            {bug ? 'Save bug' : 'Create bug'}
          </button>
        </footer>
      </form>
    </Modal>
  )
}
