import { z } from 'zod'
import {
  repositoryRefSchema,
  type Repository,
  type GitHubItem,
} from '../shared/github.ts'

export class ApiError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}
export async function githubRequest(
  token: string,
  path: string,
  fetcher: typeof fetch = fetch,
) {
  let response: Response
  try {
    response = await fetcher(`https://api.github.com${path}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
        'User-Agent': 'DevOrbit',
      },
      redirect: 'error',
      signal: AbortSignal.timeout(15000),
    })
  } catch {
    throw new ApiError(502, 'GitHub could not be reached. Try again shortly.')
  }
  if (!response.ok) {
    if (response.status === 401)
      throw new ApiError(
        401,
        'Your GitHub session expired or access was revoked. Connect again.',
      )
    if (response.status === 404)
      throw new ApiError(
        404,
        'Repository not found or your account does not have access.',
      )
    if (response.status === 403 || response.status === 429) {
      const reset = response.headers.get('x-ratelimit-reset')
      const limited =
        response.status === 429 ||
        response.headers.get('x-ratelimit-remaining') === '0' ||
        response.headers.has('retry-after')
      throw new ApiError(
        403,
        limited
          ? `GitHub rate limit reached. Try again ${reset && Number.isFinite(Number(reset)) ? `after ${new Date(Number(reset) * 1000).toISOString()}` : 'later'}.`
          : 'GitHub denied access. Check repository permissions and organization approval for your connection.',
      )
    }
    throw new ApiError(
      502,
      'GitHub is temporarily unavailable. Try again shortly.',
    )
  }
  return response
}
const rawRepo = z.object({
  id: z.number().int().positive(),
  name: z.string(),
  owner: z.object({ login: z.string() }),
  description: z.string().nullable(),
  private: z.boolean(),
  default_branch: z.string(),
})
export function repository(data: unknown): Repository {
  const repo = rawRepo.parse(data)
  return {
    ...repositoryRefSchema.parse({
      id: repo.id,
      name: repo.name,
      owner: repo.owner.login,
    }),
    description: repo.description ?? '',
    private: repo.private,
    defaultBranch: repo.default_branch,
  }
}
const rawItem = z.object({
  id: z.number().int().positive(),
  number: z.number().int().positive(),
  title: z.string(),
  body: z.string().nullable(),
  state: z.enum(['open', 'closed']),
  labels: z.array(z.object({ name: z.string() })),
  updated_at: z.iso.datetime(),
  pull_request: z.unknown().optional(),
  draft: z.boolean().optional(),
  merged_at: z.string().nullable().optional(),
})
export function items(data: unknown, kind: 'issues' | 'pulls'): GitHubItem[] {
  return z
    .array(rawItem)
    .parse(data)
    .filter((item) => kind === 'pulls' || !item.pull_request)
    .map((item) => ({
      id: item.id,
      number: item.number,
      title: item.title,
      body: item.body ?? '',
      state: item.state,
      labels: item.labels.map((label) => label.name),
      updatedAt: item.updated_at,
      draft: item.draft ?? false,
      merged: !!item.merged_at,
    }))
}
