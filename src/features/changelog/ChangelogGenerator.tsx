import { useState, type FormEvent } from 'react'
import { Bug, Layers3, Search } from 'lucide-react'
import { Modal } from '../../components/ui/Modal'
import {
  changelogCategories,
  type ChangelogDraft,
  type ChangelogSource,
  type Project,
} from '../workspace/model'
import { localToday } from '../milestones/presentation'
import { completedWork, sourceKey } from './generation'
export function ChangelogGenerator({
  project,
  onClose,
  onGenerate,
}: {
  project: Project
  onClose: () => void
  onGenerate: (
    metadata: Omit<ChangelogDraft, 'notes'>,
    sources: ChangelogSource[],
    includeReleased: boolean,
  ) => string | undefined
}) {
  const [scope, setScope] = useState('all'),
    [query, setQuery] = useState(''),
    [includeReleased, setIncludeReleased] = useState(false),
    [selection, setSelection] = useState<Record<string, ChangelogSource>>({}),
    [error, setError] = useState('')
  const milestone = project.milestones.find((item) => item.id === scope)
  const visible = completedWork(project).filter(
    (source) =>
      (includeReleased || !source.previouslyReleased) &&
      (scope === 'all' ||
        (!!milestone &&
          (source.kind === 'task'
            ? milestone.taskIds
            : milestone.bugIds
          ).includes(source.id))) &&
      `${source.title} ${source.context}`
        .toLowerCase()
        .includes(query.trim().toLowerCase()),
  )
  const selected = Object.values(selection)
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const failure = onGenerate(
      {
        title: String(form.get('title')).trim(),
        version: String(form.get('version')).trim(),
        releaseDate: String(form.get('releaseDate')),
      },
      selected,
      includeReleased,
    )
    if (failure) setError(failure)
    else onClose()
  }
  return (
    <Modal title="Generate changelog" onClose={onClose}>
      <form className="editor-form changelog-generator" onSubmit={submit}>
        <p className="changelog-help">
          Turn finished work into release notes. Choose what to include, group
          it your way, then polish the draft before releasing.
        </p>
        <label>
          Release name
          <input
            name="title"
            required
            maxLength={120}
            autoFocus
            placeholder="A little closer to launch"
          />
        </label>
        <div className="form-row">
          <label>
            Version
            <input
              name="version"
              required
              maxLength={60}
              placeholder="v1.0.0"
            />
          </label>
          <label>
            Release date
            <input
              type="date"
              name="releaseDate"
              aria-label="Release date"
              required
              defaultValue={localToday()}
            />
          </label>
        </div>
        <label>
          Work scope
          <select
            aria-label="Work scope"
            value={scope}
            onChange={(event) => {
              setScope(event.target.value)
              setSelection({})
            }}
          >
            <option value="all">All completed project work</option>
            {project.milestones.map((item) => (
              <option key={item.id} value={item.id}>
                {item.title}
              </option>
            ))}
          </select>
        </label>
        <label className="changelog-checkbox">
          <input
            type="checkbox"
            checked={includeReleased}
            onChange={(event) => {
              setIncludeReleased(event.target.checked)
              setSelection({})
            }}
          />{' '}
          Include previously released work
        </label>
        <p className="changelog-help">
          Completed task columns and resolved/closed bugs only. Changing scope
          clears your selection; searching keeps it.
        </p>
        <label className="board-search">
          <Search size={15} />
          <input
            type="search"
            aria-label="Search completed work"
            placeholder="Find a finished task or bug…"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </label>
        <div className="changelog-selection-bar">
          <span>
            {selected.length} selected · {visible.length} shown
          </span>
          <button
            type="button"
            className="text-button"
            disabled={
              !visible.length ||
              visible.every((source) => selection[sourceKey(source)])
            }
            onClick={() =>
              setSelection((current) => {
                const next = { ...current }
                for (const source of visible) {
                  if (Object.keys(next).length >= 1000) break
                  next[sourceKey(source)] = next[sourceKey(source)] ?? source
                }
                return next
              })
            }
          >
            Select shown
          </button>
          <button
            type="button"
            className="text-button"
            disabled={!selected.length}
            onClick={() => setSelection({})}
          >
            Clear selection
          </button>
        </div>
        <div
          className="changelog-source-picker"
          role="region"
          aria-label="Completed work"
          tabIndex={0}
        >
          {visible.map((source) => {
            const key = sourceKey(source),
              checked = !!selection[key]
            return (
              <div
                className={`changelog-source-option ${checked ? 'is-selected' : ''}`}
                key={key}
              >
                <label>
                  <input
                    type="checkbox"
                    aria-label={`Include ${source.kind}: ${source.title}`}
                    checked={checked}
                    disabled={!checked && selected.length >= 1000}
                    onChange={(event) =>
                      setSelection((current) => {
                        const next = { ...current }
                        if (event.target.checked) next[key] = source
                        else delete next[key]
                        return next
                      })
                    }
                  />
                  {source.kind === 'bug' ? (
                    <Bug size={15} />
                  ) : (
                    <Layers3 size={15} />
                  )}
                  <span>
                    <strong>{source.title}</strong>
                    <small>
                      {source.context}
                      {source.previouslyReleased
                        ? ' · Previously released'
                        : ''}
                    </small>
                  </span>
                </label>
                {checked && (
                  <select
                    aria-label={`Category for ${source.title}`}
                    value={selection[key].category}
                    onChange={(event) =>
                      setSelection((current) => ({
                        ...current,
                        [key]: {
                          ...source,
                          category: event.target
                            .value as ChangelogSource['category'],
                        },
                      }))
                    }
                  >
                    {changelogCategories.map((name) => (
                      <option key={name}>{name}</option>
                    ))}
                  </select>
                )}
              </div>
            )
          })}
          {!visible.length && (
            <p className="changelog-picker-empty">
              No eligible work in this view. Adjust the scope, finish some work,
              or create an empty draft to write your own notes.
            </p>
          )}
        </div>
        {selected.length >= 1000 && (
          <p className="form-warning">
            Up to 1,000 work items can be included in one changelog.
          </p>
        )}
        <p className="changelog-help">
          Tasks start in Changed; bugs start in Fixed. GitHub issue links are
          included when available. Notes are snapshots and won’t change when
          source work changes.
        </p>
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
            {selected.length ? 'Generate draft' : 'Create empty draft'}
          </button>
        </footer>
      </form>
    </Modal>
  )
}
