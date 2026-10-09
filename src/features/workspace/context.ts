import { createContext, useContext } from 'react'
import type { Board, Workspace } from './model'

export interface WorkspaceContextValue {
  workspace: Workspace
  error: string
  blocked: boolean
  update: (change: (workspace: Workspace) => Workspace) => boolean
  updateBoard: (
    projectId: string,
    boardId: string,
    change: (board: Board) => Board,
  ) => boolean
  replace: (workspace: Workspace) => boolean
}
export const WorkspaceContext = createContext<WorkspaceContextValue | null>(
  null,
)
export function useWorkspace() {
  const context = useContext(WorkspaceContext)
  if (!context) throw new Error('WorkspaceProvider is required')
  return context
}
