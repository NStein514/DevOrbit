// A fixed simulation space keeps movement and difficulty identical on phones and desktops.
export const WIDTH = 480
export const HEIGHT = 640
export type FlightStatus =
  'ready' | 'running' | 'paused' | 'over' | 'break-ended'
export interface Body {
  id: number
  x: number
  y: number
  radius: number
  speed: number
  angle: number
  spin: number
}
export interface Flight {
  status: FlightStatus
  reason: string
  x: number
  y: number
  elapsed: number
  heat: number
  shields: number
  invulnerable: number
  orbs: number
  rocks: Body[]
  energy: Body[]
  rockIn: number
  orbIn: number
  seed: number
  nextId: number
}
export interface Controls {
  x: number
  y: number
  target?: { x: number; y: number }
}
export function createFlight(seed = 123456): Flight {
  return {
    status: 'ready',
    reason: '',
    x: WIDTH / 2,
    y: HEIGHT - 95,
    elapsed: 0,
    heat: 12,
    shields: 3,
    invulnerable: 0,
    orbs: 0,
    rocks: [],
    energy: [],
    rockIn: 0.6,
    orbIn: 1,
    seed: seed >>> 0 || 1,
    nextId: 0,
  }
}
function random(flight: Flight) {
  flight.seed = (Math.imul(flight.seed, 1664525) + 1013904223) >>> 0
  return flight.seed / 4294967296
}
export function score(flight: Flight) {
  return Math.floor(flight.elapsed * 10) + flight.orbs * 75
}
export function endFlight(
  flight: Flight,
  reason: string,
  status: FlightStatus = 'over',
) {
  flight.status = status
  flight.reason = reason
}
export function step(flight: Flight, controls: Controls, dt: number) {
  if (flight.status !== 'running') return
  // Callers use fixed steps; this guard also prevents large jumps after suspension.
  dt = Math.max(0, Math.min(dt, 1 / 30))
  flight.elapsed += dt
  flight.heat = Math.min(
    100,
    flight.heat + (3.4 + Math.min(2, flight.elapsed / 90)) * dt,
  )
  flight.invulnerable = Math.max(0, flight.invulnerable - dt)
  let { x, y } = controls
  if (controls.target) {
    x = controls.target.x - flight.x
    y = controls.target.y - flight.y
  }
  const length = Math.hypot(x, y)
  if (length > 0) {
    const distance = controls.target ? Math.min(length, 260 * dt) : 260 * dt
    flight.x += (x / length) * distance
    flight.y += (y / length) * distance
  }
  flight.x = Math.max(22, Math.min(WIDTH - 22, flight.x))
  flight.y = Math.max(40, Math.min(HEIGHT - 28, flight.y))
  const speed = 110 + Math.min(160, flight.elapsed * 1.5)
  flight.rockIn -= dt
  flight.orbIn -= dt
  if (flight.rockIn <= 0) {
    const radius = 18 + random(flight) * 18
    flight.rocks.push({
      id: flight.nextId++,
      x: radius + random(flight) * (WIDTH - radius * 2),
      y: -60,
      radius,
      speed: speed * (0.85 + random(flight) * 0.35),
      angle: random(flight) * Math.PI * 2,
      spin: random(flight) - 0.5,
    })
    flight.rockIn = Math.max(0.3, 0.86 - flight.elapsed / 200)
  }
  if (flight.orbIn <= 0) {
    flight.energy.push({
      id: flight.nextId++,
      x: 35 + random(flight) * (WIDTH - 70),
      y: -35,
      radius: 12,
      speed: speed * 0.82,
      angle: 0,
      spin: 0,
    })
    flight.orbIn = 2.4
  }
  for (const rock of flight.rocks) {
    rock.y += rock.speed * dt
    rock.angle += rock.spin * dt
    if (
      flight.invulnerable === 0 &&
      Math.hypot(rock.x - flight.x, rock.y - flight.y) < rock.radius + 12
    ) {
      flight.shields -= 1
      flight.invulnerable = 1.4
      flight.heat = Math.min(100, flight.heat + 10)
      rock.y = HEIGHT + 100
      if (flight.shields === 0) {
        endFlight(flight, 'Hull lost. The asteroid field wins this round.')
        return
      }
    }
  }
  for (const orb of flight.energy) {
    orb.y += orb.speed * dt
    if (Math.hypot(orb.x - flight.x, orb.y - flight.y) < orb.radius + 16) {
      flight.orbs += 1
      flight.heat = Math.max(0, flight.heat - 24)
      orb.y = HEIGHT + 100
    }
  }
  flight.rocks = flight.rocks.filter((rock) => rock.y < HEIGHT + 70)
  flight.energy = flight.energy.filter((orb) => orb.y < HEIGHT + 70)
  if (flight.heat >= 100)
    endFlight(
      flight,
      'Reactor overheated. Collect more energy to keep your ship cool.',
    )
}
