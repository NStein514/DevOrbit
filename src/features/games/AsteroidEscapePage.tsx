import {
  useEffect,
  useCallback,
  useLayoutEffect,
  useRef,
  useState,
  type PointerEvent,
} from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  Pause,
  Play,
  Square,
  Trophy,
} from 'lucide-react'
import { usePomodoro } from '../pomodoro/context'
import { formatTime } from '../pomodoro/model'
import { loadSprites, type Sprites } from './art'
import {
  createFlight,
  endFlight,
  HEIGHT,
  score,
  step,
  WIDTH,
  type Flight,
} from './engine'
import { readRecord, saveRecord } from './records'
import { renderFlight } from './render'
import './games.css'

function snapshot(flight: Flight) {
  return {
    status: flight.status,
    reason: flight.reason,
    score: score(flight),
    seconds: Math.floor(flight.elapsed),
    heat: Math.round(flight.heat),
    shields: flight.shields,
    orbs: flight.orbs,
  }
}
export default function AsteroidEscapePage() {
  const [query] = useSearchParams()
  const breakMode = query.get('mode') === 'break'
  return <FlightGame key={String(breakMode)} breakMode={breakMode} />
}
function FlightGame({ breakMode }: { breakMode: boolean }) {
  const pomodoro = usePomodoro()
  const breakState = useRef(pomodoro)
  useLayoutEffect(() => {
    breakState.current = pomodoro
  }, [pomodoro])
  const canvas = useRef<HTMLCanvasElement>(null)
  const root = useRef<HTMLDivElement>(null)
  const flight = useRef(createFlight())
  const keys = useRef(new Set<string>())
  const target = useRef<{ x: number; y: number } | undefined>(undefined)
  const savedRun = useRef(false)
  const [view, setView] = useState(() => snapshot(createFlight()))
  const [assets, setAssets] = useState<'loading' | 'ready' | 'error'>('loading')
  const [retry, setRetry] = useState(0)
  const [saved, setSaved] = useState(readRecord)
  const previousRecord = useRef(saved.record)
  const breakReady =
    !pomodoro.blocked &&
    pomodoro.timer.phase !== 'focus' &&
    pomodoro.timer.deadline !== null &&
    pomodoro.remaining > 0

  const clearControls = useCallback(() => {
    keys.current.clear()
    target.current = undefined
  }, [])
  const publish = useCallback(() => {
    setView(snapshot(flight.current))
  }, [])
  const pause = useCallback(
    (reason = 'Flight paused. Take your time.') => {
      clearControls()
      if (flight.current.status !== 'running') return
      flight.current.status = 'paused'
      flight.current.reason = reason
      publish()
    },
    [clearControls, publish],
  )
  const finish = useCallback(() => {
    if (!savedRun.current && flight.current.elapsed > 0) {
      savedRun.current = true
      const result = saveRecord(
        score(flight.current),
        flight.current.elapsed,
        previousRecord.current,
      )
      previousRecord.current = result.record
      setSaved(result)
    }
    clearControls()
    publish()
  }, [clearControls, publish])
  function launch() {
    if (assets !== 'ready' || (breakMode && !breakReady)) return
    if (flight.current.status !== 'paused') {
      flight.current = createFlight(
        crypto.getRandomValues(new Uint32Array(1))[0],
      )
      savedRun.current = false
    }
    clearControls()
    flight.current.status = 'running'
    flight.current.reason = ''
    publish()
    canvas.current
      ?.closest('.escape-cockpit')
      ?.scrollIntoView({ block: 'start', behavior: 'instant' })
    canvas.current?.focus({ preventScroll: true })
  }

  useEffect(() => {
    let disposed = false
    let frame = 0
    let sprites: Sprites
    let last = 0
    let accumulated = 0
    let lastPublished = 0
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)')
    const ctx = canvas.current?.getContext('2d')
    const onHide = () => {
      if (document.hidden) pause('Flight paused while you were away.')
    }
    const onBlur = () => pause('Flight paused while you were away.')
    function animate(time: number) {
      if (disposed || !ctx) return
      const elapsed = last ? (time - last) / 1000 : 0
      last = time
      const game = flight.current
      if (
        breakMode &&
        (game.status === 'running' || game.status === 'paused')
      ) {
        const { timer, blocked } = breakState.current
        if (
          blocked ||
          timer.phase === 'focus' ||
          (timer.deadline !== null && timer.deadline <= Date.now())
        ) {
          endFlight(
            game,
            'Break complete. Your next small win is waiting.',
            'break-ended',
          )
          finish()
        } else if (timer.deadline === null)
          pause('Your Pomodoro break is paused. Resume the timer to continue.')
      }
      if (game.status === 'running') {
        if (elapsed > 0.5) {
          pause('Flight paused after an interruption. Ready when you are.')
          accumulated = 0
        } else {
          accumulated += Math.min(elapsed, 0.1)
          while (accumulated >= 1 / 60 && game.status === 'running') {
            step(
              game,
              {
                x:
                  Number(
                    keys.current.has('arrowright') || keys.current.has('d'),
                  ) -
                  Number(
                    keys.current.has('arrowleft') || keys.current.has('a'),
                  ),
                y:
                  Number(
                    keys.current.has('arrowdown') || keys.current.has('s'),
                  ) -
                  Number(keys.current.has('arrowup') || keys.current.has('w')),
                target: target.current,
              },
              1 / 60,
            )
            accumulated -= 1 / 60
          }
          if (flight.current.status === 'over') finish()
        }
      } else accumulated = 0
      renderFlight(ctx, game, sprites, reducedMotion.matches)
      if (time - lastPublished > 100) {
        publish()
        lastPublished = time
      }
      frame = requestAnimationFrame(animate)
    }
    void loadSprites()
      .then((loaded) => {
        if (disposed) return
        if (!ctx) {
          setAssets('error')
          return
        }
        sprites = loaded
        setAssets('ready')
        frame = requestAnimationFrame(animate)
      })
      .catch(() => {
        if (!disposed) setAssets('error')
      })
    document.addEventListener('visibilitychange', onHide)
    window.addEventListener('blur', onBlur)
    return () => {
      disposed = true
      cancelAnimationFrame(frame)
      document.removeEventListener('visibilitychange', onHide)
      window.removeEventListener('blur', onBlur)
      clearControls()
    }
  }, [breakMode, retry, clearControls, publish, finish, pause])

  function steer(event: PointerEvent<HTMLCanvasElement>) {
    const bounds = event.currentTarget.getBoundingClientRect()
    target.current = {
      x: ((event.clientX - bounds.left) * WIDTH) / bounds.width,
      y:
        ((event.clientY - bounds.top) * HEIGHT) / bounds.height -
        (event.pointerType === 'touch' ? 55 : 0),
    }
  }
  const ended = view.status === 'over' || view.status === 'break-ended'
  return (
    <div
      className="escape-page"
      ref={root}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget))
          pause('Flight paused. Return to the cockpit to resume.')
      }}
    >
      <Link className="text-link" to="/games">
        <ArrowLeft size={16} /> Back to arcade
      </Link>
      <div className="escape-heading">
        <div>
          <p className="eyebrow">DEVORBIT ARCADE / 01</p>
          <h1>Asteroid Escape</h1>
        </div>
        <span className="arcade-record">
          <Trophy size={16} /> Best {saved.record.bestScore.toLocaleString()}
        </span>
      </div>
      {breakMode && (
        <div className="arcade-break-banner">
          <span>
            {breakReady
              ? `Break flight · ${formatTime(pomodoro.remaining)} remaining`
              : 'Break play follows your Pomodoro timer.'}
          </span>
          <Link to="/pomodoro">Open Pomodoro</Link>
        </div>
      )}
      {saved.error && (
        <p className="arcade-notice" role="alert">
          {saved.error}
        </p>
      )}
      <div className="escape-layout">
        <section className="escape-cockpit" aria-label="Asteroid Escape game">
          <div className="escape-hud">
            {breakMode && (
              <div>
                <small>BREAK</small>
                <strong>{formatTime(pomodoro.remaining)}</strong>
              </div>
            )}
            <div>
              <small>SCORE</small>
              <strong data-testid="flight-score">
                {view.score.toLocaleString()}
              </strong>
            </div>
            <div>
              <small>SURVIVED</small>
              <strong>{formatTime(view.seconds * 1000)}</strong>
            </div>
            <div>
              <small>HULL</small>
              <strong aria-label={`${view.shields} hull points`}>
                {'◆'.repeat(view.shields)}
                {'◇'.repeat(3 - view.shields)}
              </strong>
            </div>
          </div>
          <div className="escape-heat">
            <label htmlFor="reactor-heat">
              REACTOR{' '}
              <span>
                {view.heat >= 70 ? 'RUNNING HOT · ' : ''}
                {view.heat}%
              </span>
            </label>
            <progress id="reactor-heat" value={view.heat} max={100} />
          </div>
          <div className="escape-stage">
            <canvas
              ref={canvas}
              width={WIDTH}
              height={HEIGHT}
              tabIndex={0}
              aria-label="Asteroid Escape flight area"
              aria-describedby="flight-controls"
              onBlur={clearControls}
              onKeyDown={(event) => {
                const key = event.key.toLowerCase()
                if (
                  [
                    'arrowup',
                    'arrowdown',
                    'arrowleft',
                    'arrowright',
                    'w',
                    'a',
                    's',
                    'd',
                  ].includes(key)
                ) {
                  event.preventDefault()
                  keys.current.add(key)
                  target.current = undefined
                }
                if ((key === 'p' || key === 'escape') && !event.repeat) {
                  event.preventDefault()
                  if (flight.current.status === 'running') pause()
                  else if (flight.current.status === 'paused') launch()
                }
              }}
              onKeyUp={(event) => keys.current.delete(event.key.toLowerCase())}
              onPointerDown={(event) => {
                if (flight.current.status !== 'running') return
                event.currentTarget.focus({ preventScroll: true })
                event.currentTarget.setPointerCapture(event.pointerId)
                steer(event)
              }}
              onPointerMove={(event) => {
                if (event.currentTarget.hasPointerCapture(event.pointerId))
                  steer(event)
              }}
              onPointerUp={() => {
                target.current = undefined
              }}
              onPointerCancel={() => {
                target.current = undefined
              }}
              onLostPointerCapture={() => {
                target.current = undefined
              }}
            >
              Pilot your ship with arrow keys, WASD, or touch. Avoid asteroids
              and collect cooling energy orbs.
            </canvas>
            {view.status !== 'running' && (
              <div className="escape-overlay">
                <div>
                  <p className="eyebrow">
                    {ended
                      ? 'FLIGHT LOG'
                      : breakMode
                        ? 'A LITTLE BREAK FROM GRAVITY'
                        : 'YOUR SHIP IS READY'}
                  </p>
                  <h2>
                    {assets === 'loading'
                      ? 'Preparing your ship…'
                      : assets === 'error'
                        ? 'Artwork unavailable'
                        : view.status === 'paused'
                          ? 'Holding orbit.'
                          : view.status === 'over'
                            ? 'One more orbit?'
                            : view.status === 'break-ended'
                              ? 'Back to your mission.'
                              : 'How far can you fly?'}
                  </h2>
                  <p>
                    {assets === 'error'
                      ? 'The game artwork could not load. Check your connection and retry.'
                      : view.reason ||
                        'Dodge asteroids. Collect energy. Stay cool.'}
                  </p>
                  {ended && (
                    <p className="escape-result">
                      {view.score.toLocaleString()} points · {view.seconds}s ·{' '}
                      {view.orbs} orbs
                    </p>
                  )}
                  {assets === 'error' ? (
                    <button
                      className="button arcade-launch"
                      onClick={() => {
                        setAssets('loading')
                        setRetry(retry + 1)
                      }}
                    >
                      Retry artwork
                    </button>
                  ) : view.status === 'break-ended' ? (
                    <Link className="button arcade-launch" to="/pomodoro">
                      Return to focus
                    </Link>
                  ) : (
                    <button
                      className="button arcade-launch"
                      disabled={
                        assets !== 'ready' || (breakMode && !breakReady)
                      }
                      onClick={launch}
                    >
                      {view.status === 'paused'
                        ? 'Resume flight'
                        : ended
                          ? 'Fly again'
                          : 'Launch flight'}{' '}
                      <Play size={16} />
                    </button>
                  )}
                  {breakMode && !breakReady && !ended && (
                    <Link className="escape-setup-link" to="/pomodoro">
                      Start or resume a Pomodoro break first
                    </Link>
                  )}
                </div>
              </div>
            )}
          </div>
          <div className="escape-toolbar">
            <button
              className="button button--outline"
              disabled={view.status !== 'running' && view.status !== 'paused'}
              onClick={() => (view.status === 'running' ? pause() : launch())}
            >
              {view.status === 'paused' ? (
                <Play size={16} />
              ) : (
                <Pause size={16} />
              )}
              {view.status === 'paused' ? 'Resume' : 'Pause'}
            </button>
            <span>{view.orbs} energy orbs</span>
            <button
              className="button button--outline"
              disabled={view.status !== 'running' && view.status !== 'paused'}
              onClick={() => {
                endFlight(flight.current, 'Safely docked. A good flight.')
                finish()
              }}
            >
              <Square size={14} /> End flight
            </button>
          </div>
          <div
            className="escape-steering"
            role="group"
            aria-label="Touch steering"
          >
            {(
              [
                ['arrowleft', 'Steer left', ArrowLeft],
                ['arrowup', 'Steer up', ArrowUp],
                ['arrowdown', 'Steer down', ArrowDown],
                ['arrowright', 'Steer right', ArrowRight],
              ] as const
            ).map(([key, label, Icon]) => (
              <button
                key={key}
                aria-label={label}
                disabled={view.status !== 'running'}
                onPointerDown={(event) => {
                  event.currentTarget.setPointerCapture(event.pointerId)
                  target.current = undefined
                  keys.current.add(key)
                }}
                onPointerUp={() => keys.current.delete(key)}
                onPointerCancel={() => keys.current.delete(key)}
                onLostPointerCapture={() => keys.current.delete(key)}
                onKeyDown={(event) => {
                  if (event.key === ' ' || event.key === 'Enter') {
                    event.preventDefault()
                    target.current = undefined
                    keys.current.add(key)
                  }
                }}
                onKeyUp={() => keys.current.delete(key)}
                onBlur={() => keys.current.delete(key)}
              >
                <Icon size={22} />
              </button>
            ))}
          </div>
        </section>
        <aside className="escape-guide">
          <span className="arcade-live">FLIGHT MANUAL</span>
          <h2>
            Small ship.
            <br />
            Nerves of steel.
          </h2>
          <p id="flight-controls">
            <strong>Desktop:</strong> focus the flight area and use arrow keys
            or WASD. P or Escape pauses. You can also click and drag.
            <br />
            <strong>Phone:</strong> drag inside the field; your ship stays above
            your finger. Or hold the direction buttons below.
          </p>
          <div className="escape-rule">
            <span>01</span>
            <div>
              <h3>Find the gaps</h3>
              <p>
                Three hull points. Each asteroid hit costs one. The field grows
                faster the longer you survive.
              </p>
            </div>
          </div>
          <div className="escape-rule">
            <span>02</span>
            <div>
              <h3>Chase the cool</h3>
              <p>
                Energy orbs remove 24% heat and add 75 points. Your reactor
                heats up continuously. At 100%, the flight ends.
              </p>
            </div>
          </div>
          <div className="escape-rule">
            <span>03</span>
            <div>
              <h3>Make it count</h3>
              <p>
                Earn 10 points per second plus your orb bonus. End a flight to
                bank it. Best scores stay in this browser.
              </p>
            </div>
          </div>
          <p className="escape-footnote">
            Leaving or hiding this window pauses play. Leaving this page
            discards the current flight.{' '}
            {breakMode
              ? 'Your break timer keeps running while the game is paused; break completion ends the flight.'
              : 'Free play has no time limit. Choose break play in Pomodoro for a timed adventure.'}
          </p>
        </aside>
      </div>
      <p className="sr-only" role="status">
        {view.status === 'running'
          ? 'Flight running.'
          : view.reason || 'Ready to launch.'}
      </p>
    </div>
  )
}
