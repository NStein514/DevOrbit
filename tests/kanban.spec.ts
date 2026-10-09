import { expect, test, type Page } from '@playwright/test'

const storageKey = 'devorbit.workspace.v1'
const boardUrl = '/projects/devorbit/boards/devorbit-board'
const column = (page: Page, name: string) =>
  page.getByRole('region', { name: `${name} column`, exact: true })
async function createTask(page: Page, title: string) {
  await page.getByRole('button', { name: 'New task', exact: true }).click()
  await page.getByRole('textbox', { name: 'Title', exact: true }).fill(title)
  await page.getByRole('button', { name: 'Create task', exact: true }).click()
  await expect(page.getByRole('dialog')).not.toBeVisible()
}

test.beforeEach(async ({ page }) => {
  await page.goto('/boards')
})

test('creates, edits, moves, duplicates and deletes tasks, with persistence', async ({
  page,
}) => {
  await createTask(page, 'Ship the board')
  await column(page, 'Backlog')
    .getByRole('button', { name: 'Edit task Ship the board', exact: true })
    .click()
  await page
    .getByRole('textbox', { name: 'Description', exact: true })
    .fill('Keyboard support and responsive layout')
  await page
    .getByRole('combobox', { name: 'Priority', exact: true })
    .selectOption('high')
  await page.getByLabel('Due date', { exact: true }).fill('2027-05-20')
  await page
    .getByRole('textbox', { name: 'Labels', exact: true })
    .fill('release, frontend, release')
  await page
    .getByRole('combobox', { name: 'Column', exact: true })
    .selectOption({ label: 'In progress' })
  await page.getByRole('button', { name: 'Save task', exact: true }).click()
  await expect(column(page, 'In progress').getByRole('article')).toHaveCount(1)
  await page.reload()
  const task = column(page, 'In progress').getByRole('article')
  await expect(task).toContainText('Keyboard support')
  await expect(task).toContainText('high')
  await expect(task.locator('time')).toHaveAttribute('datetime', '2027-05-20')
  await expect(task.locator('.task-labels > span')).toHaveCount(2)
  await task
    .getByRole('button', { name: 'Duplicate task Ship the board', exact: true })
    .click()
  await expect(column(page, 'In progress').getByRole('article')).toHaveCount(2)
  await page
    .getByRole('button', {
      name: 'Delete task Ship the board (copy)',
      exact: true,
    })
    .click()
  await page.getByRole('button', { name: 'Cancel', exact: true }).click()
  await expect(column(page, 'In progress').getByRole('article')).toHaveCount(2)
  await page
    .getByRole('button', {
      name: 'Delete task Ship the board (copy)',
      exact: true,
    })
    .click()
  await page.getByRole('button', { name: 'Confirm deletion' }).click()
  await expect(column(page, 'In progress').getByRole('article')).toHaveCount(1)
  await page.reload()
  await expect(page.getByRole('article')).toHaveCount(1)
})

test('customizes column color, position, completion and work limits, then migrates tasks on deletion', async ({
  page,
}) => {
  await page.getByRole('button', { name: 'Add column', exact: true }).click()
  await page.getByRole('textbox', { name: 'Column name' }).fill('Released')
  await page.getByRole('radio', { name: 'blue', exact: true }).check()
  await page
    .getByRole('spinbutton', { name: 'Position', exact: true })
    .fill('1')
  await page
    .getByRole('spinbutton', { name: 'Work-in-progress limit' })
    .fill('1')
  await page.getByRole('checkbox').check()
  await page.getByRole('button', { name: 'Create column' }).click()
  await createTask(page, 'First launch')
  await createTask(page, 'Second launch')
  await expect(column(page, 'Released')).toHaveClass(/color-blue/)
  await expect(column(page, 'Released')).toContainText(
    'Work-in-progress limit exceeded',
  )
  await expect(page.locator('.board-progress')).toHaveText('2 / 2 completed')
  await page.reload()
  await expect(page.locator('.board-column').first()).toHaveAttribute(
    'aria-label',
    'Released column',
  )
  await page.getByRole('button', { name: 'Edit column Released' }).click()
  await page.getByRole('textbox', { name: 'Column name' }).fill('Shipped')
  await page.getByRole('button', { name: 'Save column' }).click()
  await page.getByRole('button', { name: 'Delete column Shipped' }).click()
  await page
    .getByRole('combobox', { name: 'Move 2 tasks to' })
    .selectOption({ label: 'Backlog' })
  await page.getByRole('button', { name: 'Confirm deletion' }).click()
  await expect(column(page, 'Shipped')).toHaveCount(0)
  await expect(column(page, 'Backlog').getByRole('article')).toHaveCount(2)
  await expect(page.locator('.board-progress')).toHaveText('0 / 2 completed')
})

