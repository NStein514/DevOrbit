import { expect, test, type Page } from '@playwright/test'

async function configure(page: Page) {
  await page.getByLabel('Focus minutes', { exact: true }).fill('1')
  await page.getByLabel('Short break minutes', { exact: true }).fill('1')
  await page.getByLabel('Long break minutes', { exact: true }).fill('2')
  await page.getByLabel('Sessions before long break').fill('2')
  await page.getByRole('button', { name: 'Save preferences' }).click()
}

test('customizes, pauses, navigates and reloads without losing elapsed time', async ({
  page,
}) => {
  await page.clock.install()
  await page.goto('/pomodoro')
  await configure(page)
  await page.getByLabel('What are you focusing on?').fill('Ship the timer')
  await page
    .getByLabel('Project', { exact: true })
    .selectOption({ label: 'DevOrbit' })
  await expect(page.getByRole('timer')).toHaveText('01:00')
  await page.getByRole('button', { name: 'Start', exact: true }).click()
  await page.clock.runFor(12000)
  await page.getByRole('button', { name: 'Pause', exact: true }).click()
  await expect(page.getByRole('timer')).toHaveText('00:48')
  await page.clock.runFor(10000)
  await expect(page.getByRole('timer')).toHaveText('00:48')
  await page.reload()
  await expect(page.getByRole('timer')).toHaveText('00:48')
  await page.getByRole('button', { name: 'Resume', exact: true }).click()
  await page.getByRole('link', { name: 'DevOrbit home' }).click()
  await expect(page.locator('.pomodoro-mini')).toContainText('00:48')
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBeTruthy()
  await page.clock.runFor(8000)
  await page.locator('.pomodoro-mini').click()
  await expect(page.getByRole('timer')).toHaveText('00:40')
  await page.reload()
  await expect(
    page.getByRole('button', { name: 'Pause', exact: true }),
  ).toBeVisible()
  await expect(page.getByRole('timer')).toHaveText('00:40')
  await expect(page.getByLabel('What are you focusing on?')).toHaveValue(
    'Ship the timer',
  )
})

test('completes focus, follows break cadence, and keeps skips out of history', async ({
  page,
}) => {
  await page.clock.install()
  await page.goto('/pomodoro')
  await configure(page)
  await page.getByLabel('Automatically start breaks').check()
  await page.getByLabel('Automatically start focus').check()
  await page.getByRole('button', { name: 'Save preferences' }).click()
  await page.getByRole('button', { name: 'Start', exact: true }).click()
  await page.clock.runFor(60000)
  await expect(page.getByRole('timer')).toHaveAttribute(
    'aria-label',
    'Short break time remaining',
  )
  await expect(page.locator('.pomodoro-history li')).toHaveCount(1)
  await expect(
    page.getByRole('button', { name: 'Pause', exact: true }),
  ).toBeVisible()
  await page.clock.runFor(60000)
  await expect(page.getByRole('timer')).toHaveAttribute(
    'aria-label',
    'Focus time remaining',
  )
  await page.clock.runFor(60000)
  await expect(page.getByRole('timer')).toHaveAttribute(
    'aria-label',
    'Long break time remaining',
  )
  await expect(page.getByRole('timer')).toHaveText('02:00')
  await expect(page.locator('.pomodoro-history li')).toHaveCount(2)
  await page.getByRole('button', { name: 'Skip', exact: true }).click()
  await expect(
    page.getByText('0 of 2 focus sessions before a long break'),
  ).toBeVisible()
  await page.getByRole('button', { name: 'Skip', exact: true }).click()
  await expect(page.locator('.pomodoro-history li')).toHaveCount(2)
  await expect(
    page.getByRole('button', { name: 'Start', exact: true }),
  ).toBeVisible()
})

