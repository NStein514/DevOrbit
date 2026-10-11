import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import {
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  Pause,
  Play,
  Trophy,
} from 'lucide-react'
import { usePomodoro } from '../pomodoro/context'
import { formatTime } from '../pomodoro/model'
import {
  createMission,
  nextPlanet,
  stepMission,
  stopThrust,
  planets,
  WIDTH,
  HEIGHT,
  SAFE_HORIZONTAL,
  SAFE_VERTICAL,
} from './lunar/engine'
import { loadLunarArt, type LunarSprites } from './lunar/art'
import { renderLunar } from './lunar/render'
import { readLunarRecord, saveLunarRecord } from './lunar/records'
import './games.css'
import './lunar/lunar.css'

export default function LunarLandingPage() {
  const [query] = useSearchParams()
  return (
    <LunarGame
      key={query.get('mode') ?? 'free'}
      breakMode={query.get('mode') === 'break'}
    />
  )
}
function LunarGame({ breakMode }: { breakMode: boolean }) {
  const pomodoro = usePomodoro(),
    timer = useRef(pomodoro)
  useLayoutEffect(() => {
    timer.current = pomodoro
  }, [pomodoro])
  const game = useRef(createMission()),
    canvas = useRef<HTMLCanvasElement>(null)
  const keys = useRef(new Set<string>()),
    pointers = useRef(new Map<number, string>())
  const [view, setView] = useState(() => createMission())
  const [assets, setAssets] = useState<'loading' | 'ready' | 'error'>(
      'loading',
    ),
    [retry, setRetry] = useState(0)
  const [record, setRecord] = useState(readLunarRecord)
  const breakReady =
    !pomodoro.blocked &&
    pomodoro.timer.phase !== 'focus' &&
    pomodoro.timer.deadline !== null &&
    pomodoro.remaining > 0
  const publish = useCallback(() => setView({ ...game.current }), [])
  const clear = useCallback(() => {
    keys.current.clear()
    pointers.current.clear()
    stopThrust(game.current)
  }, [])
  const pause = useCallback(() => {
    clear()
    if (game.current.status === 'running') {
      game.current.status = 'paused'
      game.current.reason = 'Flight paused. Take your time.'
      publish()
    }
  }, [clear, publish])
  function launch() {
    if (assets !== 'ready' || (breakMode && !breakReady)) return
    if (game.current.status === 'landed')
      game.current = nextPlanet(game.current)
    else if (game.current.status !== 'paused')
      game.current = createMission(
        crypto.getRandomValues(new Uint32Array(1))[0],
      )
    clear()
    game.current.status = 'running'
    game.current.reason = ''
    publish()
    canvas.current
      ?.closest('.escape-cockpit')
      ?.scrollIntoView({ block: 'start', behavior: 'instant' })
    canvas.current?.focus({ preventScroll: true })
  }
  useEffect(() => {
    let disposed = false,
      frame = 0,
      last = 0,
      accumulated = 0,
      published = 0
    let sprites: LunarSprites
    const context = canvas.current?.getContext('2d')
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)')
    function animate(now: number) {
      if (disposed || !context) return
      const delta = last ? (now - last) / 1000 : 0
      last = now
      const state = game.current
      if (
        breakMode &&
        state.status !== 'ready' &&
        state.status !== 'break-ended'
      ) {
        const p = timer.current
        if (
          p.blocked ||
          p.timer.phase === 'focus' ||
          (p.timer.deadline !== null && p.timer.deadline <= Date.now())
        ) {
          clear()
          state.status = 'break-ended'
          state.reason = 'Break complete. Your next small win is waiting.'
          publish()
        } else if (p.timer.deadline === null) pause()
      }
      if (delta > 0.5) {
        pause()
        accumulated = 0
      } else {
        accumulated += delta
        while (accumulated >= 1 / 120) {
          const held = new Set([...keys.current, ...pointers.current.values()])
          const before = state.status
          stepMission(
            state,
            {
              main:
                held.has('arrowup') ||
                held.has('w') ||
                held.has(' ') ||
                held.has('main'),
              left: held.has('arrowleft') || held.has('a') || held.has('left'),
              right:
                held.has('arrowright') || held.has('d') || held.has('right'),
            },
            1 / 120,
          )
          if (before === 'running' && state.status !== 'running') {
            clear()
            if (state.status === 'landed')
              setRecord(saveLunarRecord(state.score, state.landings))
            publish()
          }
          accumulated -= 1 / 120
        }
      }
      renderLunar(context, state, sprites, reduced.matches)
      if (now - published > 100) {
        publish()
        published = now
      }
      frame = requestAnimationFrame(animate)
    }
    loadLunarArt()
      .then((loaded) => {
        if (disposed) return
        sprites = loaded
        setAssets('ready')
        frame = requestAnimationFrame(animate)
      })
      .catch(() => {
        if (!disposed) setAssets('error')
      })
    const hide = () => {
      if (document.hidden) pause()
    }
    window.addEventListener('blur', pause)
    document.addEventListener('visibilitychange', hide)
    return () => {
      disposed = true
      cancelAnimationFrame(frame)
      window.removeEventListener('blur', pause)
      document.removeEventListener('visibilitychange', hide)
      clear()
    }
  }, [breakMode, retry, clear, pause, publish])
  const planet = planets[(view.level - 1) % planets.length]
  const safe = Math.abs(view.vx) <= SAFE_HORIZONTAL && view.vy <= SAFE_VERTICAL
  const controls = [
    ['left', 'Left jet', ArrowLeft],
    ['main', 'Main engine', ArrowUp],
    ['right', 'Right jet', ArrowRight],
  ] as const
  return (
    <div
      className="escape-page lunar-page"
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) pause()
      }}
    >
      <Link className="text-link" to="/games">
        <ArrowLeft size={16} /> Back to arcade
      </Link>
      <div className="escape-heading">
        <div>
          <p className="eyebrow">DEVORBIT ARCADE / 02</p>
          <h1>Lunar Landing</h1>
        </div>
        <span className="arcade-record">
          <Trophy size={16} /> Best {record.record.score.toLocaleString()}
        </span>
      </div>
      {breakMode && (
        <div className="arcade-break-banner">
          <span>
            {breakReady
              ? `Break expedition · ${formatTime(pomodoro.remaining)} remaining`
              : 'Break play follows your Pomodoro timer.'}
          </span>
          <Link to="/pomodoro">Open Pomodoro</Link>
        </div>
      )}
      {record.error && (
        <p role="alert" className="arcade-notice">
          {record.error}
        </p>
      )}
      <div className="escape-layout">
        <section
          className="escape-cockpit lunar-cockpit"
          aria-label="Lunar Landing game"
        >
          <div className="lunar-planet">
            <span>
              SECTOR {String(view.level).padStart(2, '0')} /{' '}
              {planet.name.toUpperCase()}
            </span>
            <span>GRAVITY {(view.gravity / 22).toFixed(2)}×</span>
          </div>
          <div className="escape-hud">
            <div>
              <small>SCORE</small>
              <strong data-testid="lunar-score">
                {view.score.toLocaleString()}
              </strong>
            </div>
            <div>
              <small>LANDED</small>
              <strong>{view.landings}</strong>
            </div>
            <div>
              <small>FUEL</small>
              <strong data-testid="lunar-fuel">{Math.ceil(view.fuel)}%</strong>
            </div>
          </div>
          <progress
            className="lunar-fuel"
            aria-label="Fuel remaining"
            max={100}
            value={view.fuel}
          />
          <div className="escape-stage lunar-stage">
            <canvas
              ref={canvas}
              width={WIDTH}
              height={HEIGHT}
              tabIndex={0}
              aria-label="Lunar Landing flight area"
              aria-describedby="lunar-controls"
              onBlur={clear}
              onKeyDown={(event) => {
                const key = event.key.toLowerCase()
                if (
                  [
                    'arrowup',
                    'arrowleft',
                    'arrowright',
                    'w',
                    'a',
                    'd',
                    ' ',
                  ].includes(key)
                ) {
                  event.preventDefault()
                  if (game.current.status === 'running') keys.current.add(key)
                }
                if ((key === 'p' || key === 'escape') && !event.repeat) {
                  event.preventDefault()
                  if (game.current.status === 'running') pause()
                  else if (game.current.status === 'paused') launch()
                }
              }}
              onKeyUp={(event) => keys.current.delete(event.key.toLowerCase())}
            >
              Use arrow keys or A, W, D. Hold the main engine to slow your
              descent, and land gently on a lit platform.
            </canvas>
            {view.status !== 'running' && (
              <div className="escape-overlay lunar-overlay">
                <div>
                  <p className="eyebrow">
                    {view.status === 'landed'
                      ? 'CONTACT CONFIRMED'
                      : `${planet.name} · ${planet.subtitle}`}
                  </p>
                  <h2>
                    {assets === 'loading'
                      ? 'Preparing your lander…'
                      : assets === 'error'
                        ? 'Artwork unavailable'
                        : view.status === 'paused'
                          ? 'Holding position.'
                          : view.status === 'landed'
                            ? 'A small step.'
                            : view.status === 'crashed'
                              ? 'A little too fast.'
                              : view.status === 'break-ended'
                                ? 'Back to your mission.'
                                : 'Find your footing.'}
                  </h2>
                  <p>
                    {assets === 'error'
                      ? 'The artwork could not load. Check your connection and retry.'
                      : view.reason ||
                        'A distant world. A little fuel. Bring your ship gently home.'}
                  </p>
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
                        ? 'Resume descent'
                        : view.status === 'landed'
                          ? 'Travel to next planet'
                          : view.status === 'crashed'
                            ? 'Try a new expedition'
                            : 'Begin descent'}{' '}
                      <Play size={16} />
                    </button>
                  )}
                  {breakMode &&
                    !breakReady &&
                    view.status !== 'break-ended' && (
                      <Link className="escape-setup-link" to="/pomodoro">
                        Start or resume a Pomodoro break first
                      </Link>
                    )}
                </div>
              </div>
            )}
            <div
              className={`lunar-telemetry ${safe ? 'is-safe' : ''}`}
              aria-label="Landing telemetry"
            >
              <span>
                ↓ {Math.round(view.vy)} <small>/ 32</small>
              </span>
              <span>
                ↔ {Math.round(Math.abs(view.vx))} <small>/ 20</small>
              </span>
              <span>{safe ? 'SPEED SAFE' : 'SLOW DOWN'}</span>
            </div>
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
              )}{' '}
              {view.status === 'paused' ? 'Resume' : 'Pause'}
            </button>
            <span>
              {view.fuel === 0
                ? 'FUEL EMPTY · COASTING'
                : view.fuel < 20
                  ? 'LOW FUEL · USE SHORT BURSTS'
                  : 'Release to coast'}
            </span>
          </div>
          <div
            className="lunar-controls"
            role="group"
            aria-label="Lander thrust controls"
          >
            {controls.map(([action, label, Icon]) => (
              <button
                key={action}
                aria-label={label}
                disabled={view.status !== 'running'}
                onPointerDown={(event) => {
                  event.preventDefault()
                  event.currentTarget.setPointerCapture(event.pointerId)
                  pointers.current.set(event.pointerId, action)
                }}
                onPointerUp={(event) =>
                  pointers.current.delete(event.pointerId)
                }
                onPointerCancel={(event) =>
                  pointers.current.delete(event.pointerId)
                }
                onLostPointerCapture={(event) =>
                  pointers.current.delete(event.pointerId)
                }
                onKeyDown={(event) => {
                  if (event.key === ' ' || event.key === 'Enter') {
                    event.preventDefault()
                    keys.current.add(action)
                  }
                }}
                onKeyUp={() => keys.current.delete(action)}
                onBlur={() => {
                  keys.current.delete(action)
                  for (const [id, value] of pointers.current)
                    if (value === action) pointers.current.delete(id)
                }}
              >
                <Icon size={20} />
                <span>
                  {action === 'main' ? 'THRUST' : action.toUpperCase()}
                </span>
              </button>
            ))}
          </div>
        </section>
        <aside className="escape-guide lunar-guide">
          <span className="arcade-live">THE ART OF ARRIVING</span>
          <h2>
            Less haste.
            <br />
            More space.
          </h2>
          <p id="lunar-controls">
            <strong>Keyboard:</strong> ↑ / W / Space fires the main engine. ← →
            / A D fire side jets. P or Escape pauses.
            <br />
            <strong>Touch:</strong> hold the buttons below the field. You can
            hold a side jet and the main engine together.
          </p>
          <div className="escape-rule">
            <span>01</span>
            <div>
              <h3>Brake before touchdown</h3>
              <p>
                Gravity keeps pulling. Use short upward bursts to keep descent
                at 32 or less, and sideways speed at 20 or less. The telemetry
                turns mint when your speed is safe.
              </p>
            </div>
          </div>
          <div className="escape-rule">
            <span>02</span>
            <div>
              <h3>Two feet. One platform.</h3>
              <p>
                Both feet must fit inside a lit pad. The smaller amber platform
                earns 350 bonus points. Rough terrain and the edges of the
                flight corridor end your expedition.
              </p>
            </div>
          </div>
          <div className="escape-rule">
            <span>03</span>
            <div>
              <h3>A new world awaits</h3>
              <p>
                Each landing earns 500 × sector plus 10 points per fuel unit
                left. Continue with a full tank to a new landscape, stronger
                gravity and narrower pads. Best scores stay in this browser.
              </p>
            </div>
          </div>
          <p className="escape-footnote">
            Leaving this window pauses descent. Leaving this page discards the
            active expedition; successful landings are saved immediately.{' '}
            {breakMode
              ? 'Your Pomodoro keeps counting while paused; the expedition ends with your break.'
              : 'Free play has no time limit. You can also choose Lunar Landing for a Pomodoro break.'}
          </p>
        </aside>
      </div>
      <p className="sr-only" role="status">
        {view.status === 'running'
          ? 'Descent in progress.'
          : view.reason || 'Ready to descend.'}
      </p>
    </div>
  )
}