test('isolates projects and boards and supports renaming and deletion', async ({
  page,
}) => {
  await createTask(page, 'Original project task')
  await page.getByRole('button', { name: 'New board', exact: true }).click()
  await page
    .getByRole('textbox', { name: 'Name', exact: true })
    .fill('Release planning')
  await page.getByRole('button', { name: 'Save board' }).click()
  await expect(
    page.getByRole('heading', { name: 'Release planning.' }),
  ).toBeVisible()
  await expect(page.getByRole('article')).toHaveCount(0)
  await page.getByRole('button', { name: 'Board settings' }).click()
  await page
    .getByRole('textbox', { name: 'Name', exact: true })
    .fill('Launch checklist')
  await page.getByRole('button', { name: 'Save board' }).click()
  await page.getByRole('button', { name: 'New project', exact: true }).click()
  await page
    .getByRole('textbox', { name: 'Name', exact: true })
    .fill('My own project')
  await page.getByRole('button', { name: 'Save project' }).click()
  await createTask(page, 'Independent task')
  await page.reload()
  await expect(
    page.getByRole('combobox', { name: 'Project', exact: true }),
  ).toHaveValue(/.+/)
  await expect(
    page.getByRole('button', { name: 'Edit task Original project task' }),
  ).toHaveCount(0)
  await page
    .getByRole('combobox', { name: 'Project', exact: true })
    .selectOption({ label: 'DevOrbit' })
  await expect(
    page.getByRole('button', { name: 'Edit task Original project task' }),
  ).toBeVisible()
  await page
    .getByRole('navigation', { name: 'Project boards' })
    .getByRole('link', { name: 'Launch checklist' })
    .click()
  await page.getByRole('button', { name: 'Delete board', exact: true }).click()
  await page.getByRole('button', { name: 'Confirm deletion' }).click()
  await expect(
    page.getByRole('heading', { name: 'My workflow.' }),
  ).toBeVisible()
  await expect(
    page.getByRole('button', { name: 'Delete board', exact: true }),
  ).toBeDisabled()
})

test('combines filters without losing hidden tasks or their order', async ({
  page,
}) => {
  await createTask(page, 'Alpha')
  await createTask(page, 'Beta')
  await page
    .getByRole('button', { name: 'Edit task Beta', exact: true })
    .click()
  await page
    .getByRole('combobox', { name: 'Priority', exact: true })
    .selectOption('urgent')
  await page
    .getByRole('textbox', { name: 'Labels', exact: true })
    .fill('release')
  await page.getByRole('button', { name: 'Save task' }).click()
  await page.getByRole('searchbox', { name: 'Search tasks' }).fill('BETA')
  await page
    .getByRole('combobox', { name: 'Filter by priority' })
    .selectOption('urgent')
  await page
    .getByRole('combobox', { name: 'Filter by label' })
    .selectOption('release')
  await expect(page.getByRole('article')).toHaveCount(1)
  await expect(
    page.getByRole('button', { name: 'Drag task Beta', exact: true }),
  ).toBeDisabled()
  await page
    .getByRole('combobox', { name: 'Filter by priority' })
    .selectOption('low')
  await expect(page.getByRole('article')).toHaveCount(0)
  await page.getByRole('button', { name: 'Clear filters' }).click()
  await expect(page.getByRole('article')).toHaveCount(2)
  await expect(page.getByRole('article').first()).toHaveAttribute(
    'aria-label',
    'Task: Alpha',
  )
  await page.reload()
  await expect(page.getByRole('article')).toHaveCount(2)
})

