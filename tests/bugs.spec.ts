import { expect, test, type Page } from '@playwright/test'
import {
  createWorkspace,
  type BugReport,
  type Workspace,
} from '../src/features/workspace/model.js'

const storageKey = 'devorbit.workspace.v1'
const listPath = '/projects/devorbit/bugs'
const makeBug = (
  id: string,
  overrides: Partial<BugReport> = {},
): BugReport => ({
  id,
  title: `Report ${id}`,
  description: '',
  steps: '',
  expected: '',
  actual: '',
  environment: '',
  status: 'open',
  severity: 'medium',
  labels: [],
  createdAt: '2026-10-01T10:00:00.000Z',
  updatedAt: '2026-10-01T10:00:00.000Z',
  ...overrides,
})
async function seed(page: Page, workspace: Workspace) {
  await page.addInitScript(
    ({ key, data }) => {
      if (!localStorage.getItem(key))
        localStorage.setItem(key, JSON.stringify(data))
    },
    { key: storageKey, data: workspace },
  )
}
async function report(page: Page, title: string) {
  await page.getByRole('button', { name: 'Report a bug', exact: true }).click()
  await page.getByRole('textbox', { name: 'Title', exact: true }).fill(title)
  await page.getByRole('button', { name: 'Create bug', exact: true }).click()
  await expect(page.getByRole('dialog')).not.toBeVisible()
  await expect(
    page.getByRole('heading', { name: title, exact: true }),
  ).toBeVisible()
}

test('reports, edits, resolves, reopens and deletes a bug with direct URL persistence', async ({
  page,
}) => {
  await page.goto('/bugs')
  await page.getByRole('button', { name: 'Report your first bug' }).click()
  await page
    .getByRole('textbox', { name: 'Title', exact: true })
    .fill('Saving a board loses the title')
  await page
    .getByRole('combobox', { name: 'Severity', exact: true })
    .selectOption('critical')
  await page
    .getByLabel('Description', { exact: true })
    .fill('A regression after renaming.')
  await page
    .getByLabel('Steps to reproduce')
    .fill('1. Open a board\n2. Rename it\n3. Refresh')
  await page.getByLabel('Expected behavior').fill('The new title persists.')
  await page.getByLabel('Actual behavior').fill('The title is blank.')
  await page.getByLabel('Environment').fill('Chrome on macOS')
  await page
    .getByLabel('Labels', { exact: true })
    .fill('regression, frontend, regression')
  await page.getByRole('button', { name: 'Create bug', exact: true }).click()
  await expect(page).toHaveURL(/\/projects\/devorbit\/bugs\/[a-z0-9-]+$/)
  const detailUrl = page.url()
  await page.reload()
  await expect(
    page.getByRole('heading', { name: 'Saving a board loses the title' }),
  ).toBeVisible()
  await expect(page.locator('.bug-detail-content')).toContainText('3. Refresh')
  await expect(page.locator('.bug-properties')).toContainText('Chrome on macOS')
  await expect(page.locator('.bug-properties .bug-labels > span')).toHaveCount(
    2,
  )
  const original = await page.evaluate(
    (key) => JSON.parse(localStorage.getItem(key)!).projects[0].bugs[0],
    storageKey,
  )
  await page.getByRole('button', { name: 'Edit bug', exact: true }).click()
  await page
    .getByLabel('Title', { exact: true })
    .fill('Board title disappears after refresh')
  await page
    .getByRole('combobox', { name: 'Severity', exact: true })
    .selectOption('high')
  await page.getByRole('button', { name: 'Save bug', exact: true }).click()
  for (const status of ['in-progress', 'resolved', 'closed', 'open']) {
    await page.getByLabel('Bug status', { exact: true }).selectOption(status)
    await page.reload()
    await expect(page.getByLabel('Bug status', { exact: true })).toHaveValue(
      status,
    )
  }
  const updated = await page.evaluate(
    (key) => JSON.parse(localStorage.getItem(key)!).projects[0].bugs[0],
    storageKey,
  )
  expect(updated.id).toBe(original.id)
  expect(updated.createdAt).toBe(original.createdAt)
  expect(updated.updatedAt > original.updatedAt).toBeTruthy()
  await page.getByRole('button', { name: /^Delete bug / }).click()
  await page.getByRole('button', { name: 'Cancel', exact: true }).click()
  await expect(
    page.getByRole('heading', { name: 'Board title disappears after refresh' }),
  ).toBeVisible()
  await page.getByRole('button', { name: /^Delete bug / }).click()
  await page.getByRole('button', { name: 'Confirm deletion' }).click()
  await expect(page).toHaveURL(new RegExp(`${listPath}$`))
  await expect(
    page.getByRole('heading', { name: 'A clear sky. A fresh start.' }),
  ).toBeVisible()
  await page.goto(detailUrl)
  await expect(
    page.getByRole('heading', { name: 'This report has left orbit.' }),
  ).toBeVisible()
})

