import {
  changelogCategories,
  changelogSchema,
  isActiveBug,
  newId,
  type Changelog,
  type ChangelogDraft,
  type ChangelogSource,
  type Project,
} from '../workspace/model.ts'
import { issueUrl } from '../../../shared/github.ts'
export const sourceKey = (source: Pick<ChangelogSource, 'kind' | 'id'>) =>
  `${source.kind}:${source.id}`
export interface CompletedWork extends ChangelogSource {
  context: string
  previouslyReleased: boolean
}
export function completedWork(project: Project): CompletedWork[] {
  const released = new Set(
    project.changelogs
      .filter((entry) => entry.status === 'released')
      .flatMap((entry) => entry.sources.map(sourceKey)),
  )
  const tasks = project.boards.flatMap((board) =>
    board.columns
      .filter((column) => column.completed)
      .flatMap((column) =>
        column.tasks.map((task) => ({
          kind: 'task' as const,
          id: task.id,
          title: task.title,
          category: 'Changed' as const,
          githubIssue: task.githubIssue,
          context: `${board.name} · ${column.name}`,
          previouslyReleased: released.has(`task:${task.id}`),
        })),
      ),
  )
  const bugs = project.bugs
    .filter((bug) => !isActiveBug(bug))
    .map((bug) => ({
      kind: 'bug' as const,
      id: bug.id,
      title: bug.title,
      category: 'Fixed' as const,
      githubIssue: bug.githubIssue,
      context: `${bug.severity} severity · ${bug.status}`,
      previouslyReleased: released.has(`bug:${bug.id}`),
    }))
  return [...tasks, ...bugs]
}
// Source titles are literal text, even if they contain Markdown or HTML.
export const markdownText = (value: string) =>
  value.replace(/\s+/g, ' ').replace(/([\\`*_{}[\]()<>#+.!|~-])/g, '\\$1')
export function generateNotes(sources: ChangelogSource[]) {
  return changelogCategories
    .map((category) => {
      const entries = sources.filter((source) => source.category === category)
      return entries.length
        ? `### ${category}\n\n${entries.map((source) => `- ${markdownText(source.title)}${source.githubIssue ? ` ([#${source.githubIssue.number}](${issueUrl(source.githubIssue)}))` : ''}`).join('\n')}`
        : ''
    })
    .filter(Boolean)
    .join('\n\n')
}
export function releaseMarkdown(entry: Changelog | ChangelogDraft) {
  return `## ${markdownText(entry.version)} — ${entry.releaseDate}\n\n${markdownText(entry.title)}\n\n${entry.notes.trim()}\n`
}
export function projectMarkdown(project: Project) {
  const entries = project.changelogs
    .filter((entry) => entry.status === 'released')
    .sort(
      (a, b) =>
        b.releaseDate.localeCompare(a.releaseDate) ||
        b.releasedAt.localeCompare(a.releasedAt) ||
        a.id.localeCompare(b.id),
    )
  return `# Changelog\n\n${markdownText(project.name)}\n\n${entries.map(releaseMarkdown).join('\n')}`
}
export function downloadMarkdown(markdown: string, filename: string) {
  const url = URL.createObjectURL(
    new Blob([markdown], { type: 'text/markdown;charset=utf-8' }),
  )
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
export const releaseFilename = (version: string) =>
  `changelog-${version.replace(/[^a-zA-Z0-9._-]/g, '-').slice(0, 60)}.md`
export function createChangelog(
  project: Project,
  metadata: Omit<ChangelogDraft, 'notes'>,
  selection: ChangelogSource[],
  includeReleased: boolean,
): Changelog {
  if (project.changelogs.length >= 100)
    throw new Error('This project has reached its limit of 100 changelogs.')
  if (
    project.changelogs.some(
      (entry) =>
        entry.version.toLowerCase() === metadata.version.trim().toLowerCase(),
    )
  )
    throw new Error(
      'This version already has a changelog. Choose a different version.',
    )
  const available = new Map(
    completedWork(project).map((source) => [sourceKey(source), source]),
  )
  const sources = selection.map((selected) => {
    const current = available.get(sourceKey(selected))
    if (!current)
      throw new Error(
        'Some selected work was reopened or removed. Close and reopen the generator to refresh the list.',
      )
    if (current.previouslyReleased && !includeReleased)
      throw new Error(
        'Some selected work was released in another tab. Refresh the list or enable previously released work.',
      )
    return {
      kind: current.kind,
      id: current.id,
      title: current.title,
      githubIssue: current.githubIssue,
      category: selected.category,
    }
  })
  const notes = generateNotes(sources)
  if (notes.length > 100000)
    throw new Error(
      'Generated notes exceed 100,000 characters. Select fewer work items.',
    )
  const timestamp = new Date().toISOString()
  const result = changelogSchema.safeParse({
    ...metadata,
    id: newId(),
    notes,
    sources,
    status: 'draft',
    createdAt: timestamp,
    updatedAt: timestamp,
    releasedAt: '',
  })
  if (!result.success)
    throw new Error(
      'Check the name, version, date, and selection limits before generating.',
    )
  return result.data
}
export function reviseChangelog(
  project: Project,
  original: Changelog,
  draft: ChangelogDraft,
): Changelog {
  const current = assertCurrent(project, original)
  if (current.status !== 'draft')
    throw new Error('Return this release to draft before editing.')
  if (
    project.changelogs.some(
      (entry) =>
        entry.id !== current.id &&
        entry.version.toLowerCase() === draft.version.trim().toLowerCase(),
    )
  )
    throw new Error(
      'This version already has a changelog. Choose a different version.',
    )
  const result = changelogSchema.safeParse({
    ...current,
    ...draft,
    updatedAt: new Date().toISOString(),
  })
  if (!result.success)
    throw new Error(
      'Check the name, version, date, and note length before saving.',
    )
  return result.data
}
export function assertCurrent(project: Project, original: Changelog) {
  const current = project.changelogs.find((entry) => entry.id === original.id)
  if (!current || JSON.stringify(current) !== JSON.stringify(original))
    throw new Error(
      'This changelog changed in another tab or was removed. Close and reopen this dialog before continuing.',
    )
  return current
}
