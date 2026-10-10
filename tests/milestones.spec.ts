import { expect, test, type Page } from '@playwright/test'
import {
  createBoard,
  createWorkspace,
  type BugReport,
  type Milestone,
  type Workspace,
} from '../src/features/workspace/model.js'

const key = 'devorbit.workspace.v1'
const listPath = '/projects/devorbit/milestones'
const milestone = (
  id: string,
  changes: Partial<Milestone> = {},
): Milestone => ({
  id,
  title: `Goal ${id}`,
  description: '',
  targetDate: '',
  status: 'planned',
  taskIds: [],
  bugIds: [],
  createdAt: '2026-10-01T12:00:00.000Z',
  updatedAt: '2026-10-01T12:00:00.000Z',
  completedAt: '',
  ...changes,
})
function fixture() {
  const workspace = createWorkspace()
  const project = workspace.projects[0]
  project.boards[0].columns[0].tasks = [
    {
      id: 'build',
      title: 'Build the feature',
      description: '',
      priority: 'high',
      labels: [],
      dueDate: '',
    },
  ]
  const second = createBoard('Quality checks')
  second.columns[2].tasks = [
    {
      id: 'test',
      title: 'Test the feature',
      description: '',
      priority: 'medium',
      labels: [],
      dueDate: '',
    },
  ]
  project.boards.push(second)
  const bug: BugReport = {
    id: 'save-bug',
    title: 'Saving fails',
    description: '',
    status: 'open',
    severity: 'high',
    steps: '',
    expected: '',
    actual: '',
    environment: '',
    labels: [],
    createdAt: '2026-10-01T12:00:00.000Z',
    updatedAt: '2026-10-01T12:00:00.000Z',
  }
  project.bugs = [bug]
  return workspace
}
async function seed(page: Page, data: unknown) {
  await page.addInitScript(
    ({ key, data }) => {
      if (!localStorage.getItem(key))
        localStorage.setItem(key, JSON.stringify(data))
    },
    { key, data },
  )
}
async function stored(page: Page): Promise<Workspace> {
  return page.evaluate((key) => JSON.parse(localStorage.getItem(key)!), key)
}
async function create(page: Page, title: string) {
  await page.getByRole('button', { name: 'New milestone', exact: true }).click()
  await page
    .getByRole('textbox', { name: 'Milestone name', exact: true })
    .fill(title)
  await page
    .getByRole('button', { name: 'Create milestone', exact: true })
    .click()
  await expect(
    page.getByRole('heading', { name: title, exact: true }),
  ).toBeVisible()
}

