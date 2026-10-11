import { expect, test } from '@playwright/test'
import { initialState, POMODORO_KEY } from '../src/features/pomodoro/model.js'
import {
  createMission,
  stepMission,
} from '../src/features/games/lunar/engine.js'
test('arcade entry loads art, keyboard controls consume fuel, pause freezes and a crash can restart', async ({
  page,
}) => {
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(e.message))
  await page.clock.install()
  await page.goto('/games')
  await page.getByRole('link', { name: 'Play Lunar Landing' }).click()
  await page.getByRole('button', { name: 'Begin descent' }).click()
  await page.clock.runFor(500)
  await page.keyboard.down('ArrowUp')
  await page.clock.runFor(500)
  await page.keyboard.up('ArrowUp')
  expect(
    Number((await page.getByTestId('lunar-fuel').innerText()).replace('%', '')),
  ).toBeLessThan(100)
  await page.keyboard.press('p')
  await page.clock.runFor(100)
  const canvas = page.getByLabel('Lunar Landing flight area')
  const image = await canvas.evaluate((el: HTMLCanvasElement) => el.toDataURL())
  await page.clock.runFor(2000)
  expect(await canvas.evaluate((el: HTMLCanvasElement) => el.toDataURL())).toBe(
    image,
  )
  await page.getByRole('button', { name: 'Resume descent' }).click()
  await page.clock.runFor(12000)
  await page.getByRole('button', { name: 'Try a new expedition' }).click()
  await expect(page.getByTestId('lunar-fuel')).toHaveText('100%')
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBeTruthy()
  expect(errors).toEqual([])
})
test('touch supports simultaneous jets, pointer cancellation and focus loss', async ({
  page,
}) => {
  await page.clock.install()
  await page.goto('/games/lunar-landing')
  await page.getByRole('button', { name: 'Begin descent' }).click()
  const main = page.getByRole('button', { name: 'Main engine' }),
    right = page.getByRole('button', { name: 'Right jet' })
  // Actual mouse capture exercises the same Pointer Events path used by touch.
  await main.hover()
  await page.mouse.down()
  await page.clock.runFor(350)
  await page.mouse.up()
  await page.clock.runFor(150)
  const fuel = await page.getByTestId('lunar-fuel').innerText()
  expect(fuel).not.toBe('100%')
  await page.clock.runFor(250)
  await expect(page.getByTestId('lunar-fuel')).toHaveText(fuel)
  const session = await page.context().newCDPSession(page)
  const mainBox = (await main.boundingBox())!,
    rightBox = (await right.boundingBox())!
  await session.send('Input.dispatchTouchEvent', {
    type: 'touchStart',
    touchPoints: [
      {
        x: mainBox.x + mainBox.width / 2,
        y: mainBox.y + mainBox.height / 2,
        id: 1,
      },
      {
        x: rightBox.x + rightBox.width / 2,
        y: rightBox.y + rightBox.height / 2,
        id: 2,
      },
    ],
  })
  await page.clock.runFor(300)
  await session.send('Input.dispatchTouchEvent', {
    type: 'touchCancel',
    touchPoints: [],
  })
  await page.clock.runFor(150)
  const afterTouch = await page.getByTestId('lunar-fuel').innerText()
  expect(parseInt(afterTouch)).toBeLessThan(parseInt(fuel))
  expect(await page.getByLabel('Landing telemetry').innerText()).not.toContain(
    '↔ 0',
  )
  await page.clock.runFor(250)
  await expect(page.getByTestId('lunar-fuel')).toHaveText(afterTouch)
  await session.detach()
  await right.focus()
  await page.keyboard.down(' ')
  await page.clock.runFor(300)
  await page.keyboard.up(' ')
  await page.evaluate(() => window.dispatchEvent(new Event('blur')))
  await expect(
    page.getByRole('heading', { name: 'Holding position.' }),
  ).toBeVisible()
})
test('Lunar break preference persists and a paused descent ends with the timer', async ({
  page,
}) => {
  await page.clock.install()
  await page.goto('/pomodoro')
  await page.getByLabel('Break activity').selectOption('lunar-landing')
  await page.getByRole('button', { name: 'Save preferences' }).click()
  await page.reload()
  await expect(page.getByLabel('Break activity')).toHaveValue('lunar-landing')
  await page.getByRole('button', { name: 'Short break', exact: true }).click()
  await page.getByRole('link', { name: 'Play this break' }).click()
  await expect(page).toHaveURL(/lunar-landing\?mode=break/)
  await page.getByRole('button', { name: 'Begin descent' }).click()
  await page.getByRole('button', { name: 'Pause', exact: true }).click()
  await page.clock.fastForward(5 * 60000 + 1000)
  await expect(
    page.getByRole('link', { name: 'Return to focus' }),
  ).toBeVisible()
})
test('break guard, failed artwork retry and corrupt records preserve free play', async ({
  page,
}) => {
  await page.goto('/games/lunar-landing?mode=break')
  await expect(
    page.getByRole('button', { name: 'Begin descent' }),
  ).toBeDisabled()
  await page.evaluate(() =>
    localStorage.setItem('devorbit.lunar.v1', 'invalid'),
  )
  await page.route('**/lunar/lander.png', (route) => route.abort())
  await page.goto('/games/lunar-landing')
  await expect(
    page.getByRole('heading', { name: 'Artwork unavailable' }),
  ).toBeVisible()
  await page.unroute('**/lunar/lander.png')
  await page.getByRole('button', { name: 'Retry artwork' }).click()
  await expect(
    page.getByRole('button', { name: 'Begin descent' }),
  ).toBeEnabled()
  expect(
    await page.evaluate(() => localStorage.getItem('devorbit.lunar.v1')),
  ).toBe('invalid')
  await page.emulateMedia({ reducedMotion: 'reduce', colorScheme: 'dark' })
  await page.getByRole('button', { name: 'Begin descent' }).click()
  await expect(
    page.getByRole('button', { name: 'Pause', exact: true }),
  ).toBeEnabled()
})
test('external Pomodoro pause stops an active descent', async ({ page }) => {
  await page.clock.install()
  await page.goto('/games')
  await page.evaluate(
    ({ key, state }) =>
      localStorage.setItem(
        key,
        JSON.stringify({
          ...state,
          phase: 'short',
          duration: 60000,
          remaining: 60000,
          deadline: Date.now() + 60000,
        }),
      ),
    { key: POMODORO_KEY, state: initialState() },
  )
  await page.goto('/games/lunar-landing?mode=break')
  await page.getByRole('button', { name: 'Begin descent' }).click()
  await page.evaluate((key) => {
    const oldValue = localStorage.getItem(key)!,
      state = JSON.parse(oldValue)
    state.deadline = null
    state.updatedAt = Date.now() + 1
    const newValue = JSON.stringify(state)
    localStorage.setItem(key, newValue)
    window.dispatchEvent(
      new StorageEvent('storage', { key, oldValue, newValue }),
    )
  }, POMODORO_KEY)
  await page.clock.runFor(200)
  await expect(
    page.getByRole('heading', { name: 'Holding position.' }),
  ).toBeVisible()
})

