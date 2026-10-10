import { test } from 'node:test'
import assert from 'node:assert/strict'
import { changelogFixture, changelogEntry } from '../tests/changelog.fixture.ts'
import {
  workspaceSchema,
  changelogSchema,
  type ChangelogSource,
} from '../src/features/workspace/model.ts'
import {
  completedWork,
  createChangelog,
  generateNotes,
  reviseChangelog,
  projectMarkdown,
  releaseMarkdown,
  releaseFilename,
  assertCurrent,
} from '../src/features/changelog/generation.ts'
const metadata = {
  title: 'First launch',
  version: 'v1.0.0',
  releaseDate: '2026-10-10',
}
test('generates completed tasks and fixed bugs with safe categories and GitHub links without mutating work', () => {
  const workspace = changelogFixture(),
    project = workspace.projects[0],
    before = JSON.stringify(project),
    work = completedWork(project)
  assert.equal(work.length, 3)
  assert.ok(!work.some((item) => item.id === 'unfinished'))
  const entry = createChangelog(
    project,
    metadata,
    work.map((item) => ({
      ...item,
      category: item.kind === 'task' ? 'Added' : 'Fixed',
    })),
    false,
  )
  assert.match(entry.notes, /### Added/)
  assert.match(entry.notes, /### Fixed/)
  assert.match(entry.notes, /https:\/\/github.com\/octocat\/orbit\/issues\/42/)
  assert.ok(!entry.notes.includes('Internal details'))
  assert.equal(entry.sources.length, 3)
  assert.equal(JSON.stringify(project), before)
  project.changelogs = [entry]
  project.boards[0].columns[2].tasks[0].title = 'Renamed work'
  project.bugs = []
  project.milestones = []
  assert.ok(workspaceSchema.safeParse(workspace).success)
  assert.equal(entry.sources[0].title, 'Add offline drafts')
})
test('released source exclusion allows deliberate reuse and rejects reopened work and duplicate versions', () => {
  const project = changelogFixture().projects[0],
    selection = completedWork(project)
  const entry = createChangelog(project, metadata, selection, false)
  project.changelogs = [entry]
  assert.ok(completedWork(project).every((item) => !item.previouslyReleased))
  entry.status = 'released'
  entry.releasedAt = new Date().toISOString()
  assert.ok(completedWork(project).every((item) => item.previouslyReleased))
  assert.throws(
    () =>
      createChangelog(project, { ...metadata, version: ' v1.0.0 ' }, [], false),
    /already has/,
  )
  assert.throws(
    () =>
      createChangelog(
        project,
        { ...metadata, version: 'v2' },
        selection,
        false,
      ),
    /released in another tab/,
  )
  assert.equal(
    createChangelog(project, { ...metadata, version: 'v2' }, selection, true)
      .sources.length,
    3,
  )
  project.boards[0].columns[2].completed = false
  assert.throws(
    () =>
      createChangelog(project, { ...metadata, version: 'v2' }, selection, true),
    /reopened or removed/,
  )
})
test('draft edits and status actions reject stale, removed and released originals and retain snapshots', () => {
  const project = changelogFixture().projects[0],
    entry = createChangelog(project, metadata, completedWork(project), false)
  project.changelogs = [entry]
  const revised = reviseChangelog(project, entry, {
    ...metadata,
    notes: 'Custom notes',
  })
  assert.deepEqual(revised.sources, entry.sources)
  assert.equal(revised.createdAt, entry.createdAt)
  project.changelogs = [revised]
  assert.throws(() => assertCurrent(project, entry), /another tab/)
  assert.throws(
    () =>
      reviseChangelog(project, entry, { ...metadata, notes: 'Overwritten' }),
    /another tab/,
  )
  revised.status = 'released'
  revised.releasedAt = new Date().toISOString()
  assert.throws(
    () =>
      reviseChangelog(project, revised, { ...metadata, notes: 'Overwritten' }),
    /Return this release/,
  )
  project.changelogs = []
  assert.throws(() => assertCurrent(project, entry), /removed/)
})
test('exports only released entries newest first and escapes title syntax', () => {
  const project = changelogFixture().projects[0]
  project.changelogs = [
    changelogEntry('draft'),
    changelogEntry('old', {
      status: 'released',
      releaseDate: '2026-09-01',
      releasedAt: '2026-09-01T00:00:00Z',
    }),
    changelogEntry('new', {
      status: 'released',
      releasedAt: '2026-10-10T00:00:00Z',
    }),
  ]
  const markdown = projectMarkdown(project)
  assert.ok(markdown.indexOf('## new') < markdown.indexOf('## old'))
  assert.ok(!markdown.includes('Release draft'))
  assert.match(
    generateNotes([
      {
        kind: 'task',
        id: 'x',
        title: '<script>*alert*</script>',
        category: 'Security',
      },
    ]),
    /\\<script\\>/,
  )
  assert.match(releaseMarkdown({ ...metadata, notes: 'Manual' }), /v1\\.0\\.0/)
  assert.equal(
    releaseFilename('../../bad/version'),
    'changelog-..-..-bad-version.md',
  )
})
test('legacy backups migrate and invalid release state, sources, IDs and versions fail validation', () => {
  const workspace = changelogFixture(),
    legacy = JSON.parse(JSON.stringify(workspace))
  delete legacy.projects[0].changelogs
  assert.deepEqual(workspaceSchema.parse(legacy).projects[0].changelogs, [])
  assert.ok(
    !changelogSchema.safeParse(changelogEntry('bad', { status: 'released' }))
      .success,
  )
  assert.ok(
    !changelogSchema.safeParse(
      changelogEntry('bad', {
        status: 'released',
        releasedAt: '2026-10-10T00:00:00Z',
        notes: '  ',
      }),
    ).success,
  )
  const source: ChangelogSource = {
    kind: 'task',
    id: 'removed',
    title: 'Historical',
    category: 'Added',
  }
  assert.ok(
    !changelogSchema.safeParse(
      changelogEntry('duplicate', { sources: [source, source] }),
    ).success,
  )
  workspace.projects[0].changelogs = [
    changelogEntry('a', { version: 'V1' }),
    changelogEntry('b', { version: 'v1' }),
  ]
  assert.ok(!workspaceSchema.safeParse(workspace).success)
  workspace.projects[0].changelogs = [changelogEntry(workspace.projects[0].id)]
  assert.ok(!workspaceSchema.safeParse(workspace).success)
})
test('enforces changelog, selection and note limits and supports a blank draft', () => {
  const project = changelogFixture().projects[0]
  assert.equal(createChangelog(project, metadata, [], false).notes, '')
  assert.throws(
    () => createChangelog(project, { ...metadata, title: ' ' }, [], false),
    /Check/,
  )
  project.changelogs = Array.from({ length: 100 }, (_, i) =>
    changelogEntry(`v${i}`),
  )
  assert.throws(
    () => createChangelog(project, metadata, [], false),
    /100 changelogs/,
  )
  project.changelogs = []
  const task = project.boards[0].columns[2].tasks[0]
  project.boards[0].columns[2].tasks = Array.from({ length: 1000 }, (_, i) => ({
    ...task,
    id: `task-${i}`,
    title: '*'.repeat(120),
  }))
  assert.throws(
    () =>
      createChangelog(
        project,
        metadata,
        completedWork(project).slice(0, 1000),
        false,
      ),
    /100,000/,
  )
  assert.ok(
    !changelogSchema.safeParse(
      changelogEntry('long', { notes: 'x'.repeat(100001) }),
    ).success,
  )
  assert.ok(
    !changelogSchema.safeParse(
      changelogEntry('many', {
        sources: Array.from({ length: 1001 }, (_, i) => ({
          kind: 'task',
          id: `source-${i}`,
          title: 'Work',
          category: 'Changed',
        })),
      }),
    ).success,
  )
})
