import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import {
  APPEARANCE_KEY,
  applyAppearance,
  defaultAppearance,
  readAppearance,
  type Appearance,
} from './appearance'
import { AppearanceContext } from './context'

export function AppearanceProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState(readAppearance)
  const current = useRef(state.preferences)
  const [systemDark, setSystemDark] = useState(
    () => window.matchMedia('(prefers-color-scheme: dark)').matches,
  )
  const resolvedTheme =
    state.preferences.mode === 'system'
      ? systemDark
        ? 'dark'
        : 'light'
      : state.preferences.mode

  useLayoutEffect(() => {
    applyAppearance(state.preferences, systemDark)
  }, [state.preferences, systemDark])
  useEffect(() => {
    const query = window.matchMedia('(prefers-color-scheme: dark)')
    const onSystemChange = (event: MediaQueryListEvent) =>
      setSystemDark(event.matches)
    const onStorage = (event: StorageEvent) => {
      if (event.key !== APPEARANCE_KEY && event.key !== null) return
      const next = readAppearance()
      current.current = next.preferences
      setState(next)
    }
    query.addEventListener('change', onSystemChange)
    window.addEventListener('storage', onStorage)
    return () => {
      query.removeEventListener('change', onSystemChange)
      window.removeEventListener('storage', onStorage)
    }
  }, [])

  const save = (preferences: Appearance) => {
    let error = ''
    try {
      localStorage.setItem(APPEARANCE_KEY, JSON.stringify(preferences))
    } catch {
      error =
        'Your appearance changed for this session, but browser storage is unavailable. These preferences may reset when you reload.'
    }
    current.current = preferences
    setState({ preferences, error })
  }
  return (
    <AppearanceContext.Provider
      value={{
        ...state,
        resolvedTheme,
        update: (changes) => save({ ...current.current, ...changes }),
        reset: () => save(defaultAppearance),
      }}
    >
      {children}
    </AppearanceContext.Provider>
  )
}
