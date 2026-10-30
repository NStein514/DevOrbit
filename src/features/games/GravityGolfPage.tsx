import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent,
} from 'react'
import {
  advance,
  holes,
  prediction,
  shoot,
  coursePar,
  holeStars,
  shotRating,
  type Comet,
  type Outcome,
  type Point,
} from './golf/engine'
import { render } from './golf/render'
import { loadGolfArt, type GolfSprites } from './golf/art'
import { GameShell } from './shared/GameShell'
import { useGameSession } from './shared/useGameSession'
import { readGameRecord, saveGameRecord } from './shared/records'
import './golf/golf.css'
const messages: Record<Outcome, string> = {
  flying: 'Comet in flight…',
  sunk: 'In the black hole! Nicely curved.',
  collision: 'Planet impact. Try a wider curve or a little more power.',
  escaped: 'Your comet left the course. Try a gentler shot.',
  timeout: 'Orbit trapped! Adjust your angle to break free.',
}
const blankScores = () => holes.map(() => 0)
export default function GravityGolfPage() {
  const [index, setIndex] = useState(0),
    [angle, setAngle] = useState(-20),
    [power, setPower] = useState(260)
  const [outcome, setOutcome] = useState<Outcome | null>(null),
    [paused, setPaused] = useState(false),
    [strokes, setStrokes] = useState(blankScores),
    [showPreview, setShowPreview] = useState(true)
  const [artState, setArtState] = useState<'loading' | 'ready' | 'error'>(
      'loading',
    ),
    [artAttempt, setArtAttempt] = useState(0)
  const [saved, setSaved] = useState(() => readGameRecord('gravity-golf'))
  const session = useGameSession()
  const sprites = useRef<GolfSprites | null>(null)
  useEffect(() => {
    let disposed = false
    loadGolfArt()
      .then((images) => {
        if (!disposed) {
          sprites.current = images
          setArtState('ready')
        }
      })
      .catch(() => {
        if (!disposed) setArtState('error')
      })
    return () => {
      disposed = true
    }
  }, [artAttempt])
  const canvas = useRef<HTMLCanvasElement>(null),
    body = useRef<Comet | null>(null),
    trail = useRef<Point[]>([]),
    previous = useRef<Point[]>([]),
    flying = useRef(false)
  const pointer = useRef<{
    id: number
    x: number
    y: number
    angle: number
    power: number
  } | null>(null)
  const h = holes[index],
    forecast = useMemo(() => prediction(h, angle, power), [h, angle, power])
  const view = useRef({
    index,
    paused,
    forecast,
    showPreview,
    outcome,
    strokes,
    canPlay: session.canPlay,
  })
  useLayoutEffect(() => {
    view.current = {
      index,
      paused,
      forecast,
      showPreview,
      outcome,
      strokes,
      canPlay: session.canPlay,
    }
  }, [index, paused, forecast, showPreview, outcome, strokes, session.canPlay])
  useEffect(() => {
    let frame = 0,
      last = 0,
      acc = 0,
      visualTime = 0,
      effectAge = 0,
      previousOutcome: Outcome | null = null
    const ctx = canvas.current!.getContext('2d')!,
      motion = matchMedia('(prefers-reduced-motion: reduce)')
    let drawnView: typeof view.current | null = null
    let drawnSprites: GolfSprites | null = null
    let drawnReduced = false
    function draw(now: number) {
      const v = view.current,
        elapsed = last ? (now - last) / 1000 : 0,
        dt = Math.min(elapsed, 0.05)
      last = now
      if ((!v.canPlay() || elapsed > 0.5) && !v.paused) {
        v.paused = true
        setPaused(true)
      }
      if (flying.current && !v.paused && body.current) {
        acc += dt
        while (acc >= 1 / 120 && flying.current) {
          const result = advance(body.current, holes[v.index], 1 / 120)
          acc -= 1 / 120
          if (result !== 'flying') {
            flying.current = false
            setOutcome(result)
            if (result === 'sunk')
              setSaved(
                saveGameRecord(
                  'gravity-golf',
                  v.index,
                  holeStars(v.strokes[v.index], holes[v.index].par),
                  v.index === holes.length - 1
                    ? v.strokes.reduce((a, b) => a + b, 0)
                    : 0,
                ),
              )
          }
        }
        trail.current.push({ x: body.current.x, y: body.current.y })
        if (trail.current.length > 350) trail.current.shift()
      } else acc = 0
      if (v.outcome !== previousOutcome) {
        effectAge = 0
        previousOutcome = v.outcome
      }
      if (!v.paused) {
        visualTime += dt * 1000
        effectAge += dt
      }
      if (
        !v.paused ||
        drawnView !== v ||
        drawnSprites !== sprites.current ||
        drawnReduced !== motion.matches
      ) {
        render(
          ctx,
          v.index,
          body.current,
          trail.current,
          !flying.current && v.outcome !== 'sunk' && v.showPreview
            ? v.forecast.points
            : [],
          visualTime,
          motion.matches,
          v.outcome,
          sprites.current,
          effectAge,
          previous.current,
          v.forecast.outcome,
        )
        drawnView = v
        drawnSprites = sprites.current
        drawnReduced = motion.matches
      }
      frame = requestAnimationFrame(draw)
    }
    frame = requestAnimationFrame(draw)
    const pause = () => {
      view.current.paused = true
      pointer.current = null
      setPaused(true)
    }
    const hide = () => {
      if (document.hidden) pause()
    }
    document.addEventListener('visibilitychange', hide)
    window.addEventListener('blur', pause)
    return () => {
      cancelAnimationFrame(frame)
      document.removeEventListener('visibilitychange', hide)
      window.removeEventListener('blur', pause)
    }
  }, [])
  function launch() {
    if (
      artState !== 'ready' ||
      flying.current ||
      paused ||
      outcome === 'sunk' ||
      !session.canPlay()
    )
      return
    previous.current = [...trail.current]
    body.current = shoot(h, angle, power)
    trail.current = []
    flying.current = true
    setOutcome('flying')
    const next = strokes.map((n, i) => (i === index ? n + 1 : n))
    view.current.strokes = next
    setStrokes(next)
    canvas.current?.scrollIntoView({ block: 'center', behavior: 'instant' })
    canvas.current?.focus({ preventScroll: true })
  }
  function reset(next = 0) {
    flying.current = false
    body.current = null
    trail.current = []
    previous.current = []
    pointer.current = null
    setOutcome(null)
    setPaused(false)
    setIndex(next)
    setAngle(-20)
    setPower(260)
    if (next === 0) setStrokes(blankScores())
  }
  const busy = outcome === 'flying',
    finished = outcome === 'sunk' && index === holes.length - 1,
    canAim =
      artState === 'ready' &&
      !busy &&
      !paused &&
      outcome !== 'sunk' &&
      session.available
  function aim(e: PointerEvent<HTMLCanvasElement>) {
    const start = pointer.current
    if (!start || start.id !== e.pointerId || !canAim) return
    const rect = e.currentTarget.getBoundingClientRect(),
      dx = ((e.clientX - start.x) * 1000) / rect.width,
      dy = ((e.clientY - start.y) * 560) / rect.height
    if (Math.hypot(dx, dy) < 5) return
    setAngle(
      Math.round(
        Math.max(
          -80,
          Math.min(80, (Math.atan2(dy, Math.max(10, dx)) * 180) / Math.PI),
        ),
      ),
    )
    setPower(
      Math.round(Math.max(120, Math.min(440, Math.hypot(dx, dy) * 1.4)) / 5) *
        5,
    )
  }
  const total = strokes.reduce((a, b) => a + b, 0)
  return (
    <GameShell
      title="Gravity Golf"
      subtitle="One tiny comet. Six cosmic puzzles. Chase the perfect curve."
      label="COSMIC LINKS / 04"
      record={
        saved.record.best
          ? `Best course · ${saved.record.best} strokes`
          : 'Your first course record awaits'
      }
      error={saved.error}
      session={session}
    >
      <div className="game-hud">
        <div>
          <small>
            Hole {index + 1} / {holes.length}
          </small>
          <strong>{h.name}</strong>
        </div>
        <div>
          <small>Par {h.par}</small>
          <strong>Strokes {strokes[index]}</strong>
        </div>
        <div>
          <small>Course · par {coursePar}</small>
          <strong>Total {total}</strong>
        </div>
      </div>
      <div className="game-stage">
        <canvas
          ref={canvas}
          width={1000}
          height={560}
          tabIndex={0}
          aria-label="Gravity Golf course. Drag right to aim and set power. Space launches, arrows adjust, P pauses."
          onPointerDown={(e) => {
            if (e.button !== 0 || pointer.current || !canAim) return
            pointer.current = {
              id: e.pointerId,
              x: e.clientX,
              y: e.clientY,
              angle,
              power,
            }
            e.currentTarget.setPointerCapture(e.pointerId)
            e.currentTarget.focus({ preventScroll: true })
          }}
          onPointerMove={aim}
          onPointerUp={() => {
            pointer.current = null
          }}
          onPointerCancel={() => {
            if (pointer.current) {
              setAngle(pointer.current.angle)
              setPower(pointer.current.power)
            }
            pointer.current = null
          }}
          onLostPointerCapture={() => {
            pointer.current = null
          }}
          onKeyDown={(e) => {
            if (e.key === ' ') {
              e.preventDefault()
              if (!e.repeat) launch()
            }
            if (e.key.toLowerCase() === 'p' && !e.repeat) {
              e.preventDefault()
              setPaused((p) => !p)
            }
            if (
              canAim &&
              ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(
                e.key,
              )
            ) {
              e.preventDefault()
              if (e.key === 'ArrowLeft' || e.key === 'ArrowRight')
                setAngle((a) =>
                  Math.max(
                    -80,
                    Math.min(80, a + (e.key === 'ArrowLeft' ? -1 : 1)),
                  ),
                )
              else
                setPower((p) =>
                  Math.max(
                    120,
                    Math.min(440, p + (e.key === 'ArrowUp' ? 5 : -5)),
                  ),
                )
            }
          }}
        />
        <span className="game-stage-hint">
          {paused
            ? 'PAUSED'
            : busy
              ? 'GRAVITY IS YOUR CADDIE'
              : 'Drag right to aim · Longer drag = more power'}
        </span>
      </div>
      <div className="game-console">
        {artState === 'loading' && <p>Loading cosmic artwork…</p>}
        {artState === 'error' && (
          <p role="alert">
            Artwork could not load.{' '}
            <button
              className="button button--outline"
              onClick={() => {
                setArtState('loading')
                setArtAttempt((n) => n + 1)
              }}
            >
              Retry artwork
            </button>
          </p>
        )}
        <div
          className={`game-feedback ${outcome === 'sunk' ? 'game-feedback--success' : ''}`}
        >
          <div>
            <span className="game-kicker">
              {outcome === 'sunk'
                ? `${'★'.repeat(holeStars(strokes[index], h.par))} ${shotRating(strokes[index], h.par)}`
                : 'FIND YOUR LINE'}
            </span>
            <p role="status">
              {finished
                ? `Course complete! ${total} strokes against par ${coursePar}.`
                : paused
                  ? 'Paused. Resume when ready.'
                  : outcome
                    ? messages[outcome]
                    : 'Drag across the sky or use the sliders. Aim first, then launch.'}
            </p>
          </div>
          {outcome === 'sunk' && !finished && (
            <button
              className="button button--primary"
              onClick={() => reset(index + 1)}
            >
              Next hole
            </button>
          )}
          {finished && (
            <button className="button button--primary" onClick={() => reset()}>
              Play again
            </button>
          )}
        </div>
        <div className="game-scorecard" aria-label="Course scorecard">
          {holes.map((hole, i) => {
            const complete = i < index || (i === index && outcome === 'sunk')
            return (
              <div
                key={hole.name}
                className={i === index ? 'is-current' : ''}
                aria-label={`Hole ${i + 1}, par ${hole.par}, ${complete ? `${strokes[i]} strokes` : 'not completed'}`}
              >
                <small>HOLE {i + 1}</small>
                <strong>{complete ? strokes[i] : '—'}</strong>
                <span
                  className="game-stars"
                  aria-label={
                    complete
                      ? `${holeStars(strokes[i], hole.par)} stars`
                      : 'Not completed'
                  }
                >
                  {complete
                    ? '★'.repeat(holeStars(strokes[i], hole.par))
                    : '···'}
                </span>
              </div>
            )
          })}
        </div>
        <section className="game-controls" aria-label="Shot controls">
          <label>
            Shot angle<strong>{angle}°</strong>
            <input
              type="range"
              min={-80}
              max={80}
              value={angle}
              disabled={!canAim}
              onChange={(e) => setAngle(Number(e.target.value))}
            />
          </label>
          <label>
            Shot power<strong>{power}</strong>
            <input
              type="range"
              min={120}
              max={440}
              step={5}
              value={power}
              disabled={!canAim}
              onChange={(e) => setPower(Number(e.target.value))}
            />
          </label>
        </section>
        <div className="golf-assist">
          <label>
            <input
              type="checkbox"
              checked={showPreview}
              onChange={(e) => setShowPreview(e.target.checked)}
            />{' '}
            Show predicted path
          </label>
          <span>
            {showPreview && !busy && outcome !== 'sunk'
              ? forecast.outcome === 'sunk'
                ? 'Capture predicted ✦'
                : forecast.outcome === 'collision'
                  ? 'Trajectory meets a planet'
                  : forecast.outcome === 'escaped'
                    ? 'Trajectory leaves the course'
                    : 'Trajectory loops into orbit'
              : 'Trust your instincts.'}
          </span>
        </div>
        <div className="game-actions">
          <button
            className="button button--primary"
            disabled={!canAim}
            onClick={launch}
          >
            Launch comet
          </button>
          <button
            className="button button--outline"
            disabled={!session.available || artState !== 'ready'}
            onClick={() => setPaused(!paused)}
          >
            {paused ? 'Resume' : 'Pause'}
          </button>
          {busy && (
            <button
              className="button button--outline"
              onClick={() => {
                flying.current = false
                setOutcome('timeout')
              }}
            >
              Abandon shot
            </button>
          )}
          <button className="button button--outline" onClick={() => reset()}>
            Restart course
          </button>
        </div>
      </div>
      <details className="game-guide">
        <summary>How to play & earn stars</summary>
        <p>
          Drag right anywhere on the course to aim. Drag upward or downward for
          direction; a longer drag adds power. Release to keep your aim, then
          press Launch comet. The sliders offer precise adjustments. Focus the
          course and use Left/Right for angle, Up/Down for power, Space to
          launch, or P to pause. On phones, expand the play area and rotate to
          landscape for a wider view.
        </p>
        <p>
          Planets curve every shot. Avoid their surfaces and reach the black
          hole. The dashed path shows your forecast; a faint line shows your
          previous attempt. Switch off the preview for an extra challenge. Every
          launch counts, including abandoned shots. Impacts, escapes, and 18
          seconds in flight end the attempt; launch again from the tee.
        </p>
        <p>
          Finish under par for three stars, at par for two, or above par for
          one. Best stars per hole and your lowest completed six-hole score stay
          in this browser. The current course resets when you leave. Break play
          pauses with your Pomodoro timer; free play is always available.
        </p>
      </details>
    </GameShell>
  )
}