test('supports keyboard task and column reordering', async ({ page }) => {
  await createTask(page, 'Alpha')
  await createTask(page, 'Beta')
  const taskHandle = page.getByRole('button', {
    name: 'Drag task Alpha',
    exact: true,
  })
  await taskHandle.focus()
  await page.keyboard.press('Space')
  await expect(taskHandle).toHaveAttribute('aria-pressed', 'true')
  await page.keyboard.press('ArrowDown')
  await expect(page.locator('[id^="DndLiveRegion"]')).toHaveText(
    'Moving over Beta.',
  )
  await page.keyboard.press('Space')
  await expect(
    column(page, 'Backlog').getByRole('article').first(),
  ).toHaveAttribute('aria-label', 'Task: Beta')
  await page
    .getByRole('button', { name: 'Drag column Backlog', exact: true })
    .focus()
  await page.keyboard.press('Space')
  await expect(
    page.getByRole('button', { name: 'Drag column Backlog', exact: true }),
  ).toHaveAttribute('aria-pressed', 'true')
  await page.keyboard.press('ArrowRight')
  await expect(page.locator('[id^="DndLiveRegion"]')).toHaveText(
    'Moving over In progress.',
  )
  await page.keyboard.press('Space')
  await expect(page.locator('.board-column').first()).toHaveAttribute(
    'aria-label',
    'In progress column',
  )
  await page.reload()
  await expect(page.locator('.board-column').first()).toHaveAttribute(
    'aria-label',
    'In progress column',
  )
})

test('moves tasks across columns by pointer drag', async ({ page }) => {
  await createTask(page, 'Move me')
  const source = page.getByRole('button', {
    name: 'Drag task Move me',
    exact: true,
  })
  await source.scrollIntoViewIfNeeded()
  const from = await source.boundingBox()
  const target = column(page, 'In progress').locator('.column-tasks')
  // Keep both columns in the scroll viewport for mouse-driven testing, also in mobile emulation.
  await page.setViewportSize({ width: 1440, height: 1000 })
  const freshFrom = await source.boundingBox()
  const to = await target.boundingBox()
  expect(from && freshFrom && to).toBeTruthy()
  await page.mouse.move(
    freshFrom!.x + freshFrom!.width / 2,
    freshFrom!.y + freshFrom!.height / 2,
  )
  await page.mouse.down()
  await page.mouse.move(freshFrom!.x + 15, freshFrom!.y + 15, { steps: 5 })
  await page.mouse.move(to!.x + to!.width / 2, to!.y + 60, { steps: 20 })
  await page.mouse.up()
  await expect(column(page, 'In progress').getByRole('article')).toHaveCount(1)
  await expect(column(page, 'Backlog').getByRole('article')).toHaveCount(0)
  await page.reload()
  await expect(column(page, 'In progress').getByRole('article')).toHaveCount(1)
})

test('exports and restores backups, rejects invalid imports without data loss', async ({
  page,
}) => {
  await createTask(page, 'Keep this task')
  const downloaded = page.waitForEvent('download')
  await page
    .getByRole('button', { name: 'Export workspace', exact: true })
    .click()
  const file = await downloaded
  const path = await file.path()
  expect(path).toBeTruthy()
  await page
    .getByRole('button', { name: 'Import workspace', exact: true })
    .click()
  await page.getByLabel('Workspace JSON file').setInputFiles({
    name: 'bad.json',
    mimeType: 'application/json',
    buffer: Buffer.from('{"version":999}'),
  })
  await expect(page.getByRole('alert')).toContainText('not a valid')
  await expect(
    page.getByRole('button', { name: 'Import and replace' }),
  ).toBeDisabled()
  await page.getByRole('button', { name: 'Cancel', exact: true }).click()
  await createTask(page, 'Remove on restore')
  await page
    .getByRole('button', { name: 'Import workspace', exact: true })
    .click()
  await page.getByLabel('Workspace JSON file').setInputFiles(path!)
  await expect(
    page.getByRole('button', { name: 'Import and replace' }),
  ).toBeDisabled()
  await page
    .getByRole('checkbox', { name: 'Replace my current workspace' })
    .check()
  await page.getByRole('button', { name: 'Import and replace' }).click()
  await expect(page.getByRole('article')).toHaveCount(1)
  await expect(page.getByRole('article')).toContainText('Keep this task')
  await page.reload()
  await expect(page.getByRole('article')).toHaveCount(1)
})

