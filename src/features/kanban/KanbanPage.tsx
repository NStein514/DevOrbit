import { useState, type ChangeEvent } from 'react'
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  pointerWithin,
  useSensor,
  useSensors,
  type CollisionDetection,
  type DragEndEvent,
  type KeyboardCoordinateGetter,
} from '@dnd-kit/core'
import {
  SortableContext,
  arrayMove,
  horizontalListSortingStrategy,
  sortableKeyboardCoordinates,
} from '@dnd-kit/sortable'
import {
  ArrowLeft,
  CheckCheck,
  Download,
  FolderPlus,
  Layers3,
  Plus,
  Search,
  Settings2,
  Trash2,
  Upload,
} from 'lucide-react'
import { useWorkspace } from '../workspace/context'
import {
  boardPath,
  bugsPath,
  createBoard,
  downloadWorkspace,
  moveTask,
  newId,
  priorities,
  type Board,
  type Column,
  type Task,
} from '../workspace/model'
import { EntityEditor, ImportWorkspace } from '../workspace/WorkspaceDialogs'
import { BoardColumn } from './BoardColumn'
import { ColumnEditor } from './ColumnEditor'
import { TaskEditor } from './TaskEditor'
import { ConfirmDialog } from './ConfirmDialog'
import './kanban.css'

type Editor =
  | { type: 'task'; task?: Task; columnId: string }
  | { type: 'column'; column?: Column; index: number }
  | { type: 'delete-task'; task: Task }
  | { type: 'delete-column'; column: Column }
  | {
      type:
        | 'new-board'
        | 'edit-board'
        | 'new-project'
        | 'edit-project'
        | 'delete-board'
        | 'delete-project'
        | 'import'
    }

const collisionDetection: CollisionDetection = (args) => {
  if (args.active.data.current?.type === 'column')
    return closestCenter({
      ...args,
      droppableContainers: args.droppableContainers.filter(
        (container) => container.data.current?.type === 'column',
      ),
    })
  const intersections = pointerWithin(args)
  const tasks = intersections.filter(
    (intersection) =>
      args.droppableContainers.find(
        (container) => container.id === intersection.id,
      )?.data.current?.type === 'task',
  )
  return tasks.length
    ? tasks
    : intersections.length
      ? intersections
      : args.pointerCoordinates
        ? []
        : closestCenter(args)
}

// Nested task droppables must not intercept horizontal column navigation.
const keyboardCoordinates: KeyboardCoordinateGetter = (event, args) => {
  if (args.context.active?.data.current?.type !== 'column')
    return sortableKeyboardCoordinates(event, args)
  if (event.code !== 'ArrowRight' && event.code !== 'ArrowLeft') return
  event.preventDefault()
  const { active, over, droppableContainers, droppableRects, collisionRect } =
    args.context
  if (!active || !collisionRect) return
  const columns = droppableContainers
    .getEnabled()
    .filter((item) => item.data.current?.type === 'column')
    .sort(
      (a, b) =>
        (droppableRects.get(a.id)?.left ?? 0) -
        (droppableRects.get(b.id)?.left ?? 0),
    )
  const index = columns.findIndex((item) => item.id === (over?.id ?? active.id))
  const target = columns[index + (event.code === 'ArrowRight' ? 1 : -1)]
  const rect = target && droppableRects.get(target.id)
  if (rect)
    return {
      x: args.currentCoordinates.x + rect.left - collisionRect.left,
      y: args.currentCoordinates.y,
    }
}

export function BoardLanding() {
  const { workspace } = useWorkspace()
  return <Navigate to={boardPath(workspace.projects[0])} replace />
}

export function KanbanPage() {
  const { workspace } = useWorkspace()
  const { projectId, boardId } = useParams()
  const project = workspace.projects.find((item) => item.id === projectId)
  const board = project?.boards.find((item) => item.id === boardId)
  if (!project || !board)
    return (
      <section className="board-not-found">
        <h1>That board isn’t in this orbit.</h1>
        <p>
          It may have been deleted, or this browser has a different workspace.
        </p>
        <Link className="button button--primary" to="/boards">
          Open your workspace
        </Link>
      </section>
    )
  return (
    <BoardView
      key={`${project.id}/${board.id}`}
      projectId={project.id}
      board={board}
    />
  )
}

