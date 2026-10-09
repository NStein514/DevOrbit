import { createContext, useContext } from 'react'
import type { Appearance, ResolvedTheme } from './appearance'

interface AppearanceContextValue {
  preferences: Appearance
  resolvedTheme: ResolvedTheme
  error: string
  update: (preferences: Partial<Pick<Appearance, 'mode' | 'accent'>>) => void
  reset: () => void
}
export const AppearanceContext = createContext<AppearanceContextValue | null>(
  null,
)
export function useAppearance() {
  const context = useContext(AppearanceContext)
  if (!context) throw new Error('AppearanceProvider is required')
  return context
}
