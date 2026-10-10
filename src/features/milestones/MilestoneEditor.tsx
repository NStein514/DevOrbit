import { useState, type FormEvent } from 'react'
import { Modal } from '../../components/ui/Modal'
import type { Milestone, MilestoneDraft, Project } from '../workspace/model'
import { WorkPicker } from './WorkPicker'

export function MilestoneEditor({
  project,
  milestone,
  onSave,
  onClose,
}: {
  project: Project
  milestone?: Milestone
  onSave: (draft: MilestoneDraft) => string | undefined
  onClose: () => void
}) {
  const [taskIds, setTaskIds] = useState(milestone?.taskIds ?? [])
  const [bugIds, setBugIds] = useState(milestone?.bugIds ?? [])
  const [error, setError] = useState('')
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const title = String(form.get('title')).trim()
    if (!title) {
      setError('Give your milestone a name.')
      return
    }
    const failure = onSave({
      title,
      description: String(form.get('description')).trim(),
      targetDate: String(form.get('targetDate')),
      taskIds,
      bugIds,
    })
    if (failure) setError(failure)
    else onClose()
  }
  return (
    <Modal
      title={milestone ? 'Edit milestone' : 'New milestone'}
      onClose={onClose}
    >
      <form className="editor-form milestone-editor" onSubmit={submit}>
        <label>
          Milestone name
          <input
            autoFocus
            required
            name="title"
            maxLength={120}
            defaultValue={milestone?.title}
            placeholder="Your next launch, big or small"
          />
        </label>
        <label>
          Description
          <textarea
            name="description"
            rows={3}
            maxLength={10000}
            defaultValue={milestone?.description}
            placeholder="What will success look like?"
          />
        </label>
        <label>
          Target date
          <input
            type="date"
            name="targetDate"
            aria-label="Target date"
            defaultValue={milestone?.targetDate}
            aria-describedby="target-date-hint"
          />
          <small id="target-date-hint">
            Optional. Set a date to keep your next launch in sight.
          </small>
        </label>
        <WorkPicker
          project={project}
          taskIds={taskIds}
          bugIds={bugIds}
          onChange={(tasks, bugs) => {
            setTaskIds(tasks)
            setBugIds(bugs)
          }}
        />
        {milestone?.status === 'completed' && (
          <p className="form-warning">
            Adding unfinished work reopens this milestone as In progress.
          </p>
        )}
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
          <button type="submit" className="button button--primary">
            {milestone ? 'Save milestone' : 'Create milestone'}
          </button>
        </footer>
      </form>
    </Modal>
  )
}
