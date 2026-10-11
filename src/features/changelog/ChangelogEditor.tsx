import { useState, type FormEvent } from 'react'
import { Modal } from '../../components/ui/Modal'
import type { Changelog, ChangelogDraft } from '../workspace/model'
import { MarkdownPreview } from './MarkdownPreview'
export function ChangelogEditor({
  entry,
  onClose,
  onSave,
}: {
  entry: Changelog
  onClose: () => void
  onSave: (draft: ChangelogDraft) => string | undefined
}) {
  const [notes, setNotes] = useState(entry.notes),
    [preview, setPreview] = useState(false),
    [error, setError] = useState('')
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const failure = onSave({
      title: String(form.get('title')).trim(),
      version: String(form.get('version')).trim(),
      releaseDate: String(form.get('releaseDate')),
      notes,
    })
    if (failure) setError(failure)
    else onClose()
  }
  return (
    <Modal title="Edit changelog" onClose={onClose}>
      <form className="editor-form changelog-editor" onSubmit={submit}>
        <label>
          Release name
          <input
            name="title"
            required
            maxLength={120}
            defaultValue={entry.title}
            autoFocus
          />
        </label>
        <div className="form-row">
          <label>
            Version
            <input
              name="version"
              required
              maxLength={60}
              defaultValue={entry.version}
            />
          </label>
          <label>
            Release date
            <input
              type="date"
              name="releaseDate"
              aria-label="Release date"
              required
              defaultValue={entry.releaseDate}
            />
          </label>
        </div>
        <label>
          Release notes
          <textarea
            aria-label="Release notes"
            rows={14}
            maxLength={100000}
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            placeholder="### Added&#10;&#10;- Tell the story of your release."
          />
        </label>
        <div className="changelog-selection-bar">
          <span>{notes.length.toLocaleString()} / 100,000 characters</span>
          <button
            className="text-button"
            type="button"
            aria-expanded={preview}
            onClick={() => setPreview(!preview)}
          >
            {preview ? 'Hide preview' : 'Show preview'}
          </button>
        </div>
        <p className="changelog-help">
          Use Markdown headings, lists, links, and code. Your selected work is
          kept as a reference; editing notes does not change those snapshots.
          Images and raw HTML are not rendered in the preview.
        </p>
        {preview && (
          <section
            className="changelog-editor-preview"
            aria-label="Draft preview"
          >
            <MarkdownPreview
              notes={notes || '*Your release story starts here.*'}
            />
          </section>
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
          <button className="button button--primary" type="submit">
            Save changelog
          </button>
        </footer>
      </form>
    </Modal>
  )
}
