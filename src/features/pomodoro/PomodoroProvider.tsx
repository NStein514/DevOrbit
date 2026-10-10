import { useEffect, useRef, useState, type ReactNode } from 'react'
import { PomodoroContext } from './context'
import {
  advance,
  changePhase,
  formatTime,
  initialState,
  labels,
  POMODORO_KEY,
  readTimer,
  remainingAt,
  type TimerState,
} from './model'

export function PomodoroProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState(readTimer)
  const current = useRef(state)
  const [now, setNow] = useState(Date.now)
  const [announcement, setAnnouncement] = useState('')
  const audio = useRef<AudioContext | null>(null)

  function save(timer: TimerState, force = false) {
    if (current.current.blocked && !force) return
    let error = ''
    try {
      localStorage.setItem(POMODORO_KEY, JSON.stringify(timer))
    } catch {
      error =
        'Timer changes are only available in this tab because browser storage is unavailable. Reloading may lose your progress.'
    }
    const next = { timer, error, blocked: false }
    current.current = next
    setState(next)
    setNow(Date.now())
  }
  function unlockAudio() {
    try {
      audio.current ??= new AudioContext()
      void audio.current.resume().catch(() => {})
    } catch {
      /* Audio is optional on unsupported browsers. */
    }
  }
  function chime() {
    const ctx = audio.current
    if (
      !ctx ||
      ctx.state !== 'running' ||
      current.current.timer.settings.volume === 0
    )
      return
    const oscillator = ctx.createOscillator()
    const gain = ctx.createGain()
    oscillator.connect(gain)
    gain.connect(ctx.destination)
    oscillator.frequency.value = 660
    gain.gain.setValueAtTime(
      current.current.timer.settings.volume / 500,
      ctx.currentTime,
    )
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.7)
    oscillator.start()
    oscillator.stop(ctx.currentTime + 0.7)
  }

  useEffect(() => {
    function tick() {
      const time = Date.now()
      const { timer, blocked } = current.current
      if (blocked || timer.deadline === null) return
      setNow(time)
      if (time >= timer.deadline) {
        const next = advance(timer, true, time)
        save(next)
        setAnnouncement(
          `${labels[timer.phase]} complete. ${labels[next.phase]} ${next.deadline ? 'started' : 'ready'}.`,
        )
        if (timer.settings.sound && document.visibilityState === 'visible')
          chime()
      }
    }
    function sync(event: StorageEvent) {
      if (event.key !== POMODORO_KEY && event.key !== null) return
      const next = readTimer()
      current.current = next
      setState(next)
      tick()
    }
    const interval = window.setInterval(tick, 250)
    window.addEventListener('storage', sync)
    window.addEventListener('focus', tick)
    document.addEventListener('visibilitychange', tick)
    tick()
    return () => {
      clearInterval(interval)
      window.removeEventListener('storage', sync)
      window.removeEventListener('focus', tick)
      document.removeEventListener('visibilitychange', tick)
    }
  }, [])

  const remaining = remainingAt(state.timer, now)
  useEffect(() => {
    if (state.timer.deadline !== null)
      document.title = `${formatTime(remaining)} · ${labels[state.timer.phase]} · DevOrbit`
    else document.title = 'DevOrbit — Your developer mission control'
  }, [remaining, state.timer.deadline, state.timer.phase])

  return (
    <PomodoroContext.Provider
      value={{
        ...state,
        remaining,
        announcement,
        toggle: () => {
          unlockAudio()
          const timer = current.current.timer
          const time = Date.now()
          if (timer.deadline !== null && time >= timer.deadline) {
            save(advance(timer, true, time))
            return
          }
          save({
            ...timer,
            remaining: remainingAt(timer, time),
            deadline: timer.deadline === null ? time + timer.remaining : null,
          })
        },
        restart: () =>
          save(changePhase(current.current.timer, current.current.timer.phase)),
        skip: () => save(advance(current.current.timer, false, Date.now())),
        select: (phase) => save(changePhase(current.current.timer, phase)),
        configure: (settings) => {
          const timer = current.current.timer
          const next = { ...timer, settings }
          save(
            timer.deadline === null && timer.remaining === timer.duration
              ? changePhase(next, timer.phase)
              : next,
          )
        },
        describe: (intention, project) =>
          save({ ...current.current.timer, intention, project }),
        reset: () => {
          save(initialState(), true)
          setAnnouncement('Timer data reset.')
        },
        previewSound: () => {
          unlockAudio()
          void audio.current
            ?.resume()
            .then(chime)
            .catch(() => {})
        },
      }}
    >
      {children}
      {announcement && (
        <span className="sr-only" role="status">
          {announcement}
        </span>
      )}
    </PomodoroContext.Provider>
  )
}