test('preserves unreadable storage and only resets after confirmation', async ({
  page,
}) => {
  await page.evaluate((key) => localStorage.setItem(key, '{broken'), storageKey)
  await page.reload()
  await expect(page.getByRole('alert')).toContainText(
    'has not been overwritten',
  )
  await expect(
    page.getByRole('button', { name: 'New task', exact: true }),
  ).toBeDisabled()
  expect(
    await page.evaluate((key) => localStorage.getItem(key), storageKey),
  ).toBe('{broken')
  await page
    .getByRole('button', { name: 'Reset workspace', exact: true })
    .click()
  await page.getByRole('button', { name: 'Cancel', exact: true }).click()
  expect(
    await page.evaluate((key) => localStorage.getItem(key), storageKey),
  ).toBe('{broken')
  await page
    .getByRole('button', { name: 'Reset workspace', exact: true })
    .click()
  await page.getByRole('button', { name: 'Confirm deletion' }).click()
  await expect(page.getByRole('alert')).toHaveCount(0)
  await createTask(page, 'Recovered')
  await page.reload()
  await expect(page.getByRole('article')).toContainText('Recovered')
})

test('keeps unsaved work usable and exportable if browser storage fails', async ({
  page,
}) => {
  await page.evaluate(() => {
    Storage.prototype.setItem = () => {
      throw new DOMException('Quota exceeded', 'QuotaExceededError')
    }
  })
  await createTask(page, 'In-memory task')
  await expect(page.getByRole('alert')).toContainText('only in memory')
  await expect(page.getByRole('article')).toContainText('In-memory task')
  const download = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Export unsaved workspace' }).click()
  expect((await download).suggestedFilename()).toContain('devorbit-workspace')
})

test('shares saved work across tabs and updates homepage progress', async ({
  page,
  context,
}) => {
  const other = await context.newPage()
  await other.goto(boardUrl)
  await createTask(page, 'Shared task')
  await expect(other.getByRole('article')).toContainText('Shared task')
  await page
    .getByRole('button', { name: 'Edit task Shared task', exact: true })
    .click()
  await page
    .getByRole('combobox', { name: 'Column', exact: true })
    .selectOption({ label: 'Done' })
  await page.getByRole('button', { name: 'Save task' }).click()
  await page.goto('/')
  await expect(
    page.getByRole('progressbar', { name: 'DevOrbit mission progress' }),
  ).toHaveAttribute('aria-valuenow', '100')
  await expect(other.locator('.board-progress')).toHaveText('1 / 1 completed')
})

test('validates whitespace titles and supports keyboard dialog dismissal and narrow layouts', async ({
  page,
}) => {
  await page.getByRole('button', { name: 'New task', exact: true }).click()
  await page.getByRole('textbox', { name: 'Title', exact: true }).fill('   ')
  await page.getByRole('button', { name: 'Create task' }).click()
  await expect(page.getByRole('alert')).toHaveText('Give your task a title.')
  await page.keyboard.press('Escape')
  await expect(page.getByRole('dialog')).not.toBeVisible()
  await expect(
    page.getByRole('button', { name: 'New task', exact: true }),
  ).toBeFocused()
  await page.setViewportSize({ width: 360, height: 800 })
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBeTruthy()
  await page.getByRole('button', { name: 'Open navigation' }).click()
  await expect(
    page.getByRole('link', { name: 'Kanban boards', exact: true }),
  ).toBeVisible()
})