test('a flown landing saves a record and continues to a harder refueled planet', async ({
  page,
}) => {
  await page.addInitScript(() => {
    const original = crypto.getRandomValues.bind(crypto)
    crypto.getRandomValues = (array) => {
      if (array instanceof Uint32Array && array.length === 1) {
        array[0] = 42
        return array
      }
      return original(array)
    }
  })
  await page.clock.install()
  await page.goto('/games/lunar-landing')
  await expect(
    page.getByRole('button', { name: 'Begin descent' }),
  ).toBeEnabled()
  await page.clock.pauseAt(new Date((await page.evaluate(() => Date.now())) + 1000))
  await page.getByRole('button', { name: 'Begin descent' }).click()
  const g = createMission(42),
    pad = g.pads[0]
  g.status = 'running'
  const active = new Set<string>()
  for (let tick = 0; tick < 250 && g.status === 'running'; tick++) {
    const dx = pad.x + pad.width / 2 - g.x,
      altitude = pad.y - 24 - g.y
    const wantedX = Math.sign(dx) * Math.min(40, Math.sqrt(Math.abs(dx) * 35))
    const wantedY = Math.min(
      48,
      Math.sqrt(Math.max(0, altitude) * 35),
      altitude < 80 ? 18 : 48,
    )
    const input = {
      left: g.vx > wantedX + 3,
      right: g.vx < wantedX - 3,
      main: g.vy > wantedY,
    }
    for (const [key, held] of [
      ['ArrowLeft', input.left],
      ['ArrowRight', input.right],
      ['ArrowUp', input.main],
    ] as const) {
      if (held && !active.has(key)) {
        await page.keyboard.down(key)
        active.add(key)
      }
      if (!held && active.has(key)) {
        await page.keyboard.up(key)
        active.delete(key)
      }
    }
    for (let frame = 0; frame < 12; frame++) stepMission(g, input, 1 / 120)
    await page.clock.runFor(100)
  }
  for (const key of active) await page.keyboard.up(key)
  await page.clock.runFor(1500)
  await expect(
    page.getByRole('heading', { name: 'A small step.' }),
  ).toBeVisible()
  expect(
    await page.evaluate(
      () => JSON.parse(localStorage.getItem('devorbit.lunar.v1')!).landings,
    ),
  ).toBe(1)
  await page.getByRole('button', { name: 'Travel to next planet' }).click()
  await expect(page.getByText('SECTOR 02 / CINDER')).toBeVisible()
  await expect(page.getByTestId('lunar-fuel')).toHaveText('100%')
  expect(
    Number(
      await page
        .getByTestId('lunar-score')
        .innerText()
        .then((t) => t.replaceAll(',', '')),
    ),
  ).toBeGreaterThan(500)
  await page.reload()
  await expect(page.getByText(/Best [1-9]/)).toBeVisible()
})
