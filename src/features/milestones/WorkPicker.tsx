import { useState } from 'react'
import { Bug, CheckCheck, Layers3, Search } from 'lucide-react'
import { isActiveBug, type Project } from '../workspace/model'

export function WorkPicker({
  project,
  taskIds,
  bugIds,
  onChange,
}: {
  project: Project
  taskIds: string[]
  bugIds: string[]
  onChange: (taskIds: string[], bugIds: string[]) => void
}) {
  const [query, setQuery] = useState('')
  const [kind, setKind] = useState('all')
  const [selectedOnly, setSelectedOnly] = useState(false)
  const tasks = project.boards.flatMap((board) =>
    board.columns.flatMap((column) =>
      column.tasks.map((task) => ({
        id: task.id,
        title: task.title,
        context: `${board.name} · ${column.name}`,
        kind: 'task',
        done: column.completed,
      })),
    ),
  )
  const bugs = project.bugs.map((bug) => ({
    id: bug.id,
    title: bug.title,
    context: `${bug.severity} severity · ${bug.status.replace('-', ' ')}`,
    kind: 'bug',
    done: !isActiveBug(bug),
  }))
  const selected = new Set([...taskIds, ...bugIds])
  const items = [...tasks, ...bugs].filter(
    (item) =>
      (kind === 'all' || kind === item.kind) &&
      (!selectedOnly || selected.has(item.id)) &&
      `${item.title} ${item.context}`
        .toLowerCase()
        .includes(query.trim().toLowerCase()),
  )
  function toggle(id: string, type: string, checked: boolean) {
    const update = (ids: string[]) =>
      checked ? [...ids, id] : ids.filter((value) => value !== id)
    onChange(
      type === 'task' ? update(taskIds) : taskIds,
      type === 'bug' ? update(bugIds) : bugIds,
    )
  }
  return (
    <fieldset className="milestone-work-picker">
      <legend>Linked work</legend>
      <p className="milestone-hint">
        Choose tasks and bug reports from this project. Work can contribute to
        more than one milestone.
      </p>
      <div className="work-picker-filters">
        <label className="board-search">
          <Search size={14} />
          <input
            type="search"
            aria-label="Search available work"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Find tasks or bugs…"
          />
        </label>
        <select
          aria-label="Work type"
          value={kind}
          onChange={(event) => setKind(event.target.value)}
        >
          <option value="all">Tasks & bugs</option>
          <option value="task">Tasks</option>
          <option value="bug">Bugs</option>
        </select>
      </div>
      <div className="work-picker-summary">
        <span>
          {taskIds.length} tasks · {bugIds.length} bugs selected
        </span>
        <label>
          <input
            type="checkbox"
            checked={selectedOnly}
            onChange={(event) => setSelectedOnly(event.target.checked)}
          />{' '}
          Selected only
        </label>
      </div>
      <div
        className="work-picker-list"
        tabIndex={0}
        role="region"
        aria-label="Available work"
      >
        {items.length ? (
          items.map((item) => (
            <label className="work-picker-item" key={item.id}>
              <input
                type="checkbox"
                aria-label={`Link ${item.kind}: ${item.title}`}
                checked={selected.has(item.id)}
                disabled={
                  !selected.has(item.id) &&
                  (item.kind === 'task' ? taskIds.length : bugIds.length) >=
                    1000
                }
                onChange={(event) =>
                  toggle(item.id, item.kind, event.target.checked)
                }
              />
              {item.kind === 'task' ? <Layers3 size={15} /> : <Bug size={15} />}
              <span>
                <strong>{item.title}</strong>
                <small>{item.context}</small>
              </span>
              {item.done && (
                <CheckCheck size={16} aria-label="Completed work" />
              )}
            </label>
          ))
        ) : (
          <p className="work-picker-empty">
            {tasks.length + bugs.length
              ? 'No matching work. Try another search or filter.'
              : 'Create tasks on a Kanban board or report bugs, then link them here.'}
          </p>
        )}
      </div>
      <p className="milestone-hint">
        Tasks count as done in completed columns; bugs count as done when
        resolved or closed. Deleting work removes its links.
      </p>
    </fieldset>
  )
}
