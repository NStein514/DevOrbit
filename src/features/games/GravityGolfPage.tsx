import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  advance,
  holes,
  prediction,
  shoot,
  type Comet,
  type Outcome,
  type Point,
} from './golf/engine'
import { render } from './golf/render'
import { loadGolfArt, type GolfSprites } from './golf/art'
import './golf/golf.css'
const messages: Record<Outcome, string> = {
  flying: 'Comet in flight…',
  sunk: 'In the black hole! Nicely curved.',
  collision: 'Planet impact. Adjust your angle or power and try again.',
  escaped: 'Your comet left the course. Try a gentler shot.',
  timeout: 'Orbit trapped! Try a different launch.',
}
export default function GravityGolfPage() {
  const [index, setIndex] = useState(0),
    [angle, setAngle] = useState(-20),
    [power, setPower] = useState(260),
    [outcome, setOutcome] = useState<Outcome | null>(null),
    [paused, setPaused] = useState(false),
    [strokes, setStrokes] = useState([0, 0, 0]),
    [showPreview, setShowPreview] = useState(true)
  const [artState, setArtState] = useState<'loading' | 'ready' | 'error'>(
      'loading',
    ),
    [artAttempt, setArtAttempt] = useState(0)
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
    flying = useRef(false)
  const h = holes[index],
    forecast = useMemo(() => prediction(h, angle, power), [h, angle, power])
  const view = useRef({ index, paused, forecast, showPreview, outcome })
  useEffect(() => {
    view.current = { index, paused, forecast, showPreview, outcome }
  }, [index, paused, forecast, showPreview, outcome])
  useEffect(() => {
    let frame = 0,
      last = 0,
      acc = 0,
      visualTime = 0,
      effectAge = 0,
      previousOutcome: Outcome | null = null
    const ctx = canvas.current!.getContext('2d')!,
      motion = matchMedia('(prefers-reduced-motion: reduce)')
    function draw(time: number) {
      const v = view.current
      const dt = last ? Math.min((time - last) / 1000, 0.05) : 0
      last = time
      if (flying.current && !v.paused && body.current) {
        acc += dt
        while (acc >= 1 / 120 && flying.current) {
          const result = advance(body.current, holes[v.index], 1 / 120)
          acc -= 1 / 120
          if (result !== 'flying') {
            flying.current = false
            setOutcome(result)
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
      )
      frame = requestAnimationFrame(draw)
    }
    frame = requestAnimationFrame(draw)
    const hide = () => {
      if (document.hidden) setPaused(true)
    }
    document.addEventListener('visibilitychange', hide)
    return () => {
      cancelAnimationFrame(frame)
      document.removeEventListener('visibilitychange', hide)
    }
  }, [])
  function launch() {
    if (artState !== 'ready' || flying.current || paused || outcome === 'sunk')
      return
    body.current = shoot(h, angle, power)
    trail.current = []
    flying.current = true
    setOutcome('flying')
    setStrokes((s) => s.map((n, i) => (i === index ? n + 1 : n)))
  }
  function reset(next = 0) {
    flying.current = false
    body.current = null
    trail.current = []
    setOutcome(null)
    setPaused(false)
    setIndex(next)
    setAngle(-20)
    setPower(260)
    if (next === 0) setStrokes([0, 0, 0])
  }
  const busy = outcome === 'flying',
    finished = outcome === 'sunk' && index === holes.length - 1
  return (
    <div className="golf-page">
      <Link className="text-link" to="/games">
        ← Back to arcade
      </Link>
      <div className="page-heading">
        <div>
          <p className="eyebrow">COSMIC LINKS / 04</p>
          <h1>
            Gravity Golf<span>.</span>
          </h1>
          <p>Read the gravity. Bend the shot. Find the darkness.</p>
        </div>
      </div>
      <div className="golf-hud">
        <span>
          Hole {index + 1} / 3 · {h.name}
        </span>
        <span>
          Par {h.par} · Strokes {strokes[index]}
        </span>
        <span>Total {strokes.reduce((a, b) => a + b, 0)}</span>
      </div>
      <canvas
        className="golf-canvas"
        ref={canvas}
        width={1000}
        height={560}
        aria-label="Gravity Golf course. Planets curve your shot toward the purple black hole. Use the angle and power controls below."
      />
      {artState === 'loading' && (
        <p aria-live="polite">Loading cosmic artwork…</p>
      )}
      {artState === 'error' && (
        <p role="alert">
          Artwork could not load.{' '}
          <button
            onClick={() => {
              setArtState('loading')
              setArtAttempt((n) => n + 1)
            }}
          >
            Retry artwork
          </button>
        </p>
      )}
      <p className="golf-message" role="status">
        {finished
          ? `Course complete! ${strokes.reduce((a, b) => a + b, 0)} strokes against par 8.`
          : paused
            ? 'Paused. Resume when ready.'
            : outcome
              ? messages[outcome]
              : 'Aim your comet. The dashed line previews its full path.'}
      </p>
      <section className="golf-controls" aria-label="Shot controls">
        <label>
          Shot angle: {angle}°
          <input
            type="range"
            min={-80}
            max={80}
            value={angle}
            disabled={busy || outcome === 'sunk'}
            onChange={(e) => setAngle(Number(e.target.value))}
          />
        </label>
        <label>
          Shot power: {power}
          <input
            type="range"
            min={120}
            max={440}
            step={5}
            value={power}
            disabled={busy || outcome === 'sunk'}
            onChange={(e) => setPower(Number(e.target.value))}
          />
        </label>
        <label className="golf-check">
          <input
            type="checkbox"
            checked={showPreview}
            onChange={(e) => setShowPreview(e.target.checked)}
          />{' '}
          Show predicted path
        </label>
      </section>
      <div className="golf-actions">
        <button
          className="button button--primary"
          disabled={
            artState !== 'ready' || busy || paused || outcome === 'sunk'
          }
          onClick={launch}
        >
          Launch comet
        </button>
        <button
          className="button button--outline"
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
        {outcome === 'sunk' && !finished && (
          <button
            className="button button--primary"
            onClick={() => reset(index + 1)}
          >
            Next hole
          </button>
        )}
        <button className="button button--outline" onClick={() => reset()}>
          Restart course
        </button>
      </div>
      <details className="golf-guide">
        <summary>How to play</summary>
        <p>
          Launch from the white tee into the purple black hole. Negative angles
          aim upward; positive angles aim downward. Planets pull the comet
          continuously, bending its path. A planet impact, leaving the course,
          or 18 seconds in flight ends a shot. Every launch counts, including
          abandoned shots. Try again from the tee without losing your stroke
          count. Use the preview to plan a slingshot; switch it off for a harder
          challenge. Controls work with keyboard and touch. Switching tabs
          pauses flight. This three-hole course is session-only; leaving the
          page resets progress.
        </p>
      </details>
    </div>
  )
}
