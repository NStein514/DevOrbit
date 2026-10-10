import { expect, test, type Page } from '@playwright/test'
import {
  createWorkspace,
  type Workspace,
} from '../src/features/workspace/model.js'
import type { GitHubItem, Repository } from '../shared/github.js'

const errors = new WeakMap<Page, string[]>()
test.beforeEach(async ({ page }) => {
  const messages: string[] = []
  errors.set(page, messages)
  page.on('pageerror', (error) => messages.push(error.message))
  page.on('console', (message) => {
    if (message.type() === 'error') messages.push(message.text())
  })
})
test.afterEach(async ({ page }) => {
  expect(
    (errors.get(page) ?? []).filter(
      (message) => !message.includes('Failed to load resource'),
    ),
  ).toEqual([])
})

const key = 'devorbit.workspace.v1'
const repo: Repository = {
  id: 101,
  owner: 'octocat',
  name: 'orbit',
  description: 'A small space for ideas',
  private: true,
  defaultBranch: 'main',
}
const issue: GitHubItem = {
  id: 201,
  number: 12,
  title: 'Fix the landing sequence',
  body: 'Reproduction steps\nKeep this body as plain text.',
  state: 'open',
  labels: ['bug', 'launch'],
  updatedAt: '2026-10-10T12:00:00Z',
  draft: false,
  merged: false,
}
const second = {
  ...issue,
  id: 202,
  number: 13,
  title: 'Closed flight report',
  state: 'closed' as const,
}
async function seed(page: Page, workspace: Workspace = createWorkspace()) {
  await page.addInitScript(
    ({ key, workspace }) => {
      if (!localStorage.getItem(key))
        localStorage.setItem(key, JSON.stringify(workspace))
    },
    { key, workspace },
  )
}
async function mock(page: Page, connected = true) {
  const state = {
    connected,
    oauth: false,
    repoError: 0,
    itemsError: 0,
    identity: 101,
    issues: [issue, second],
    repos: [repo],
    calls: [] as string[],
  }
  await page.route('**/api/github/**', async (route) => {
    const req = route.request(),
      url = new URL(req.url()),
      path = url.pathname.replace('/api/github', '')
    state.calls.push(path + url.search)
    const send = (data: unknown, status = 200) =>
      route.fulfill({ status, json: data })
    if (path === '/session')
      return send({
        user: state.connected ? { login: 'octocat' } : null,
        oauthAvailable: state.oauth,
      })
    if (path === '/token') {
      expect(req.method()).toBe('POST')
      expect(req.postDataJSON()).toEqual({ token: 'github_pat_browser_test' })
      state.connected = true
      return send({ user: { login: 'octocat' }, oauthAvailable: state.oauth })
    }
    if (path === '/disconnect') {
      state.connected = false
      return send({ user: null, oauthAvailable: state.oauth })
    }
    if (!state.connected)
      return send({ error: 'Connect your GitHub account to continue.' }, 401)
    if (path === '/repositories')
      return send({
        items:
          url.searchParams.get('page') === '2'
            ? [{ ...repo, id: 102, name: 'lunar' }]
            : state.repos,
        nextPage: url.searchParams.get('page') === '2' ? null : 2,
      })
    if (path.endsWith('/issues') || path.endsWith('/pulls')) {
      if (state.itemsError)
        return send(
          { error: 'GitHub rate limit reached. Try again later.' },
          state.itemsError,
        )
      return send({
        items: path.endsWith('/pulls')
          ? [
              {
                ...issue,
                id: 301,
                number: 22,
                title: 'Polish the orbit',
                merged: true,
                state: 'closed',
              },
            ]
          : state.issues,
        nextPage: null,
      })
    }
    if (path.startsWith('/repositories/')) {
      if (state.repoError)
        return send(
          {
            error: 'Repository not found or your account does not have access.',
          },
          state.repoError,
        )
      return send({ ...repo, id: state.identity })
    }
    return send({ error: 'Unknown endpoint' }, 404)
  })
  return state
}
async function link(page: Page) {
  await page.goto('/github')
  await page
    .getByRole('button', { name: 'Link octocat/orbit', exact: true })
    .click()
  await expect(
    page.getByRole('heading', { name: 'Your code in motion' }),
  ).toBeVisible()
}
async function stored(page: Page): Promise<Workspace> {
  return page.evaluate((key) => JSON.parse(localStorage.getItem(key)!), key)
}