test('keeps active duration, validates preferences, and restarts with new settings', async ({
  page,
}) => {
  await page.clock.install()
  await page.goto('/pomodoro')
  await configure(page)
  await page.getByRole('button', { name: 'Start', exact: true }).click()
  await page.clock.runFor(10000)
  await page.getByLabel('Focus minutes', { exact: true }).fill('3')
  await page.getByRole('button', { name: 'Save preferences' }).click()
  await expect(page.getByRole('timer')).toHaveText('00:50')
  await page.getByRole('button', { name: 'Restart', exact: true }).click()
  await expect(page.getByRole('timer')).toHaveText('03:00')
  await page.getByLabel('Focus minutes', { exact: true }).fill('0')
  await page.getByRole('button', { name: 'Save preferences' }).click()
  expect(
    await page
      .getByLabel('Focus minutes', { exact: true })
      .evaluate((input: HTMLInputElement) => input.validity.valid),
  ).toBe(false)
  await page.reload()
  await expect(page.getByLabel('Focus minutes', { exact: true })).toHaveValue(
    '3',
  )
  await page.getByRole('button', { name: 'Use default preferences' }).click()
  await page.getByRole('button', { name: 'Save preferences' }).click()
  await expect(page.getByRole('timer')).toHaveText('25:00')
})

test('recovers one overdue session after sleep, without fabricated history', async ({
  page,
}) => {
  await page.clock.install()
  await page.goto('/pomodoro')
  await configure(page)
  await page.getByLabel('Automatically start breaks').check()
  await page.getByLabel('Automatically start focus').check()
  await page.getByRole('button', { name: 'Save preferences' }).click()
  await page.getByRole('button', { name: 'Start', exact: true }).click()
  await page.clock.fastForward(8 * 60 * 60 * 1000)
  await expect(page.locator('.pomodoro-history li')).toHaveCount(1)
  await expect(page.getByRole('timer')).toHaveText('01:00')
  await expect(page.getByRole('timer')).toHaveAttribute(
    'aria-label',
    'Short break time remaining',
  )
})

test('preserves invalid data until confirmed reset and handles unavailable storage', async ({
  page,
}) => {
  await page.goto('/pomodoro')
  await page.evaluate(() =>
    localStorage.setItem('devorbit.pomodoro.v1', '{invalid'),
  )
  await page.reload()
  await expect(page.getByRole('alert')).toContainText('could not be read')
  await expect(
    page.getByRole('button', { name: 'Start', exact: true }),
  ).toBeDisabled()
  expect(
    await page.evaluate(() => localStorage.getItem('devorbit.pomodoro.v1')),
  ).toBe('{invalid')
  await page
    .getByRole('button', { name: 'Reset timer data', exact: true })
    .click()
  await page.getByRole('button', { name: 'Cancel', exact: true }).click()
  await expect(
    page.getByRole('button', { name: 'Start', exact: true }),
  ).toBeDisabled()
  await page
    .getByRole('button', { name: 'Reset timer data', exact: true })
    .click()
  await page.getByRole('button', { name: 'Confirm deletion' }).click()
  await expect(
    page.getByRole('button', { name: 'Start', exact: true }),
  ).toBeEnabled()
  await page.evaluate(() => {
    Storage.prototype.setItem = () => {
      throw new Error('Storage unavailable')
    }
  })
  await page.getByRole('button', { name: 'Start', exact: true }).click()
  await expect(page.getByRole('alert')).toContainText(
    'only available in this tab',
  )
  await expect(
    page.getByRole('button', { name: 'Pause', exact: true }),
  ).toBeVisible()
})

test('synchronizes timer controls between tabs and fits themed mobile layouts', async ({
  page,
  context,
}) => {
  await page.goto('/pomodoro')
  const other = await context.newPage()
  await other.goto('/pomodoro')
  await configure(page)
  await expect(other.getByRole('timer')).toHaveText('01:00')
  await page.getByRole('button', { name: 'Start', exact: true }).click()
  await expect(
    other.getByRole('button', { name: 'Pause', exact: true }),
  ).toBeVisible()
  await other.getByRole('button', { name: 'Pause', exact: true }).click()
  await expect(
    page.getByRole('button', { name: 'Resume', exact: true }),
  ).toBeVisible()
  for (const theme of ['light', 'dark']) {
    await page.evaluate((value) => {
      document.documentElement.dataset.theme = value
    }, theme)
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBeTruthy()
  }
  await other.close()
})