test('combines search, severity, status and label filters and sorts reports', async ({
  page,
}) => {
  const workspace = createWorkspace()
  workspace.projects[0].bugs = [
    makeBug('minor', {
      title: 'Small display glitch',
      severity: 'low',
      labels: ['ui'],
      updatedAt: '2026-10-03T10:00:00.000Z',
    }),
    makeBug('blocker', {
      title: 'Cannot save changes',
      severity: 'critical',
      labels: ['regression'],
      steps: 'Click the launch button',
      createdAt: '2026-10-02T10:00:00.000Z',
      updatedAt: '2026-10-02T10:00:00.000Z',
    }),
    makeBug('fixed', {
      title: 'Old crash',
      severity: 'high',
      status: 'closed',
      labels: ['regression'],
    }),
  ]
  await seed(page, workspace)
  await page.goto('/bugs')
  const links = page.locator('.bug-report-link')
  await expect(links).toHaveCount(3)
  await expect(links.first()).toContainText('Small display glitch')
  await page.getByLabel('Sort bugs').selectOption('severity')
  await expect(links.first()).toContainText('Cannot save changes')
  await page.getByLabel('Sort bugs').selectOption('created')
  await expect(links.first()).toContainText('Cannot save changes')
  await page.getByLabel('Filter by status').selectOption('active')
  await page.getByLabel('Filter by label').selectOption('regression')
  await page.getByLabel('Filter by severity').selectOption('critical')
  await page
    .getByRole('searchbox', { name: 'Search bugs' })
    .fill(' LAUNCH BUTTON ')
  await expect(links).toHaveCount(1)
  await page.getByRole('searchbox', { name: 'Search bugs' }).fill('missing')
  await expect(
    page.getByRole('heading', { name: 'No signals in this view.' }),
  ).toBeVisible()
  await page.getByRole('button', { name: 'Clear filters' }).click()
  await expect(links).toHaveCount(3)
  await page
    .getByLabel('Status for Cannot save changes', { exact: true })
    .selectOption('resolved')
  await expect(
    page.locator('.bug-summary > div').filter({ hasText: 'Active bugs' }),
  ).toContainText('1')
  await page.reload()
  await expect(
    page.getByLabel('Status for Cannot save changes', { exact: true }),
  ).toHaveValue('resolved')
})

