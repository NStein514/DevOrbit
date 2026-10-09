import { z } from 'zod'

export const colors = [
  'sage',
  'blue',
  'lavender',
  'amber',
  'rose',
  'slate',
] as const
export const priorities = ['none', 'low', 'medium', 'high', 'urgent'] as const
const name = z.string().trim().min(1).max(120)
const id = z
  .string()
  .min(1)
  .max(100)
  .regex(/^[a-zA-Z0-9_-]+$/)
export const bugStatuses = [
  'open',
  'in-progress',
  'resolved',
  'closed',
] as const
export const bugSeverities = ['low', 'medium', 'high', 'critical'] as const
export const bugSchema = z.object({
  id,
  title: name,
  description: z.string().max(10000),
  status: z.enum(bugStatuses),
  severity: z.enum(bugSeverities),
  steps: z.string().max(10000),
  expected: z.string().max(10000),
  actual: z.string().max(10000),
  environment: z.string().max(1000),
  labels: z.array(z.string().trim().min(1).max(30)).max(12),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
})
export type BugReport = z.infer<typeof bugSchema>
export type BugDraft = Omit<BugReport, 'id' | 'createdAt' | 'updatedAt'>
export const isActiveBug = (bug: BugReport) =>
  bug.status === 'open' || bug.status === 'in-progress'
export const bugsPath = (project: { id: string }) =>
  `/projects/${project.id}/bugs`

export const taskSchema = z.object({
  id,
  title: name,
  description: z.string().max(10000),
  priority: z.enum(priorities),
  labels: z.array(z.string().trim().min(1).max(30)).max(12),
  dueDate: z.union([z.iso.date(), z.literal('')]),
})
export const columnSchema = z.object({
  id,
  name,
  color: z.enum(colors),
  limit: z.number().int().min(0).max(1000),
  completed: z.boolean(),
  tasks: z.array(taskSchema).max(1000),
})
export const boardSchema = z.object({
  id,
  name,
  description: z.string().max(1000),
  columns: z.array(columnSchema).min(1).max(30),
})
export const projectSchema = z.object({
  id,
  name,
  description: z.string().max(1000),
  // Older version 1 workspaces did not have bug reports.
  bugs: z.array(bugSchema).max(1000).default([]),
  boards: z.array(boardSchema).min(1).max(30),
})
export const workspaceSchema = z
  .object({
    version: z.literal(1),
    projects: z.array(projectSchema).min(1).max(50),
  })
  .superRefine((workspace, context) => {
    const ids = new Set<string>()
    const unique = (value: string) => {
      if (ids.has(value))
        context.addIssue({
          code: 'custom',
          message: 'IDs must be unique across the workspace.',
        })
      ids.add(value)
    }
    workspace.projects.forEach((project) => {
      unique(project.id)
      project.bugs.forEach((bug) => unique(bug.id))
      project.boards.forEach((board) => {
        unique(board.id)
        board.columns.forEach((column) => {
          unique(column.id)
          column.tasks.forEach((task) => unique(task.id))
        })
      })
    })
  })

export type Task = z.infer<typeof taskSchema>
export type Column = z.infer<typeof columnSchema>
export type Board = z.infer<typeof boardSchema>
export type Project = z.infer<typeof projectSchema>
export type Workspace = z.infer<typeof workspaceSchema>

export const newId = () => crypto.randomUUID()
export const boardPath = (project: Project, board = project.boards[0]) =>
  `/projects/${project.id}/boards/${board.id}`

export function createBoard(name = 'My workflow'): Board {
  return {
    id: newId(),
    name,
    description: '',
    columns: [
      {
        id: newId(),
        name: 'Backlog',
        color: 'slate',
        limit: 0,
        completed: false,
        tasks: [],
      },
      {
        id: newId(),
        name: 'In progress',
        color: 'sage',
        limit: 0,
        completed: false,
        tasks: [],
      },
      {
        id: newId(),
        name: 'Done',
        color: 'lavender',
        limit: 0,
        completed: true,
        tasks: [],
      },
    ],
  }
}

export function createWorkspace(): Workspace {
  const board = createBoard()
  board.id = 'devorbit-board'
  board.columns = board.columns.map((column, index) => ({
    ...column,
    id: `devorbit-column-${index}`,
  }))
  return {
    version: 1,
    projects: [
      {
        id: 'devorbit',
        name: 'DevOrbit',
        description: 'A calmer mission control for side projects.',
        boards: [board],
        bugs: [],
      },
    ],
  }
}

export function moveTask(
  board: Board,
  taskId: string,
  columnId: string,
  index: number,
): Board {
  const task = board.columns
    .flatMap((column) => column.tasks)
    .find((item) => item.id === taskId)
  if (!task || !board.columns.some((column) => column.id === columnId))
    return board
  return {
    ...board,
    columns: board.columns.map((column) => {
      const tasks = column.tasks.filter((item) => item.id !== taskId)
      if (column.id === columnId)
        tasks.splice(Math.max(0, Math.min(index, tasks.length)), 0, task)
      return { ...column, tasks }
    }),
  }
}

export function downloadWorkspace(workspace: Workspace) {
  const url = URL.createObjectURL(
    new Blob([JSON.stringify(workspace, null, 2)], {
      type: 'application/json',
    }),
  )
  const link = document.createElement('a')
  link.href = url
  link.download = `devorbit-workspace-${new Date().toISOString().slice(0, 10)}.json`
  link.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