function BoardView({ projectId, board }: { projectId: string; board: Board }) {
  const { workspace, update, updateBoard, blocked, error } = useWorkspace()
  const project = workspace.projects.find((item) => item.id === projectId)!
  const navigate = useNavigate()
  const [editor, setEditor] = useState<Editor | null>(null)
  const [query, setQuery] = useState('')
  const [priority, setPriority] = useState('all')
  const [label, setLabel] = useState('')
  const [active, setActive] = useState<string | null>(null)
  const [announcement, setAnnouncement] = useState('')
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: keyboardCoordinates,
      scrollBehavior: 'auto',
    }),
  )
  const tasks = board.columns.flatMap((column) => column.tasks)
  const dragName = (id: string | number) =>
    board.columns.find((column) => column.id === id)?.name ??
    tasks.find((task) => task.id === id)?.title ??
    'item'
  const labels = [...new Set(tasks.flatMap((task) => task.labels))].sort()
  const filtered = !!query.trim() || priority !== 'all' || label !== ''
  const matches = (task: Task) =>
    (!query.trim() ||
      `${task.title} ${task.description} ${task.labels.join(' ')}`
        .toLowerCase()
        .includes(query.trim().toLowerCase())) &&
    (priority === 'all' || task.priority === priority) &&
    (label === '' || task.labels.includes(label))
  const completed = board.columns
    .filter((column) => column.completed)
    .reduce((sum, column) => sum + column.tasks.length, 0)
  const close = () => setEditor(null)
  const change = (recipe: (board: Board) => Board) =>
    updateBoard(projectId, board.id, recipe)

  function dragEnd(event: DragEndEvent) {
    setActive(null)
    if (filtered || !event.over || event.active.id === event.over.id) return
    const id = String(event.active.id)
    const targetId = String(event.over.id)
    if (event.active.data.current?.type === 'column') {
      change((current) => {
        const from = current.columns.findIndex((column) => column.id === id)
        const to = current.columns.findIndex((column) => column.id === targetId)
        return from < 0 || to < 0
          ? current
          : { ...current, columns: arrayMove(current.columns, from, to) }
      })
    } else {
      change((current) => {
        const source = current.columns.find((column) =>
          column.tasks.some((task) => task.id === id),
        )
        const target = current.columns.find(
          (column) =>
            column.id === targetId ||
            column.tasks.some((task) => task.id === targetId),
        )
        if (!source || !target) return current
        const index = target.tasks.findIndex((task) => task.id === targetId)
        return moveTask(
          current,
          id,
          target.id,
          index < 0 ? target.tasks.length : index,
        )
      })
    }
    setAnnouncement('Board order updated.')
  }

  function saveTask(task: Task, columnId: string, index: number) {
    return change((current) => {
      if (!current.columns.some((column) => column.id === columnId))
        return current
      const withoutTask = {
        ...current,
        columns: current.columns.map((column) => ({
          ...column,
          tasks: column.tasks.filter((item) => item.id !== task.id),
        })),
      }
      return {
        ...withoutTask,
        columns: withoutTask.columns.map((column) => {
          if (column.id !== columnId) return column
          const nextTasks = [...column.tasks]
          nextTasks.splice(Math.min(index, nextTasks.length), 0, task)
          return { ...column, tasks: nextTasks }
        }),
      }
    })
  }

  const filterChange =
    (setter: (value: string) => void) =>
    (event: ChangeEvent<HTMLSelectElement>) =>
      setter(event.target.value)
  return (
    <div className="kanban-page">
      <div className="board-context">
        <Link to="/#projects">
          <ArrowLeft size={15} />
          Projects
        </Link>
        <span>/</span>
        <label className="sr-only" htmlFor="project-switch">
          Project
        </label>
        <select
          id="project-switch"
          value={projectId}
          onChange={(event) =>
            navigate(
              boardPath(
                workspace.projects.find(
                  (item) => item.id === event.target.value,
                )!,
              ),
            )
          }
        >
          {workspace.projects.map((item) => (
            <option value={item.id} key={item.id}>
              {item.name}
            </option>
          ))}
        </select>
        <button
          className="icon-button"
          aria-label="Edit project"
          onClick={() => setEditor({ type: 'edit-project' })}
          disabled={blocked}
        >
          <Settings2 size={16} />
        </button>
        <button
          className="button button--outline compact"
          onClick={() => setEditor({ type: 'new-project' })}
          disabled={blocked || workspace.projects.length >= 50}
        >
          <FolderPlus size={14} />
          New project
        </button>
        <Link to={bugsPath(project)} className="text-link bug-board-link">
          Bug tracking
        </Link>
      </div>
      <div className="board-heading">
        <div>
          <p className="eyebrow">
            <Layers3 size={13} /> KANBAN WORKSPACE
          </p>
          <h1>
            {board.name}
            <span>.</span>
          </h1>
          <p>
            {board.description ||
              'A clear path from your next idea to your next launch.'}
          </p>
        </div>
        <div className="board-primary-actions">
          <button
            className="button button--outline"
            onClick={() =>
              setEditor({ type: 'column', index: board.columns.length })
            }
            disabled={blocked || board.columns.length >= 30}
          >
            <Plus size={16} />
            Add column
          </button>
          <button
            className="button button--primary"
            onClick={() =>
              setEditor({ type: 'task', columnId: board.columns[0].id })
            }
            disabled={blocked}
          >
            <Plus size={16} />
            New task
          </button>
        </div>
      </div>
      <div className="board-tabs-row">
        <nav aria-label="Project boards" className="board-tabs">
          {project.boards.map((item) => (
            <Link
              key={item.id}
              to={boardPath(project, item)}
              aria-current={item.id === board.id ? 'page' : undefined}
              className={
                item.id === board.id ? 'board-tab current' : 'board-tab'
              }
            >
              <Layers3 size={14} />
              {item.name}
            </Link>
          ))}
          <button
            className="icon-button"
            aria-label="New board"
            onClick={() => setEditor({ type: 'new-board' })}
            disabled={blocked || project.boards.length >= 30}
          >
            <Plus size={17} />
          </button>
        </nav>
        <div className="board-tools">
          <button
            className="icon-button"
            aria-label="Board settings"
            onClick={() => setEditor({ type: 'edit-board' })}
            disabled={blocked}
          >
            <Settings2 size={17} />
          </button>
          <button
            className="icon-button"
            aria-label="Export workspace"
            title="Export workspace"
            onClick={() => downloadWorkspace(workspace)}
          >
            <Download size={17} />
          </button>
          <button
            className="icon-button"
            aria-label="Import workspace"
            title="Import workspace"
            onClick={() => setEditor({ type: 'import' })}
          >
            <Upload size={17} />
          </button>
          <button
            className="icon-button"
            aria-label="Delete board"
            title={
              project.boards.length === 1
                ? 'Keep at least one board per project'
                : 'Delete board'
            }
            disabled={blocked || project.boards.length === 1}
            onClick={() => setEditor({ type: 'delete-board' })}
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>
      <div className="board-toolbar">
        <label className="board-search">
          <Search size={16} />
          <input
            type="search"
            aria-label="Search tasks"
            placeholder="Find something in your orbit…"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </label>
        <label className="filter-select">
          <span className="sr-only">Filter by priority</span>
          <select value={priority} onChange={filterChange(setPriority)}>
            <option value="all">All priorities</option>
            {priorities.map((item) => (
              <option value={item} key={item}>
                {item === 'none' ? 'No priority' : item}
              </option>
            ))}
          </select>
        </label>
        <label className="filter-select">
          <span className="sr-only">Filter by label</span>
          <select value={label} onChange={filterChange(setLabel)}>
            <option value="">All labels</option>
            {(label !== '' && !labels.includes(label)
              ? [label, ...labels]
              : labels
            ).map((item) => (
              <option value={item} key={item}>
                {item}
              </option>
            ))}
          </select>
        </label>
        {filtered && (
          <button
            className="text-button"
            onClick={() => {
              setQuery('')
              setPriority('all')
              setLabel('')
            }}
          >
            Clear filters
          </button>
        )}
        <span className="board-progress">
          <CheckCheck size={16} />
          {completed} / {tasks.length} completed
        </span>
      </div>
      {filtered && (
        <p className="board-filter-note" role="status">
          {tasks.filter(matches).length} of {tasks.length} tasks shown. Clear
          filters to drag and reorder; task editing is still available.
        </p>
      )}
      <DndContext
        accessibility={{
          announcements: {
            onDragStart: ({ active }) => `Picked up ${dragName(active.id)}.`,
            onDragOver: ({ over }) =>
              over
                ? `Moving over ${dragName(over.id)}.`
                : 'Outside a drop area.',
            onDragEnd: ({ active, over }) =>
              over
                ? `Dropped ${dragName(active.id)} over ${dragName(over.id)}.`
                : 'Move cancelled.',
            onDragCancel: () => 'Move cancelled.',
          },
        }}
        sensors={sensors}
        collisionDetection={collisionDetection}
        onDragStart={(event) => setActive(String(event.active.id))}
        onDragCancel={() => setActive(null)}
        onDragEnd={dragEnd}
      >
        <div
          className="board-scroll"
          role="region"
          aria-label="Kanban columns"
          tabIndex={0}
        >
          <div className="board-columns">
            <SortableContext
              items={board.columns.map((column) => column.id)}
              strategy={horizontalListSortingStrategy}
            >
              {board.columns.map((column, index) => (
                <BoardColumn
                  key={column.id}
                  column={column}
                  tasks={column.tasks.filter(matches)}
                  filtered={filtered}
                  blocked={blocked}
                  onlyColumn={board.columns.length === 1}
                  onEdit={() => setEditor({ type: 'column', column, index })}
                  onDelete={() => setEditor({ type: 'delete-column', column })}
                  onAddTask={() =>
                    setEditor({ type: 'task', columnId: column.id })
                  }
                  onEditTask={(task) =>
                    setEditor({ type: 'task', task, columnId: column.id })
                  }
                  onDeleteTask={(task) =>
                    setEditor({ type: 'delete-task', task })
                  }
                  onDuplicateTask={(task) => {
                    const copy = {
                      ...task,
                      id: newId(),
                      title: `${task.title.slice(0, 113)} (copy)`,
                    }
                    if (
                      saveTask(
                        copy,
                        column.id,
                        column.tasks.findIndex((item) => item.id === task.id) +
                          1,
                      )
                    )
                      setAnnouncement(`Duplicated ${task.title}.`)
                  }}
                />
              ))}
            </SortableContext>
            <button
              className="new-column-tile"
              onClick={() =>
                setEditor({ type: 'column', index: board.columns.length })
              }
              disabled={blocked || board.columns.length >= 30}
            >
              <Plus size={18} />
              Add a column<span>Make this workflow yours</span>
            </button>
          </div>
        </div>
        <DragOverlay>
          {active && (
            <div className="drag-preview">
              {board.columns.find((column) => column.id === active)?.name ??
                tasks.find((task) => task.id === active)?.title}
            </div>
          )}
        </DragOverlay>
      </DndContext>
      <div className="board-bottom-note">
        <span className={error ? 'unsaved-state' : ''}>
          <span className="status-dot" />
          {error ? 'Check workspace storage notice' : 'Saved in this browser'} ·
          Export a backup to keep your work safe.
        </span>
        <span>Drag by the handles, or edit a task’s column and position.</span>
      </div>
      <p className="sr-only" role="status">
        {announcement}
      </p>
      <button
        className="text-button project-delete"
        disabled={blocked || workspace.projects.length === 1}
        onClick={() => setEditor({ type: 'delete-project' })}
      >
        Delete project
      </button>
      {editor?.type === 'task' && (
        <TaskEditor
          board={board}
          task={editor.task}
          columnId={editor.columnId}
          onSave={saveTask}
          onClose={close}
        />
      )}
      {editor?.type === 'column' && (
        <ColumnEditor
          column={editor.column}
          index={editor.index}
          count={board.columns.length}
          onClose={close}
          onSave={(column, index) =>
            change((current) => {
              const existing = current.columns.find(
                (item) => item.id === column.id,
              )
              const columns = current.columns.filter(
                (item) => item.id !== column.id,
              )
              columns.splice(index, 0, {
                ...column,
                tasks: existing?.tasks ?? [],
              })
              return { ...current, columns }
            })
          }
        />
      )}
      {editor?.type === 'delete-task' && (
        <ConfirmDialog
          title="Delete task?"
          onClose={close}
          onConfirm={() =>
            change((current) => ({
              ...current,
              columns: current.columns.map((column) => ({
                ...column,
                tasks: column.tasks.filter(
                  (task) => task.id !== editor.task.id,
                ),
              })),
            }))
          }
        >
          <p>
            “{editor.task.title}” will be permanently removed. This cannot be
            undone.
          </p>
        </ConfirmDialog>
      )}
      {editor?.type === 'delete-column' && (
        <DeleteColumn
          column={editor.column}
          board={board}
          onClose={close}
          onDelete={(destination) =>
            change((current) => {
              const source = current.columns.find(
                (column) => column.id === editor.column.id,
              )
              if (
                current.columns.length === 1 ||
                !source ||
                (source.tasks.length &&
                  !current.columns.some(
                    (column) =>
                      column.id === destination && column.id !== source.id,
                  ))
              )
                return current
              return {
                ...current,
                columns: current.columns
                  .filter((column) => column.id !== source.id)
                  .map((column) =>
                    column.id === destination
                      ? { ...column, tasks: [...column.tasks, ...source.tasks] }
                      : column,
                  ),
              }
            })
          }
        />
      )}
      {(editor?.type === 'new-board' || editor?.type === 'edit-board') && (
        <EntityEditor
          title={editor.type === 'new-board' ? 'New board' : 'Edit board'}
          initialName={editor.type === 'edit-board' ? board.name : ''}
          initialDescription={
            editor.type === 'edit-board' ? board.description : ''
          }
          onClose={close}
          onSave={(name, description) => {
            if (editor.type === 'edit-board')
              return change((current) => ({ ...current, name, description }))
            const next = { ...createBoard(name), description }
            const saved = update((current) => ({
              ...current,
              projects: current.projects.map((item) =>
                item.id === projectId
                  ? { ...item, boards: [...item.boards, next] }
                  : item,
              ),
            }))
            if (saved) navigate(boardPath(project, next))
            return saved
          }}
        />
      )}
      {(editor?.type === 'new-project' || editor?.type === 'edit-project') && (
        <EntityEditor
          title={editor.type === 'new-project' ? 'New project' : 'Edit project'}
          initialName={editor.type === 'edit-project' ? project.name : ''}
          initialDescription={
            editor.type === 'edit-project' ? project.description : ''
          }
          onClose={close}
          onSave={(name, description) => {
            if (editor.type === 'edit-project')
              return update((current) => ({
                ...current,
                projects: current.projects.map((item) =>
                  item.id === projectId ? { ...item, name, description } : item,
                ),
              }))
            const next = {
              id: newId(),
              name,
              description,
              boards: [createBoard()],
              bugs: [],
            }
            const saved = update((current) => ({
              ...current,
              projects: [...current.projects, next],
            }))
            if (saved) navigate(boardPath(next))
            return saved
          }}
        />
      )}
      {editor?.type === 'delete-board' && (
        <ConfirmDialog
          title="Delete board?"
          onClose={close}
          onConfirm={() => {
            const remaining = project.boards.filter(
              (item) => item.id !== board.id,
            )
            if (!remaining.length) return false
            const saved = update((current) => ({
              ...current,
              projects: current.projects.map((item) =>
                item.id === projectId
                  ? {
                      ...item,
                      boards: item.boards.filter(
                        (entry) => entry.id !== board.id,
                      ),
                    }
                  : item,
              ),
            }))
            if (saved) navigate(boardPath(project, remaining[0]))
            return saved
          }}
        >
          <p>
            Delete “{board.name}” and all its tasks? Export a backup first if
            you may need them. This cannot be undone.
          </p>
        </ConfirmDialog>
      )}
      {editor?.type === 'delete-project' && (
        <ConfirmDialog
          title="Delete project?"
          onClose={close}
          onConfirm={() => {
            const remaining = workspace.projects.filter(
              (item) => item.id !== projectId,
            )
            if (!remaining.length) return false
            const saved = update((current) => ({
              ...current,
              projects: current.projects.filter(
                (item) => item.id !== projectId,
              ),
            }))
            if (saved) navigate(boardPath(remaining[0]))
            return saved
          }}
        >
          <p>
            Delete “{project.name}” with all of its boards, tasks, and bug
            reports? This cannot be undone.
          </p>
        </ConfirmDialog>
      )}
      {editor?.type === 'import' && (
        <ImportWorkspace
          onClose={() => {
            close()
            navigate('/boards')
          }}
        />
      )}
    </div>
  )
}

function DeleteColumn({
  column,
  board,
  onDelete,
  onClose,
}: {
  column: Column
  board: Board
  onDelete: (destination: string) => boolean
  onClose: () => void
}) {
  const alternatives = board.columns.filter((item) => item.id !== column.id)
  const [destination, setDestination] = useState(alternatives[0]?.id ?? '')
  return (
    <ConfirmDialog
      title="Delete column?"
      onClose={onClose}
      onConfirm={() => onDelete(destination)}
    >
      <p>
        Remove “{column.name}” from this workflow?{' '}
        {column.tasks.length
          ? 'Its tasks will be moved, not deleted.'
          : 'This column is empty.'}
      </p>
      {column.tasks.length > 0 && (
        <label className="migration-target">
          Move {column.tasks.length} tasks to
          <select
            value={destination}
            onChange={(event) => setDestination(event.target.value)}
          >
            {alternatives.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
        </label>
      )}
    </ConfirmDialog>
  )
}
