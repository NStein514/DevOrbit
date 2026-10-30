import { useCallback, useLayoutEffect, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'
import { usePomodoro } from '../../pomodoro/context'
export function useGameSession() {
  const [query] = useSearchParams()
  const pomodoro = usePomodoro()
  const breakMode = query.get('mode') === 'break'
  const current = useRef(pomodoro)
  useLayoutEffect(() => {
    current.current = pomodoro
  }, [pomodoro])
  const canPlay = useCallback(() => {
    const p = current.current
    return (
      !breakMode ||
      (!p.blocked &&
        p.timer.phase !== 'focus' &&
        p.timer.deadline !== null &&
        p.timer.deadline > Date.now())
    )
  }, [breakMode])
  const available =
    !breakMode ||
    (!pomodoro.blocked &&
      pomodoro.timer.phase !== 'focus' &&
      pomodoro.timer.deadline !== null &&
      pomodoro.remaining > 0)
  return { breakMode, available, canPlay, remaining: pomodoro.remaining }
}
