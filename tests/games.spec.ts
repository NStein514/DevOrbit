import { expect, test } from '@playwright/test'
import { initialState, POMODORO_KEY } from '../src/features/pomodoro/model.js'

test('arcade has one playable game, original artwork and responsive future cards', async ({
  page,
}) => {
  await page.goto('/games')
  await expect(
    page.getByRole('heading', { name: 'The orbital arcade.' }),
  ).toBeVisible()
  await expect(page.locator('.arcade-locked')).toHaveCount(6)
  await expect(
    page.getByRole('link', { name: 'Play Asteroid Escape' }),
  ).toHaveCount(1)
  for (const theme of ['light', 'dark'] as const) {
    await page.emulateMedia({ colorScheme: theme })
    await expect(page.locator('html')).toHaveAttribute('data-theme', theme)
    await expect(
      page.getByRole('link', { name: 'Set up a game break' }),
    ).toHaveCSS(
      'background-color',
      theme === 'dark' ? 'rgb(27, 32, 38)' : 'rgb(255, 255, 255)',
    )
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBeTruthy()
  }
  await page.getByRole('link', { name: 'Play Asteroid Escape' }).click()
  await expect(
    page.getByRole('button', { name: 'Launch flight' }),
  ).toBeEnabled()
  await page.reload()
  await expect(
    page.getByRole('heading', { name: 'Asteroid Escape', exact: true }),
  ).toBeVisible()
  await expect(
    page.getByRole('button', { name: 'Launch flight' }),
  ).toBeEnabled()
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBeTruthy()
})

test('keyboard play pauses, resumes, banks scores and restarts without duplicate records', async ({
  page,
}) => {
  await page.clock.install()
  await page.goto('/games/asteroid-escape')
  await page.getByRole('button', { name: 'Launch flight' }).click()
  await page.keyboard.down('ArrowLeft')
  await page.clock.runFor(1000)
  await page.keyboard.up('ArrowLeft')
  await page.keyboard.press('p')
  await expect(
    page.getByRole('heading', { name: 'Holding orbit.' }),
  ).toBeVisible()
  const points = await page.getByTestId('flight-score').innerText()
  expect(Number(points)).toBeGreaterThan(0)
  await page.clock.runFor(3000)
  await expect(page.getByTestId('flight-score')).toHaveText(points)
  await page.getByRole('button', { name: 'Resume flight' }).click()
  await page.clock.runFor(1000)
  await page.getByRole('button', { name: 'End flight' }).click()
  await expect(
    page.getByRole('heading', { name: 'One more orbit?' }),
  ).toBeVisible()
  const saved = await page.evaluate(() =>
    JSON.parse(localStorage.getItem('devorbit.arcade.v1')!),
  )
  expect(saved.runs).toBe(1)
  expect(saved.bestScore).toBeGreaterThan(Number(points))
  await page.clock.runFor(2000)
  expect(
    await page.evaluate(
      () => JSON.parse(localStorage.getItem('devorbit.arcade.v1')!).runs,
    ),
  ).toBe(1)
  await page.getByRole('button', { name: 'Fly again' }).click()
  await expect(page.getByTestId('flight-score')).toHaveText('0')
  await page.reload()
  await expect(page.getByText(`Best ${saved.bestScore}`)).toBeVisible()
})

test('pointer steering, cancellation, focus loss and reduced-motion play work', async ({
  page,
}) => {
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.clock.install()
  await page.goto('/games/asteroid-escape')
  await page.getByRole('button', { name: 'Launch flight' }).click()
  const canvas = page.getByLabel('Asteroid Escape flight area')
  const bounds = (await canvas.boundingBox())!
  await page.mouse.move(
    bounds.x + bounds.width / 2,
    bounds.y + bounds.height * 0.7,
  )
  await page.mouse.down()
  await page.mouse.move(
    bounds.x + bounds.width * 0.2,
    bounds.y + bounds.height * 0.5,
  )
  await page.clock.runFor(700)
  await page.mouse.up()
  const control = page.getByRole('button', { name: 'Steer right' })
  await control.scrollIntoViewIfNeeded()
  const buttonBounds = (await control.boundingBox())!
  const touch = await page.context().newCDPSession(page)
  await touch.send('Input.dispatchTouchEvent', {
    type: 'touchStart',
    touchPoints: [
      {
        x: buttonBounds.x + buttonBounds.width / 2,
        y: buttonBounds.y + buttonBounds.height / 2,
      },
    ],
  })
  await page.clock.runFor(500)
  await touch.send('Input.dispatchTouchEvent', {
    type: 'touchCancel',
    touchPoints: [],
  })
  await touch.detach()
  await page.evaluate(() => window.dispatchEvent(new Event('blur')))
  await expect(
    page.getByRole('heading', { name: 'Holding orbit.' }),
  ).toBeVisible()
  const points = await page.getByTestId('flight-score').innerText()
  await page.clock.runFor(3000)
  await expect(page.getByTestId('flight-score')).toHaveText(points)
  await page.getByRole('button', { name: 'Resume flight' }).click()
  await page.keyboard.press('Escape')
  await expect(
    page.getByRole('heading', { name: 'Holding orbit.' }),
  ).toBeVisible()
  expect(errors).toEqual([])
})

