import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Check, GripVertical, Plus, Settings2, Trash2 } from 'lucide-react'
import type { Column, Task } from '../workspace/model'
import { TaskCard } from './TaskCard'

export function BoardColumn({
  column,
  tasks,
  filtered,
  blocked,
  onlyColumn,
  onEdit,
  onDelete,
  onAddTask,
  onEditTask,
  onDeleteTask,
  onDuplicateTask,
}: {
  column: Column
  tasks: Task[]
  filtered: boolean
  blocked: boolean
  onlyColumn: boolean
  onEdit: () => void
  onDelete: () => void
  onAddTask: () => void
  onEditTask: (task: Task) => void
  onDeleteTask: (task: Task) => void
  onDuplicateTask: (task: Task) => void
}) {
  const {
    setNodeRef,
    attributes,
    listeners,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: column.id,
    data: { type: 'column' },
    disabled: filtered || blocked,
  })
  const overLimit = column.limit > 0 && column.tasks.length > column.limit
  return (
    <section
      ref={setNodeRef}
      className={`board-column color-${column.color} ${isDragging ? 'is-dragging' : ''}`}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      aria-label={`${column.name} column`}
    >
      <header className="column-header">
        <button
          className="drag-handle"
          {...attributes}
          {...listeners}
          disabled={filtered || blocked}
          aria-label={`Drag column ${column.name}`}
          title="Drag to reorder columns"
        >
          <GripVertical size={17} />
        </button>
        <span className="column-dot" />
        <h2>{column.name}</h2>
        {column.completed && <Check size={14} aria-label="Completed column" />}
        <span className={`column-count ${overLimit ? 'over-limit' : ''}`}>
          {column.tasks.length}
          {column.limit > 0 && ` / ${column.limit}`}
        </span>
        <button
          className="icon-button"
          aria-label={`Edit column ${column.name}`}
          onClick={onEdit}
          disabled={blocked}
        >
          <Settings2 size={15} />
        </button>
        <button
          className="icon-button"
          aria-label={`Delete column ${column.name}`}
          onClick={onDelete}
          disabled={onlyColumn || blocked}
          title={onlyColumn ? 'Keep at least one column' : 'Delete column'}
        >
          <Trash2 size={14} />
        </button>
      </header>
      {overLimit && (
        <p className="wip-warning">Work-in-progress limit exceeded</p>
      )}
      <div className="column-tasks">
        <SortableContext
          items={tasks.map((task) => task.id)}
          strategy={verticalListSortingStrategy}
        >
          {tasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              completed={column.completed}
              disabled={filtered || blocked}
              onEdit={() => onEditTask(task)}
              onDelete={() => onDeleteTask(task)}
              onDuplicate={() => onDuplicateTask(task)}
            />
          ))}
        </SortableContext>
        {tasks.length === 0 && (
          <p className="column-empty">
            {filtered
              ? 'No matching tasks'
              : 'A little space for your next idea.'}
          </p>
        )}
      </div>
      <button className="add-task" onClick={onAddTask} disabled={blocked}>
        <Plus size={16} />
        Add task<span className="sr-only"> to {column.name}</span>
      </button>
    </section>
  )
}
