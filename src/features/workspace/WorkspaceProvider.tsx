import { useEffect, useRef, useState, type ReactNode } from 'react'
import { WorkspaceContext } from './context'
import { createWorkspace, workspaceSchema, type Workspace } from './model'

const STORAGE_KEY = 'devorbit.workspace.v1'
function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { workspace: createWorkspace(), error: '', blocked: false }
    const parsed = workspaceSchema.safeParse(JSON.parse(raw))
    if (parsed.success)
      return { workspace: parsed.data, error: '', blocked: false }
  } catch (error) {
    if (!(error instanceof SyntaxError))
      return {
        workspace: createWorkspace(),
        error:
          'Browser storage is unavailable. Changes will stay in memory; export a backup before leaving.',
        blocked: false,
      }
  }
  return {
    workspace: createWorkspace(),
    error:
      'Saved workspace could not be read. It has not been overwritten. Import a valid backup to recover, or download the original data before resetting.',
    blocked: true,
  }
}

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState(load)
  const current = useRef(state)

  useEffect(() => {
    const sync = (event: StorageEvent) => {
      if (event.key !== STORAGE_KEY && event.key !== null) return
      const next = load()
      current.current = next
      setState(next)
    }
    window.addEventListener('storage', sync)
    return () => window.removeEventListener('storage', sync)
  }, [])

  const save = (workspace: Workspace) => {
    const parsed = workspaceSchema.safeParse(workspace)
    if (!parsed.success) {
      const next = {
        ...current.current,
        error: `Changes could not be applied: ${parsed.error.issues[0].message}`,
      }
      current.current = next
      setState(next)
      return false
    }
    let error = ''
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(parsed.data))
    } catch {
      error =
        'Your changes are only in memory: browser storage is full or unavailable. Export a backup before leaving.'
    }
    const next = { workspace: parsed.data, error, blocked: false }
    current.current = next
    setState(next)
    return true
  }
  const update = (change: (workspace: Workspace) => Workspace) => {
    if (current.current.blocked) return false
    return save(change(current.current.workspace))
  }

  return (
    <WorkspaceContext.Provider
      value={{
        ...state,
        update,
        replace: save,
        updateBoard: (projectId, boardId, change) =>
          update((workspace) => ({
            ...workspace,
            projects: workspace.projects.map((project) =>
              project.id !== projectId
                ? project
                : {
                    ...project,
                    boards: project.boards.map((board) =>
                      board.id === boardId ? change(board) : board,
                    ),
                  },
            ),
          })),
      }}
    >
      {children}
    </WorkspaceContext.Provider>
  )
}
