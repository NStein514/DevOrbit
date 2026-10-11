import { expect, test, type Page } from '@playwright/test'
import { readFile } from 'node:fs/promises'
import { changelogEntry, changelogFixture } from './changelog.fixture.ts'
import { createBoard, type Workspace } from '../src/features/workspace/model.ts'
const key = 'devorbit.workspace.v1',
  path = '/projects/devorbit/changelog'
async function seed(page: Page, workspace = changelogFixture()) {
  await page.addInitScript(
    ({ key, workspace }) => {
      if (!localStorage.getItem(key))
        localStorage.setItem(key, JSON.stringify(workspace))
    },
    { key, workspace },
  )
}
async function stored(page: Page): Promise<Workspace> {
  return page.evaluate((key) => JSON.parse(localStorage.getItem(key)!), key)
}
async function metadata(page: Page, version = 'v1.0.0') {
  await page
    .getByRole('button', { name: 'Generate changelog', exact: true })
    .click()
  await page.getByLabel('Release name', { exact: true }).fill('First launch')
  await page.getByLabel('Version', { exact: true }).fill(version)
  await page.getByLabel('Release date', { exact: true }).fill('2026-10-10')
}
async function generate(page: Page, version = 'v1.0.0') {
  await metadata(page, version)
  await page.getByRole('button', { name: 'Select shown', exact: true }).click()
  await page
    .getByRole('button', { name: 'Generate draft', exact: true })
    .click()
  await expect(
    page.getByRole('heading', { name: 'First launch', exact: true }),
  ).toBeVisible()
}
async function release(page: Page) {
  await page
    .getByRole('button', { name: 'Mark as released', exact: true })
    .click()
  await page
    .getByRole('button', { name: 'Confirm release', exact: true })
    .click()
  await expect(
    page.getByRole('button', { name: 'Return to draft', exact: true }),
  ).toBeVisible()
}
async function download(page: Page, name: string) {
  const promise = page.waitForEvent('download')
  await page.getByRole('button', { name, exact: true }).click()
  const file = await promise
  return {
    name: file.suggestedFilename(),
    text: await readFile((await file.path())!, 'utf8'),
  }
}
async function publishStorage(page: Page, data: Workspace) {
  await page.evaluate(
    ({ key, data }) => localStorage.setItem(key, JSON.stringify(data)),
    { key, data },
  )
}
test('generates scoped grouped notes, edits and previews Markdown, records releases and exports', async ({
  page,
}) => {
  await seed(page)
  await page.goto('/changelog')
  await metadata(page)
  await expect(page.getByLabel('Include task: Not ready')).toHaveCount(0)
  await page.getByLabel('Work scope', { exact: true }).selectOption('beta')
  await expect(
    page.getByLabel('Include task: Polish mobile navigation'),
  ).toHaveCount(0)
  await page.getByRole('button', { name: 'Select shown', exact: true }).click()
  await page.getByLabel('Category for Add offline drafts').selectOption('Added')
  await page
    .getByRole('button', { name: 'Generate draft', exact: true })
    .click()
  const notes = page.locator('.changelog-markdown')
  await expect(
    notes.getByRole('heading', { name: 'Added', exact: true }),
  ).toBeVisible()
  await expect(
    notes.getByRole('heading', { name: 'Fixed', exact: true }),
  ).toBeVisible()
  await expect(
    notes.getByRole('link', { name: '#42', exact: true }),
  ).toHaveAttribute('href', 'https://github.com/octocat/orbit/issues/42')
  await expect(notes).not.toContainText('Internal details')
  await page
    .getByRole('button', { name: 'Edit changelog', exact: true })
    .click()
  await page
    .getByLabel('Release notes', { exact: true })
    .fill(
      '### Highlights\n\n- **Ready for launch**\n\n| Feature | Status |\n| --- | --- |\n| Drafts | Ready |',
    )
  await page.getByRole('button', { name: 'Show preview', exact: true }).click()
  await expect(
    page.getByRole('region', { name: 'Draft preview' }).getByRole('table'),
  ).toBeVisible()
  await page
    .getByRole('button', { name: 'Save changelog', exact: true })
    .click()
  await page.evaluate(() =>
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: {
        writeText: (text: string) => {
          sessionStorage.setItem('copied', text)
          return Promise.resolve()
        },
      },
    }),
  )
  await page.getByRole('button', { name: 'Copy Markdown', exact: true }).click()
  await expect(
    page.getByText('Markdown copied.', { exact: true }),
  ).toBeVisible()
  expect(await page.evaluate(() => sessionStorage.getItem('copied'))).toContain(
    'Ready for launch',
  )
  await release(page)
  await page.reload()
  await expect(
    page.getByRole('button', { name: 'Edit changelog', exact: true }),
  ).toHaveCount(0)
  const single = await download(page, 'Download Markdown')
  expect(single.name).toBe('changelog-v1.0.0.md')
  expect(single.text).toContain('Ready for launch')
  await page.getByRole('link', { name: 'All changelogs', exact: true }).click()
  const combined = await download(page, 'Export released notes')
  expect(combined.name).toBe('CHANGELOG.md')
  expect(combined.text).toContain('## v1\\.0\\.0')
  await page.goto('/')
  await expect(
    page.getByRole('region', { name: 'Changelog summary' }),
  ).toContainText('1 releases recorded')
})
test('excludes released work, preserves searched selections, supports explicit reuse and handwritten drafts', async ({
  page,
}) => {
  await seed(page)
  await page.goto(path)
  await generate(page)
  await release(page)
  await page.getByRole('link', { name: 'All changelogs', exact: true }).click()
  await metadata(page, 'v2')
  await expect(
    page.getByRole('region', { name: 'Completed work' }),
  ).toContainText('No eligible work')
  await page.getByLabel('Include previously released work').check()
  await page.getByLabel('Search completed work').fill('offline')
  await page.getByRole('button', { name: 'Select shown', exact: true }).click()
  await page.getByLabel('Search completed work').fill('crash')
  await expect(
    page.getByText('1 selected · 1 shown', { exact: true }),
  ).toBeVisible()
  await page
    .getByRole('button', { name: 'Generate draft', exact: true })
    .click()
  expect((await stored(page)).projects[0].changelogs[1].sources).toHaveLength(1)
  await page.getByRole('link', { name: 'All changelogs', exact: true }).click()
  await metadata(page, 'v3')
  await page
    .getByRole('button', { name: 'Create empty draft', exact: true })
    .click()
  await expect(
    page.getByRole('button', { name: 'Mark as released', exact: true }),
  ).toBeDisabled()
  await page
    .getByRole('button', { name: 'Write release notes', exact: true })
    .click()
  await page
    .getByLabel('Release notes', { exact: true })
    .fill('A handwritten release.')
  await page
    .getByRole('button', { name: 'Save changelog', exact: true })
    .click()
  await release(page)
  await page
    .getByRole('button', { name: 'Return to draft', exact: true })
    .click()
  await page
    .getByRole('button', { name: 'Confirm return to draft', exact: true })
    .click()
  await expect(
    page.getByRole('button', { name: 'Edit changelog', exact: true }),
  ).toBeVisible()
})
test('validates versions and empty names and prevents stale cross-tab edits and confirmations', async ({
  page,
  context,
}) => {
  await seed(page)
  await page.goto(path)
  await generate(page)
  const other = await context.newPage()
  await other.goto(page.url())
  await page
    .getByRole('button', { name: 'Edit changelog', exact: true })
    .click()
  await other
    .getByRole('button', { name: 'Edit changelog', exact: true })
    .click()
  await other.getByLabel('Release name', { exact: true }).fill('New title')
  await other
    .getByRole('button', { name: 'Save changelog', exact: true })
    .click()
  await page.getByLabel('Release notes', { exact: true }).fill('Stale edit')
  await page
    .getByRole('button', { name: 'Save changelog', exact: true })
    .click()
  await expect(page.getByRole('dialog').getByRole('alert')).toContainText(
    'another tab',
  )
  await page.keyboard.press('Escape')
  await expect(
    page.getByRole('heading', { name: 'New title', exact: true }),
  ).toBeVisible()
  await page
    .getByRole('button', { name: 'Mark as released', exact: true })
    .click()
  await other
    .getByRole('button', { name: 'Edit changelog', exact: true })
    .click()
  await other.getByLabel('Release notes', { exact: true }).fill('Current notes')
  await other
    .getByRole('button', { name: 'Save changelog', exact: true })
    .click()
  await page
    .getByRole('button', { name: 'Confirm release', exact: true })
    .click()
  await expect(page.getByRole('dialog').getByRole('alert')).toContainText(
    'another tab',
  )
  await page.keyboard.press('Escape')
  await page.getByRole('link', { name: 'All changelogs', exact: true }).click()
  await metadata(page, ' V1.0.0 ')
  await page
    .getByRole('button', { name: 'Create empty draft', exact: true })
    .click()
  await expect(page.getByRole('dialog').getByRole('alert')).toContainText(
    'already has',
  )
  await page.getByLabel('Version', { exact: true }).fill('v2')
  await page.getByLabel('Release name', { exact: true }).fill('   ')
  await page
    .getByRole('button', { name: 'Create empty draft', exact: true })
    .click()
  await expect(page.getByRole('dialog').getByRole('alert')).toContainText(
    'Check the name',
  )
})
test('rejects reopened selections, preserves historical sources after deletion and deletes only a changelog', async ({
  page,
  context,
}) => {
  await seed(page)
  await page.goto(path)
  await metadata(page)
  await page.getByRole('button', { name: 'Select shown', exact: true }).click()
  const other = await context.newPage()
  await other.goto(path)
  let data = await stored(other)
  data.projects[0].boards[0].columns[2].completed = false
  data.projects[0].milestones = []
  await publishStorage(other, data)
  await page
    .getByRole('button', { name: 'Generate draft', exact: true })
    .click()
  await expect(page.getByRole('dialog').getByRole('alert')).toContainText(
    'reopened or removed',
  )
  await page.keyboard.press('Escape')
  data = await stored(other)
  data.projects[0].boards[0].columns[2].completed = true
  await publishStorage(other, data)
  await generate(page)
  await release(page)
  const detail = page.url(),
    before = (await stored(page)).projects[0].changelogs[0].notes
  data = await stored(other)
  data.projects[0].bugs = []
  data.projects[0].boards[0].columns[2].tasks = []
  data.projects[0].boards[1].columns[2].completed = false
  await publishStorage(other, data)
  await expect(
    page.getByText('Task snapshot · Source removed', { exact: true }),
  ).toBeVisible()
  await expect(
    page.getByText('Bug snapshot · Source removed', { exact: true }),
  ).toBeVisible()
  expect((await stored(page)).projects[0].changelogs[0].notes).toBe(before)
  await page
    .getByRole('button', { name: 'Delete changelog v1.0.0', exact: true })
    .click()
  await page
    .getByRole('button', { name: 'Confirm deletion', exact: true })
    .click()
  data = await stored(page)
  expect(data.projects[0].changelogs).toHaveLength(0)
  expect(data.projects[0].boards[1].columns[2].tasks).toHaveLength(1)
  await page.goto(detail)
  await expect(
    page.getByRole('heading', { name: 'This changelog has left orbit.' }),
  ).toBeVisible()
})
test('filters, sorts and isolates project histories', async ({ page }) => {
  const data = changelogFixture()
  data.projects[0].changelogs = [
    changelogEntry('old', { releaseDate: '2026-09-01' }),
    changelogEntry('new', {
      status: 'released',
      releasedAt: '2026-10-10T00:00:00Z',
    }),
    changelogEntry('recent', {
      releaseDate: '2026-08-01',
      updatedAt: '2026-10-11T00:00:00Z',
      notes: 'Searchable words',
    }),
  ]
  data.projects.push({
    id: 'other',
    name: 'Other project',
    description: '',
    boards: [createBoard()],
    bugs: [],
    milestones: [],
    changelogs: [],
  })
  await seed(page, data)
  await page.goto(path)
  const list = page.getByRole('list', { name: 'Changelogs', exact: true })
  await expect(list.locator('li').first()).toContainText('new')
  await page.getByLabel('Sort changelogs').selectOption('updated')
  await expect(list.locator('li').first()).toContainText('recent')
  await page.getByLabel('Filter changelogs').selectOption('released')
  await expect(list.locator('li')).toHaveCount(1)
  await page.getByLabel('Search changelogs').fill('absent')
  await expect(
    page.getByRole('heading', { name: 'No releases in this view.' }),
  ).toBeVisible()
  await page.getByRole('button', { name: 'Clear filters', exact: true }).click()
  await page.getByLabel('Search changelogs').fill('Searchable')
  await expect(list.locator('li')).toHaveCount(1)
  await page.getByLabel('Project', { exact: true }).selectOption('other')
  await expect(
    page.getByRole('heading', {
      name: 'Every little launch deserves a story.',
    }),
  ).toBeVisible()
  await metadata(page, 'other-version')
  await page
    .getByRole('button', { name: 'Create empty draft', exact: true })
    .click()
  await expect(
    page.getByRole('heading', { name: 'First launch', exact: true }),
  ).toBeVisible()
  expect((await stored(page)).projects[0].changelogs).toHaveLength(3)
})
test('round-trips backups, loads legacy workspaces and rejects malformed released entries', async ({
  page,
}) => {
  const legacy = JSON.parse(JSON.stringify(changelogFixture()))
  delete legacy.projects[0].changelogs
  await seed(page, legacy)
  await page.goto(path)
  await generate(page)
  await page.getByRole('link', { name: 'All changelogs', exact: true }).click()
  const backup = await download(page, 'Export workspace')
  expect(JSON.parse(backup.text).projects[0].changelogs).toHaveLength(1)
  await metadata(page, 'v2')
  await page
    .getByRole('button', { name: 'Create empty draft', exact: true })
    .click()
  await page.getByRole('link', { name: 'All changelogs', exact: true }).click()
  await page
    .getByRole('button', { name: 'Import workspace', exact: true })
    .click()
  const invalid = JSON.parse(backup.text)
  invalid.projects[0].changelogs[0].status = 'released'
  await page.getByLabel('Workspace JSON file').setInputFiles({
    name: 'invalid.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(invalid)),
  })
  await expect(page.getByRole('dialog').getByRole('alert')).toBeVisible()
  expect((await stored(page)).projects[0].changelogs).toHaveLength(2)
  await page.getByLabel('Workspace JSON file').setInputFiles({
    name: 'backup.json',
    mimeType: 'application/json',
    buffer: Buffer.from(backup.text),
  })
  await expect(page.getByRole('dialog')).toContainText('1 changelogs found')
  await page.getByRole('dialog').getByRole('checkbox').check()
  await page
    .getByRole('button', { name: 'Import and replace', exact: true })
    .click()
  await expect(
    page.getByRole('list', { name: 'Changelogs', exact: true }).locator('li'),
  ).toHaveCount(1)
})
test('renders Markdown safely and supports clipboard errors, keyboard controls and narrow dark layouts', async ({
  page,
}) => {
  const data = changelogFixture()
  data.projects[0].changelogs = [
    changelogEntry('safe', {
      notes:
        '### Safe preview\n\n<script>window.bad=true</script>\n\n[Unsafe](javascript:alert(1))\n\n![Remote](https://example.com/tracker.png)\n\n[Safe](https://github.com)\n\n' +
        'word'.repeat(100),
    }),
  ]
  const requests: string[] = []
  page.on('request', (request) => {
    if (request.url().includes('tracker.png')) requests.push(request.url())
  })
  await seed(page, data)
  await page.addInitScript(() =>
    localStorage.setItem(
      'devorbit.appearance.v1',
      JSON.stringify({ version: 1, mode: 'dark', accent: 'violet' }),
    ),
  )
  await page.setViewportSize({ width: 360, height: 800 })
  await page.goto(`${path}/safe`)
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
  await expect(
    page.getByRole('link', { name: 'Unsafe', exact: true }),
  ).toHaveCount(0)
  await expect(page.locator('.changelog-markdown img')).toHaveCount(0)
  await expect(page.locator('.changelog-markdown script')).toHaveCount(0)
  expect(requests).toHaveLength(0)
  await expect(
    page.getByRole('link', { name: 'Safe', exact: true }),
  ).toHaveAttribute('rel', 'noreferrer')
  await page.evaluate(() =>
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText: () => Promise.reject(new Error('Denied')) },
    }),
  )
  await page.getByRole('button', { name: 'Copy Markdown', exact: true }).click()
  await expect(
    page.getByText(
      'Clipboard access is unavailable. Use Download Markdown instead.',
      { exact: true },
    ),
  ).toBeVisible()
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true)
  const trigger = page.getByRole('button', {
    name: 'Edit changelog',
    exact: true,
  })
  await trigger.click()
  await page.keyboard.press('Escape')
  await expect(trigger).toBeFocused()
  await page.getByRole('link', { name: 'All changelogs', exact: true }).click()
  await metadata(page, 'mobile')
  await page.getByRole('button', { name: 'Select shown', exact: true }).click()
  expect(
    await page
      .getByRole('dialog')
      .evaluate((el) => el.scrollWidth <= el.clientWidth),
  ).toBe(true)
  await page.keyboard.press('Escape')
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true)
})
test('enforces history limits, preserves memory-only exports and blocks corrupt storage with URL recovery', async ({
  page,
}) => {
  const data = changelogFixture()
  data.projects[0].changelogs = Array.from({ length: 100 }, (_, i) =>
    changelogEntry(`v${i}`),
  )
  await seed(page, data)
  await page.goto(path)
  await expect(
    page.getByRole('button', { name: 'Generate changelog', exact: true }),
  ).toBeDisabled()
  await page.goto('/projects/missing/changelog')
  await expect(
    page.getByRole('heading', { name: 'This project has left orbit.' }),
  ).toBeVisible()
  await publishStorage(page, changelogFixture())
  await page.goto(path)
  await page.evaluate(() => {
    Storage.prototype.setItem = () => {
      throw new DOMException('Full', 'QuotaExceededError')
    }
  })
  await generate(page)
  await expect(page.getByRole('alert')).toContainText('only in memory')
  await page.getByRole('link', { name: 'All changelogs', exact: true }).click()
  const backup = await download(page, 'Export workspace')
  expect(JSON.parse(backup.text).projects[0].changelogs).toHaveLength(1)
  await page.reload()
  await page.evaluate((key) => localStorage.setItem(key, '{broken'), key)
  await page.reload()
  await expect(page.getByRole('alert')).toContainText(
    'has not been overwritten',
  )
  await expect(
    page.getByRole('button', { name: 'Generate changelog', exact: true }),
  ).toBeDisabled()
  expect(await page.evaluate((key) => localStorage.getItem(key), key)).toBe(
    '{broken',
  )
})
