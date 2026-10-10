import { useState, type FormEvent } from 'react'
import { LockKeyhole, Globe, Search } from 'lucide-react'
import type { PageResult, Repository } from '../../../shared/github'
import { githubApi, useGitHubData } from './api'

export function RepositoryPicker({
  onLink,
  blocked,
}: {
  onLink: (repo: Repository) => void
  blocked: boolean
}) {
  const [page, setPage] = useState(1),
    [query, setQuery] = useState(''),
    [revision, setRevision] = useState(0),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(false)
  const result = useGitHubData<PageResult<Repository>>(
    `/repositories?page=${page}`,
    revision,
  )
  async function lookup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const name = String(
      new FormData(event.currentTarget).get('repository'),
    ).trim()
    const match = /^([a-zA-Z0-9-]+)\/([a-zA-Z0-9_.-]+)$/.exec(name)
    if (!match) {
      setError('Enter a repository as owner/name.')
      return
    }
    setBusy(true)
    setError('')
    try {
      onLink(
        await githubApi<Repository>(`/repositories/${match[1]}/${match[2]}`),
      )
    } catch (e) {
      setError(
        e instanceof Error ? e.message : 'Repository could not be found.',
      )
    } finally {
      setBusy(false)
    }
  }
  const repositories =
    result.data?.items.filter((repo) =>
      `${repo.owner}/${repo.name} ${repo.description}`
        .toLowerCase()
        .includes(query.toLowerCase().trim()),
    ) ?? []
  return (
    <section className="github-panel">
      <div className="github-section-heading">
        <div>
          <p className="eyebrow">CHOOSE YOUR LAUNCHPAD</p>
          <h2>Link a repository</h2>
          <p>Choose from your repositories or enter an exact owner/name.</p>
        </div>
      </div>
      <form className="github-lookup" onSubmit={lookup}>
        <label>
          Repository owner/name
          <input
            name="repository"
            placeholder="octocat/hello-world"
            required
            maxLength={201}
          />
        </label>
        <button className="button button--outline" disabled={blocked || busy}>
          {busy ? 'Looking up…' : 'Link by name'}
        </button>
      </form>
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      <label className="board-search github-repo-search">
        <Search size={16} />
        <input
          type="search"
          aria-label="Search repositories on this page"
          placeholder="Search this page…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </label>
      {result.loading && <p role="status">Finding your repositories…</p>}
      {result.error && (
        <p className="form-error" role="alert">
          {result.error}{' '}
          <button
            className="text-button"
            onClick={() => setRevision((n) => n + 1)}
          >
            Retry repositories
          </button>
        </p>
      )}
      {result.data && (
        <>
          <ul className="github-repositories">
            {repositories.map((repo) => (
              <li key={repo.id}>
                <span className="github-repo-icon">
                  {repo.private ? (
                    <LockKeyhole size={18} />
                  ) : (
                    <Globe size={18} />
                  )}
                </span>
                <div>
                  <h3>
                    {repo.owner}/{repo.name}
                  </h3>
                  <p>{repo.description || 'No repository description.'}</p>
                  <small>
                    {repo.private ? 'Private' : 'Public'} · {repo.defaultBranch}
                  </small>
                </div>
                <button
                  className="button button--outline"
                  disabled={blocked || busy}
                  aria-label={`Link ${repo.owner}/${repo.name}`}
                  onClick={() => onLink(repo)}
                >
                  Link repository
                </button>
              </li>
            ))}
          </ul>
          {!repositories.length && (
            <p className="github-empty">
              {query
                ? 'No repositories match on this page. Clear the search or try another page.'
                : 'No repositories on this page. Check token permissions or try an exact owner/name.'}
            </p>
          )}
          <div className="github-pagination">
            <button
              className="button button--outline"
              disabled={page === 1}
              onClick={() => {
                setPage((n) => n - 1)
                setQuery('')
              }}
            >
              Previous repositories
            </button>
            <span>Page {page}</span>
            <button
              className="button button--outline"
              disabled={!result.data.nextPage}
              onClick={() => {
                setPage(result.data!.nextPage!)
                setQuery('')
              }}
            >
              Next repositories
            </button>
          </div>
        </>
      )}
    </section>
  )
}
