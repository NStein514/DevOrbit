import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  createWorkspace,
  workspaceSchema,
} from '../src/features/workspace/model.ts'
import { importIssue } from '../src/features/github/import.ts'
import type { GitHubItem } from '../shared/github.ts'
const repo = { id: 101, owner: 'octocat', name: 'orbit' }
const issue: GitHubItem = {
  id: 201,
  number: 12,
  title: 'Landing',
  body: 'Notes',
  state: 'closed',
  labels: ['bug'],
  updatedAt: '2026-10-10T12:00:00Z',
  draft: false,
  merged: false,
}
function fixture() {
  const workspace = createWorkspace()
  workspace.projects[0].githubRepository = repo
  return workspace
}
const draft = {
  kind: 'bug' as const,
  title: 'Landing',
  description: 'Notes',
  boardId: 'devorbit-board',
  columnId: 'devorbit-column-2',
}
test('imports preserve schema validity, limit labels, block duplicates and reject stale repositories or destinations', () => {
  const workspace = fixture(),
    project = workspace.projects[0]
  const imported = importIssue(
    project,
    repo,
    {
      ...issue,
      labels: [
        'x'.repeat(60),
        ...Array.from({ length: 15 }, (_, i) => `label${i}`),
      ],
    },
    draft,
  )
  assert.equal(imported.bugs[0].labels.length, 12)
  assert.equal(imported.bugs[0].labels[0].length, 30)
  assert.equal(imported.bugs[0].status, 'closed')
  assert(
    workspaceSchema.safeParse({ ...workspace, projects: [imported] }).success,
  )
  assert.throws(
    () => importIssue(imported, repo, issue, { ...draft, kind: 'task' }),
    /already imported/,
  )
  assert.throws(
    () =>
      importIssue(
        { ...project, githubRepository: undefined },
        repo,
        issue,
        draft,
      ),
    /repository changed/,
  )
  assert.throws(
    () =>
      importIssue(project, repo, issue, {
        ...draft,
        kind: 'task',
        columnId: 'missing',
      }),
    /destination was removed/,
  )
  assert.throws(
    () => importIssue(project, repo, issue, { ...draft, title: '  ' }),
    /title/,
  )
  const task = importIssue(project, repo, issue, { ...draft, kind: 'task' })
  assert.equal(task.boards[0].columns[2].tasks[0].githubIssue?.number, 12)
})
test('respects task and bug limits without changing the original workspace', () => {
  const project = fixture().projects[0],
    withBug = importIssue(project, repo, issue, draft)
  withBug.bugs = Array.from({ length: 1000 }, (_, i) => ({
    ...withBug.bugs[0],
    id: `bug${i}`,
    githubIssue: undefined,
  }))
  assert.throws(() => importIssue(withBug, repo, issue, draft), /1,000 bug/)
  const withTask = importIssue(project, repo, issue, {
      ...draft,
      kind: 'task',
    }),
    column = withTask.boards[0].columns[2]
  column.tasks = Array.from({ length: 1000 }, (_, i) => ({
    ...column.tasks[0],
    id: `task${i}`,
    githubIssue: undefined,
  }))
  assert.throws(
    () => importIssue(withTask, repo, issue, { ...draft, kind: 'task' }),
    /1,000 tasks/,
  )
  assert.equal(project.bugs.length, 0)
  assert.equal(project.boards[0].columns[2].tasks.length, 0)
})
test('legacy backups stay compatible and malformed GitHub references are rejected', () => {
  const workspace = createWorkspace()
  assert(workspaceSchema.safeParse(workspace).success)
  for (const githubRepository of [
    { ...repo, owner: 'https://evil.example' },
    { ...repo, name: '..' },
    { ...repo, id: -1 },
    { ...repo, name: 'orbit?token=secret' },
  ])
    assert.equal(
      workspaceSchema.safeParse({
        ...workspace,
        projects: [{ ...workspace.projects[0], githubRepository }],
      }).success,
      false,
    )
  const imported = importIssue(fixture().projects[0], repo, issue, draft)
  const invalid = {
    ...imported,
    bugs: [
      {
        ...imported.bugs[0],
        githubIssue: { repository: repo, number: 0, importedAt: 'not a date' },
      },
    ],
  }
  assert.equal(
    workspaceSchema.safeParse({ ...workspace, projects: [invalid] }).success,
    false,
  )
})
