import { expect, test } from '@playwright/test'

test.beforeEach(async ({ page }) => {
  await page.goto('/')
})

test('renders a responsive homepage with artwork and no browser errors', async ({
  page,
}) => {
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  await page.reload()
  await expect(page).toHaveTitle(/DevOrbit/)
  await expect(
    page.getByRole('heading', { name: 'Mission control.' }),
  ).toBeVisible()
  await expect(page.getByRole('button', { name: /^Explore / })).toHaveCount(1)
  const image = await page.request.get('/images/devorbit-planet.png')
  expect(image.ok()).toBeTruthy()
  expect(image.headers()['content-type']).toContain('image/png')
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBeTruthy()
  expect(errors).toEqual([])
})

test('filters the live project list and recovers from empty results', async ({
  page,
}) => {
  await page.getByRole('button', { name: 'In orbit', exact: true }).click()
  await expect(page.getByRole('button', { name: /^Explore / })).toHaveCount(0)
  await page.getByRole('button', { name: 'Pre-launch', exact: true }).click()
  await expect(
    page.getByRole('button', { name: 'Explore DevOrbit' }),
  ).toBeVisible()
  await page.getByRole('searchbox', { name: 'Search projects' }).fill('missing')
  await expect(page.getByRole('status')).toHaveText(/No projects/)
  await page
    .getByRole('searchbox', { name: 'Search projects' })
    .fill('DEVORBIT')
  await expect(
    page.getByRole('button', { name: 'Explore DevOrbit' }),
  ).toBeVisible()
})

test('opens planned feature details and returns focus after Escape', async ({
  page,
}) => {
  const trigger = page.getByRole('button', {
    name: /Changelog generation/,
  })
  await trigger.click()
  const dialog = page.getByRole('dialog')
  await expect(dialog).toBeVisible()
  await expect(
    dialog.getByRole('heading', { name: 'Changelog generation' }),
  ).toBeVisible()
  await expect(dialog).toContainText('release notes')
  await page.keyboard.press('Escape')
  await expect(dialog).not.toBeVisible()
  await expect(trigger).toBeFocused()
})

test('opens the project board and supports direct URL reload', async ({
  page,
}) => {
  await page.getByRole('button', { name: 'Explore DevOrbit' }).click()
  await expect(page).toHaveURL(/\/projects\/devorbit\/boards\/devorbit-board$/)
  await expect(
    page.getByRole('heading', { name: 'My workflow.' }),
  ).toBeVisible()
  await page.reload()
  await expect(
    page.getByRole('region', { name: 'Backlog column', exact: true }),
  ).toBeVisible()
})

test('navigates to projects on desktop and mobile', async ({
  page,
  isMobile,
}) => {
  if (isMobile)
    await page.getByRole('button', { name: 'Open navigation' }).click()
  await page
    .getByRole('navigation', { name: 'Main navigation' })
    .getByRole('link', { name: /Projects/ })
    .click()
  await expect(page).toHaveURL(/#projects$/)
  await expect(
    page.getByRole('heading', { name: 'Your little universe' }),
  ).toBeInViewport()
  if (isMobile)
    await expect(
      page.getByRole('button', { name: 'Open navigation' }),
    ).toHaveAttribute('aria-expanded', 'false')
})
