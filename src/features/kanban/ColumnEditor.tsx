import { useState, type FormEvent } from 'react'
import { Modal } from '../../components/ui/Modal'
import { colors, newId, type Column } from '../workspace/model'

export function ColumnEditor({
  column,
  index,
  count,
  onSave,
  onClose,
}: {
  column?: Column
  index: number
  count: number
  onSave: (column: Column, index: number) => boolean
  onClose: () => void
}) {
  const [error, setError] = useState('')
  const [color, setColor] = useState<Column['color']>(column?.color ?? 'sage')
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const name = String(form.get('name')).trim()
    if (!name) {
      setError('Give your column a name.')
      return
    }
    const next: Column = {
      id: column?.id ?? newId(),
      name,
      color,
      limit: Number(form.get('limit')),
      completed: form.get('completed') === 'on',
      tasks: column?.tasks ?? [],
    }
    if (onSave(next, Number(form.get('position')) - 1)) onClose()
    else setError('The column could not be saved. Check the workspace message.')
  }
  return (
    <Modal title={column ? 'Edit column' : 'New column'} onClose={onClose}>
      <form onSubmit={submit} className="editor-form">
        <label>
          Column name
          <input
            name="name"
            required
            maxLength={120}
            defaultValue={column?.name}
            placeholder="e.g. In review"
            autoFocus
          />
        </label>
        <fieldset className="color-options">
          <legend>Column color</legend>
          {colors.map((item) => (
            <label key={item} className={`color-option color-${item}`}>
              <input
                type="radio"
                name="color"
                value={item}
                checked={color === item}
                onChange={() => setColor(item)}
              />
              <span />
              {item === 'sage' ? 'Theme accent' : item}
            </label>
          ))}
        </fieldset>
        <div className="form-row">
          <label>
            Position
            <input
              name="position"
              type="number"
              min={1}
              max={column ? count : count + 1}
              defaultValue={index + 1}
              required
            />
          </label>
          <label>
            Work-in-progress limit
            <input
              name="limit"
              type="number"
              min={0}
              max={1000}
              defaultValue={column?.limit ?? 0}
              required
            />
            <small>0 means unlimited. Exceeding a limit shows a warning.</small>
          </label>
        </div>
        <label className="checkbox-label">
          <input
            type="checkbox"
            name="completed"
            defaultChecked={column?.completed}
          />
          <span>
            Count tasks in this column as completed
            <small>You can have more than one completed column.</small>
          </span>
        </label>
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        <footer className="modal-actions">
          <button
            className="button button--outline"
            type="button"
            onClick={onClose}
          >
            Cancel
          </button>
          <button className="button button--primary" type="submit">
            {column ? 'Save column' : 'Create column'}
          </button>
        </footer>
      </form>
    </Modal>
  )
}