test('isolates projects and preserves reports through board changes', async ({
  page,
  isMobile,
}) => {
  await page.goto('/')
  if (isMobile)
    await page.getByRole('button', { name: 'Open navigation' }).click()
  await page
    .getByRole('navigation')
    .getByRole('link', { name: 'Bug tracking', exact: true })
    .click()
  await expect(
    page.locator('nav[aria-label="Main navigation"] [aria-current="page"]'),
  ).toHaveText('Bug tracking')
  await report(page, 'First project issue')
  await page.goto('/')
  await expect(
    page.getByRole('region', { name: 'Bug tracking summary' }),
  ).toContainText('1 active bugs')
  await page.getByRole('button', { name: 'New project', exact: true }).click()
  await page
    .getByRole('textbox', { name: 'Name', exact: true })
    .fill('Moonbase')
  await page.getByRole('button', { name: 'Save project' }).click()
  await page
    .getByRole('main')
    .getByRole('link', { name: 'Bug tracking', exact: true })
    .click()
  await expect(
    page.getByRole('heading', { name: 'A clear sky. A fresh start.' }),
  ).toBeVisible()
  await report(page, 'Second project issue')
  await page.getByRole('link', { name: 'Kanban board', exact: true }).click()
  await expect(
    page.locator('nav[aria-label="Main navigation"] [aria-current="page"]'),
  ).toHaveText('Kanban boards')
  await page.getByRole('button', { name: 'New task', exact: true }).click()
  await page
    .getByRole('textbox', { name: 'Title', exact: true })
    .fill('Fix the issue')
  await page.getByRole('button', { name: 'Create task', exact: true }).click()
  await page
    .getByRole('main')
    .getByRole('link', { name: 'Bug tracking', exact: true })
    .click()
  await expect(
    page.getByRole('link', { name: 'Open bug Second project issue' }),
  ).toBeVisible()
  await page
    .getByRole('combobox', { name: 'Project', exact: true })
    .selectOption('devorbit')
  await expect(page.locator('.bug-report-link')).toHaveCount(1)
  await expect(page.locator('.bug-report-link')).toContainText(
    'First project issue',
  )
  await page
    .getByRole('combobox', { name: 'Project', exact: true })
    .selectOption({ label: 'Moonbase' })
  await page.getByRole('link', { name: 'Kanban board', exact: true }).click()
  await page
    .getByRole('button', { name: 'Delete project', exact: true })
    .click()
  await expect(page.getByRole('dialog')).toContainText('bug reports')
  await page.getByRole('button', { name: 'Confirm deletion' }).click()
  await page.goto('/bugs')
  await expect(page.locator('.bug-report-link')).toHaveCount(1)
  await expect(page.locator('.bug-report-link')).toContainText(
    'First project issue',
  )
  expect(
    await page.evaluate(
      (key) => JSON.parse(localStorage.getItem(key)!).projects.length,
      storageKey,
    ),
  ).toBe(1)
})

