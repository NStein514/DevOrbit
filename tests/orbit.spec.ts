import { test, expect } from '@playwright/test'
import { advance, launch, gravity } from '../src/features/games/orbit/engine.ts'
test('circular launches remain bounded and collisions remove both satellites', () => {
  const body = launch(1, 190, 0, 0, Math.sqrt(gravity / 190))
  for (let i = 0; i < 7200; i++) expect(advance([body], 1 / 120).size).toBe(0)
  expect(Math.hypot(body.x, body.y)).toBeGreaterThan(185)
  expect(Math.hypot(body.x, body.y)).toBeLessThan(195)
  expect(
    advance([launch(1, 190, 0, 0, 31), launch(2, 190, 0, 0, 31)], 1 / 120).size,
  ).toBe(2)
})
test('launch controls, pause and reset work on responsive layouts', async ({
  page,
}) => {
  await page.goto('/games/orbit-architect')
  await expect(
    page.getByRole('heading', { name: 'Orbit Architect.' }),
  ).toBeVisible()
  await page
    .getByRole('button', { name: 'Launch satellite', exact: true })
    .click()
  await expect(
    page.getByText('1 / 8 satellites', { exact: true }),
  ).toBeVisible()
  await page.getByRole('button', { name: 'Pause', exact: true }).click()
  await expect(
    page.getByRole('button', { name: 'Launch satellite', exact: true }),
  ).toBeDisabled()
  await page
    .getByRole('button', { name: 'Reset simulation', exact: true })
    .click()
  await expect(
    page.getByText('0 / 8 satellites', { exact: true }),
  ).toBeVisible()
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true)
})
