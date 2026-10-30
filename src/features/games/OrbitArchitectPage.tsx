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
  launch,
  predictOrbit,
  gravity,
  type Satellite,
} from './orbit/engine'
import {
  missions,
  orbitHazards,
  missionReady,
  missionStars,
  occupiedLanes,
} from './orbit/missions'
import { renderOrbit, type OrbitEffect } from './orbit/render'
import { GameShell } from './shared/GameShell'
import { useGameSession } from './shared/useGameSession'
import { readGameRecord, saveGameRecord } from './shared/records'
import './orbit/orbit.css'
export default function OrbitArchitectPage() {
  const canvas = useRef<HTMLCanvasElement>(null),
    bodies = useRef<Satellite[]>([]),
    nextId = useRef(1)
  const [radius, setRadius] = useState(190),
    [position, setPosition] = useState(0),
    [direction, setDirection] = useState(0),
    [speed, setSpeed] = useState(31)
  const [paused, setPaused] = useState(false),
    [count, setCount] = useState(0),
    [message, setMessage] = useState(
      'Choose an orbit lane, then launch. Your next launch position spaces itself out.',
    )
  const [ready, setReady] = useState(false),
    [error, setError] = useState(false),
    [attempt, setAttempt] = useState(0)
  const [mission, setMission] = useState(0),
    [won, setWon] = useState(false),
    [progress, setProgress] = useState(0),
    [lanes, setLanes] = useState(0),
    [losses, setLosses] = useState(0)
  const [forecastTime, setForecastTime] = useState(0)
  const [saved, setSaved] = useState(() => readGameRecord('orbit-architect'))
  const simulation = useRef({
    held: 0,
    losses: 0,
    won: false,
    effects: [] as OrbitEffect[],
    time: 0,
  })
  const pointer = useRef<number | null>(null)
  const session = useGameSession()
  const preview = useMemo(
    () =>
      predictOrbit(
        launch(0, radius, position, direction, speed),
        orbitHazards[mission],
        forecastTime,
        missions[mission].hold,
      ),
    [radius, position, direction, speed, mission, forecastTime],
  )
  const config = useRef({
    radius,
    position,
    direction,
    speed,
    paused,
    mission,
    preview,
    canPlay: session.canPlay,
  })
  useLayoutEffect(() => {
    config.current = {
      radius,
      position,
      direction,
      speed,
      paused,
      mission,
      preview,
      canPlay: session.canPlay,
    }
  }, [
    radius,
    position,
    direction,
    speed,
    paused,
    mission,
    preview,
    session.canPlay,
  ])
  useEffect(() => {
    let disposed = false,
      frame = 0,
      last = 0,
      acc = 0,
      published = 0
    const world = new Image(),
      sprite = new Image(),
      debris = new Image(),
      motion = matchMedia('(prefers-reduced-motion: reduce)')
    world.src = '/images/arcade/orbit/world.png'
    sprite.src = '/images/arcade/orbit/satellite.png'
    debris.src = '/images/arcade/asteroid-escape-asteroid.png'
    const el = canvas.current!,
      ctx = el.getContext('2d')!
    let drawnConfig: typeof config.current | null = null
    let drawnHeight = 0
    let drawnReduced = false
    let drawnWon = false
    let resizeFrame = 0
    const resize = new ResizeObserver(() => {
      cancelAnimationFrame(resizeFrame)
      resizeFrame = requestAnimationFrame(() => {
        const height = el.clientWidth < 600 ? 900 : 562
        if (el.height !== height) el.height = height
      })
    })
    resize.observe(el)
    Promise.all([world.decode(), sprite.decode(), debris.decode()])
      .then(() => {
        if (disposed) return
        setReady(true)
        function draw(now: number) {
          if (disposed) return
          const elapsed = last ? (now - last) / 1000 : 0,
            dt = Math.min(elapsed, 0.05)
          last = now
          const cfg = config.current,
            s = simulation.current
          if ((!cfg.canPlay() || elapsed > 0.5) && !cfg.paused) {
            cfg.paused = true
            setPaused(true)
          }
          if (!cfg.paused && !s.won) {
            acc += dt
            while (acc >= 1 / 120) {
              const removed = advance(
                bodies.current,
                1 / 120,
                orbitHazards[cfg.mission],
                s.time,
              )
              s.time += 1 / 120
              if (removed.size) {
                bodies.current.forEach((b) => {
                  if (removed.has(b.id))
                    s.effects.push({ x: b.x, y: b.y, age: 0 })
                })
                bodies.current = bodies.current.filter(
                  (b) => !removed.has(b.id),
                )
                s.losses += removed.size
                setCount(bodies.current.length)
                setLosses(s.losses)
                setMessage(
                  `${[...removed.values()][0]}. Try a circular preset or a different lane.`,
                )
              }
              s.held = missionReady(bodies.current, cfg.mission)
                ? s.held + 1 / 120
                : 0
              if (s.held >= missions[cfg.mission].hold && !s.won) {
                s.won = true
                setWon(true)
                setProgress(missions[cfg.mission].hold)
                setMessage(
                  'Constellation established! Your satellites are in harmony.',
                )
                setSaved(
                  saveGameRecord(
                    'orbit-architect',
                    cfg.mission,
                    missionStars(s.losses),
                  ),
                )
                acc = 0
                break
              }
              acc -= 1 / 120
            }
            for (const b of bodies.current) {
              b.trail.push({ x: b.x, y: b.y })
              if (b.trail.length > 180) b.trail.shift()
            }
            s.effects = s.effects.filter((e) => {
              e.age += dt
              return e.age < 1
            })
            if (now - published > 100) {
              setForecastTime(s.time)
              setProgress(Math.min(s.held, missions[cfg.mission].hold))
              setLanes(occupiedLanes(bodies.current))
              published = now
            }
          } else {
            acc = 0
            if (cfg.preview.launchTime !== s.time) setForecastTime(s.time)
          }
          if (
            (!cfg.paused && !s.won) ||
            drawnConfig !== cfg ||
            drawnHeight !== el.height ||
            drawnReduced !== motion.matches ||
            drawnWon !== s.won
          ) {
            renderOrbit(
              ctx,
              world,
              sprite,
              bodies.current,
              cfg.preview.points,
              cfg,
              s.effects,
              s.time,
              motion.matches,
              s.won,
              orbitHazards[cfg.mission],
              debris,
              cfg.preview.reason !== null,
            )
            drawnConfig = cfg
            drawnHeight = el.height
            drawnReduced = motion.matches
            drawnWon = s.won
          }
          frame = requestAnimationFrame(draw)
        }
        frame = requestAnimationFrame(draw)
      })
      .catch(() => {
        if (!disposed) setError(true)
      })
    const pause = () => {
      config.current.paused = true
      pointer.current = null
      setPaused(true)
    }
    const hide = () => {
      if (document.hidden) pause()
    }
    document.addEventListener('visibilitychange', hide)
    window.addEventListener('blur', pause)
    return () => {
      disposed = true
      cancelAnimationFrame(frame)
      resize.disconnect()
      cancelAnimationFrame(resizeFrame)
      document.removeEventListener('visibilitychange', hide)
      window.removeEventListener('blur', pause)
    }
  }, [attempt])
  function send() {
    if (
      !ready ||
      paused ||
      won ||
      !session.canPlay() ||
      bodies.current.length >= 8
    )
      return
    bodies.current.push(
      launch(nextId.current++, radius, position, direction, speed),
    )
    setCount(bodies.current.length)
    setPosition((position + 137) % 360)
    canvas.current?.scrollIntoView({ block: 'center', behavior: 'instant' })
    canvas.current?.focus({ preventScroll: true })
    setMessage(
      'Satellite deployed. The next launch is spaced out; mix lanes for a safer constellation.',
    )
  }
  function reset(next = mission) {
    bodies.current = []
    nextId.current = 1
    simulation.current = {
      held: 0,
      losses: 0,
      won: false,
      effects: [],
      time: 0,
    }
    setForecastTime(0)
    setCount(0)
    setWon(false)
    setProgress(0)
    setLanes(0)
    setLosses(0)
    setMission(next)
    setPaused(false)
    setRadius(190)
    setPosition(0)
    setDirection(0)
    setSpeed(31)
    setMessage(missions[next].brief)
  }
  function aim(event: PointerEvent<HTMLCanvasElement>) {
    if (
      pointer.current !== event.pointerId ||
      paused ||
      won ||
      !ready ||
      !session.canPlay()
    )
      return
    const el = event.currentTarget,
      box = el.getBoundingClientRect(),
      scale = el.height > 600 ? 1.5 : 1
    const x =
        (((event.clientX - box.left) * el.width) / box.width - el.width / 2) /
        scale,
      y =
        (((event.clientY - box.top) * el.height) / box.height - el.height / 2) /
        scale
    const r = Math.round(Math.max(130, Math.min(245, Math.hypot(x, y))))
    setRadius(r)
    setPosition(Math.round(((Math.atan2(y, x) * 180) / Math.PI + 360) % 360))
    setDirection(0)
    setSpeed(Math.round(Math.sqrt(gravity / r)))
  }
  const m = missions[mission],
    blocked = paused || won || !session.available
  return (
    <GameShell
      title="Orbit Architect"
      subtitle="Find the balance. Build a constellation. Make the sky your own."
      label="CELESTIAL DESIGN LAB / 03"
      record={`Best ${saved.record.best} / 9 stars`}
      error={saved.error}
      session={session}
    >
      <div className="game-hud">
        <div>
          <small>Mission {mission + 1} / 3</small>
          <strong>{m.name}</strong>
        </div>
        <div>
          <small>Constellation</small>
          <strong>{count} / 8 satellites</strong>
        </div>
        <div>
          <small>
            Stability · {Math.floor(progress)} / {m.hold}s
          </small>
          <strong>
            {lanes} / {m.bands} lanes
          </strong>
          <progress
            aria-label="Constellation stability"
            max={m.hold}
            value={progress}
          />
        </div>
      </div>
      <div className="game-stage">
        <canvas
          ref={canvas}
          width={1000}
          height={562}
          tabIndex={0}
          aria-label="Orbital simulation. Drag to place a circular launch. Space launches, P pauses."
          onPointerDown={(e) => {
            if (e.button !== 0 || pointer.current !== null) return
            pointer.current = e.pointerId
            e.currentTarget.setPointerCapture(e.pointerId)
            e.currentTarget.focus({ preventScroll: true })
            aim(e)
          }}
          onPointerMove={aim}
          onPointerUp={() => {
            pointer.current = null
          }}
          onPointerCancel={() => {
            pointer.current = null
          }}
          onLostPointerCapture={() => {
            pointer.current = null
          }}
          onKeyDown={(e) => {
            if (e.repeat) return
            if (e.key === ' ') {
              e.preventDefault()
              send()
            }
            if (e.key.toLowerCase() === 'p') {
              e.preventDefault()
              setPaused((p) => !p)
            }
          }}
        />
        <span className="game-stage-hint">
          {won
            ? 'CONSTELLATION COMPLETE'
            : paused
              ? 'PAUSED'
              : 'Drag to position · Space to launch · P to pause'}
        </span>
      </div>
      <div className="game-hazards" aria-label="Debris forecast">
        <span>
          ⚠ {orbitHazards[mission].length} debris{' '}
          {orbitHazards[mission].length === 1 ? 'hazard' : 'hazards'} · amber
          routes
        </span>
        <span>
          {won
            ? 'Formation secured'
            : preview.reason
              ? `${preview.reason} predicted in ${preview.seconds.toFixed(1)}s — wait or adjust your launch.`
              : `Launch now: clear of debris for ${m.hold}s.`}
        </span>
        <small>
          Field time{' '}
          <span data-testid="hazard-time">{forecastTime.toFixed(1)}</span>s ·
          previews exclude other satellites
        </small>
      </div>
      <div className="game-console">
        {error ? (
          <p role="alert">
            Artwork could not load.{' '}
            <button
              className="button button--outline"
              onClick={() => {
                setError(false)
                setAttempt((a) => a + 1)
              }}
            >
              Retry artwork
            </button>
          </p>
        ) : !ready ? (
          <p>Preparing the orbital laboratory…</p>
        ) : null}
        <div className={`game-feedback ${won ? 'game-feedback--success' : ''}`}>
          <div>
            <span className="game-kicker">
              {won
                ? `${'★'.repeat(missionStars(losses))} MISSION COMPLETE`
                : m.brief}
            </span>
            <p role="status">
              {paused ? 'Simulation paused. Resume when ready.' : message}
            </p>
          </div>
          {won && (
            <button
              className="button button--primary"
              onClick={() => reset((mission + 1) % missions.length)}
            >
              {mission < 2 ? 'Next mission' : 'Play missions again'}
            </button>
          )}
        </div>
        <div className="game-presets" aria-label="Orbit lane presets">
          {[
            { r: 150, label: 'Inner lane' },
            { r: 190, label: 'Middle lane' },
            { r: 235, label: 'Outer lane' },
          ].map((p) => (
            <button
              key={p.r}
              disabled={blocked}
              onClick={() => {
                setRadius(p.r)
                setDirection(0)
                setSpeed(Math.round(Math.sqrt(gravity / p.r)))
              }}
            >
              {p.label}
            </button>
          ))}
        </div>
        <section className="game-controls" aria-label="Launch controls">
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
                disabled={blocked}
                onChange={(e) => c.set(Number(e.target.value))}
              />
            </label>
          ))}
        </section>
        <div className="game-actions">
          <button
            className="button button--primary"
            disabled={!ready || blocked || count >= 8}
            onClick={send}
          >
            Launch satellite
          </button>
          <button
            className="button button--outline"
            disabled={blocked}
            onClick={() => {
              setDirection(0)
              setSpeed(Math.round(Math.sqrt(gravity / radius)))
            }}
          >
            Circular orbit preset
          </button>
          <button
            className="button button--outline"
            disabled={!ready || won || !session.available}
            onClick={() => setPaused(!paused)}
          >
            {paused ? 'Resume' : 'Pause'}
          </button>
          <button className="button button--outline" onClick={() => reset()}>
            Reset simulation
          </button>
        </div>
      </div>
      <details className="game-guide">
        <summary>Flight manual & mission rewards</summary>
        <p>
          Amber rings mark debris and dashed amber tracks show its route. D1 and
          D2 move through launch lanes; later missions also contain a fixed
          fragment. Wait for an opening, then launch. The preview forecasts
          moving debris over the stability target duration, but does not predict
          other satellites. Debris impacts lose satellites and count against
          stars. Pausing freezes the entire field; reset restarts its timing.
          Reduced motion keeps hazard movement visible because it affects play.
        </p>
        <p>
          Tap or drag around the planet to place a circular launch; use the
          sliders for experimental paths. Launch with the button or focus the
          sky and press Space. P pauses. The next launch moves 137° around the
          planet to help avoid collisions. Inner, middle, and outer lanes sit at
          150, 190, and 235 units. Keep the required satellite count and lanes
          occupied continuously; losing the formation resets stability.
        </p>
        <p>
          Earn three stars with no lost satellites, two with up to two losses,
          or one for completing the mission. Your best stars for each mission
          stay in this browser. Live constellations reset when leaving the page.
          Predicted paths do not account for other satellites. Break play pauses
          with your Pomodoro timer; free play is always available.
        </p>
      </details>
    </GameShell>
  )
}
