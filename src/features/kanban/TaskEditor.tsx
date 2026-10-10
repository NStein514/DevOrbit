import { useState, type FormEvent } from 'react'
import { RelatedMilestones } from '../milestones/RelatedMilestones'
import { Modal } from '../../components/ui/Modal'
import { newId, priorities, type Board, type Task } from '../workspace/model'

export function TaskEditor({
  board,
  task,
  columnId,
  onSave,
  onClose,
}: {
  board: Board
  task?: Task
  columnId: string
  onSave: (task: Task, columnId: string, index: number) => boolean
  onClose: () => void
}) {
  const [target, setTarget] = useState(columnId)
  const [error, setError] = useState('')
  const column =
    board.columns.find((item) => item.id === target) ?? board.columns[0]
  const initialIndex = task
    ? column.tasks.findIndex((item) => item.id === task.id)
    : column.tasks.length
  const [position, setPosition] = useState(initialIndex + 1)
  const count = column.tasks.filter((item) => item.id !== task?.id).length + 1
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const title = String(form.get('title')).trim()
    const labels = [
      ...new Set(
        String(form.get('labels'))
          .split(',')
          .map((label) => label.trim())
          .filter(Boolean),
      ),
    ]
    if (!title) {
      setError('Give your task a title.')
      return
    }
    if (labels.length > 12 || labels.some((label) => label.length > 30)) {
      setError('Use up to 12 labels, with at most 30 characters each.')
      return
    }
    const next: Task = {
      id: task?.id ?? newId(),
      title,
      description: String(form.get('description')).trim(),
      priority: form.get('priority') as Task['priority'],
      labels,
      dueDate: String(form.get('dueDate')),
    }
    if (onSave(next, target, Math.min(position, count) - 1)) onClose()
    else
      setError(
        'The task could not be saved. Check the workspace message and try again.',
      )
  }
  return (
    <Modal title={task ? 'Edit task' : 'New task'} onClose={onClose}>
      <form onSubmit={submit} className="editor-form">
        {task && <RelatedMilestones taskId={task.id} />}
        <label>
          Title
          <input
            name="title"
            required
            maxLength={120}
            defaultValue={task?.title}
            placeholder="What’s the next small win?"
            autoFocus
          />
        </label>
        <label>
          Description
          <textarea
            name="description"
            rows={4}
            maxLength={10000}
            defaultValue={task?.description}
            placeholder="Notes, context, or acceptance criteria…"
          />
        </label>
        <div className="form-row">
          <label>
            Column
            <select
              value={target}
              onChange={(event) => {
                setTarget(event.target.value)
                setPosition(1)
              }}
            >
              {board.columns.map((item) => (
                <option value={item.id} key={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Position
            <input
              type="number"
              min={1}
              max={count}
              value={Math.min(position, count)}
              onChange={(event) => setPosition(Number(event.target.value))}
              required
            />
          </label>
        </div>
        <div className="form-row">
          <label>
            Priority
            <select name="priority" defaultValue={task?.priority ?? 'none'}>
              {priorities.map((priority) => (
                <option key={priority} value={priority}>
                  {priority === 'none'
                    ? 'No priority'
                    : priority[0].toUpperCase() + priority.slice(1)}
                </option>
              ))}
            </select>
          </label>
          <label>
            Due date
            <input name="dueDate" type="date" defaultValue={task?.dueDate} />
          </label>
        </div>
        <label>
          Labels
          <input
            name="labels"
            aria-label="Labels"
            aria-describedby="task-labels-hint"
            maxLength={400}
            defaultValue={task?.labels.join(', ')}
            placeholder="design, backend, next-release"
          />
          <small id="task-labels-hint">
            Separate labels with commas. Up to 12 labels.
          </small>
        </label>
        {column.limit > 0 && count > column.limit && (
          <p className="form-warning">
            This column will exceed its work-in-progress limit of {column.limit}
            . Limits are a guide, so you can still save.
          </p>
        )}
        {error && (
          <p role="alert" className="form-error">
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
            {task ? 'Save task' : 'Create task'}
          </button>
        </footer>
      </form>
    </Modal>
  )
}
