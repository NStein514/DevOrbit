import { setRange } from './helpers/arcade-controls.js'
import { test, expect } from '@playwright/test'
import { initialState, POMODORO_KEY } from '../src/features/pomodoro/model.js'
import {
  missions,
  missionReady,
  missionStars,
} from '../src/features/games/orbit/missions.js'
import { launch } from '../src/features/games/orbit/engine.js'

test('orbit missions require both satellite count and separate lanes', () => {
  const same = [0, 60, 120, 180, 240, 300].map((a, i) =>
    launch(i, 190, a, 0, 31),
  )
  expect(missionReady(same, 0)).toBe(true)
  expect(missionReady(same, 1)).toBe(false)
  const layered = same.map((s, i) =>
    launch(s.id, [150, 190, 235][i % 3], i * 60, 0, 31),
  )
  expect(missionReady(layered, 2)).toBe(true)
  expect(missionReady(layered.slice(0, 5), 2)).toBe(false)
  expect([0, 2, 3].map(missionStars)).toEqual([3, 2, 1])
})

test('orbit missions progress, pause freezes stability, and stars persist', async ({
  page,
}) => {
  test.setTimeout(90000)
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
  for (let mission = 0; mission < 3; mission++) {
    const presets =
      mission === 0
        ? ['Middle lane', 'Middle lane', 'Middle lane']
        : mission === 1
          ? ['Inner lane', 'Inner lane', 'Outer lane', 'Outer lane']
          : [
              'Inner lane',
              'Inner lane',
              'Middle lane',
              'Middle lane',
              'Outer lane',
              'Outer lane',
            ]
    await setRange(page, /Launch position/, [10, 10, 125][mission])
    for (const name of presets) {
      await page.getByRole('button', { name, exact: true }).click()
      await page
        .getByRole('button', { name: 'Launch satellite', exact: true })
        .click()
    }
    await page.clock.runFor(2000)
    await page.getByRole('button', { name: 'Pause', exact: true }).click()
    const stability = await page.getByRole('progressbar').getAttribute('value')
    await page.clock.runFor(2000)
    await expect(page.getByRole('progressbar')).toHaveAttribute(
      'value',
      stability!,
    )
    await page.getByRole('button', { name: 'Resume', exact: true }).click()
    await page.clock.runFor(missions[mission].hold * 1000)
    await expect(page.getByRole('status')).toContainText(
      'Constellation established',
    )
    if (mission < 2)
      await page
        .getByRole('button', { name: 'Next mission', exact: true })
        .click()
  }
  await expect(
    page.getByText('Best 9 / 9 stars', { exact: true }),
  ).toBeVisible()
  await page.clock.resume()
  await page.reload()
  await expect(
    page.getByText('Best 9 / 9 stars', { exact: true }),
  ).toBeVisible()
  await expect(
    page.getByText('0 / 8 satellites', { exact: true }),
  ).toBeVisible()
  await page.getByRole('link', { name: 'Back to arcade', exact: true }).click()
  await expect(page.getByText('Personal best: 9 / 9 stars')).toBeVisible()
})

