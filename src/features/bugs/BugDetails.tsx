import { ArrowLeft, Pencil, Trash2 } from 'lucide-react'
import { RelatedMilestones } from '../milestones/RelatedMilestones'
import { Link } from 'react-router-dom'
import { bugStatuses, type BugReport } from '../workspace/model'
import {
  bugReference,
  formatDate,
  severityNames,
  statusNames,
} from './presentation'

export function BugDetails({
  bug,
  listPath,
  blocked,
  onEdit,
  onDelete,
  onStatus,
}: {
  bug: BugReport
  listPath: string
  blocked: boolean
  onEdit: () => void
  onDelete: () => void
  onStatus: (status: BugReport['status']) => void
}) {
  return (
    <>
      <Link className="text-link bug-back" to={listPath}>
        <ArrowLeft size={15} /> All bug reports
      </Link>
      <div className="page-heading bug-detail-heading">
        <div>
          <p className="eyebrow">{bugReference(bug)}</p>
          <h1>{bug.title}</h1>
          <p>
            Reported {formatDate(bug.createdAt)} · Updated{' '}
            {formatDate(bug.updatedAt)}
          </p>
        </div>
        <div className="bug-actions">
          <button
            className="button button--outline"
            disabled={blocked}
            onClick={onEdit}
          >
            <Pencil size={15} /> Edit bug
          </button>
          <button
            className="icon-button bug-delete"
            disabled={blocked}
            onClick={onDelete}
            aria-label={`Delete bug ${bug.title}`}
          >
            <Trash2 size={17} />
          </button>
        </div>
      </div>
      <RelatedMilestones bugId={bug.id} />
      <div className="bug-detail-layout">
        <div className="bug-detail-content">
          {(
            [
              ['Description', bug.description],
              ['Steps to reproduce', bug.steps],
              ['Expected behavior', bug.expected],
              ['Actual behavior', bug.actual],
            ] as const
          ).map(([heading, text]) => (
            <section className="bug-detail-section" key={heading}>
              <h2>{heading}</h2>
              <p className={text ? '' : 'bug-empty-value'}>
                {text || 'Not provided yet.'}
              </p>
            </section>
          ))}
        </div>
        <aside className="bug-properties" aria-label="Bug properties">
          <h2>Flight log</h2>
          <label>
            Status
            <select
              aria-label="Bug status"
              value={bug.status}
              disabled={blocked}
              onChange={(event) =>
                onStatus(event.target.value as BugReport['status'])
              }
            >
              {bugStatuses.map((status) => (
                <option key={status} value={status}>
                  {statusNames[status]}
                </option>
              ))}
            </select>
          </label>
          <p className="bug-property-label">Severity</p>
          <span className={`bug-severity severity-${bug.severity}`}>
            <span />
            {severityNames[bug.severity]}
          </span>
          <h3>Environment</h3>
          <p>{bug.environment || 'Not provided yet.'}</p>
          <h3>Labels</h3>
          <div className="bug-labels">
            {bug.labels.length ? (
              bug.labels.map((label) => <span key={label}>{label}</span>)
            ) : (
              <p>No labels yet.</p>
            )}
          </div>
          <div className="bug-lifecycle-note">
            Resolved means a fix is ready to verify. Close a verified report, or
            set it to Open to investigate again.
          </div>
        </aside>
      </div>
    </>
  )
}