test('loads legacy workspaces and round-trips bug reports in backups', async ({
  page,
}) => {
  const workspace = createWorkspace()
  const project = workspace.projects[0]
  project.boards[0].columns[0].tasks.push({
    id: 'legacy-task',
    title: 'Keep my existing task',
    description: '',
    priority: 'none',
    labels: [],
    dueDate: '',
  })
  const legacy = {
    version: 1,
    projects: [
      {
        id: project.id,
        name: project.name,
        description: project.description,
        boards: project.boards,
      },
    ],
  }
  await page.addInitScript(
    ({ key, data }) => localStorage.setItem(key, JSON.stringify(data)),
    { key: storageKey, data: legacy },
  )
  await page.goto('/bugs')
  await expect(page.getByRole('alert')).toHaveCount(0)
  await report(page, 'Back up this issue')
  expect(
    await page.evaluate(
      (key) =>
        JSON.parse(localStorage.getItem(key)!).projects[0].boards[0].columns[0]
          .tasks[0].title,
      storageKey,
    ),
  ).toBe('Keep my existing task')
  await page.getByRole('link', { name: 'All bug reports' }).click()
  const downloaded = page.waitForEvent('download')
  await page
    .getByRole('button', { name: 'Export workspace', exact: true })
    .click()
  const file = await downloaded
  const path = await file.path()
  expect(path).toBeTruthy()
  await report(page, 'Discard after restore')
  await page.getByRole('link', { name: 'All bug reports' }).click()
  await page
    .getByRole('button', { name: 'Import workspace', exact: true })
    .click()
  await page.getByLabel('Workspace JSON file').setInputFiles(path!)
  await expect(page.getByRole('dialog')).toContainText('1 bug reports found')
  await expect(
    page.getByRole('button', { name: 'Import and replace' }),
  ).toBeDisabled()
  await page
    .getByRole('checkbox', { name: 'Replace my current workspace' })
    .check()
  await page.getByRole('button', { name: 'Import and replace' }).click()
  await expect(page.locator('.bug-report-link')).toHaveCount(1)
  await expect(page.locator('.bug-report-link')).toContainText(
    'Back up this issue',
  )
  // Legacy imports intentionally contain no bug reports and require confirmation.
  await page
    .getByRole('button', { name: 'Import workspace', exact: true })
    .click()
  await page.getByLabel('Workspace JSON file').setInputFiles({
    name: 'legacy.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(legacy)),
  })
  await expect(page.getByRole('dialog')).toContainText('0 bug reports found')
  await page.getByRole('button', { name: 'Cancel', exact: true }).click()
  await expect(page.locator('.bug-report-link')).toHaveCount(1)
  const replacement = createWorkspace()
  replacement.projects[0].id = 'imported-project'
  replacement.projects[0].bugs = [makeBug('imported-bug')]
  await page
    .getByRole('button', { name: 'Import workspace', exact: true })
    .click()
  await page.getByLabel('Workspace JSON file').setInputFiles({
    name: 'replacement.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(replacement)),
  })
  await page
    .getByRole('checkbox', { name: 'Replace my current workspace' })
    .check()
  await page.getByRole('button', { name: 'Import and replace' }).click()
  await expect(page).toHaveURL(/\/projects\/imported-project\/bugs$/)
  await expect(page.locator('.bug-report-link')).toContainText(
    'Report imported-bug',
  )
})

test('rejects malformed bug backups and duplicate IDs without data loss', async ({
  page,
}) => {
  await page.goto('/bugs')
  await report(page, 'Keep my report')
  await page.getByRole('link', { name: 'All bug reports' }).click()
  const before = await page.evaluate(
    (key) => localStorage.getItem(key),
    storageKey,
  )
  for (const invalid of [
    makeBug('invalid', { severity: 'impossible' as BugReport['severity'] }),
    makeBug('devorbit-column-0'),
    makeBug('invalid-date', { updatedAt: 'tomorrow' }),
  ]) {
    const candidate = createWorkspace()
    candidate.projects[0].bugs = [invalid]
    await page
      .getByRole('button', { name: 'Import workspace', exact: true })
      .click()
    await page.getByLabel('Workspace JSON file').setInputFiles({
      name: 'bad.json',
      mimeType: 'application/json',
      buffer: Buffer.from(JSON.stringify(candidate)),
    })
    await expect(page.getByRole('alert')).toContainText('not a valid')
    await expect(
      page.getByRole('button', { name: 'Import and replace' }),
    ).toBeDisabled()
    await page.getByRole('button', { name: 'Cancel', exact: true }).click()
  }
  expect(
    await page.evaluate((key) => localStorage.getItem(key), storageKey),
  ).toBe(before)
})

test('syncs reports across tabs and prevents a stale editor from overwriting newer changes', async ({
  page,
  context,
}) => {
  await page.goto('/bugs')
  await report(page, 'Shared report')
  const other = await context.newPage()
  await other.goto(page.url())
  await page.getByRole('button', { name: 'Edit bug', exact: true }).click()
  await page.getByLabel('Title', { exact: true }).fill('Stale edit')
  await other.getByLabel('Bug status', { exact: true }).selectOption('resolved')
  await expect(page.locator('.bug-properties select')).toHaveValue('resolved')
  await page.getByRole('button', { name: 'Save bug', exact: true }).click()
  await expect(page.getByRole('alert')).toContainText('changed in another tab')
  await page.getByRole('button', { name: 'Cancel', exact: true }).click()
  await expect(
    page.getByRole('heading', { name: 'Shared report' }),
  ).toBeVisible()
  await other.getByRole('button', { name: /^Delete bug / }).click()
  await other.getByRole('button', { name: 'Confirm deletion' }).click()
  await expect(
    page.getByRole('heading', { name: 'This report has left orbit.' }),
  ).toBeVisible()
})

