import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  advance,
  launch,
  step,
  lost,
  gravity,
  type Satellite,
} from './orbit/engine'
import './orbit/orbit.css'
export default function OrbitArchitectPage() {
  const canvas = useRef<HTMLCanvasElement>(null),
    bodies = useRef<Satellite[]>([]),
    nextId = useRef(1)
  const [radius, setRadius] = useState(190),
    [position, setPosition] = useState(0),
    [direction, setDirection] = useState(0),
    [speed, setSpeed] = useState(31),
    [paused, setPaused] = useState(false),
    [count, setCount] = useState(0),
    [message, setMessage] = useState(
      'Launch three satellites and keep them together for 30 seconds.',
    ),
    [ready, setReady] = useState(false),
    [error, setError] = useState(false),
    [attempt, setAttempt] = useState(0),
    [won, setWon] = useState(false)
  const settings = useRef({ radius, position, direction, speed, paused })
  useEffect(() => {
    settings.current = { radius, position, direction, speed, paused }
  }, [radius, position, direction, speed, paused])
  useEffect(() => {
    let disposed = false,
      frame = 0,
      last = 0,
      accumulator = 0,
      held = 0,
      celebrated = false
    const world = new Image(),
      sprite = new Image()
    world.src = '/images/arcade/orbit/world.png'
    sprite.src = '/images/arcade/orbit/satellite.png'
    const effects: { x: number; y: number; age: number }[] = []
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches
    Promise.all([world.decode(), sprite.decode()])
      .then(() => {
        if (disposed) return
        setReady(true)
        const ctx = canvas.current!.getContext('2d')!
        function draw(time: number) {
          if (disposed) return
          const dt = last ? Math.min((time - last) / 1000, 0.05) : 0
          last = time
          const cfg = settings.current
          if (!cfg.paused) {
            accumulator += dt
            while (accumulator >= 1 / 120) {
              const removed = advance(bodies.current, 1 / 120)
              if (removed.size) {
                for (const b of bodies.current)
                  if (removed.has(b.id))
                    effects.push({ x: b.x, y: b.y, age: 0 })
                bodies.current = bodies.current.filter(
                  (b) => !removed.has(b.id),
                )
                setCount(bodies.current.length)
                setMessage(
                  [...removed.values()][0] +
                    '. Adjust your launch and try again.',
                )
              }
              held = bodies.current.length >= 3 ? held + 1 / 120 : 0
              if (held >= 30 && !celebrated) {
                celebrated = true
                setWon(true)
                setMessage(
                  'Constellation established! Three satellites held orbit for 30 seconds.',
                )
              }
              accumulator -= 1 / 120
            }
            for (const b of bodies.current) {
              b.trail.push({ x: b.x, y: b.y })
              if (b.trail.length > 180) b.trail.shift()
            }
            for (const e of effects) e.age += dt
          }
          ctx.clearRect(0, 0, 1000, 562)
          ctx.drawImage(world, 0, 0, 1000, 562)
          ctx.save()
          ctx.translate(500, 281)
          const preview = launch(
            0,
            cfg.radius,
            cfg.position,
            cfg.direction,
            cfg.speed,
          )
          ctx.beginPath()
          ctx.moveTo(preview.x, preview.y)
          for (let i = 0; i < 1000; i++) {
            step(preview, 0.04)
            if (lost(preview)) break
            ctx.lineTo(preview.x, preview.y)
          }
          ctx.strokeStyle = '#b5f4da66'
          ctx.setLineDash([3, 6])
          ctx.lineWidth = 1
          ctx.stroke()
          ctx.setLineDash([])
          const start = launch(
            0,
            cfg.radius,
            cfg.position,
            cfg.direction,
            cfg.speed,
          )
          ctx.strokeStyle = '#e4fff3'
          ctx.beginPath()
          ctx.moveTo(start.x, start.y)
          ctx.lineTo(start.x + start.vx, start.y + start.vy)
          ctx.stroke()
          ctx.strokeRect(start.x - 5, start.y - 5, 10, 10)
          for (const b of bodies.current) {
            const color = `hsl(${(b.id * 67) % 360} 85% 78%)`
            ctx.strokeStyle = color
            ctx.lineWidth = 1.5
            ctx.beginPath()
            b.trail.forEach((p, i) =>
              i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y),
            )
            ctx.stroke()
            ctx.save()
            ctx.translate(b.x, b.y)
            ctx.rotate(Math.atan2(b.vy, b.vx))
            if (!reduced) {
              ctx.shadowColor = color
              ctx.shadowBlur = 12
            }
            ctx.drawImage(sprite, -18, -9, 36, 18)
            ctx.restore()
          }
          for (let i = effects.length - 1; i >= 0; i--) {
            const e = effects[i]
            if (e.age > 1) {
              effects.splice(i, 1)
              continue
            }
            if (reduced) continue
            ctx.strokeStyle = `rgba(255,191,124,${1 - e.age})`
            ctx.beginPath()
            ctx.arc(e.x, e.y, 8 + e.age * 45, 0, Math.PI * 2)
            ctx.stroke()
          }
          ctx.restore()
          frame = requestAnimationFrame(draw)
        }
        frame = requestAnimationFrame(draw)
      })
      .catch(() => {
        if (!disposed) setError(true)
      })
    const hide = () => {
      if (document.hidden) setPaused(true)
    }
    document.addEventListener('visibilitychange', hide)
    return () => {
      disposed = true
      cancelAnimationFrame(frame)
      document.removeEventListener('visibilitychange', hide)
    }
  }, [attempt])
  function send() {
    if (!ready || paused || bodies.current.length >= 8) return
    bodies.current.push(
      launch(nextId.current++, radius, position, direction, speed),
    )
    setCount(bodies.current.length)
    setMessage('Satellite deployed. Watch its path before launching the next.')
  }
  return (
    <div className="orbit-page">
      <Link className="text-link" to="/games">
        ← Back to arcade
      </Link>
      <div className="page-heading">
        <div>
          <p className="eyebrow">CELESTIAL DESIGN LAB / 03</p>
          <h1>
            Orbit Architect<span>.</span>
          </h1>
          <p>
            A little velocity. A delicate balance. A universe of possibilities.
          </p>
        </div>
      </div>
      <div className="orbit-hud">
        <span>{count} / 8 satellites</span>
        <span>
          {won
            ? '✦ Constellation established'
            : 'Mission: 3 satellites · 30 seconds'}
        </span>
        <span>{paused ? 'Simulation paused' : 'Gravity active'}</span>
      </div>
      <canvas
        ref={canvas}
        width={1000}
        height={562}
        className="orbit-canvas"
        aria-label="Orbital simulation with predicted launch path. Adjust the controls below to launch satellites."
      />
      {error ? (
        <p role="alert">
          Artwork could not load.{' '}
          <button
            onClick={() => {
              setError(false)
              setAttempt((a) => a + 1)
            }}
          >
            Retry artwork
          </button>
        </p>
      ) : !ready ? (
        <p role="status">Preparing the orbital laboratory…</p>
      ) : null}
      <p role="status" className="orbit-message">
        {message}
      </p>
      <section className="orbit-controls" aria-label="Launch controls">
        {[
          {
            label: 'Launch radius',
            value: radius,
            set: setRadius,
            min: 130,
            max: 245,
            unit: ' units',
          },
          {
            label: 'Launch position',
            value: position,
            set: setPosition,
            min: 0,
            max: 359,
            unit: '°',
          },
          {
            label: 'Direction from tangent',
            value: direction,
            set: setDirection,
            min: -180,
            max: 180,
            unit: '°',
          },
          {
            label: 'Launch velocity',
            value: speed,
            set: setSpeed,
            min: 5,
            max: 65,
            unit: ' units/s',
          },
        ].map((c) => (
          <label key={c.label}>
            {c.label}
            <strong>
              {c.value}
              {c.unit}
            </strong>
            <input
              type="range"
              min={c.min}
              max={c.max}
              value={c.value}
              onChange={(e) => c.set(Number(e.target.value))}
            />
          </label>
        ))}
      </section>
      <div className="orbit-actions">
        <button
          className="button button--primary"
          disabled={!ready || paused || count >= 8}
          onClick={send}
        >
          Launch satellite
        </button>
        <button
          className="button button--outline"
          onClick={() => {
            setDirection(0)
            setSpeed(Math.round(Math.sqrt(gravity / radius)))
          }}
        >
          Circular orbit preset
        </button>
        <button
          className="button button--outline"
          disabled={!ready}
          onClick={() => setPaused(!paused)}
        >
          {paused ? 'Resume' : 'Pause'}
        </button>
        <button
          className="button button--outline"
          onClick={() => {
            bodies.current = []
            setCount(0)
            setWon(false)
            setPaused(false)
            setAttempt((a) => a + 1)
            setReady(false)
            setMessage('Laboratory reset. Try a different constellation.')
          }}
        >
          Reset simulation
        </button>
      </div>
      <details className="orbit-guide">
        <summary>Flight manual</summary>
        <p>
          Direction 0° follows the tangent; ±90° aims toward or away from the
          planet. More speed makes wider orbits, too little falls inward, and
          too much escapes. The dashed path predicts a single satellite’s
          motion; it does not predict collisions with other satellites. Launch
          from different positions or radii to avoid collisions. The circular
          preset is a helpful starting point. Keep three satellites alive
          together for 30 simulation seconds to complete the challenge. Leaving
          the tab pauses the simulation. Progress resets when you leave this
          page.
        </p>
      </details>
    </div>
  )
}
