import { expect, test } from '@playwright/test'

const appearanceKey = 'devorbit.appearance.v1'
const workspaceKey = 'devorbit.workspace.v1'
const colors = [
  ['Green', '#c0f2ad'],
  ['Red', '#f5adb4'],
  ['Orange', '#f6c08c'],
  ['Yellow', '#f2d779'],
  ['Blue', '#a9cff7'],
  ['Purple', '#e1b3ef'],
  ['Violet', '#c6b7fa'],
] as const

test('opens personalization from navigation and fits small screens', async ({
  page,
  isMobile,
}) => {
  await page.goto('/')
  if (isMobile)
    await page.getByRole('button', { name: 'Open navigation' }).click()
  await page.getByRole('link', { name: 'Settings', exact: true }).click()
  await expect(page).toHaveURL(/\/settings$/)
  await expect(page.getByRole('heading', { name: 'Settings.' })).toBeVisible()
  await expect(page.locator('nav [aria-current="page"]')).toHaveText('Settings')
  await expect(page.getByRole('radio')).toHaveCount(10)
  await page.setViewportSize({ width: 360, height: 900 })
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true)
  await page.getByRole('radio', { name: 'Violet', exact: true }).check()
  await expect(
    page.getByRole('radio', { name: 'Violet', exact: true }),
  ).toBeChecked()
})

test('System follows device changes while explicit modes override them', async ({
  page,
}) => {
  await page.emulateMedia({ colorScheme: 'dark' })
  await page.goto('/settings')
  await expect(
    page.getByRole('radio', { name: 'System', exact: true }),
  ).toBeChecked()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
  await page.emulateMedia({ colorScheme: 'light' })
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light')
  await expect(page.getByRole('status')).toContainText('currently light')
  await page.getByRole('radio', { name: 'Dark', exact: true }).check()
  await page.emulateMedia({ colorScheme: 'dark' })
  await page.emulateMedia({ colorScheme: 'light' })
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
  await page.reload()
  await expect(
    page.getByRole('radio', { name: 'Dark', exact: true }),
  ).toBeChecked()
  await page.getByRole('radio', { name: 'Light', exact: true }).check()
  await page.emulateMedia({ colorScheme: 'dark' })
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light')
  await page.getByRole('radio', { name: 'System', exact: true }).check()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
})

for (const mode of ['Light', 'Dark']) {
  test(`all accents recolor branding, artwork and favicon in ${mode} mode`, async ({
    page,
  }) => {
    await page.goto('/settings')
    await page.getByRole('radio', { name: mode, exact: true }).check()
    const buttons = new Set<string>()
    const artwork = new Set<string>()
    const branding = new Set<string>()
    const progress = new Set<string>()
    for (const [name, fill] of colors) {
      await page.getByRole('radio', { name, exact: true }).check()
      await expect(page.locator('html')).toHaveAttribute(
        'data-accent',
        name.toLowerCase(),
      )
      const rgb = fill
        .slice(1)
        .match(/.{2}/g)!
        .map((value) => parseInt(value, 16))
      await expect(page.locator('.button--primary')).toHaveCSS(
        'background-color',
        `rgb(${rgb.join(', ')})`,
      )
      const styles = await page.evaluate(() => {
        const css = (selector: string) =>
          getComputedStyle(document.querySelector(selector)!)
        const root = getComputedStyle(document.documentElement)
        const context = document.createElement('canvas').getContext('2d')!
        const toRGB = (color: string) => {
          context.clearRect(0, 0, 1, 1)
          context.fillStyle = color
          context.fillRect(0, 0, 1, 1)
          return Array.from(context.getImageData(0, 0, 1, 1).data).slice(0, 3)
        }
        const luminance = (color: string) => {
          const [r, g, b] = toRGB(color).map((channel) => {
            const c = channel / 255
            return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
          })
          return 0.2126 * r + 0.7152 * g + 0.0722 * b
        }
        const contrast = (foreground: string, background: string) => {
          const values = [luminance(foreground), luminance(background)].sort(
            (a, b) => b - a,
          )
          return (values[0] + 0.05) / (values[1] + 0.05)
        }
        const button = css('.button--primary')
        const panel = css('.settings-panel')
        const label = css('.settings-panel-heading p')
        return {
          button: button.backgroundColor,
          accent: toRGB(root.getPropertyValue('--accent')),
          brand: css('.brand-mark').color,
          progress: css('.progress-track > span').backgroundColor,
          planet: getComputedStyle(document.querySelector('.hero')!, '::after')
            .filter,
          favicon:
            document.querySelector<HTMLLinkElement>('link[rel="icon"]')!.href,
          contrast: contrast(button.color, button.backgroundColor),
          mutedContrast: contrast(label.color, panel.backgroundColor),
          accentContrast: contrast(
            css('.settings-save-state').color,
            root.getPropertyValue('--page'),
          ),
        }
      })
      expect(styles.button).toBe(`rgb(${styles.accent.join(', ')})`)
      const favicon = decodeURIComponent(styles.favicon.split(',')[1])
      expect(favicon).toContain(`rx="12" fill="${fill}"`)
      expect(styles.contrast).toBeGreaterThanOrEqual(4.5)
      expect(styles.mutedContrast).toBeGreaterThanOrEqual(4.5)
      expect(styles.accentContrast).toBeGreaterThanOrEqual(4.5)
      buttons.add(styles.button)
      artwork.add(styles.planet)
      branding.add(styles.brand)
      progress.add(styles.progress)
    }
    expect(buttons.size).toBe(7)
    expect(artwork.size).toBe(7)
    expect(branding.size).toBe(7)
    expect(progress.size).toBe(7)
  })
}

