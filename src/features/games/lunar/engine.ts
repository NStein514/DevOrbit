export const WIDTH = 600
export const HEIGHT = 720
export const SAFE_VERTICAL = 32
export const SAFE_HORIZONTAL = 20
export const planets = [
  { name: 'Selene', subtitle: 'The quiet frontier', color: '#9be7dd' },
  { name: 'Cinder', subtitle: 'An ember in the dark', color: '#ffc18e' },
  { name: 'Borealis', subtitle: 'Beyond the frozen veil', color: '#bab2ff' },
]
export interface Pad {
  x: number
  y: number
  width: number
  bonus: boolean
}
export interface Mission {
  status: 'ready' | 'running' | 'paused' | 'landed' | 'crashed' | 'break-ended'
  level: number
  seed: number
  score: number
  landings: number
  x: number
  y: number
  vx: number
  vy: number
  fuel: number
  gravity: number
  elapsed: number
  effectAge: number
  thrust: number
  side: number
  terrain: { x: number; y: number }[]
  pads: Pad[]
  reason: string
}
export interface Input {
  main: boolean
  left: boolean
  right: boolean
}
function random(state: { seed: number }) {
  state.seed = (Math.imul(state.seed, 1664525) + 1013904223) >>> 0
  return state.seed / 4294967296
}
export function createMission(
  seed = 1,
  level = 1,
  score = 0,
  landings = 0,
): Mission {
  const rng = { seed: seed >>> 0 }
  const width = Math.max(72, 148 - (level - 1) * 9)
  const pads: Pad[] = [
    {
      x: 35 + random(rng) * 75,
      y: 548 + random(rng) * 50,
      width,
      bonus: false,
    },
    {
      x: 355 + random(rng) * 65,
      y: 552 + random(rng) * 50,
      width: Math.max(55, width * 0.7),
      bonus: true,
    },
  ]
  const xs = [
    ...new Set([
      0,
      WIDTH,
      ...Array.from({ length: 19 }, (_, i) => (i + 1) * 30),
      ...pads.flatMap((p) => [p.x, p.x + p.width]),
    ]),
  ].sort((a, b) => a - b)
  const terrain = xs.map((x) => {
    const pad = pads.find((p) => x >= p.x && x <= p.x + p.width)
    return { x, y: pad ? pad.y : 535 + random(rng) * 95 }
  })
  return {
    status: 'ready',
    level,
    seed: rng.seed,
    score,
    landings,
    x: 275 + random(rng) * 50,
    y: 100,
    vx: 0,
    vy: 0,
    fuel: 100,
    gravity: 22 + 40 * (1 - Math.exp(-(level - 1) / 7)),
    elapsed: 0,
    effectAge: 0,
    thrust: 0,
    side: 0,
    terrain,
    pads,
    reason: '',
  }
}
export function groundAt(game: Mission, x: number) {
  const nodes = game.terrain
  for (let i = 1; i < nodes.length; i++) {
    if (x <= nodes[i].x) {
      const a = nodes[i - 1],
        b = nodes[i]
      return a.y + (b.y - a.y) * Math.max(0, (x - a.x) / (b.x - a.x))
    }
  }
  return nodes[nodes.length - 1].y
}
export function stopThrust(game: Mission) {
  game.thrust = 0
  game.side = 0
}
export function nextPlanet(game: Mission) {
  if (game.status !== 'landed') return game
  return createMission(game.seed, game.level + 1, game.score, game.landings)
}
export function stepMission(game: Mission, input: Input, dt: number) {
  dt = Math.max(0, Math.min(dt, 1 / 30))
  if (game.status === 'landed' || game.status === 'crashed') {
    game.effectAge = Math.min(1.2, game.effectAge + dt)
    return
  }
  if (game.status !== 'running' || dt === 0) return
  game.elapsed += dt
  const side = Number(input.right) - Number(input.left)
  const consumption = Number(input.main) * 7 + Math.abs(side) * 2.5
  const power = consumption ? Math.min(1, game.fuel / (consumption * dt)) : 0
  game.thrust = Number(input.main) * power
  game.side = power > 0 ? side * power : 0
  game.fuel = Math.max(0, game.fuel - consumption * power * dt)
  game.vx = Math.max(-150, Math.min(150, game.vx + game.side * 48 * dt))
  game.vy = Math.max(
    -100,
    Math.min(220, game.vy + (game.gravity - game.thrust * 88) * dt),
  )
  game.x += game.vx * dt
  game.y += game.vy * dt
  if (game.x < 22 || game.x > WIDTH - 22 || game.y < 28) {
    game.x = Math.max(22, Math.min(WIDTH - 22, game.x))
    game.y = Math.max(28, game.y)
    game.status = 'crashed'
    game.reason =
      'You left the flight corridor. Keep your ship inside the field.'
    stopThrust(game)
    return
  }
  const ground = Math.min(
    groundAt(game, game.x - 24),
    groundAt(game, game.x),
    groundAt(game, game.x + 24),
  )
  if (game.y + 24 < ground) return
  const pad = game.pads.find(
    (p) =>
      game.x - 24 >= p.x &&
      game.x + 24 <= p.x + p.width &&
      Math.abs(ground - p.y) < 0.01,
  )
  game.y = ground - 24
  if (
    pad &&
    game.vy >= 0 &&
    game.vy <= SAFE_VERTICAL &&
    Math.abs(game.vx) <= SAFE_HORIZONTAL
  ) {
    game.status = 'landed'
    game.landings++
    const earned = Math.round(
      500 * game.level + game.fuel * 10 + (pad.bonus ? 350 : 0),
    )
    game.score += earned
    game.reason = `${pad.bonus ? 'Precision landing' : 'Soft touchdown'}. +${earned.toLocaleString()} points. Your next ship is refueled and ready.`
  } else {
    game.status = 'crashed'
    game.reason = !pad
      ? 'Rough terrain. Bring both landing feet inside a lit platform.'
      : 'Hard landing. Slow descent to 32 or less and sideways speed to 20 or less.'
  }
  game.vx = 0
  game.vy = 0
  stopThrust(game)
}
