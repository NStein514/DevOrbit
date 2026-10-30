import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, Maximize2, Minimize2, Timer, Trophy } from 'lucide-react'
import { formatTime } from '../../pomodoro/model'
import type { useGameSession } from './useGameSession'
import '../games.css'
import './play.css'
export function GameShell({
  title,
  subtitle,
  label,
  record,
  error,
  session,
  children,
}: {
  title: string
  subtitle: string
  label: string
  record: string
  error: string
  session: ReturnType<typeof useGameSession>
  children: ReactNode
}) {
  const [expanded, setExpanded] = useState(false)
  const region = useRef<HTMLDivElement>(null)
  const expandButton = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    if (!expanded) return
    const button = expandButton.current
    const before = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    region.current?.focus()
    const escape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setExpanded(false)
      if (event.key === 'Tab' && region.current) {
        const nodes = [
          ...region.current.querySelectorAll<HTMLElement>(
            'button:not(:disabled), a, input:not(:disabled), summary, canvas[tabindex]',
          ),
        ]
        const first = nodes[0],
          last = nodes.at(-1)
        if (
          event.shiftKey &&
          (document.activeElement === first ||
            document.activeElement === region.current)
        ) {
          event.preventDefault()
          last?.focus()
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault()
          first?.focus()
        }
      }
    }
    document.addEventListener('keydown', escape)
    return () => {
      document.body.style.overflow = before
      document.removeEventListener('keydown', escape)
      button?.focus()
    }
  }, [expanded])
  return (
    <div className="space-game">
      <Link className="text-link game-back" to="/games">
        <ArrowLeft size={16} /> Back to arcade
      </Link>
      <div className="page-heading">
        <div>
          <p className="eyebrow">{label}</p>
          <h1>
            {title}
            <span>.</span>
          </h1>
          <p>{subtitle}</p>
        </div>
        <span className="arcade-record">
          <Trophy size={16} />
          {record}
        </span>
      </div>
      {session.breakMode && (
        <div className="game-break">
          <Timer size={18} />
          <span>
            {session.available
              ? `Break play · ${formatTime(session.remaining)} remaining`
              : 'Break play is paused. Start or resume a break in Pomodoro.'}
          </span>
          <Link to="/pomodoro">Open Pomodoro</Link>
          <Link
            to={
              title === 'Gravity Golf'
                ? '/games/gravity-golf'
                : '/games/orbit-architect'
            }
          >
            Free play
          </Link>
        </div>
      )}
      {error && (
        <p role="alert" className="arcade-notice">
          {error}
        </p>
      )}
      <div
        ref={region}
        tabIndex={-1}
        className={`game-station ${expanded ? 'game-station--expanded' : ''}`}
        role={expanded ? 'dialog' : undefined}
        aria-modal={expanded || undefined}
        aria-label={`${title} play area`}
      >
        <div className="game-station-bar">
          <span>
            <i /> {session.breakMode ? 'POMODORO EXPEDITION' : 'FREE PLAY'} /{' '}
            {label}
          </span>
          <button
            ref={expandButton}
            onClick={() => setExpanded(!expanded)}
            className="game-expand"
          >
            {expanded ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
            {expanded ? 'Exit expanded view' : 'Expand play area'}
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}