test('preferences survive navigation and reset without changing Kanban data', async ({
  page,
}) => {
  await page.goto('/boards')
  await page.getByRole('button', { name: 'New task', exact: true }).click()
  await page
    .getByRole('textbox', { name: 'Title', exact: true })
    .fill('Keep my work')
  await page.getByRole('button', { name: 'Create task', exact: true }).click()
  const workspace = await page.evaluate(
    (key) => localStorage.getItem(key),
    workspaceKey,
  )
  await page.goto('/settings')
  await page.getByRole('radio', { name: 'Dark', exact: true }).check()
  await page.getByRole('radio', { name: 'Orange', exact: true }).check()
  await page.getByRole('link', { name: 'View your dashboard' }).click()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
  await page.getByRole('button', { name: 'Explore DevOrbit' }).click()
  await page.reload()
  await expect(page.locator('html')).toHaveAttribute('data-accent', 'orange')
  await expect(page.getByRole('article')).toContainText('Keep my work')
  const columnColors = await page
    .locator('.color-sage')
    .first()
    .evaluate((el) => {
      const css = getComputedStyle(el)
      return [
        css.getPropertyValue('--column-color').trim(),
        css.getPropertyValue('--accent').trim(),
      ]
    })
  expect(columnColors[0]).toBe(columnColors[1])
  await page.getByRole('button', { name: 'New task', exact: true }).click()
  await expect(page.getByRole('dialog')).toHaveCSS(
    'background-color',
    'rgb(30, 36, 44)',
  )
  await page.keyboard.press('Escape')
  await page.goto('/settings')
  await page.getByRole('button', { name: 'Restore defaults' }).click()
  await expect(
    page.getByRole('radio', { name: 'System', exact: true }),
  ).toBeChecked()
  await expect(
    page.getByRole('radio', { name: 'Green', exact: true }),
  ).toBeChecked()
  expect(
    await page.evaluate((key) => localStorage.getItem(key), workspaceKey),
  ).toBe(workspace)
})

test('updates other tabs and supports native keyboard selection', async ({
  page,
  context,
}) => {
  await page.goto('/settings')
  const other = await context.newPage()
  await other.goto('/settings')
  await page.getByRole('radio', { name: 'Dark', exact: true }).focus()
  await page.keyboard.press('Space')
  await expect(other.locator('html')).toHaveAttribute('data-theme', 'dark')
  await page.getByRole('radio', { name: 'Green', exact: true }).focus()
  await page.keyboard.press('ArrowRight')
  await expect(
    page.getByRole('radio', { name: 'Red', exact: true }),
  ).toBeFocused()
  await expect(
    other.getByRole('radio', { name: 'Red', exact: true }),
  ).toBeChecked()
  await other.getByRole('button', { name: 'Restore defaults' }).click()
  await expect(
    page.getByRole('radio', { name: 'System', exact: true }),
  ).toBeChecked()
  await expect(
    page.getByRole('radio', { name: 'Green', exact: true }),
  ).toBeChecked()
})

test('recovers invalid preferences without blocking the app', async ({
  page,
}) => {
  await page.goto('/settings')
  await page.evaluate(
    (key) =>
      localStorage.setItem(
        key,
        JSON.stringify({ version: 1, mode: 'dark', accent: 'constructor' }),
      ),
    appearanceKey,
  )
  await page.reload()
  await expect(page.getByRole('alert')).toContainText('could not be read')
  await expect(
    page.getByRole('radio', { name: 'Green', exact: true }),
  ).toBeChecked()
  await page.getByRole('radio', { name: 'Blue', exact: true }).check()
  await expect(page.getByRole('alert')).toHaveCount(0)
  await page.reload()
  await expect(
    page.getByRole('radio', { name: 'Blue', exact: true }),
  ).toBeChecked()
  await page.evaluate((key) => localStorage.setItem(key, '{'), appearanceKey)
  await page.reload()
  await expect(page.getByRole('heading', { name: 'Settings.' })).toBeVisible()
  await expect(page.getByRole('alert')).toContainText('could not be loaded')
})

test('keeps session preferences and explains when saving is unavailable', async ({
  page,
}) => {
  await page.addInitScript(() => {
    const original = Storage.prototype.setItem
    Storage.prototype.setItem = function (key, value) {
      if (key === 'devorbit.appearance.v1')
        throw new DOMException('Storage unavailable', 'QuotaExceededError')
      original.call(this, key, value)
    }
  })
  await page.goto('/settings')
  await page.getByRole('radio', { name: 'Dark', exact: true }).check()
  await page.getByRole('radio', { name: 'Purple', exact: true }).check()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
  await expect(page.locator('html')).toHaveAttribute('data-accent', 'purple')
  await expect(page.getByRole('alert')).toContainText(
    'changed for this session',
  )
  await page.getByRole('link', { name: 'View your dashboard' }).click()
  await expect(page.locator('html')).toHaveAttribute('data-accent', 'purple')
})
