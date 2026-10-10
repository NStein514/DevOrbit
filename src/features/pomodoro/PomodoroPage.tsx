import { useState } from 'react'
import {
  Coffee,
  Pause,
  Play,
  RotateCcw,
  SkipForward,
  Timer,
} from 'lucide-react'
import { useWorkspace } from '../workspace/context'
import { ConfirmDialog } from '../kanban/ConfirmDialog'
import { usePomodoro } from './context'
import {
  defaults,
  formatTime,
  labels,
  settingsSchema,
  type Settings,
  type Phase,
} from './model'
import './pomodoro.css'

export default function PomodoroPage() {
  const pomodoro = usePomodoro()
  const { timer, remaining, blocked } = pomodoro
  const { workspace } = useWorkspace()
  const [resetOpen, setResetOpen] = useState(false)
  const today = new Date().toDateString()
  const sessions = timer.history.filter(
    (session) => new Date(session.endedAt).toDateString() === today,
  )
  const running = timer.deadline !== null
  return (
    <div className="pomodoro-page">
      <div className="page-heading">
        <div>
          <p className="eyebrow">ONE THING AT A TIME</p>
          <h1>
            Find your rhythm<span>.</span>
          </h1>
          <p>A little focus. A proper break. A rhythm that’s yours.</p>
        </div>
        <span className="pomodoro-tag">
          <Timer size={18} /> Pomodoro Timer
        </span>
      </div>
      {pomodoro.error && (
        <div className="pomodoro-notice" role="alert">
          {pomodoro.error}
        </div>
      )}
      <div className="pomodoro-grid">
        <section
          className="pomodoro-panel pomodoro-clock"
          aria-label="Pomodoro timer"
        >
          <div
            className="pomodoro-modes"
            role="group"
            aria-label="Session type"
          >
            {(Object.keys(labels) as Phase[]).map((phase) => (
              <button
                key={phase}
                disabled={blocked}
                aria-pressed={timer.phase === phase}
                onClick={() => pomodoro.select(phase)}
              >
                {labels[phase]}
              </button>
            ))}
          </div>
          <div className="pomodoro-dial">
            {timer.phase === 'focus' ? (
              <Timer size={25} />
            ) : (
              <Coffee size={25} />
            )}
            <p>
              {labels[timer.phase]} ·{' '}
              {running
                ? 'In progress'
                : remaining < timer.duration
                  ? 'Paused'
                  : 'Ready when you are'}
            </p>
            <div
              className="pomodoro-time"
              role="timer"
              aria-label={`${labels[timer.phase]} time remaining`}
              aria-live="off"
            >
              {formatTime(remaining)}
            </div>
            <progress
              aria-label="Session progress"
              value={timer.duration - remaining}
              max={timer.duration}
            />
            <small>
              {timer.round} of {timer.settings.rounds} focus sessions before a
              long break
            </small>
          </div>
          <div className="pomodoro-actions">
            <button
              className="button button--outline"
              disabled={blocked}
              onClick={pomodoro.restart}
            >
              <RotateCcw size={16} /> Restart
            </button>
            <button
              className="button button--primary"
              disabled={blocked}
              onClick={pomodoro.toggle}
            >
              {running ? <Pause size={18} /> : <Play size={18} />}
              {running
                ? 'Pause'
                : remaining < timer.duration
                  ? 'Resume'
                  : 'Start'}
            </button>
            <button
              className="button button--outline"
              disabled={blocked}
              onClick={pomodoro.skip}
            >
              <SkipForward size={16} /> Skip
            </button>
          </div>
          <p className="pomodoro-help">
            Skipping or changing modes does not count as completed focus.
            Restart uses your latest duration.
          </p>
          <div className="pomodoro-context">
            <label>
              What are you focusing on?
              <input
                maxLength={200}
                disabled={blocked || running || remaining < timer.duration}
                placeholder="One small win…"
                value={timer.intention}
                onChange={(event) =>
                  pomodoro.describe(event.target.value, timer.project)
                }
              />
            </label>
            <label>
              Project
              <select
                aria-label="Project"
                disabled={blocked || running || remaining < timer.duration}
                value={timer.project}
                onChange={(event) =>
                  pomodoro.describe(timer.intention, event.target.value)
                }
              >
                <option value="">Personal focus</option>
                {timer.project &&
                  !workspace.projects.some(
                    (project) => project.name === timer.project,
                  ) && (
                    <option value={timer.project}>
                      {timer.project} (saved)
                    </option>
                  )}
                {workspace.projects.map((project) => (
                  <option key={project.id} value={project.name}>
                    {project.name}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </section>
        <SettingsForm
          key={JSON.stringify(timer.settings)}
          settings={timer.settings}
        />
      </div>
      <section
        className="pomodoro-panel pomodoro-history"
        aria-labelledby="focus-history-title"
      >
        <div className="pomodoro-summary">
          <div>
            <p className="eyebrow">SMALL WINS ADD UP</p>
            <h2 id="focus-history-title">Your focus today</h2>
          </div>
          <strong>
            {sessions.length} / {timer.settings.goal}
            <small>daily sessions</small>
          </strong>
          <strong>
            {sessions.reduce((sum, session) => sum + session.minutes, 0)}
            <small>focus minutes</small>
          </strong>
        </div>
        <progress
          aria-label="Daily focus goal"
          max={timer.settings.goal}
          value={Math.min(sessions.length, timer.settings.goal)}
        />
        <h3>Recent sessions</h3>
        {timer.history.length ? (
          <ol>
            {timer.history.slice(0, 10).map((session, index) => (
              <li key={`${session.endedAt}-${index}`}>
                <div>
                  <strong>{session.intention || 'Focused work'}</strong>
                  <small>{session.project || 'Personal focus'}</small>
                </div>
                <span>
                  {session.minutes} min
                  <small>
                    {new Date(session.endedAt).toLocaleString(undefined, {
                      month: 'short',
                      day: 'numeric',
                      hour: 'numeric',
                      minute: '2-digit',
                    })}
                  </small>
                </span>
              </li>
            ))}
          </ol>
        ) : (
          <p>Finish your first focus session to start your history.</p>
        )}
        <p className="pomodoro-help">
          The latest 100 sessions are saved in this browser; the 10 most recent
          appear here. Timer data is separate from workspace backups.
        </p>
        <button
          className="button button--outline"
          onClick={() => setResetOpen(true)}
        >
          Reset timer data
        </button>
      </section>
      {resetOpen && (
        <ConfirmDialog
          title="Reset timer data?"
          onClose={() => setResetOpen(false)}
          onConfirm={() => {
            pomodoro.reset()
            return true
          }}
        >
          This stops the timer and removes its preferences and session history
          in this browser. Your projects are unaffected.
        </ConfirmDialog>
      )}
    </div>
  )
}

function SettingsForm({ settings }: { settings: Settings }) {
  const { configure, blocked, previewSound } = usePomodoro()
  const [draft, setDraft] = useState(settings)
  const [message, setMessage] = useState('')
  const numbers = [
    ['focus', 'Focus minutes', 180],
    ['short', 'Short break minutes', 60],
    ['long', 'Long break minutes', 120],
    ['rounds', 'Sessions before long break', 12],
    ['goal', 'Daily session goal', 20],
  ] as const
  return (
    <form
      className="pomodoro-panel pomodoro-settings"
      aria-label="Timer preferences"
      onSubmit={(event) => {
        event.preventDefault()
        const parsed = settingsSchema.safeParse(draft)
        if (!parsed.success) {
          setMessage('Enter whole numbers within the displayed limits.')
          return
        }
        configure(parsed.data)
        setMessage('Preferences saved.')
      }}
    >
      <h2>Your session rhythm</h2>
      <p>Set the pace that works for you.</p>
      <fieldset disabled={blocked}>
        <div className="pomodoro-fields">
          {numbers.map(([key, label, max]) => (
            <label key={key}>
              {label}
              <input
                aria-label={label}
                type="number"
                required
                min={1}
                max={max}
                step={1}
                value={Number.isNaN(draft[key]) ? '' : draft[key]}
                onChange={(event) =>
                  setDraft({ ...draft, [key]: event.target.valueAsNumber })
                }
              />
              <small>1–{max}</small>
            </label>
          ))}
        </div>
        {(
          [
            ['autoBreak', 'Automatically start breaks'],
            ['autoFocus', 'Automatically start focus'],
            ['sound', 'Play a completion sound'],
          ] as const
        ).map(([key, label]) => (
          <label className="pomodoro-toggle" key={key}>
            <input
              type="checkbox"
              checked={draft[key]}
              onChange={(event) =>
                setDraft({ ...draft, [key]: event.target.checked })
              }
            />
            {label}
          </label>
        ))}
        <label className="pomodoro-volume">
          Sound volume · {draft.volume}%
          <input
            type="range"
            min={0}
            max={100}
            value={draft.volume}
            onChange={(event) =>
              setDraft({ ...draft, volume: Number(event.target.value) })
            }
          />
        </label>
        <p className="pomodoro-help">
          Save before testing sound. Browsers may require a Start or Test sound
          click after reload to enable audio.
        </p>
        <div className="pomodoro-actions">
          <button type="submit" className="button button--primary">
            Save preferences
          </button>
          <button
            type="button"
            className="button button--outline"
            onClick={previewSound}
          >
            Test sound
          </button>
        </div>
        <button
          type="button"
          className="text-link"
          onClick={() => setDraft({ ...defaults })}
        >
          Use default preferences
        </button>
      </fieldset>
      <p className="pomodoro-help">
        Duration changes apply to the next session or restart; a running or
        paused session keeps its duration. After device sleep, only the elapsed
        session is completed.
      </p>
      <p role="status">
        {message ||
          (JSON.stringify(draft) === JSON.stringify(settings)
            ? 'Current preferences applied.'
            : 'Unsaved preferences.')}
      </p>
    </form>
  )
}
