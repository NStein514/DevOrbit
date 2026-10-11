import {
  createBoard,
  createWorkspace,
  type Changelog,
} from '../src/features/workspace/model.ts'
export function changelogFixture() {
  const workspace = createWorkspace(),
    project = workspace.projects[0],
    board = project.boards[0]
  const task = {
    id: 'feature',
    title: 'Add offline drafts',
    description: 'Internal details',
    priority: 'medium' as const,
    labels: ['feature'],
    dueDate: '',
    githubIssue: {
      repository: { id: 123, owner: 'octocat', name: 'orbit' },
      number: 42,
      importedAt: '2026-10-01T12:00:00Z',
    },
  }
  board.columns[2].tasks = [task]
  board.columns[0].tasks = [
    { ...task, id: 'unfinished', title: 'Not ready', githubIssue: undefined },
  ]
  const other = createBoard('Mobile')
  other.columns[2].tasks = [
    {
      ...task,
      id: 'mobile',
      title: 'Polish mobile navigation',
      githubIssue: undefined,
    },
  ]
  project.boards.push(other)
  project.bugs = [
    {
      id: 'crash',
      title: 'Fix launch crash',
      description: 'Crash details',
      status: 'resolved',
      severity: 'high',
      steps: '',
      expected: '',
      actual: '',
      environment: '',
      labels: ['bug'],
      createdAt: '2026-10-01T12:00:00Z',
      updatedAt: '2026-10-01T12:00:00Z',
    },
  ]
  project.milestones = [
    {
      id: 'beta',
      title: 'Public beta',
      description: '',
      targetDate: '2026-10-10',
      status: 'completed',
      taskIds: ['feature'],
      bugIds: ['crash'],
      createdAt: '2026-10-01T12:00:00Z',
      updatedAt: '2026-10-01T12:00:00Z',
      completedAt: '2026-10-01T12:00:00Z',
    },
  ]
  return workspace
}
export function changelogEntry(
  id: string,
  changes: Partial<Changelog> = {},
): Changelog {
  return {
    id,
    title: `Release ${id}`,
    version: id,
    releaseDate: '2026-10-10',
    notes: '### Added\n\n- A small win.',
    status: 'draft',
    sources: [],
    createdAt: '2026-10-01T12:00:00Z',
    updatedAt: '2026-10-01T12:00:00Z',
    releasedAt: '',
    ...changes,
  }
}
