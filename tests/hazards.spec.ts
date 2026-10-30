import { setRange } from './helpers/arcade-controls.js'
import { test, expect } from '@playwright/test'
import {
  hazardPosition,
  hitsHazard,
  type Hazard,
} from '../src/features/games/shared/hazards.js'
import {
  holes,
  prediction,
  shoot,
  advance as advanceComet,
} from '../src/features/games/golf/engine.js'
import {
  advance,
  launch,
  predictOrbit,
} from '../src/features/games/orbit/engine.js'
import {
  orbitHazards,
  missions,
  missionReady,
} from '../src/features/games/orbit/missions.js'

test('swept collisions catch fast crossings and moving debris, but allow near misses', () => {
  const h: Hazard = {
    x: 0,
    y: 0,
    rx: 0,
    ry: 0,
    radius: 10,
    period: 0,
    phase: 0,
  }
  expect(
    hitsHazard({ x: -100, y: 0 }, { x: 100, y: 0 }, 4, h, 0, 1 / 120),
  ).toBe(true)
  expect(
    hitsHazard({ x: -100, y: 15 }, { x: 100, y: 15 }, 4, h, 0, 1 / 120),
  ).toBe(false)
  const moving = { ...h, rx: 100, period: 4, phase: 0 }
  expect(hazardPosition(moving, 0).x).toBe(100)
  expect(hazardPosition(moving, 2).x).toBe(-100)
  expect(hitsHazard({ x: 0, y: 0 }, { x: 0, y: 0 }, 4, moving, 0, 2)).toBe(true)
})

test('every golf hole has a safe launch and a dangerous time for that same shot', () => {
  const shots = [
    [-26, 120, 0, 1],
    [-1, 335, 0, 2.5],
    [-38, 120, 0, 4],
    [-23, 435, 0, 0.5],
    [-1, 310, 0, 2.5],
    [-9, 145, 1.5, 0],
  ]
  for (const [i, h] of holes.entries()) {
    const [angle, power, safe, blocked] = shots[i]
    expect(prediction(h, angle, power, safe).outcome).toBe('sunk')
    expect(prediction(h, angle, power, blocked).outcome).toBe('debris')
    for (const time of [safe, blocked]) {
      const comet = shoot(h, angle, power, time)
      let result: ReturnType<typeof advanceComet> = 'flying'
      for (let tick = 0; tick < 2160 && result === 'flying'; tick++)
        result = advanceComet(comet, h, 1 / 120)
      expect(result).toBe(prediction(h, angle, power, time).outcome)
    }
  }
})

test('orbit debris removes only impacted satellites and each mission remains achievable', () => {
  const obstacle: Hazard = {
    x: 190,
    y: 0,
    rx: 0,
    ry: 0,
    radius: 10,
    period: 0,
    phase: 0,
  }
  const removed = advance(
    [launch(1, 190, 0, 0, 31), launch(2, 190, 180, 0, 31)],
    1 / 120,
    [obstacle],
    0,
  )
  expect([...removed.entries()]).toEqual([[1, 'Debris collision']])
  expect(predictOrbit(launch(1, 190, 0, 0, 31), [obstacle], 0, 12).reason).toBe(
    'Debris collision',
  )
  for (let m = 0; m < 3; m++) {
    const radii =
      m === 0
        ? [190, 190, 190]
        : m === 1
          ? [150, 150, 235, 235]
          : [150, 150, 190, 190, 235, 235]
    const bodies = radii.map((r, i) =>
      launch(
        i,
        r,
        ([10, 10, 125][m] + i * 137) % 360,
        0,
        Math.round(Math.sqrt(180000 / r)),
      ),
    )
    for (let tick = 0; tick < missions[m].hold * 120; tick++) {
      expect(advance(bodies, 1 / 120, orbitHazards[m], tick / 120).size).toBe(0)
      expect(missionReady(bodies, m)).toBe(true)
    }
  }
})