test('links work across boards, tracks progress, completes and automatically reopens milestones', async ({
  page,
}) => {
  await seed(page, fixture())
  await page.goto('/milestones')
  await page.getByRole('button', { name: 'New milestone', exact: true }).click()
  await page.getByLabel('Milestone name', { exact: true }).fill('First release')
  await page
    .getByLabel('Description', { exact: true })
    .fill('Ship a reliable first version.')
  await page.getByLabel('Target date', { exact: true }).fill('2027-06-20')
  await page
    .getByRole('checkbox', {
      name: 'Link task: Build the feature',
      exact: true,
    })
    .check()
  await page.getByRole('combobox', { name: 'Work type' }).selectOption('task')
  await page
    .getByRole('searchbox', { name: 'Search available work' })
    .fill('Quality checks')
  await page
    .getByRole('checkbox', { name: 'Link task: Test the feature', exact: true })
    .check()
  await page.getByRole('searchbox', { name: 'Search available work' }).fill('')
  await page.getByRole('combobox', { name: 'Work type' }).selectOption('bug')
  await page
    .getByRole('checkbox', { name: 'Link bug: Saving fails', exact: true })
    .check()
  await page.getByRole('checkbox', { name: 'Selected only' }).check()
  await expect(page.getByRole('checkbox', { name: /^Link / })).toHaveCount(1)
  await page
    .getByRole('button', { name: 'Create milestone', exact: true })
    .click()
  const url = page.url()
  await expect(page).toHaveURL(/\/milestones\/[a-z0-9-]+$/)
  await page.reload()
  await expect(page.getByRole('progressbar')).toHaveAttribute(
    'aria-valuenow',
    '33',
  )
  await expect(
    page.getByRole('list', { name: 'Milestone work' }).getByRole('listitem'),
  ).toHaveCount(3)
  await expect(
    page.getByRole('button', { name: 'Complete milestone', exact: true }),
  ).toBeDisabled()
  await page.getByRole('button', { name: 'Start milestone' }).click()
  await expect(page.locator('.flight-plan-heading')).toContainText(
    'In progress',
  )
  const original = (await stored(page)).projects[0].milestones[0]
  await page.getByRole('link', { name: 'Open task Build the feature' }).click()
  await expect(page).toHaveURL(/#task-build$/)
  await page
    .getByRole('button', { name: 'Edit task Build the feature', exact: true })
    .click()
  await expect(
    page.getByRole('dialog').getByRole('link', { name: 'First release' }),
  ).toBeVisible()
  await page
    .getByRole('combobox', { name: 'Column', exact: true })
    .selectOption({ label: 'Done' })
  await page.getByRole('button', { name: 'Save task', exact: true }).click()
  await page.goto(url)
  await expect(page.getByRole('progressbar')).toHaveAttribute(
    'aria-valuenow',
    '66',
  )
  await page.getByRole('link', { name: 'Open bug Saving fails' }).click()
  await page.getByLabel('Bug status', { exact: true }).selectOption('resolved')
  await page.getByRole('link', { name: 'First release', exact: true }).click()
  await expect(page.getByRole('progressbar')).toHaveAttribute(
    'aria-valuenow',
    '100',
  )
  await page
    .getByRole('button', { name: 'Complete milestone', exact: true })
    .click()
  await expect(page.locator('.flight-plan-heading')).toContainText('Completed')
  expect((await stored(page)).projects[0].milestones[0].completedAt).not.toBe(
    '',
  )
  await page.getByRole('link', { name: 'Open bug Saving fails' }).click()
  await page.getByLabel('Bug status', { exact: true }).selectOption('open')
  await page.getByRole('link', { name: 'First release', exact: true }).click()
  await expect(page.locator('.flight-plan-heading')).toContainText(
    'In progress',
  )
  await expect(page.getByRole('progressbar')).toHaveAttribute(
    'aria-valuenow',
    '66',
  )
  const reopened = (await stored(page)).projects[0].milestones[0]
  expect(reopened.createdAt).toBe(original.createdAt)
  expect(reopened.completedAt).toBe('')
  await page.getByRole('button', { name: 'Return to planned' }).click()
  await expect(page.locator('.flight-plan-heading')).toContainText('Planned')
})

test('edits and unlinks work, and deletes a milestone without deleting its tasks or bugs', async ({
  page,
}) => {
  const workspace = fixture()
  workspace.projects[0].milestones = [
    milestone('release', { taskIds: ['build', 'test'], bugIds: ['save-bug'] }),
  ]
  await seed(page, workspace)
  await page.goto(`${listPath}/release`)
  await page
    .getByRole('button', { name: 'Edit milestone', exact: true })
    .click()
  await page
    .getByLabel('Milestone name', { exact: true })
    .fill('Polished release')
  await page.getByLabel('Target date', { exact: true }).fill('2027-01-31')
  await page
    .getByRole('checkbox', {
      name: 'Link task: Build the feature',
      exact: true,
    })
    .uncheck()
  await page
    .getByRole('button', { name: 'Save milestone', exact: true })
    .click()
  await expect(
    page.getByRole('heading', { name: 'Polished release' }),
  ).toBeVisible()
  await expect(page.getByRole('progressbar')).toHaveAttribute(
    'aria-valuenow',
    '50',
  )
  await page.reload()
  await expect(
    page.getByRole('list', { name: 'Milestone work' }).getByRole('listitem'),
  ).toHaveCount(2)
  await page.getByRole('button', { name: /^Delete milestone / }).click()
  await page.getByRole('button', { name: 'Cancel', exact: true }).click()
  await expect(
    page.getByRole('heading', { name: 'Polished release' }),
  ).toBeVisible()
  await page.getByRole('button', { name: /^Delete milestone / }).click()
  await page.getByRole('button', { name: 'Confirm deletion' }).click()
  const saved = (await stored(page)).projects[0]
  expect(saved.milestones).toEqual([])
  expect(saved.boards).toEqual(workspace.projects[0].boards)
  expect(saved.bugs).toEqual(workspace.projects[0].bugs)
  await page.goto(`${listPath}/release`)
  await expect(
    page.getByRole('heading', { name: 'This milestone has left orbit.' }),
  ).toBeVisible()
})

test('removes deleted task, board and bug links and preserves milestone validity', async ({
  page,
}) => {
  const workspace = fixture()
  workspace.projects[0].milestones = [
    milestone('cleanup', { taskIds: ['build', 'test'], bugIds: ['save-bug'] }),
  ]
  await seed(page, workspace)
  await page.goto(`${listPath}/cleanup`)
  await page.getByRole('link', { name: 'Open task Build the feature' }).click()
  await page
    .getByRole('button', { name: 'Delete task Build the feature', exact: true })
    .click()
  await page.getByRole('button', { name: 'Confirm deletion' }).click()
  await page.goto(`${listPath}/cleanup`)
  await expect(page.getByRole('progressbar')).toHaveAttribute(
    'aria-valuenow',
    '50',
  )
  await page.getByRole('link', { name: 'Open task Test the feature' }).click()
  await page.getByRole('button', { name: 'Delete board', exact: true }).click()
  await page.getByRole('button', { name: 'Confirm deletion' }).click()
  await page.goto(`${listPath}/cleanup`)
  await expect(
    page.getByRole('list', { name: 'Milestone work' }).getByRole('listitem'),
  ).toHaveCount(1)
  await page.getByRole('link', { name: 'Open bug Saving fails' }).click()
  await page.getByRole('button', { name: /^Delete bug / }).click()
  await page.getByRole('button', { name: 'Confirm deletion' }).click()
  await page.goto(`${listPath}/cleanup`)
  await expect(page.getByRole('progressbar')).toHaveAttribute(
    'aria-valuetext',
    'No work linked',
  )
  await expect(page.getByRole('alert')).toHaveCount(0)
  const saved = (await stored(page)).projects[0].milestones[0]
  expect(saved.taskIds).toEqual([])
  expect(saved.bugIds).toEqual([])
})

test('filters and sorts date-only milestones and distinguishes today, overdue and completed', async ({
  page,
}) => {
  await page.clock.setFixedTime(new Date('2026-10-09T12:00:00Z'))
  const workspace = createWorkspace()
  workspace.projects[0].milestones = [
    milestone('today', {
      title: 'Today launch',
      targetDate: '2026-10-09',
      status: 'active',
    }),
    milestone('late', { title: 'Late release', targetDate: '2026-10-08' }),
    milestone('complete', {
      title: 'Past launch',
      targetDate: '2026-10-01',
      status: 'completed',
      completedAt: '2026-10-01T12:00:00.000Z',
    }),
    milestone('undated', {
      title: 'Someday release',
      updatedAt: '2026-10-05T12:00:00.000Z',
    }),
  ]
  await seed(page, workspace)
  await page.goto('/milestones')
  const cards = page.locator('.milestone-card')
  await expect(cards).toHaveCount(4)
  await expect(cards.first()).toContainText('Past launch')
  await expect(cards.last()).toContainText('Someday release')
  await expect(cards.filter({ hasText: 'Today launch' })).not.toContainText(
    'Overdue',
  )
  await page
    .getByRole('combobox', { name: 'Filter milestones' })
    .selectOption('overdue')
  await expect(cards).toHaveCount(1)
  await expect(cards).toContainText('Late release')
  await page
    .getByRole('searchbox', { name: 'Search milestones' })
    .fill('missing')
  await expect(
    page.getByRole('heading', { name: 'No checkpoints in this view.' }),
  ).toBeVisible()
  await page.getByRole('button', { name: 'Clear filters' }).click()
  await page
    .getByRole('combobox', { name: 'Sort milestones' })
    .selectOption('updated')
  await expect(cards.first()).toContainText('Someday release')
  await page
    .getByRole('combobox', { name: 'Filter milestones' })
    .selectOption('completed')
  await expect(cards).toHaveCount(1)
  await expect(cards).toContainText('Past launch')
})

test('keeps projects isolated and updates the dashboard and project navigation', async ({
  page,
  isMobile,
}) => {
  const workspace = fixture()
  const second = {
    ...createWorkspace().projects[0],
    id: 'moonbase',
    name: 'Moonbase',
    boards: [createBoard()],
  }
  workspace.projects.push(second)
  await seed(page, workspace)
  await page.goto('/')
  if (isMobile)
    await page.getByRole('button', { name: 'Open navigation' }).click()
  await page
    .getByRole('navigation', { name: 'Main navigation' })
    .getByRole('link', { name: 'Milestones', exact: true })
    .click()
  await expect(
    page.locator('nav[aria-label="Main navigation"] [aria-current="page"]'),
  ).toHaveText('Milestones')
  await create(page, 'DevOrbit goal')
  await page
    .getByRole('button', { name: 'Complete milestone', exact: true })
    .click()
  await page
    .getByRole('combobox', { name: 'Project', exact: true })
    .selectOption('moonbase')
  await expect(
    page.getByRole('heading', {
      name: 'Every launch starts with a destination.',
    }),
  ).toBeVisible()
  await page.getByRole('button', { name: 'New milestone', exact: true }).click()
  await expect(page.getByRole('checkbox', { name: /^Link / })).toHaveCount(0)
  await page.getByLabel('Milestone name', { exact: true }).fill('Moonbase goal')
  await page
    .getByRole('button', { name: 'Create milestone', exact: true })
    .click()
  await page.getByRole('link', { name: 'Kanban board', exact: true }).click()
  await page
    .getByRole('main')
    .getByRole('link', { name: 'Milestones', exact: true })
    .click()
  await expect(page.locator('.milestone-card')).toHaveCount(1)
  await expect(page.locator('.milestone-card')).toContainText('Moonbase goal')
  await page.goto('/')
  await expect(
    page.getByRole('region', { name: 'Milestone summary' }),
  ).toContainText('1 of 2 milestones completed')
})

test('loads older workspaces and round-trips linked milestones in backups', async ({
  page,
}) => {
  const source = fixture()
  const legacy = {
    ...source,
    projects: source.projects.map((project) => ({
      id: project.id,
      name: project.name,
      description: project.description,
      boards: project.boards,
      bugs: project.bugs,
    })),
  }
  await seed(page, legacy)
  await page.goto('/milestones')
  await expect(page.getByRole('alert')).toHaveCount(0)
  await page.getByRole('button', { name: 'New milestone', exact: true }).click()
  await page
    .getByLabel('Milestone name', { exact: true })
    .fill('Backed up goal')
  await page
    .getByRole('checkbox', {
      name: 'Link task: Build the feature',
      exact: true,
    })
    .check()
  await page
    .getByRole('checkbox', { name: 'Link bug: Saving fails', exact: true })
    .check()
  await page
    .getByRole('button', { name: 'Create milestone', exact: true })
    .click()
  await page.getByRole('link', { name: 'All milestones' }).click()
  const downloaded = page.waitForEvent('download')
  await page
    .getByRole('button', { name: 'Export workspace', exact: true })
    .click()
  const path = await (await downloaded).path()
  await create(page, 'Discard on restore')
  await page.getByRole('link', { name: 'All milestones' }).click()
  await page
    .getByRole('button', { name: 'Import workspace', exact: true })
    .click()
  await page.getByLabel('Workspace JSON file').setInputFiles(path!)
  await expect(page.getByRole('dialog')).toContainText('1 milestones found')
  await expect(
    page.getByRole('button', { name: 'Import and replace' }),
  ).toBeDisabled()
  await page
    .getByRole('checkbox', { name: 'Replace my current workspace' })
    .check()
  await page.getByRole('button', { name: 'Import and replace' }).click()
  await expect(page.locator('.milestone-card')).toHaveCount(1)
  await page
    .getByRole('link', { name: 'Open milestone Backed up goal' })
    .click()
  await expect(
    page.getByRole('list', { name: 'Milestone work' }).getByRole('listitem'),
  ).toHaveCount(2)
  const saved = (await stored(page)).projects[0]
  expect(saved.boards).toEqual(source.projects[0].boards)
  expect(saved.bugs).toEqual(source.projects[0].bugs)
})

test('rejects invalid references, duplicate links, dates and inconsistent completion in imports', async ({
  page,
}) => {
  await seed(page, fixture())
  await page.goto('/milestones')
  const original = await stored(page)
  for (const invalid of [
    milestone('bad', { taskIds: ['missing'] }),
    milestone('bad', { taskIds: ['build', 'build'] }),
    milestone('bad', { targetDate: '2026-02-30' }),
    milestone('bad', { status: 'completed' }),
    milestone('bad', {
      status: 'completed',
      completedAt: '2026-10-01T12:00:00.000Z',
      taskIds: ['build'],
    }),
    milestone('save-bug'),
  ]) {
    const candidate = fixture()
    candidate.projects[0].milestones = [invalid]
    await page
      .getByRole('button', { name: 'Import workspace', exact: true })
      .click()
    await page.getByLabel('Workspace JSON file').setInputFiles({
      name: 'invalid.json',
      mimeType: 'application/json',
      buffer: Buffer.from(JSON.stringify(candidate)),
    })
    await expect(page.getByRole('alert')).toContainText('not a valid')
    await expect(
      page.getByRole('button', { name: 'Import and replace' }),
    ).toBeDisabled()
    await page.getByRole('button', { name: 'Cancel', exact: true }).click()
  }
  expect(await stored(page)).toEqual(original)
})

test('detects stale milestone editors and synchronizes completion across tabs', async ({
  page,
  context,
}) => {
  const workspace = fixture()
  workspace.projects[0].milestones = [
    milestone('shared', { title: 'Shared goal', taskIds: ['test'] }),
  ]
  await seed(page, workspace)
  await page.goto(`${listPath}/shared`)
  const other = await context.newPage()
  await other.goto(page.url())
  await page
    .getByRole('button', { name: 'Edit milestone', exact: true })
    .click()
  await page.getByLabel('Milestone name', { exact: true }).fill('Stale title')
  await other
    .getByRole('button', { name: 'Complete milestone', exact: true })
    .click()
  await expect(page.locator('.flight-plan-heading')).toContainText('Completed')
  await page
    .getByRole('button', { name: 'Save milestone', exact: true })
    .click()
  await expect(page.getByRole('alert')).toContainText('changed in another tab')
  await page.getByRole('button', { name: 'Cancel', exact: true }).click()
  await page
    .getByRole('button', { name: 'Edit milestone', exact: true })
    .click()
  await page
    .getByRole('checkbox', {
      name: 'Link task: Build the feature',
      exact: true,
    })
    .check()
  await page
    .getByRole('button', { name: 'Save milestone', exact: true })
    .click()
  await expect(other.locator('.flight-plan-heading')).toContainText(
    'In progress',
  )
  await expect(other.getByRole('progressbar')).toHaveAttribute(
    'aria-valuenow',
    '50',
  )
})

test('validates names, supports keyboard dismissal and dark mobile layouts, and handles empty goals', async ({
  page,
}) => {
  await page.addInitScript(() =>
    localStorage.setItem(
      'devorbit.appearance.v1',
      JSON.stringify({ version: 1, mode: 'dark', accent: 'violet' }),
    ),
  )
  await page.goto('/milestones')
  const button = page.getByRole('button', {
    name: 'New milestone',
    exact: true,
  })
  await button.click()
  await page.getByLabel('Milestone name', { exact: true }).fill('   ')
  await page
    .getByRole('button', { name: 'Create milestone', exact: true })
    .click()
  await expect(page.getByRole('alert')).toHaveText(
    'Give your milestone a name.',
  )
  await page.keyboard.press('Escape')
  await expect(button).toBeFocused()
  await page.setViewportSize({ width: 360, height: 800 })
  await create(page, 'A'.repeat(120))
  await expect(page.getByRole('progressbar')).toHaveAttribute(
    'aria-valuenow',
    '0',
  )
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBeTruthy()
  await expect(page.locator('.milestone-flight-plan')).toHaveCSS(
    'background-color',
    'rgb(27, 32, 38)',
  )
  await page
    .getByRole('button', { name: 'Complete milestone', exact: true })
    .click()
  await page
    .getByRole('button', { name: 'Reopen milestone', exact: true })
    .click()
  await expect(page.locator('.flight-plan-heading')).toContainText(
    'In progress',
  )
  await page.getByRole('link', { name: 'All milestones' }).click()
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBeTruthy()
})

test('enforces milestone limits and keeps unsaved data exportable when storage fails', async ({
  page,
}) => {
  const workspace = createWorkspace()
  workspace.projects[0].milestones = Array.from({ length: 100 }, (_, index) =>
    milestone(`goal-${index}`),
  )
  await seed(page, workspace)
  await page.goto('/milestones')
  await expect(
    page.getByRole('button', { name: 'New milestone', exact: true }),
  ).toBeDisabled()
  await expect(page.locator('.form-warning')).toContainText('100 milestones')
  await page.goto('/projects/missing/milestones')
  await expect(
    page.getByRole('heading', { name: 'This project has left orbit.' }),
  ).toBeVisible()
  await page.evaluate(
    (key) =>
      localStorage.setItem(
        key,
        JSON.stringify({
          version: 1,
          projects: JSON.parse(localStorage.getItem(key)!).projects.map(
            (project: { milestones: unknown[] }) => ({
              ...project,
              milestones: [],
            }),
          ),
        }),
      ),
    key,
  )
  await page.goto('/milestones')
  await page.evaluate(() => {
    Storage.prototype.setItem = () => {
      throw new DOMException('Full', 'QuotaExceededError')
    }
  })
  await create(page, 'In memory')
  await expect(page.getByRole('alert')).toContainText('only in memory')
  await page.getByRole('link', { name: 'All milestones' }).click()
  const download = page.waitForEvent('download')
  await page
    .getByRole('button', { name: 'Export workspace', exact: true })
    .click()
  expect(await (await download).path()).toBeTruthy()
  await page.reload()
  await page.evaluate((key) => localStorage.setItem(key, '{broken'), key)
  await page.reload()
  await expect(
    page.getByRole('button', { name: 'New milestone', exact: true }),
  ).toBeDisabled()
  await expect(page.getByRole('alert')).toContainText(
    'has not been overwritten',
  )
})
