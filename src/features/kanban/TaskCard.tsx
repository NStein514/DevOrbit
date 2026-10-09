import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { CalendarDays, Copy, GripVertical, Trash2 } from 'lucide-react'
import type { Task } from '../workspace/model'

export function TaskCard({
  task,
  completed,
  disabled,
  onEdit,
  onDelete,
  onDuplicate,
}: {
  task: Task
  completed: boolean
  disabled: boolean
  onEdit: () => void
  onDelete: () => void
  onDuplicate: () => void
}) {
  const {
    setNodeRef,
    attributes,
    listeners,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id, data: { type: 'task' }, disabled })
  const today = new Date()
  const todayString = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
  const overdue = !!task.dueDate && task.dueDate < todayString && !completed
  return (
    <article
      ref={setNodeRef}
      className={`kanban-task ${isDragging ? 'is-dragging' : ''}`}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      aria-label={`Task: ${task.title}`}
    >
      <div className="task-top">
        <span className={`priority priority-${task.priority}`}>
          <span />
          {task.priority === 'none' ? 'No priority' : task.priority}
        </span>
        <button
          type="button"
          className="drag-handle"
          {...attributes}
          {...listeners}
          disabled={disabled}
          aria-label={`Drag task ${task.title}`}
          title="Drag to move, or press Space and use arrow keys"
        >
          <GripVertical size={16} />
        </button>
      </div>
      <button
        className="task-body"
        onClick={onEdit}
        aria-label={`Edit task ${task.title}`}
      >
        <h3>{task.title}</h3>
        {task.description && <p>{task.description}</p>}
        {task.labels.length > 0 && (
          <span className="task-labels">
            {task.labels.map((label) => (
              <span key={label}>{label}</span>
            ))}
          </span>
        )}
      </button>
      <div className="task-footer">
        {task.dueDate ? (
          <span className={overdue ? 'task-date overdue' : 'task-date'}>
            <CalendarDays size={12} />
            <time dateTime={task.dueDate}>
              {new Date(`${task.dueDate}T12:00:00`).toLocaleDateString(
                undefined,
                { month: 'short', day: 'numeric', year: 'numeric' },
              )}
            </time>
            {overdue && <span>Overdue</span>}
          </span>
        ) : (
          <span className="task-date">
            {completed ? 'Completed' : 'Ready when you are'}
          </span>
        )}
        <span className="task-actions">
          <button
            className="icon-button"
            aria-label={`Duplicate task ${task.title}`}
            onClick={onDuplicate}
          >
            <Copy size={13} />
          </button>
          <button
            className="icon-button"
            aria-label={`Delete task ${task.title}`}
            onClick={onDelete}
          >
            <Trash2 size={13} />
          </button>
        </span>
      </div>
    </article>
  )
}
