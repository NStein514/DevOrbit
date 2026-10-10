import { createContext, useContext } from 'react'
import type { Phase, Settings, TimerState } from './model'

export interface PomodoroValue {
  timer: TimerState
  remaining: number
  error: string
  blocked: boolean
  announcement: string
  toggle: () => void
  restart: () => void
  skip: () => void
  select: (phase: Phase) => void
  configure: (settings: Settings) => void
  describe: (intention: string, project: string) => void
  reset: () => void
  previewSound: () => void
}
export const PomodoroContext = createContext<PomodoroValue | null>(null)
export function usePomodoro() {
  const value = useContext(PomodoroContext)
  if (!value) throw new Error('PomodoroProvider is required')
  return value
}
