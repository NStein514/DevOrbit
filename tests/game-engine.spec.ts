import { expect, test } from '@playwright/test'
import {
  createFlight,
  HEIGHT,
  score,
  step,
  WIDTH,
  type Body,
} from '../src/features/games/engine.js'

function body(x: number, y: number): Body {
  return { id: 1, x, y, radius: 20, speed: 0, angle: 0, spin: 0 }
}
function ready() {
  const game = createFlight(15)
  game.status = 'running'
  game.rockIn = Infinity
  game.orbIn = Infinity
  return game
}

test('normalizes diagonal movement, clamps boundaries and never simulates paused time', () => {
  const straight = ready(),
    diagonal = ready()
  const origin = { x: straight.x, y: straight.y }
  step(straight, { x: 1, y: 0 }, 1 / 60)
  step(diagonal, { x: 1, y: 1 }, 1 / 60)
  expect(Math.hypot(diagonal.x - origin.x, diagonal.y - origin.y)).toBeCloseTo(
    straight.x - origin.x,
  )
  for (let i = 0; i < 1000; i++) step(straight, { x: 1, y: 1 }, 1 / 60)
  expect(straight.x).toBeLessThan(WIDTH)
  expect(straight.y).toBeLessThan(HEIGHT)
  straight.status = 'paused'
  const before = structuredClone(straight)
  step(straight, { x: -1, y: -1 }, 100)
  expect(straight).toEqual(before)
})

test('orb collection cools the reactor, scores once and removes the pickup', () => {
  const game = ready()
  game.heat = 80
  game.energy.push(body(game.x, game.y))
  step(game, { x: 0, y: 0 }, 1 / 60)
  expect(game.orbs).toBe(1)
  expect(game.heat).toBeCloseTo(56, 0)
  expect(score(game)).toBe(75)
  expect(game.energy).toHaveLength(0)
  step(game, { x: 0, y: 0 }, 1 / 60)
  expect(game.orbs).toBe(1)
})

test('asteroids cost hull, grant temporary protection and end at zero hull', () => {
  const game = ready()
  game.rocks = [body(game.x, game.y), body(game.x, game.y)]
  step(game, { x: 0, y: 0 }, 1 / 60)
  expect(game.shields).toBe(2)
  step(game, { x: 0, y: 0 }, 1 / 60)
  expect(game.shields).toBe(2)
  game.invulnerable = 0
  step(game, { x: 0, y: 0 }, 1 / 60)
  expect(game.shields).toBe(1)
  game.invulnerable = 0
  game.rocks = [body(game.x, game.y)]
  step(game, { x: 0, y: 0 }, 1 / 60)
  expect(game.status).toBe('over')
  expect(game.reason).toContain('Hull lost')
})

test('overheat ends a run while cooling pickups can rescue the reactor', () => {
  const hot = ready(),
    rescued = ready()
  hot.heat = rescued.heat = 99.99
  rescued.energy.push(body(rescued.x, rescued.y))
  step(hot, { x: 0, y: 0 }, 1 / 60)
  step(rescued, { x: 0, y: 0 }, 1 / 60)
  expect(hot.status).toBe('over')
  expect(hot.reason).toContain('overheated')
  expect(rescued.status).toBe('running')
  expect(rescued.heat).toBe(76)
})

test('seeded fields are repeatable, speed increases and expired bodies are removed', () => {
  const a = createFlight(42),
    b = createFlight(42)
  a.status = b.status = 'running'
  for (let i = 0; i < 300; i++) {
    step(a, { x: 0, y: 0 }, 1 / 60)
    step(b, { x: 0, y: 0 }, 1 / 60)
  }
  expect(a).toEqual(b)
  const late = createFlight(42)
  late.status = 'running'
  late.elapsed = 120
  late.rockIn = 0
  step(late, { x: 0, y: 0 }, 1 / 60)
  expect(late.rocks[0].speed).toBeGreaterThan(a.rocks[0].speed)
  late.rocks = [body(100, HEIGHT + 100)]
  step(late, { x: 0, y: 0 }, 1 / 60)
  expect(late.rocks).toHaveLength(0)
})