test('Pomodoro activity saves and starts the selected break without affecting focus history', async ({
  page,
}) => {
  await page.goto('/pomodoro')
  await page.getByLabel('Break activity').selectOption('asteroid-escape')
  await page.getByRole('button', { name: 'Save preferences' }).click()
  await page.reload()
  await expect(page.getByLabel('Break activity')).toHaveValue('asteroid-escape')
  await expect(page.getByText('Your spaceship will be ready')).toBeVisible()
  await page.getByRole('button', { name: 'Short break', exact: true }).click()
  await page.getByRole('link', { name: 'Play this break' }).click()
  await expect(page).toHaveURL(/asteroid-escape\?mode=break$/)
  await expect(
    page.getByRole('button', { name: 'Launch flight' }),
  ).toBeEnabled()
  const timer = await page.evaluate(
    (key) => JSON.parse(localStorage.getItem(key)!),
    POMODORO_KEY,
  )
  expect(timer.deadline).not.toBeNull()
  expect(timer.history).toEqual([])
})

test('break completion ends a paused flight and preserves the Pomodoro cycle', async ({
  page,
}) => {
  await page.clock.install()
  const timer = {
    ...initialState(),
    phase: 'short' as const,
    duration: 60000,
    remaining: 60000,
  }
  await page.goto('/games')
  await page.evaluate(
    ({ key, timer }) =>
      localStorage.setItem(
        key,
        JSON.stringify({ ...timer, deadline: Date.now() + 60000 }),
      ),
    { key: POMODORO_KEY, timer },
  )
  await page.goto('/games/asteroid-escape?mode=break')
  await page.getByRole('button', { name: 'Launch flight' }).click()
  await page.clock.runFor(1000)
  await page.getByRole('button', { name: 'Pause', exact: true }).click()
  await page.clock.runFor(60000)
  await expect(
    page.getByRole('heading', { name: 'Back to your mission.' }),
  ).toBeVisible()
  await expect(
    page.getByRole('link', { name: 'Return to focus' }),
  ).toBeVisible()
  expect(
    await page.evaluate(
      (key) => JSON.parse(localStorage.getItem(key)!).phase,
      POMODORO_KEY,
    ),
  ).toBe('focus')
})

test('direct break URLs require a running break, while free play stays available', async ({
  page,
}) => {
  await page.goto('/games/asteroid-escape?mode=break')
  await expect(
    page.getByRole('button', { name: 'Launch flight' }),
  ).toBeDisabled()
  await expect(
    page.getByRole('link', { name: 'Start or resume a Pomodoro break first' }),
  ).toBeVisible()
  await page.goto('/games/asteroid-escape')
  await expect(
    page.getByRole('button', { name: 'Launch flight' }),
  ).toBeEnabled()
})

test('failed artwork retries and storage failures do not block gameplay', async ({
  page,
}) => {
  await page.route('**/images/arcade/asteroid-escape-ship.png', (route) =>
    route.abort(),
  )
  await page.goto('/games/asteroid-escape')
  await expect(
    page.getByRole('heading', { name: 'Artwork unavailable' }),
  ).toBeVisible()
  await page.unroute('**/images/arcade/asteroid-escape-ship.png')
  await page.getByRole('button', { name: 'Retry artwork' }).click()
  await expect(
    page.getByRole('button', { name: 'Launch flight' }),
  ).toBeEnabled()
  await page.evaluate(() => {
    Storage.prototype.setItem = () => {
      throw new Error('Storage full')
    }
  })
  await page.getByRole('button', { name: 'Launch flight' }).click()
  await expect(page.getByTestId('flight-score')).not.toHaveText('0')
  await page.getByRole('button', { name: 'End flight' }).click()
  await expect(page.getByRole('alert')).toContainText(
    'only saved for this visit',
  )
  await expect(page.getByRole('button', { name: 'Fly again' })).toBeEnabled()
})
