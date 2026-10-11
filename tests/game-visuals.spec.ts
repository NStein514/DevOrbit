import { expect, test } from '@playwright/test'
import { createFlight, step } from '../src/features/games/engine.js'
import {
  thrusters,
  visualVariant,
  renderFlight,
} from '../src/features/games/render.js'
import type { Sprites } from '../src/features/games/art.js'

test('directional exhaust follows actual movement and stops at rest, pause and boundaries', () => {
  const game = createFlight()
  game.status = 'running'
  for (const [x, y, expected] of [
    [0, -1, 'forward'],
    [0, 1, 'reverse'],
    [-1, 0, 'left'],
    [1, 0, 'right'],
  ] as const) {
    step(game, { x, y }, 1 / 60)
    expect(thrusters(game)[expected]).toBeCloseTo(1)
    expect(
      Object.values(thrusters(game)).filter((value) => value > 0),
    ).toHaveLength(1)
  }
  step(game, { x: 1, y: -1 }, 1 / 60)
  expect(thrusters(game).forward).toBeCloseTo(Math.SQRT1_2)
  expect(thrusters(game).right).toBeCloseTo(Math.SQRT1_2)
  step(game, { x: 0, y: 0 }, 1 / 60)
  expect(Object.values(thrusters(game))).toEqual([0, 0, 0, 0])
  game.x = 458
  step(game, { x: 1, y: 0 }, 1 / 60)
  expect(thrusters(game).right).toBe(0)
  step(game, { x: 0, y: 0, target: { x: game.x, y: game.y } }, 1 / 60)
  expect(Object.values(thrusters(game))).toEqual([0, 0, 0, 0])
  step(game, { x: -1, y: -1 }, 1 / 60)
  game.status = 'paused'
  expect(Object.values(thrusters(game))).toEqual([0, 0, 0, 0])
})

test('all four variants are selected without changing seeded gameplay', () => {
  expect(
    new Set(Array.from({ length: 20 }, (_, id) => visualVariant(id))).size,
  ).toBe(4)
})

test('rendering is deterministic, non-mutating and suppresses decorative animation for reduced motion', () => {
  const calls: unknown[][] = []
  const context = new Proxy(
    {},
    {
      get:
        (_, method) =>
        (...args: unknown[]) =>
          calls.push([method, ...args]),
      set: () => true,
    },
  ) as CanvasRenderingContext2D
  const sprite = { width: 100, height: 100 } as HTMLImageElement
  const sprites = new Proxy({}, { get: () => sprite }) as Sprites
  const game = createFlight()
  game.status = 'running'
  game.energy = [
    { id: 2, x: 100, y: 100, radius: 12, speed: 0, angle: 0, spin: 0 },
  ]
  const before = structuredClone(game)
  renderFlight(context, game, sprites, true)
  const first = JSON.stringify(calls)
  expect(game).toEqual(before)
  calls.length = 0
  game.elapsed = 50
  renderFlight(context, game, sprites, true)
  expect(JSON.stringify(calls)).toBe(first)
  calls.length = 0
  renderFlight(context, game, sprites, false)
  expect(JSON.stringify(calls)).not.toBe(first)
})

test('all visual assets decode and animation freezes while paused on desktop and mobile', async ({
  page,
}) => {
  await page.clock.install()
  await page.goto('/games/asteroid-escape')
  await page.getByRole('button', { name: 'Launch flight' }).click()
  await page.keyboard.down('ArrowUp')
  await page.clock.runFor(500)
  await page.keyboard.up('ArrowUp')
  await page.keyboard.press('p')
  await page.clock.runFor(120)
  const canvas = page.getByLabel('Asteroid Escape flight area')
  const before = await canvas.evaluate((element: HTMLCanvasElement) =>
    element.toDataURL(),
  )
  await page.clock.runFor(2000)
  expect(
    await canvas.evaluate((element: HTMLCanvasElement) => element.toDataURL()),
  ).toBe(before)
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBeTruthy()
})