for (const game of ['orbit-architect', 'gravity-golf']) {
  test(`${game} freezes moving hazards on pause and resets their clock`, async ({
    page,
  }) => {
    await page.clock.install()
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.goto(`/games/${game}`)
    const action =
      game === 'orbit-architect' ? 'Launch satellite' : 'Launch comet'
    const reset =
      game === 'orbit-architect' ? 'Reset simulation' : 'Restart course'
    await expect(
      page.getByRole('button', { name: action, exact: true }),
    ).toBeEnabled()
    await page.clock.pauseAt(
      new Date((await page.evaluate(() => Date.now())) + 100),
    )
    await page.getByRole('button', { name: reset, exact: true }).click()
    const canvas = page.locator('.game-stage canvas')
    await page.clock.runFor(300)
    const first = await canvas.evaluate((el: HTMLCanvasElement) =>
      el.toDataURL(),
    )
    await page.clock.runFor(900)
    expect(
      await canvas.evaluate((el: HTMLCanvasElement) => el.toDataURL()),
    ).not.toBe(first)
    await page.getByRole('button', { name: 'Pause', exact: true }).click()
    await page.clock.runFor(150)
    const image = await canvas.evaluate((el: HTMLCanvasElement) =>
      el.toDataURL(),
    )
    const time = await page.getByTestId('hazard-time').innerText()
    await page.clock.runFor(2000)
    await expect(page.getByTestId('hazard-time')).toHaveText(time)
    expect(
      await canvas.evaluate((el: HTMLCanvasElement) => el.toDataURL()),
    ).toBe(image)
    await page.getByRole('button', { name: reset, exact: true }).click()
    await expect(page.getByTestId('hazard-time')).toHaveText('0.0')
    await page.clock.runFor(1000)
    expect(
      Number(await page.getByTestId('hazard-time').innerText()),
    ).toBeGreaterThan(0.7)
  })
}

test('a timed golf impact costs one stroke and leaves the next attempt available', async ({
  page,
}) => {
  await page.clock.install()
  await page.goto('/games/gravity-golf')
  await expect(
    page.getByRole('button', { name: 'Launch comet', exact: true }),
  ).toBeEnabled()
  await page.clock.pauseAt(
    new Date((await page.evaluate(() => Date.now())) + 100),
  )
  await page
    .getByRole('button', { name: 'Restart course', exact: true })
    .click()
  await setRange(page, /Shot angle/, -26)
  await setRange(page, /Shot power/, 120)
  await page.clock.runFor(1100)
  await expect(
    page.getByText('Debris on this launch — wait for a gap'),
  ).toBeVisible()
  await page.getByRole('button', { name: 'Launch comet', exact: true }).click()
  await page.clock.runFor(8000)
  await expect(page.getByRole('status')).toContainText('Debris impact')
  await expect(page.getByText('Total 1', { exact: true })).toBeVisible()
  await expect(
    page.getByRole('button', { name: 'Launch comet', exact: true }),
  ).toBeEnabled()
})

test('an orbit debris impact removes the satellite and reports the obstruction', async ({
  page,
}) => {
  await page.clock.install()
  await page.goto('/games/orbit-architect')
  await expect(
    page.getByRole('button', { name: 'Launch satellite', exact: true }),
  ).toBeEnabled()
  await page.clock.pauseAt(
    new Date((await page.evaluate(() => Date.now())) + 100),
  )
  await page
    .getByRole('button', { name: 'Reset simulation', exact: true })
    .click()
  const debris = hazardPosition(orbitHazards[0][0], 0)
  await setRange(
    page,
    /Launch radius/,
    Math.round(Math.hypot(debris.x, debris.y)),
  )
  await setRange(
    page,
    /Launch position/,
    Math.round(((Math.atan2(debris.y, debris.x) * 180) / Math.PI + 360) % 360),
  )
  await expect(page.getByText(/Debris collision predicted/)).toBeVisible()
  await page
    .getByRole('button', { name: 'Launch satellite', exact: true })
    .click()
  await page.clock.runFor(300)
  await expect(
    page.getByText('0 / 8 satellites', { exact: true }),
  ).toBeVisible()
  await expect(page.getByRole('status')).toContainText('Debris collision')
  await expect(
    page.getByRole('button', { name: 'Launch satellite', exact: true }),
  ).toBeEnabled()
})
