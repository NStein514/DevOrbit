import { newId, type Project } from '../workspace/model.ts'
import type {
  GitHubItem,
  IssueRef,
  RepositoryRef,
} from '../../../shared/github.ts'

export const matchesIssue = (
  source: IssueRef | undefined,
  repo: RepositoryRef,
  number: number,
) => source?.repository.id === repo.id && source.number === number
export function findImported(
  project: Project,
  repo: RepositoryRef,
  number: number,
) {
  const bug = project.bugs.find((bug) =>
    matchesIssue(bug.githubIssue, repo, number),
  )
  if (bug) return { kind: 'bug' as const, id: bug.id, boardId: '' }
  for (const board of project.boards)
    for (const column of board.columns) {
      const task = column.tasks.find((task) =>
        matchesIssue(task.githubIssue, repo, number),
      )
      if (task) return { kind: 'task' as const, id: task.id, boardId: board.id }
    }
  return null
}
export interface ImportDraft {
  kind: 'task' | 'bug'
  title: string
  description: string
  boardId: string
  columnId: string
}
export function importIssue(
  project: Project,
  repo: RepositoryRef,
  issue: GitHubItem,
  draft: ImportDraft,
): Project {
  if (project.githubRepository?.id !== repo.id)
    throw new Error(
      'The linked repository changed. Close this dialog and refresh.',
    )
  if (findImported(project, repo, issue.number))
    throw new Error('This issue is already imported in this project.')
  const now = new Date().toISOString(),
    githubIssue = { repository: repo, number: issue.number, importedAt: now }
  const labels = [
    ...new Set(
      issue.labels.map((label) => label.trim().slice(0, 30)).filter(Boolean),
    ),
  ].slice(0, 12)
  const common = {
    id: newId(),
    title: draft.title.trim(),
    description: draft.description.trim(),
    labels,
    githubIssue,
  }
  if (
    !common.title ||
    common.title.length > 120 ||
    common.description.length > 10000
  )
    throw new Error(
      'Use a title of 1–120 characters and a description of up to 10,000 characters.',
    )
  if (draft.kind === 'bug') {
    if (project.bugs.length >= 1000)
      throw new Error(
        'This project has reached its limit of 1,000 bug reports.',
      )
    return {
      ...project,
      bugs: [
        ...project.bugs,
        {
          ...common,
          status: issue.state === 'closed' ? 'closed' : 'open',
          severity: 'medium',
          steps: '',
          expected: '',
          actual: '',
          environment: '',
          createdAt: now,
          updatedAt: now,
        },
      ],
    }
  }
  const board = project.boards.find((board) => board.id === draft.boardId),
    column = board?.columns.find((column) => column.id === draft.columnId)
  if (!column)
    throw new Error(
      'The destination was removed. Choose an available board and column.',
    )
  if (column.tasks.length >= 1000)
    throw new Error('This column has reached its limit of 1,000 tasks.')
  return {
    ...project,
    boards: project.boards.map((board) =>
      board.id !== draft.boardId
        ? board
        : {
            ...board,
            columns: board.columns.map((column) =>
              column.id !== draft.columnId
                ? column
                : {
                    ...column,
                    tasks: [
                      ...column.tasks,
                      { ...common, priority: 'none', dueDate: '' },
                    ],
                  },
            ),
          },
    ),
  }
}