test('lists planned Pomodoro and all seven minigames, with keyboard-accessible details', async ({
  page,
}) => {
  await page.goto('/#roadmap')
  await page
    .getByRole('button', { name: /Customizable Pomodoro Timer/ })
    .click()
  await expect(page.getByRole('dialog')).toContainText(
    'fully customizable focus timer',
  )
  await page.keyboard.press('Escape')
  const trigger = page.getByRole('button', { name: /Gamification/ })
  await trigger.click()
  for (const name of [
    'Asteroid Escape',
    'Lunar Landing',
    'Orbit Architect',
    'Gravity Golf',
    'Cosmic Cleanup',
    'Planet Pop',
    'Solar Surfer',
  ])
    await expect(page.getByRole('dialog')).toContainText(name)
  await expect(page.getByRole('dialog')).toContainText('planned')
  await page.keyboard.press('Escape')
  await expect(trigger).toBeFocused()
  await expect(
    page.getByRole('button', { name: /GitHub integration/ }),
  ).toHaveCount(0)
})
test('connects using a token without storing credentials, browses and links repositories, then disconnects', async ({
  page,
}) => {
  await seed(page)
  await mock(page, false)
  await page.goto('/github')
  await expect(
    page.getByRole('button', { name: 'Connect with GitHub', exact: true }),
  ).toBeDisabled()
  await page
    .getByLabel('GitHub token', { exact: true })
    .fill('github_pat_browser_test')
  await page.getByRole('button', { name: 'Connect token', exact: true }).click()
  await expect(
    page.getByRole('heading', { name: 'Connected as octocat' }),
  ).toBeVisible()
  await page
    .getByRole('searchbox', { name: 'Search repositories on this page' })
    .fill('missing')
  await expect(
    page.getByText('No repositories match on this page.'),
  ).toBeVisible()
  await page
    .getByRole('searchbox', { name: 'Search repositories on this page' })
    .fill('')
  await page.getByRole('button', { name: 'Next repositories' }).click()
  await expect(
    page.getByRole('heading', { name: 'octocat/lunar', exact: true }),
  ).toBeVisible()
  await page.getByRole('button', { name: 'Previous repositories' }).click()
  await page
    .getByRole('button', { name: 'Link octocat/orbit', exact: true })
    .click()
  await expect(
    page.getByRole('heading', { name: 'Your code in motion' }),
  ).toBeVisible()
  const raw = await page.evaluate(() => JSON.stringify({ ...localStorage }))
  expect(raw).not.toContain('github_pat')
  expect(raw).not.toContain('token')
  await page
    .getByRole('button', { name: 'Disconnect GitHub', exact: true })
    .click()
  await expect(
    page.getByRole('heading', { name: 'Bring your code into orbit.' }),
  ).toBeVisible()
  expect((await stored(page)).projects[0].githubRepository?.id).toBe(101)
  await expect(
    page.getByRole('heading', { name: 'Your code in motion' }),
  ).toHaveCount(0)
})
test('imports task and bug snapshots once, keeps source links through edits, and retains work after unlink', async ({
  page,
}) => {
  await seed(page)
  await mock(page)
  await link(page)
  await page
    .getByRole('button', { name: 'Import issue #12', exact: true })
    .click()
  await expect(page.getByRole('dialog')).toContainText(
    'Future edits in DevOrbit and GitHub stay independent.',
  )
  await page.getByRole('button', { name: 'Import issue', exact: true }).click()
  await page
    .getByRole('link', { name: 'Open imported task', exact: true })
    .click()
  await page
    .getByRole('button', {
      name: 'Edit task Fix the landing sequence',
      exact: true,
    })
    .click()
  await expect(
    page.getByRole('dialog').getByRole('link', { name: /octocat\/orbit #12/ }),
  ).toHaveAttribute('href', 'https://github.com/octocat/orbit/issues/12')
  await page
    .getByRole('textbox', { name: 'Title', exact: true })
    .fill('My local title')
  await page.getByRole('button', { name: 'Save task', exact: true }).click()
  await page.goto('/github')
  await expect(
    page.getByRole('button', { name: 'Import issue #12', exact: true }),
  ).toHaveCount(0)
  await page
    .getByRole('button', { name: 'Import issue #13', exact: true })
    .click()
  await page.getByLabel('Import as', { exact: true }).selectOption('bug')
  await page.getByRole('button', { name: 'Import issue', exact: true }).click()
  await page
    .getByRole('link', { name: 'Open imported bug', exact: true })
    .click()
  await expect(
    page.getByRole('combobox', { name: 'Bug status', exact: true }),
  ).toHaveValue('closed')
  await page.getByRole('button', { name: 'Edit bug', exact: true }).click()
  await page
    .getByRole('textbox', { name: 'Title', exact: true })
    .fill('My local bug')
  await page.getByRole('button', { name: 'Save bug', exact: true }).click()
  await expect(
    page.getByRole('link', { name: /octocat\/orbit #13/ }),
  ).toBeVisible()
  await page.goto('/github')
  await page
    .getByRole('button', { name: 'Refresh GitHub', exact: true })
    .click()
  const workspace = await stored(page)
  expect(workspace.projects[0].bugs[0].title).toBe('My local bug')
  expect(workspace.projects[0].boards[0].columns[0].tasks[0].title).toBe(
    'My local title',
  )
  await page
    .getByRole('button', { name: 'Unlink repository', exact: true })
    .click()
  await page
    .getByRole('button', { name: 'Confirm unlink', exact: true })
    .click()
  const after = await stored(page)
  expect(after.projects[0].githubRepository).toBeUndefined()
  expect(after.projects[0].bugs).toEqual(workspace.projects[0].bugs)
  expect(after.projects[0].boards).toEqual(workspace.projects[0].boards)
  await page
    .getByRole('button', { name: 'Link octocat/orbit', exact: true })
    .click()
  await expect(
    page.getByRole('link', { name: 'Open imported task', exact: true }),
  ).toBeVisible()
})
test('handles rate limits, permission failures, identity changes and state filters without leaking previous results', async ({
  page,
}) => {
  await seed(page)
  const state = await mock(page)
  await link(page)
  await page.getByRole('button', { name: 'Pull requests', exact: true }).click()
  await expect(
    page.getByRole('link', { name: 'Polish the orbit' }),
  ).toHaveAttribute('href', 'https://github.com/octocat/orbit/pull/22')
  await expect(page.getByText(/#22 · Merged/)).toBeVisible()
  await page
    .getByRole('combobox', { name: 'GitHub state', exact: true })
    .selectOption('closed')
  await expect
    .poll(() =>
      state.calls.some((path) => path.includes('pulls?page=1&state=closed')),
    )
    .toBe(true)
  state.itemsError = 403
  await page.getByRole('button', { name: 'Refresh GitHub' }).click()
  await expect(page.getByRole('alert')).toContainText('rate limit')
  await expect(
    page.getByRole('link', { name: 'Polish the orbit' }),
  ).toHaveCount(0)
  state.itemsError = 0
  await page.getByRole('button', { name: 'Refresh GitHub' }).click()
  await expect(
    page.getByRole('link', { name: 'Polish the orbit' }),
  ).toBeVisible()
  state.repoError = 404
  await page.reload()
  await expect(page.getByRole('alert')).toContainText('does not have access')
  state.repoError = 0
  state.identity = 999
  await page.getByRole('button', { name: 'Retry repository' }).click()
  await expect(page.getByRole('alert')).toContainText('different repository')
  await expect(
    page.getByRole('button', { name: 'Import issue #12' }),
  ).toHaveCount(0)
})
test('preserves project isolation, source references and repository links in backups without credentials', async ({
  page,
}) => {
  const workspace = createWorkspace()
  const other = createWorkspace().projects[0]
  other.id = 'other'
  other.name = 'Other project'
  other.boards[0].id = 'other-board'
  other.boards[0].columns.forEach((c, i) => (c.id = `other-column-${i}`))
  workspace.projects.push(other)
  await seed(page, workspace)
  await mock(page)
  await link(page)
  await page
    .getByRole('button', { name: 'Import issue #12', exact: true })
    .click()
  await page.getByRole('button', { name: 'Import issue', exact: true }).click()
  await page
    .getByRole('combobox', { name: 'Project', exact: true })
    .selectOption('other')
  await expect(
    page.getByRole('heading', { name: 'Link a repository', exact: true }),
  ).toBeVisible()
  expect((await stored(page)).projects[1].githubRepository).toBeUndefined()
  await page
    .getByRole('combobox', { name: 'Project', exact: true })
    .selectOption('devorbit')
  const downloadEvent = page.waitForEvent('download')
  await page
    .getByRole('button', { name: 'Export workspace', exact: true })
    .click()
  const download = await downloadEvent
  const file = await download.path()
  expect(file).toBeTruthy()
  await page
    .getByRole('button', { name: 'Unlink repository', exact: true })
    .click()
  await page
    .getByRole('button', { name: 'Confirm unlink', exact: true })
    .click()
  await page
    .getByRole('button', { name: 'Import workspace', exact: true })
    .click()
  await page
    .getByRole('dialog')
    .locator('input[type=file]')
    .setInputFiles(file!)
  await page
    .getByRole('checkbox', {
      name: 'Replace my current workspace with this backup',
    })
    .check()
  await page
    .getByRole('button', { name: 'Import and replace', exact: true })
    .click()
  await expect(
    page.getByRole('link', { name: 'Open imported task', exact: true }),
  ).toBeVisible()
  expect((await stored(page)).projects[0].githubRepository?.id).toBe(101)
  await page.reload()
  await expect(
    page.getByRole('link', { name: 'Open imported task', exact: true }),
  ).toBeVisible()
})
test('supports direct repository lookup, empty pages, sign-in errors, narrow dark layouts and navigation', async ({
  page,
  isMobile,
}) => {
  await seed(page)
  const state = await mock(page)
  state.repos = []
  await page.addInitScript(() =>
    localStorage.setItem(
      'devorbit.appearance.v1',
      JSON.stringify({ version: 1, mode: 'dark', accent: 'blue' }),
    ),
  )
  await page.goto('/github?connection=expired')
  await expect(
    page.getByText(
      'The sign-in request expired or could not be verified. Connect again.',
    ),
  ).toBeVisible()
  await expect(
    page.getByText('No repositories on this page.', { exact: false }),
  ).toBeVisible()
  await page
    .getByLabel('Repository owner/name', { exact: true })
    .fill('not a repository')
  await page.getByRole('button', { name: 'Link by name', exact: true }).click()
  await expect(page.getByRole('alert')).toHaveText(
    'Enter a repository as owner/name.',
  )
  await page
    .getByLabel('Repository owner/name', { exact: true })
    .fill('octocat/orbit')
  await page.getByRole('button', { name: 'Link by name', exact: true }).click()
  await expect(
    page.getByRole('heading', { name: 'Your code in motion' }),
  ).toBeVisible()
  await page.setViewportSize({ width: 360, height: 800 })
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBeTruthy()
  await page
    .getByRole('button', { name: 'Import issue #12', exact: true })
    .click()
  await page.keyboard.press('Escape')
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await page.goto('/projects/missing/github')
  await expect(
    page.getByRole('heading', { name: 'This project has left orbit.' }),
  ).toBeVisible()
  await page
    .getByRole('link', { name: 'Open GitHub integration', exact: true })
    .click()
  if (isMobile || (await page.viewportSize())!.width < 800)
    await page.getByRole('button', { name: 'Open navigation' }).click()
  await expect(
    page
      .getByRole('navigation')
      .getByRole('link', { name: 'GitHub integration', exact: true }),
  ).toHaveAttribute('aria-current', 'page')
})
test('blocks imports with invalid saved data and recovers an expired session across tabs', async ({
  page,
}) => {
  await seed(page)
  const state = await mock(page)
  await link(page)
  state.connected = false
  await page.evaluate(() => window.dispatchEvent(new Event('focus')))
  await expect(
    page.getByRole('heading', { name: 'Bring your code into orbit.' }),
  ).toBeVisible()
  await expect(
    page.getByRole('button', { name: 'Import issue #12' }),
  ).toHaveCount(0)
  await page.evaluate((key) => localStorage.setItem(key, '{broken'), key)
  state.connected = true
  await page.reload()
  await expect(
    page.getByText(/Saved workspace could not be read/),
  ).toBeVisible()
  await expect(
    page.getByRole('button', { name: 'Link octocat/orbit', exact: true }),
  ).toBeDisabled()
})
