import { test } from 'node:test'
import assert from 'node:assert/strict'
import express from 'express'
import { createHash } from 'node:crypto'
import { createApi, configFromEnv, type ServerConfig } from './app.ts'

const origin = 'http://localhost:5173'
const repo = {
  id: 1,
  name: 'hello',
  owner: { login: 'octocat' },
  description: 'Hello world',
  private: false,
  default_branch: 'main',
}
const issue = {
  id: 10,
  number: 1,
  title: 'Fix orbit',
  body: 'Details',
  state: 'open',
  labels: [{ name: 'bug' }],
  updated_at: '2026-10-10T12:00:00Z',
}
const json = (
  value: unknown,
  status = 200,
  headers: Record<string, string> = {},
) =>
  new Response(JSON.stringify(value), {
    status,
    headers: { 'Content-Type': 'application/json', ...headers },
  })
async function setup(
  fetcher: typeof fetch,
  config: Partial<ServerConfig> = {},
) {
  const app = express()
  app.use(
    '/api/github',
    createApi(
      {
        origin,
        sessionSecret: 'test-secret-with-at-least-thirty-two-characters',
        ...config,
      },
      fetcher,
    ),
  )
  const server = app.listen(0, '127.0.0.1')
  await new Promise<void>((resolve) => server.once('listening', resolve))
  const address = server.address()
  assert(address && typeof address === 'object')
  const base = `http://127.0.0.1:${address.port}/api/github`
  let cookie = ''
  async function request(
    path: string,
    body?: unknown,
    headers: Record<string, string> = {},
  ) {
    const response = await fetch(base + path, {
      method: body === undefined ? 'GET' : 'POST',
      headers: {
        ...(cookie ? { Cookie: cookie } : {}),
        ...(body === undefined
          ? {}
          : { Origin: origin, 'Content-Type': 'application/json' }),
        ...headers,
      },
      body: body === undefined ? undefined : JSON.stringify(body),
      redirect: 'manual',
    })
    if (response.headers.get('set-cookie'))
      cookie = response.headers.get('set-cookie')!.split(';')[0]
    return response
  }
  return {
    request,
    close: () =>
      new Promise<void>((resolve, reject) =>
        server.close((error) => (error ? reject(error) : resolve())),
      ),
  }
}

