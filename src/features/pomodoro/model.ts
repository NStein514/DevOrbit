import { z } from 'zod'

export const POMODORO_KEY = 'devorbit.pomodoro.v1'
export const labels = {
  focus: 'Focus',
  short: 'Short break',
  long: 'Long break',
}
export type Phase = keyof typeof labels
export const settingsSchema = z.object({
  focus: z.number().int().min(1).max(180),
  short: z.number().int().min(1).max(60),
  long: z.number().int().min(1).max(120),
  rounds: z.number().int().min(1).max(12),
  goal: z.number().int().min(1).max(20),
  autoBreak: z.boolean(),
  autoFocus: z.boolean(),
  sound: z.boolean(),
  volume: z.number().int().min(0).max(100),
  breakActivity: z.enum(['none', 'asteroid-escape']).default('none'),
})
export type Settings = z.infer<typeof settingsSchema>
export const defaults: Settings = {
  focus: 25,
  short: 5,
  long: 15,
  rounds: 4,
  goal: 8,
  autoBreak: false,
  autoFocus: false,
  sound: true,
  volume: 50,
  breakActivity: 'none',
}
const timestamp = z.number().int().min(0).max(8640000000000000)
export const timerSchema = z
  .object({
    version: z.literal(1),
    settings: settingsSchema,
    phase: z.enum(['focus', 'short', 'long']),
    duration: z.number().int().min(60000).max(10800000),
    remaining: z.number().min(0).max(10800000),
    deadline: timestamp.nullable(),
    round: z.number().int().min(0).max(12),
    intention: z.string().max(200),
    project: z.string().max(200),
    history: z
      .array(
        z.object({
          endedAt: timestamp,
          minutes: z.number().min(1).max(180),
          intention: z.string().max(200),
          project: z.string().max(200),
        }),
      )
      .max(100),
  })
  .refine((state) => state.remaining <= state.duration)
export type TimerState = z.infer<typeof timerSchema>
export function initialState(): TimerState {
  return {
    version: 1,
    settings: { ...defaults },
    phase: 'focus',
    duration: 1500000,
    remaining: 1500000,
    deadline: null,
    round: 0,
    intention: '',
    project: '',
    history: [],
  }
}
export function readTimer(): {
  timer: TimerState
  error: string
  blocked: boolean
} {
  try {
    const raw = localStorage.getItem(POMODORO_KEY)
    return {
      timer: raw ? timerSchema.parse(JSON.parse(raw)) : initialState(),
      error: '',
      blocked: false,
    }
  } catch {
    return {
      timer: initialState(),
      error:
        'Saved timer data could not be read. Reset timer data to start fresh. Your projects are unaffected.',
      blocked: true,
    }
  }
}
export function remainingAt(timer: TimerState, now: number) {
  return timer.deadline === null
    ? timer.remaining
    : Math.max(0, timer.deadline - now)
}
export function changePhase(timer: TimerState, phase: Phase): TimerState {
  const duration = timer.settings[phase] * 60000
  return { ...timer, phase, duration, remaining: duration, deadline: null }
}
export function advance(
  timer: TimerState,
  completed: boolean,
  now: number,
): TimerState {
  let next = { ...timer }
  if (timer.phase === 'focus') {
    if (completed) {
      next.round = Math.min(next.round + 1, next.settings.rounds)
      next.history = [
        {
          endedAt: timer.deadline ?? now,
          minutes: timer.duration / 60000,
          intention: timer.intention,
          project: timer.project,
        },
        ...timer.history,
      ].slice(0, 100)
    }
    next = changePhase(
      next,
      next.round >= next.settings.rounds ? 'long' : 'short',
    )
  } else {
    if (timer.phase === 'long') next.round = 0
    next = changePhase(next, 'focus')
  }
  // Resume from the present after sleep; never invent completed unattended sessions.
  if (
    completed &&
    (next.phase === 'focus' ? next.settings.autoFocus : next.settings.autoBreak)
  ) {
    next.deadline = now + next.duration
  }
  return next
}
export function formatTime(ms: number) {
  const seconds = Math.ceil(ms / 1000)
  return `${Math.floor(seconds / 60)
    .toString()
    .padStart(2, '0')}:${(seconds % 60).toString().padStart(2, '0')}`
}