test('validates reports, supports keyboard dismissal and fits narrow screens in dark mode', async ({
  page,
}) => {
  await page.addInitScript(() =>
    localStorage.setItem(
      'devorbit.appearance.v1',
      JSON.stringify({ version: 1, mode: 'dark', accent: 'red' }),
    ),
  )
  await page.goto('/bugs')
  const trigger = page.getByRole('button', {
    name: 'Report a bug',
    exact: true,
  })
  await trigger.click()
  await page.getByLabel('Title', { exact: true }).fill('   ')
  await page.getByRole('button', { name: 'Create bug', exact: true }).click()
  await expect(page.getByRole('alert')).toHaveText('Give your bug a title.')
  await page.getByLabel('Title', { exact: true }).fill('A'.repeat(120))
  await page.getByLabel('Labels', { exact: true }).fill('x'.repeat(31))
  await page.getByRole('button', { name: 'Create bug', exact: true }).click()
  await expect(page.getByRole('alert')).toContainText('at most 30 characters')
  await page.keyboard.press('Escape')
  await expect(trigger).toBeFocused()
  await page.setViewportSize({ width: 360, height: 800 })
  await trigger.click()
  await page.getByLabel('Title', { exact: true }).fill('A'.repeat(120))
  await page.getByLabel('Description', { exact: true }).fill('x'.repeat(1000))
  await page
    .getByLabel('Labels', { exact: true })
    .fill('frontend, ' + 'y'.repeat(30))
  await page.getByRole('button', { name: 'Create bug', exact: true }).click()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true)
  await page.getByRole('link', { name: 'All bug reports' }).click()
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true)
  await expect(page.locator('.bug-register')).toHaveCSS(
    'background-color',
    'rgb(27, 32, 38)',
  )
})

test('keeps unsaved bug reports exportable when storage fails and blocks corrupt workspaces', async ({
  page,
}) => {
  await page.goto('/bugs')
  await page.evaluate(() => {
    Storage.prototype.setItem = () => {
      throw new DOMException('Full', 'QuotaExceededError')
    }
  })
  await report(page, 'Unsaved but exportable')
  await expect(page.getByRole('alert')).toContainText('only in memory')
  await page.getByRole('link', { name: 'All bug reports' }).click()
  const download = page.waitForEvent('download')
  await page
    .getByRole('button', { name: 'Export workspace', exact: true })
    .click()
  expect(await (await download).path()).toBeTruthy()
  await page.reload()
  await page.evaluate((key) => localStorage.setItem(key, '{broken'), storageKey)
  await page.reload()
  await expect(page.getByRole('alert')).toContainText(
    'has not been overwritten',
  )
  await expect(
    page.getByRole('button', { name: 'Report a bug', exact: true }),
  ).toBeDisabled()
  expect(
    await page.evaluate((key) => localStorage.getItem(key), storageKey),
  ).toBe('{broken')
})

test('protects the report limit and recovers from missing project URLs', async ({
  page,
}) => {
  const workspace = createWorkspace()
  workspace.projects[0].bugs = Array.from({ length: 1000 }, (_, index) =>
    makeBug(`bug-${index}`),
  )
  await seed(page, workspace)
  await page.goto('/bugs')
  await expect(
    page.getByRole('button', { name: 'Report a bug', exact: true }),
  ).toBeDisabled()
  await expect(page.locator('.form-warning')).toContainText('1,000 reports')
  await page.goto('/projects/missing/bugs')
  await expect(
    page.getByRole('heading', { name: 'This project has left orbit.' }),
  ).toBeVisible()
  await page
    .getByRole('link', { name: 'Open bug tracking', exact: true })
    .click()
  await expect(page).toHaveURL(new RegExp(`${listPath}$`))
})