for (const game of ['orbit-architect', 'gravity-golf'] as const) {
  const action =
    game === 'orbit-architect' ? 'Launch satellite' : 'Launch comet'
  test(`${game} works as a saved break choice and stops when a paused break expires`, async ({
    page,
  }) => {
    test.setTimeout(90000)
    await page.clock.install()
    await page.goto('/pomodoro')
    await page.getByLabel('Break activity').selectOption(game)
    await page.getByRole('button', { name: 'Save preferences' }).click()
    await page.reload()
    await expect(page.getByLabel('Break activity')).toHaveValue(game)
    const timer = initialState()
    timer.settings.breakActivity = game
    timer.phase = 'short'
    timer.duration = 60000
    timer.remaining = 60000
    await page.evaluate(
      ({ key, timer }) => {
        timer.deadline = Date.now() + 60000
        localStorage.setItem(key, JSON.stringify(timer))
      },
      { key: POMODORO_KEY, timer },
    )
    await page.goto('/games')
    await expect(
      page.getByRole('link', { name: 'Play this break', exact: true }),
    ).toHaveAttribute('href', `/games/${game}?mode=break`)
    await page
      .getByRole('link', { name: 'Play this break', exact: true })
      .click()
    await page.getByRole('button', { name: action, exact: true }).click()
    await page.getByRole('button', { name: 'Pause', exact: true }).click()
    await page.clock.fastForward(61000)
    await page.clock.runFor(100)
    await expect(
      page.getByRole('button', { name: action, exact: true }),
    ).toBeDisabled()
    await expect(
      page.getByRole('button', { name: 'Resume', exact: true }),
    ).toBeDisabled()
    await expect(
      page.getByText('Break play is paused.', { exact: false }),
    ).toBeVisible()
    await page.getByRole('link', { name: 'Free play', exact: true }).click()
    await page.getByRole('button', { name: 'Resume', exact: true }).click()
    if (game === 'gravity-golf')
      await page
        .getByRole('button', { name: 'Abandon shot', exact: true })
        .click()
    await expect(
      page.getByRole('button', { name: action, exact: true }),
    ).toBeEnabled()
  })

  test(`${game} supports touch aiming, keyboard, expansion, focus loss and narrow themes`, async ({
    page,
  }) => {
    const errors: string[] = []
    page.on('pageerror', (e) => errors.push(e.message))
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.goto(`/games/${game}`)
    await expect(
      page.getByRole('button', { name: action, exact: true }),
    ).toBeEnabled()
    const canvas = page.locator('.game-stage canvas')
    await canvas.scrollIntoViewIfNeeded()
    const box = (await canvas.boundingBox())!
    const session = await page.context().newCDPSession(page)
    const start = {
      x: box.x + box.width * 0.35,
      y: box.y + box.height * 0.65,
      id: 1,
    }
    await session.send('Input.dispatchTouchEvent', {
      type: 'touchStart',
      touchPoints: [start],
    })
    await session.send('Input.dispatchTouchEvent', {
      type: 'touchMove',
      touchPoints: [
        {
          ...start,
          x: start.x + box.width * 0.25,
          y: start.y - box.height * 0.2,
        },
      ],
    })
    await session.send('Input.dispatchTouchEvent', {
      type: 'touchEnd',
      touchPoints: [],
    })
    const slider = page.getByRole('slider', {
      name: game === 'gravity-golf' ? /Shot angle/ : /Launch position/,
    })
    expect(await slider.inputValue()).not.toBe(
      game === 'gravity-golf' ? '-20' : '0',
    )
    await canvas.focus()
    await page.keyboard.press('Space')
    if (game === 'orbit-architect')
      await expect(
        page.getByText('1 / 8 satellites', { exact: true }),
      ).toBeVisible()
    else await expect(page.getByText('Total 1', { exact: true })).toBeVisible()
    await page.evaluate(() => window.dispatchEvent(new Event('blur')))
    await expect(
      page.getByRole('button', { name: 'Resume', exact: true }),
    ).toBeVisible()
    await page.getByRole('button', { name: 'Expand play area' }).click()
    await expect(page.getByRole('dialog')).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(page.getByRole('dialog')).toHaveCount(0)
    await expect(
      page.getByRole('button', { name: 'Expand play area' }),
    ).toBeFocused()
    await page.setViewportSize({ width: 360, height: 800 })
    for (const colorScheme of ['light', 'dark'] as const) {
      await page.emulateMedia({ colorScheme })
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true)
    }
    await session.detach()
    expect(errors).toEqual([])
  })

  test(`${game} preserves malformed records without blocking play`, async ({
    page,
  }) => {
    await page.addInitScript(
      (game) => localStorage.setItem(`devorbit.${game}.v1`, '{bad'),
      game,
    )
    await page.goto(`/games/${game}`)
    await expect(page.getByRole('alert')).toContainText(
      'Personal bests could not be read',
    )
    await page.getByRole('button', { name: action, exact: true }).click()
    expect(
      await page.evaluate(
        (game) => localStorage.getItem(`devorbit.${game}.v1`),
        game,
      ),
    ).toBe('{bad')
  })
}
