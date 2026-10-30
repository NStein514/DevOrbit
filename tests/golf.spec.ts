import { test, expect, type Page } from '@playwright/test'
import {
  holes,
  prediction,
  shoot,
  advance,
} from '../src/features/games/golf/engine.ts'
const solutions = [
  [-26, 120],
  [-1, 335],
  [-38, 120],
  [-23, 435],
  [-1, 310],
  [-9, 145],
]
test('all holes are solvable, gravity bends shots and failure outcomes are distinct', () => {
  holes.forEach((h, i) =>
    expect(prediction(h, ...(solutions[i] as [number, number])).outcome).toBe(
      'sunk',
    ),
  )
  const h = holes[0],
    b = shoot(h, 0, 200)
  advance(b, h, 1 / 120)
  expect(b.vy).not.toBe(0)
  expect(
    advance(
      { ...b, x: h.planets[0].x, y: h.planets[0].y, vx: 0, vy: 0 },
      h,
      1 / 120,
    ),
  ).toBe('collision')
  expect(advance({ ...b, x: 1100 }, h, 1 / 120)).toBe('escaped')
  expect(advance({ ...b, age: 19 }, h, 1 / 120)).toBe('timeout')
})
async function setShot(page: Page, a: number, p: number) {
  for (const [name, value] of [
    ['Shot angle', a],
    ['Shot power', p],
  ] as const) {
    await page
      .getByRole('slider', { name: new RegExp(name) })
      .evaluate((el, value) => {
        const input = el as HTMLInputElement
        Object.getOwnPropertyDescriptor(
          HTMLInputElement.prototype,
          'value',
        )!.set!.call(input, String(value))
        input.dispatchEvent(new Event('input', { bubbles: true }))
        input.dispatchEvent(new Event('change', { bubbles: true }))
      }, value)
  }
}
test('finishes six holes, saves bests, counts strokes and restarts cleanly', async ({
  page,
}) => {
  test.setTimeout(120000)
  await page.goto('/games/gravity-golf')
  for (let i = 0; i < 6; i++) {
    await setShot(page, ...(solutions[i] as [number, number]))
    await page
      .getByRole('button', { name: 'Launch comet', exact: true })
      .click()
    await expect(
      page.getByRole('button', { name: 'Launch comet', exact: true }),
    ).toBeDisabled()
    if (i < 5) {
      await expect(
        page.getByRole('button', { name: 'Next hole', exact: true }),
      ).toBeVisible({ timeout: 20000 })
      await page.getByRole('button', { name: 'Next hole', exact: true }).click()
    } else
      await expect(page.getByRole('status')).toContainText(
        'Course complete! 6 strokes',
        { timeout: 20000 },
      )
  }
  const record = await page.evaluate(() =>
    JSON.parse(localStorage.getItem('devorbit.gravity-golf.v1')!),
  )
  expect(record).toEqual({ best: 6, medals: [3, 3, 3, 3, 3, 3] })
  await page.reload()
  await expect(page.getByText('Best course · 6 strokes')).toBeVisible()
  await page
    .getByRole('button', { name: 'Restart course', exact: true })
    .click()
  await expect(page.getByText('Total 0', { exact: true })).toBeVisible()
})
test('pause, abandon, preview and narrow layouts remain usable', async ({
  page,
}) => {
  await page.goto('/games/gravity-golf')
  await page.getByRole('checkbox', { name: 'Show predicted path' }).uncheck()
  await page.getByRole('button', { name: 'Launch comet', exact: true }).click()
  await page.getByRole('button', { name: 'Pause', exact: true }).click()
  await expect(page.getByRole('status')).toContainText('Paused')
  await page.getByRole('button', { name: 'Abandon shot', exact: true }).click()
  await page.getByRole('button', { name: 'Resume', exact: true }).click()
  await expect(
    page.getByRole('button', { name: 'Launch comet', exact: true }),
  ).toBeEnabled()
  await expect(page.getByText('Total 1', { exact: true })).toBeVisible()
  await page.setViewportSize({ width: 360, height: 800 })
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true)
})

test('generated artwork failures can be retried and reduced motion stays playable', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.route('**/images/arcade/golf/comet.png', (route) => route.abort())
  await page.goto('/games/gravity-golf')
  await expect(page.getByRole('alert')).toContainText('Artwork could not load')
  await expect(
    page.getByRole('button', { name: 'Launch comet', exact: true }),
  ).toBeDisabled()
  await page.unroute('**/images/arcade/golf/comet.png')
  await page.getByRole('button', { name: 'Retry artwork' }).click()
  await expect(
    page.getByRole('button', { name: 'Launch comet', exact: true }),
  ).toBeEnabled()
  await page.getByRole('button', { name: 'Launch comet', exact: true }).click()
  await page.getByRole('button', { name: 'Pause', exact: true }).click()
  await expect(page.getByRole('status')).toContainText('Paused')
})
