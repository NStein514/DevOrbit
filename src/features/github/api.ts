import { useEffect, useState } from 'react'

export class GitHubError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}
export async function githubApi<T>(
  path: string,
  body?: unknown,
  signal?: AbortSignal,
): Promise<T> {
  let response: Response
  try {
    response = await fetch(`/api/github${path}`, {
      method: body === undefined ? 'GET' : 'POST',
      credentials: 'same-origin',
      headers: body === undefined ? {} : { 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal,
    })
  } catch (error) {
    if (signal?.aborted) throw error
    throw new GitHubError(
      0,
      'The GitHub connection service is unavailable. Check your connection and try again.',
    )
  }
  const data = await response.json().catch(() => null)
  if (!response.ok || !data)
    throw new GitHubError(
      response.status,
      typeof data?.error === 'string'
        ? data.error
        : 'The GitHub connection service is unavailable. Run DevOrbit with npm run dev or npm start.',
    )
  return data as T
}
export function useGitHubData<T>(
  path: string | null,
  revision = 0,
  keepPrevious = false,
) {
  const [result, setResult] = useState<{
    path: string | null
    revision: number
    data: T | null
    error: string
    status: number
    loading: boolean
  }>({
    path: null,
    revision: -1,
    data: null,
    error: '',
    status: 0,
    loading: true,
  })
  useEffect(() => {
    if (!path) return
    const controller = new AbortController()
    githubApi<T>(path, undefined, controller.signal)
      .then((data) => {
        if (!controller.signal.aborted)
          setResult({
            path,
            revision,
            data,
            error: '',
            status: 0,
            loading: false,
          })
      })
      .catch((error: unknown) => {
        if (!controller.signal.aborted)
          setResult({
            path,
            revision,
            data: null,
            error:
              error instanceof Error
                ? error.message
                : 'Unable to load GitHub data.',
            status: error instanceof GitHubError ? error.status : 0,
            loading: false,
          })
      })
    return () => controller.abort()
  }, [path, revision])
  return result.path === path && result.revision === revision
    ? result
    : {
        data: keepPrevious && result.path === path ? result.data : null,
        error: '',
        status: 0,
        loading: !!path,
      }
}
