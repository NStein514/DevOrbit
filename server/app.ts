import { randomBytes, timingSafeEqual } from 'node:crypto'
import express, { type ErrorRequestHandler } from 'express'
import session from 'express-session'
import createMemoryStore from 'memorystore'
import { z } from 'zod'
import { repositoryRefSchema } from '../shared/github.ts'
import { ApiError, githubRequest, items, repository } from './github.ts'

declare module 'express-session' {
  interface SessionData {
    token?: string
    user?: { login: string }
    authenticatedAt?: number
    oauth?: { state: string; verifier: string; createdAt: number }
  }
}
export interface ServerConfig {
  origin: string
  clientId?: string
  clientSecret?: string
  sessionSecret?: string
  oauthScope?: string
  secure?: boolean
  trustProxy?: boolean
}
export function configFromEnv(
  env: Record<string, string | undefined>,
): ServerConfig {
  const origin = env.DEVORBIT_ORIGIN || 'http://localhost:5173'
  const url = new URL(origin)
  if (url.origin !== origin || !['http:', 'https:'].includes(url.protocol))
    throw new Error(
      'DEVORBIT_ORIGIN must be an HTTP(S) origin without a trailing slash.',
    )
  const production = env.NODE_ENV === 'production'
  if (
    production &&
    (!env.SESSION_SECRET ||
      env.SESSION_SECRET.length < 32 ||
      url.protocol !== 'https:')
  )
    throw new Error(
      'Production requires an HTTPS DEVORBIT_ORIGIN and a SESSION_SECRET of at least 32 characters.',
    )
  return {
    origin,
    clientId: env.GITHUB_CLIENT_ID,
    clientSecret: env.GITHUB_CLIENT_SECRET,
    sessionSecret: env.SESSION_SECRET,
    oauthScope: env.GITHUB_OAUTH_SCOPE,
    secure: url.protocol === 'https:',
    trustProxy: env.DEVORBIT_TRUST_PROXY === '1',
  }
}
export function createApi(config: ServerConfig, fetcher: typeof fetch = fetch) {
  const app = express()
  app.disable('x-powered-by')
  const MemoryStore = createMemoryStore(session)
  const store = new MemoryStore({
    checkPeriod: 60000,
    max: 1000,
    ttl: (_options, stored: session.SessionData) =>
      Math.max(
        1,
        (stored.authenticatedAt ?? stored.oauth?.createdAt ?? Date.now()) +
          (stored.authenticatedAt ? 8 * 60 * 60 * 1000 : 10 * 60 * 1000) -
          Date.now(),
      ),
  })
  if (config.trustProxy) app.set('trust proxy', 1)
  const oauthAvailable = !!(config.clientId && config.clientSecret)
  app.use((_req, res, next) => {
    res.set({
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'no-referrer',
    })
    next()
  })
  // No CORS: the browser and API must share an origin. Check writes before parsing credentials.
  app.use((req, _res, next) => {
    if (
      !['GET', 'HEAD'].includes(req.method) &&
      (req.get('origin') !== config.origin || !req.is('application/json'))
    )
      return next(
        new ApiError(
          403,
          'This request must come from your DevOrbit workspace.',
        ),
      )
    next()
  })
  app.use(express.json({ limit: '8kb' }))
  app.use(
    session({
      name: 'devorbit.sid',
      store,
      secret: config.sessionSecret || randomBytes(48).toString('hex'),
      resave: false,
      saveUninitialized: false,
      cookie: {
        httpOnly: true,
        sameSite: 'lax',
        secure: config.secure ?? false,
        maxAge: 8 * 60 * 60 * 1000,
        path: '/api/github',
      },
    }),
  )
  app.use((req, _res, next) => {
    if (
      req.session.authenticatedAt &&
      Date.now() - req.session.authenticatedAt > 8 * 60 * 60 * 1000
    ) {
      delete req.session.token
      delete req.session.user
      delete req.session.authenticatedAt
    }
    next()
  })
  // Bound anonymous auth attempts without storing an unbounded set of IP addresses.
  const attempts = new Map<string, { start: number; count: number }>()
  app.use(['/token', '/oauth/start'], (req, _res, next) => {
    const now = Date.now()
    for (const [key, value] of attempts)
      if (now - value.start > 60000) attempts.delete(key)
    const key = req.ip || 'unknown',
      entry = attempts.get(key) ?? { start: now, count: 0 }
    if (attempts.size >= 1000 && !attempts.has(key))
      return next(
        new ApiError(
          429,
          'Too many connection attempts. Try again in a minute.',
        ),
      )
    attempts.set(key, entry)
    if (++entry.count > 10)
      return next(
        new ApiError(
          429,
          'Too many connection attempts. Try again in a minute.',
        ),
      )
    next()
  })
  const save = (req: express.Request) =>
    new Promise<void>((resolve, reject) =>
      req.session.save((error) => (error ? reject(error) : resolve())),
    )
  async function connect(req: express.Request, token: string) {
    const response = await githubRequest(token, '/user', fetcher)
    const user = z
      .object({ login: z.string().min(1) })
      .parse(await response.json())
    await new Promise<void>((resolve, reject) =>
      req.session.regenerate((error) => (error ? reject(error) : resolve())),
    )
    req.session.token = token
    req.session.user = { login: user.login }
    req.session.authenticatedAt = Date.now()
    await save(req)
  }
  app.get('/session', (req, res) =>
    res.json({ user: req.session.user ?? null, oauthAvailable }),
  )
  app.post('/token', async (req, res) => {
    const { token } = z
      .object({
        token: z
          .string()
          .trim()
          .min(10)
          .max(500)
          .regex(/^[a-zA-Z0-9_]+$/),
      })
      .parse(req.body)
    await connect(req, token)
    res.json({ user: req.session.user, oauthAvailable })
  })
  app.post('/disconnect', async (req, res) => {
    await new Promise<void>((resolve, reject) =>
      req.session.destroy((error) => (error ? reject(error) : resolve())),
    )
    res.clearCookie('devorbit.sid', {
      path: '/api/github',
      httpOnly: true,
      sameSite: 'lax',
      secure: config.secure ?? false,
    })
    res.json({ user: null, oauthAvailable })
  })
  app.post('/oauth/start', async (req, res) => {
    if (!oauthAvailable)
      throw new ApiError(
        503,
        'OAuth is not configured. Set the GitHub OAuth app credentials on the server or connect with a token.',
      )
    const state = randomBytes(32).toString('hex'),
      verifier = randomBytes(32).toString('base64url')
    req.session.oauth = { state, verifier, createdAt: Date.now() }
    await save(req)
    const { createHash } = await import('node:crypto')
    const url = new URL('https://github.com/login/oauth/authorize')
    url.search = new URLSearchParams({
      client_id: config.clientId!,
      redirect_uri: `${config.origin}/api/github/oauth/callback`,
      scope: config.oauthScope || 'read:user public_repo',
      state,
      code_challenge: createHash('sha256').update(verifier).digest('base64url'),
      code_challenge_method: 'S256',
    }).toString()
    res.json({ url: url.toString() })
  })
  app.get('/oauth/callback', async (req, res) => {
    const pending = req.session.oauth
    delete req.session.oauth
    await save(req)
    const state = typeof req.query.state === 'string' ? req.query.state : ''
    if (
      !pending ||
      Date.now() - pending.createdAt > 600000 ||
      !/^[a-f0-9]{64}$/.test(state) ||
      state.length !== pending.state.length ||
      !timingSafeEqual(Buffer.from(state), Buffer.from(pending.state))
    )
      return res.redirect(`${config.origin}/github?connection=expired`)
    if (req.query.error || typeof req.query.code !== 'string')
      return res.redirect(`${config.origin}/github?connection=cancelled`)
    try {
      const response = await fetcher(
        'https://github.com/login/oauth/access_token',
        {
          method: 'POST',
          headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            client_id: config.clientId,
            client_secret: config.clientSecret,
            code: req.query.code,
            redirect_uri: `${config.origin}/api/github/oauth/callback`,
            code_verifier: pending.verifier,
          }),
          redirect: 'error',
          signal: AbortSignal.timeout(15000),
        },
      )
      if (!response.ok) throw new Error('OAuth exchange failed')
      const token = z
        .object({ access_token: z.string().min(1) })
        .parse(await response.json()).access_token
      await connect(req, token)
      res.redirect(`${config.origin}/github?connection=success`)
    } catch {
      res.redirect(`${config.origin}/github?connection=failed`)
    }
  })
  app.use((req, _res, next) =>
    req.session.token
      ? next()
      : next(new ApiError(401, 'Connect your GitHub account to continue.')),
  )
  const pageQuery = z.object({
    page: z.coerce.number().int().min(1).max(10000).default(1),
    state: z.enum(['open', 'closed', 'all']).default('open'),
  })
  app.get('/repositories', async (req, res) => {
    const { page } = pageQuery.parse(req.query)
    const response = await githubRequest(
      req.session.token!,
      `/user/repos?per_page=30&page=${page}&sort=updated&affiliation=owner,collaborator,organization_member`,
      fetcher,
    )
    const data = z
      .array(z.unknown())
      .parse(await response.json())
      .map(repository)
    res.json({
      items: data,
      nextPage: response.headers.get('link')?.includes('rel="next"')
        ? page + 1
        : null,
    })
  })
  app.get('/repositories/:owner/:repo', async (req, res) => {
    const ref = repositoryRefSchema
      .omit({ id: true })
      .parse({ owner: req.params.owner, name: req.params.repo })
    const response = await githubRequest(
      req.session.token!,
      `/repos/${ref.owner}/${ref.name}`,
      fetcher,
    )
    res.json(repository(await response.json()))
  })
  app.get('/repositories/:owner/:repo/:kind', async (req, res) => {
    const ref = repositoryRefSchema
      .omit({ id: true })
      .parse({ owner: req.params.owner, name: req.params.repo })
    const kind = z.enum(['issues', 'pulls']).parse(req.params.kind)
    const { page, state } = pageQuery.parse(req.query)
    const response = await githubRequest(
      req.session.token!,
      `/repos/${ref.owner}/${ref.name}/${kind}?per_page=30&page=${page}&state=${state}&sort=updated&direction=desc`,
      fetcher,
    )
    res.json({
      items: items(await response.json(), kind),
      nextPage: response.headers.get('link')?.includes('rel="next"')
        ? page + 1
        : null,
    })
  })
  app.use((_req, _res, next) =>
    next(new ApiError(404, 'Unknown GitHub endpoint.')),
  )
  const errors: ErrorRequestHandler = (error, req, res, next) => {
    if (res.headersSent) return next(error)
    if (error instanceof ApiError && error.status === 401) {
      delete req.session.token
      delete req.session.user
      delete req.session.authenticatedAt
    }
    if (error instanceof z.ZodError)
      return res.status(400).json({
        error:
          'Invalid request or unexpected GitHub data. Check the values and try again.',
      })
    const status = error instanceof ApiError ? error.status : 400
    // Never expose upstream responses, credentials, stacks, or OAuth exchange details.
    res.status(status).json({
      error:
        error instanceof ApiError
          ? error.message
          : 'The request could not be completed. Try again.',
    })
  }
  app.use(errors)
  return Object.assign(app, { close: () => store.stopInterval() })
}