test('tokens remain server-side; sessions rotate, cookies are protected, and disconnect removes access', async (t) => {
  const calls: string[] = []
  const s = await setup(async (input, init) => {
    calls.push(String(input))
    assert.equal(
      new Headers(init?.headers).get('authorization'),
      'Bearer github_pat_test123',
    )
    return json({ login: 'octocat' })
  })
  t.after(s.close)
  assert.deepEqual(await (await s.request('/session')).json(), {
    user: null,
    oauthAvailable: false,
  })
  assert.equal((await s.request('/repositories')).status, 401)
  const login = await s.request('/token', { token: 'github_pat_test123' })
  assert.equal(login.status, 200)
  assert.match(login.headers.get('set-cookie')!, /HttpOnly/)
  assert.match(login.headers.get('set-cookie')!, /SameSite=Lax/)
  assert.match(login.headers.get('set-cookie')!, /Path=\/api\/github/)
  assert.deepEqual(await login.json(), {
    user: { login: 'octocat' },
    oauthAvailable: false,
  })
  assert.equal(
    (await s.request('/session')).headers.get('cache-control'),
    'no-store',
  )
  assert.equal(
    JSON.stringify(await (await s.request('/session')).json()).includes(
      'github_pat',
    ),
    false,
  )
  await s.request('/disconnect', {})
  assert.equal((await s.request('/repositories')).status, 401)
  assert.deepEqual(calls, ['https://api.github.com/user'])
})
test('rejects foreign origins, non-JSON writes, invalid tokens, and unauthenticated access', async (t) => {
  let calls = 0
  const s = await setup(async () => {
    calls++
    return json({ login: 'octocat' })
  })
  t.after(s.close)
  assert.equal(
    (
      await s.request(
        '/token',
        { token: 'github_pat_test123' },
        { Origin: 'https://evil.example' },
      )
    ).status,
    403,
  )
  assert.equal(
    (
      await s.request(
        '/token',
        { token: 'github_pat_test123' },
        { 'Content-Type': 'text/plain' },
      )
    ).status,
    403,
  )
  assert.equal(
    (await s.request('/token', { token: 'bad token with space' })).status,
    400,
  )
  assert.equal((await s.request('/repositories/octocat/hello')).status, 401)
  assert.equal((await s.request('/oauth/start', {})).status, 503)
  assert.equal(calls, 0)
})
test('OAuth validates state, uses PKCE, rotates sessions, and rejects callback replay', async (t) => {
  let verifier = '',
    exchanges = 0
  const s = await setup(
    async (input, init) => {
      if (String(input).includes('access_token')) {
        exchanges++
        const body = JSON.parse(String(init?.body))
        verifier = body.code_verifier
        assert.equal(body.client_secret, 'server-only-secret')
        return json({ access_token: 'oauth-secret' })
      }
      return json({ login: 'octocat' })
    },
    { clientId: 'client', clientSecret: 'server-only-secret' },
  )
  t.after(s.close)
  const start = await s.request('/oauth/start', {}),
    cookie = start.headers.get('set-cookie')
  const auth = new URL((await start.json()).url)
  assert.equal(auth.origin, 'https://github.com')
  assert.equal(auth.searchParams.get('code_challenge_method'), 'S256')
  assert.equal(
    auth.searchParams.get('redirect_uri'),
    `${origin}/api/github/oauth/callback`,
  )
  assert.equal(auth.searchParams.has('client_secret'), false)
  const callback = `/oauth/callback?code=code123&state=${auth.searchParams.get('state')}`
  const finish = await s.request(callback)
  assert.equal(
    finish.headers.get('location'),
    `${origin}/github?connection=success`,
  )
  assert.notEqual(finish.headers.get('set-cookie'), cookie)
  assert.equal(
    createHash('sha256').update(verifier).digest('base64url'),
    auth.searchParams.get('code_challenge'),
  )
  assert.equal(
    (await s.request(callback)).headers.get('location'),
    `${origin}/github?connection=expired`,
  )
  assert.equal(exchanges, 1)
})
test('OAuth cancellation and invalid states never exchange credentials', async (t) => {
  let calls = 0
  const s = await setup(
    async () => {
      calls++
      return json({})
    },
    { clientId: 'client', clientSecret: 'secret' },
  )
  t.after(s.close)
  let auth = new URL((await (await s.request('/oauth/start', {})).json()).url)
  assert.equal(
    (
      await s.request(
        `/oauth/callback?error=access_denied&state=${auth.searchParams.get('state')}`,
      )
    ).headers.get('location'),
    `${origin}/github?connection=cancelled`,
  )
  auth = new URL((await (await s.request('/oauth/start', {})).json()).url)
  assert.equal(
    (await s.request('/oauth/callback?code=secret&state=bad')).headers.get(
      'location',
    ),
    `${origin}/github?connection=expired`,
  )
  assert.equal(
    (
      await s.request(
        `/oauth/callback?code=secret&state=${auth.searchParams.get('state')}`,
      )
    ).headers.get('location'),
    `${origin}/github?connection=expired`,
  )
  assert.equal(calls, 0)
})
test('repository and activity pagination normalize GitHub responses and exclude pull requests from issues', async (t) => {
  const paths: string[] = []
  const s = await setup(async (input) => {
    const url = new URL(String(input))
    paths.push(url.pathname + url.search)
    if (url.pathname === '/user') return json({ login: 'octocat' })
    if (url.pathname === '/user/repos')
      return json([repo], 200, {
        link: '<https://api.github.com/user/repos?page=3>; rel="next"',
      })
    if (url.pathname.endsWith('/issues'))
      return json([
        issue,
        { ...issue, id: 11, number: 2, pull_request: { url: 'x' } },
      ])
    if (url.pathname.endsWith('/pulls'))
      return json([
        { ...issue, merged_at: '2026-10-10T12:00:00Z', draft: false },
      ])
    return json(repo)
  })
  t.after(s.close)
  await s.request('/token', { token: 'github_pat_test123' })
  const repos = await (await s.request('/repositories?page=2')).json()
  assert.equal(repos.nextPage, 3)
  assert.equal(repos.items[0].owner, 'octocat')
  assert.equal(repos.items[0].defaultBranch, 'main')
  assert.equal(
    (await (await s.request('/repositories/octocat/hello')).json()).id,
    1,
  )
  assert.equal(
    (
      await (
        await s.request('/repositories/octocat/hello/issues?state=all')
      ).json()
    ).items.length,
    1,
  )
  assert.equal(
    (
      await (
        await s.request('/repositories/octocat/hello/pulls?state=closed')
      ).json()
    ).items[0].merged,
    true,
  )
  assert(paths.some((path) => path.includes('page=2')))
  assert(paths.some((path) => path.includes('state=all')))
  const count = paths.length
  assert.equal(
    (await s.request('/repositories/octocat/hello/issues?page=-1')).status,
    400,
  )
  assert.equal(
    (await s.request('/repositories/octocat/hello/secrets')).status,
    400,
  )
  assert.equal((await s.request('/repositories/bad%20owner/hello')).status, 400)
  assert.equal(
    (await s.request('/repositories/octocat/hello/issues?state=invalid'))
      .status,
    400,
  )
  assert.equal(paths.length, count)
})
test('permission errors, rate limits, revoked credentials, and upstream failures are safe and recoverable', async (t) => {
  let status = 403
  const s = await setup(async (input) =>
    String(input).endsWith('/user')
      ? json({ login: 'octocat' })
      : json(
          { message: 'sensitive-upstream-value' },
          status,
          status === 429
            ? {
                'x-ratelimit-remaining': '0',
                'x-ratelimit-reset': '1900000000',
              }
            : {},
        ),
  )
  t.after(s.close)
  await s.request('/token', { token: 'github_pat_test123' })
  assert.match(
    (await (await s.request('/repositories')).json()).error,
    /permissions/,
  )
  status = 404
  assert.equal((await s.request('/repositories')).status, 404)
  status = 429
  assert.match(
    (await (await s.request('/repositories')).json()).error,
    /rate limit/,
  )
  status = 500
  const unavailable = await s.request('/repositories')
  assert.equal(unavailable.status, 502)
  assert.doesNotMatch(await unavailable.text(), /sensitive/)
  status = 401
  assert.equal((await s.request('/repositories')).status, 401)
  assert.equal((await (await s.request('/session')).json()).user, null)
})
test('production requires HTTPS and a strong server secret', () => {
  assert.throws(
    () => configFromEnv({ NODE_ENV: 'production' }),
    /Production requires/,
  )
  assert.throws(
    () => configFromEnv({ DEVORBIT_ORIGIN: 'https://example.com/' }),
    /origin/,
  )
  const config = configFromEnv({
    NODE_ENV: 'production',
    DEVORBIT_ORIGIN: 'https://example.com',
    SESSION_SECRET: 'x'.repeat(48),
    DEVORBIT_TRUST_PROXY: '1',
  })
  assert.equal(config.secure, true)
  assert.equal(config.trustProxy, true)
})
