import type { BugReport } from '../workspace/model'

export const statusNames: Record<BugReport['status'], string> = {
  open: 'Open',
  'in-progress': 'In progress',
  resolved: 'Resolved',
  closed: 'Closed',
}
export const severityNames: Record<BugReport['severity'], string> = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
  critical: 'Critical',
}
export const bugReference = (bug: BugReport) =>
  `BUG-${bug.id.slice(0, 8).toUpperCase()}`
export const formatDate = (value: string) =>
  new Date(value).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
