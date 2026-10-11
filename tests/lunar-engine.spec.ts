import { expect, test } from '@playwright/test'
import {
  createMission,
  stepMission,
  nextPlanet,
  groundAt,
  type Mission,
} from '../src/features/games/lunar/engine.js'
const idle = { main: false, left: false, right: false }
function touchdown(vx = 0, vy = 20, bonus = false) {
  const g = createMission(42),
    pad = g.pads[Number(bonus)]
  g.status = 'running'
  g.x = pad.x + pad.width / 2
  g.y = pad.y - 24 - 0.05
  g.vx = vx
  g.vy = vy
  stepMission(g, idle, 1 / 120)
  return g
}
test('randomized platforms are deterministic, separated and flat for both feet', () => {
  expect(createMission(42)).toEqual(createMission(42))
  expect(createMission(42).pads).not.toEqual(createMission(55).pads)
  for (let seed = 0; seed < 50; seed++)
    for (const level of [1, 5, 15]) {
      const g = createMission(seed, level)
      expect(g.pads[0].x + g.pads[0].width).toBeLessThan(g.pads[1].x)
      for (const p of g.pads) {
        expect(p.width).toBeGreaterThan(48)
        expect(groundAt(g, p.x + p.width / 2)).toBeCloseTo(p.y)
        expect(p.x + p.width).toBeLessThan(600)
      }
    }
})
test('soft landings score once, precision pays more and the next planet refuels with harder conditions', () => {
  const g = touchdown(),
    precise = touchdown(0, 20, true)
  expect(g.status).toBe('landed')
  expect(g.landings).toBe(1)
  expect(precise.score - g.score).toBe(350)
  const score = g.score
  stepMission(g, idle, 1 / 60)
  expect(g.score).toBe(score)
  const next = nextPlanet(g)
  expect(next.level).toBe(2)
  expect(next.score).toBe(score)
  expect(next.landings).toBe(1)
  expect(next.gravity).toBeGreaterThan(g.gravity)
  expect(next.pads[0].width).toBeLessThan(g.pads[0].width)
  expect(next.fuel).toBe(100)
})
test('excess speed, rough ground, partial platform overlap and corridor exits crash', () => {
  expect(touchdown(21).status).toBe('crashed')
  expect(touchdown(0, 33).status).toBe('crashed')
  for (const x of [15, 300]) {
    const g = createMission()
    g.status = 'running'
    g.x = x
    g.y = groundAt(g, x) - 23
    stepMission(g, idle, 1 / 120)
    expect(g.status).toBe('crashed')
  }
  const g = createMission()
  g.status = 'running'
  g.x = g.pads[0].x + 20
  g.y = g.pads[0].y - 23
  g.vy = 10
  stepMission(g, idle, 1 / 120)
  expect(g.status).toBe('crashed')
})
test('fuel limits engine power; empty ships coast and pause freezes the simulation', () => {
  const g = createMission()
  g.status = 'running'
  g.fuel = 0.01
  stepMission(g, { main: true, left: true, right: false }, 1 / 60)
  expect(g.fuel).toBe(0)
  expect(g.thrust).toBeLessThan(1)
  stepMission(g, { main: true, left: true, right: false }, 1 / 60)
  expect(g.thrust).toBe(0)
  expect(g.side).toBe(0)
  g.status = 'paused'
  const before = structuredClone(g)
  stepMission(g, idle, 1)
  expect(g).toEqual(before)
})
// A simple feedback pilot proves the generated routes are reachable with the real fuel budget.
function fly(g: Mission) {
  const pad = g.pads[0],
    target = pad.x + pad.width / 2
  g.status = 'running'
  for (let i = 0; i < 120 * 45 && g.status === 'running'; i++) {
    const dx = target - g.x,
      altitude = pad.y - 24 - g.y
    const wantedX = Math.sign(dx) * Math.min(45, Math.sqrt(Math.abs(dx) * 45))
    const wantedY = Math.min(
      55,
      Math.sqrt(Math.max(0, altitude) * 45),
      altitude < 60 ? 22 : 55,
    )
    stepMission(
      g,
      {
        left: g.vx > wantedX + 1,
        right: g.vx < wantedX - 1,
        main: g.vy > wantedY,
      },
      1 / 120,
    )
  }
}
test('generated worlds remain landable using thrust alone with limited fuel', () => {
  for (const level of [1, 3, 8, 15])
    for (let seed = 1; seed <= 12; seed++) {
      const g = createMission(seed * 919, level)
      fly(g)
      expect(g.status, `sector ${level} seed ${seed}: ${g.reason}`).toBe(
        'landed',
      )
      expect(g.fuel).toBeGreaterThan(0)
    }
})
