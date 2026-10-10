import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowUpRight,
  CircleDot,
  GitPullRequest,
  RefreshCw,
} from 'lucide-react'
import type { Project } from '../workspace/model'
import {
  repositoryUrl,
  type GitHubItem,
  type PageResult,
  type RepositoryRef,
} from '../../../shared/github'
import { useGitHubData } from './api'
import { findImported } from './import'

export function RepositoryActivity({
  project,
  repo,
  blocked,
  onImport,
}: {
  project: Project
  repo: RepositoryRef
  blocked: boolean
  onImport: (issue: GitHubItem) => void
}) {
  const [kind, setKind] = useState<'issues' | 'pulls'>('issues'),
    [state, setState] = useState('open'),
    [page, setPage] = useState(1),
    [revision, setRevision] = useState(0),
    [query, setQuery] = useState('')
  const result = useGitHubData<PageResult<GitHubItem>>(
    `/repositories/${repo.owner}/${repo.name}/${kind}?page=${page}&state=${state}`,
    revision,
  )
  const data =
    result.data?.items.filter((item) =>
      `${item.number} ${item.title} ${item.labels.join(' ')}`
        .toLowerCase()
        .includes(query.toLowerCase().trim()),
    ) ?? []
  return (
    <section className="github-panel" aria-label="Repository activity">
      <div className="github-section-heading">
        <div>
          <h2>Your code in motion</h2>
          <p>Live from GitHub. Import the issues you want to work on.</p>
        </div>
        <button
          className="button button--outline"
          disabled={result.loading}
          onClick={() => setRevision((n) => n + 1)}
        >
          <RefreshCw size={15} /> Refresh GitHub
        </button>
      </div>
      <div className="github-toolbar">
        <div
          role="group"
          aria-label="Repository activity type"
          className="filter-group"
        >
          <button
            className={`filter-button ${kind === 'issues' ? 'selected' : ''}`}
            aria-pressed={kind === 'issues'}
            onClick={() => {
              setKind('issues')
              setPage(1)
            }}
          >
            <CircleDot size={15} /> Issues
          </button>
          <button
            className={`filter-button ${kind === 'pulls' ? 'selected' : ''}`}
            aria-pressed={kind === 'pulls'}
            onClick={() => {
              setKind('pulls')
              setPage(1)
            }}
          >
            <GitPullRequest size={15} /> Pull requests
          </button>
        </div>
        <label className="filter-select">
          <span className="sr-only">GitHub state</span>
          <select
            value={state}
            onChange={(e) => {
              setState(e.target.value)
              setPage(1)
            }}
          >
            <option value="open">Open</option>
            <option value="closed">Closed</option>
            <option value="all">All states</option>
          </select>
        </label>
      </div>
      <label className="board-search github-repo-search">
        <input
          type="search"
          aria-label="Search GitHub items on this page"
          placeholder="Search titles, numbers, or labels on this page…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </label>
      {result.loading && (
        <p role="status">
          Loading {kind === 'issues' ? 'issues' : 'pull requests'}…
        </p>
      )}
      {result.error && (
        <p className="form-error" role="alert">
          {result.error} Use Refresh GitHub to retry.
        </p>
      )}
      {result.data && (
        <>
          <ul className="github-items">
            {data.map((item) => {
              const imported =
                kind === 'issues'
                  ? findImported(project, repo, item.number)
                  : null
              return (
                <li key={item.id}>
                  <span className="github-item-icon">
                    {kind === 'issues' ? (
                      <CircleDot size={19} />
                    ) : (
                      <GitPullRequest size={19} />
                    )}
                  </span>
                  <div className="github-item-main">
                    <a
                      href={`${repositoryUrl(repo)}/${kind === 'issues' ? 'issues' : 'pull'}/${item.number}`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      <h3>
                        {item.title} <ArrowUpRight size={13} />
                      </h3>
                    </a>
                    <p>
                      #{item.number} ·{' '}
                      {item.merged
                        ? 'Merged'
                        : item.draft
                          ? 'Draft'
                          : item.state === 'open'
                            ? 'Open'
                            : 'Closed'}{' '}
                      · Updated {new Date(item.updatedAt).toLocaleDateString()}
                    </p>
                    <div className="github-labels">
                      {item.labels.map((label) => (
                        <span key={label}>{label}</span>
                      ))}
                    </div>
                  </div>
                  {kind === 'issues' &&
                    (imported ? (
                      <Link
                        className="text-link github-import-action"
                        to={
                          imported.kind === 'bug'
                            ? `/projects/${project.id}/bugs/${imported.id}`
                            : `/projects/${project.id}/boards/${imported.boardId}#task-${imported.id}`
                        }
                      >
                        Open imported {imported.kind}
                      </Link>
                    ) : (
                      <button
                        className="button button--outline github-import-action"
                        aria-label={`Import issue #${item.number}`}
                        disabled={blocked}
                        onClick={() => onImport(item)}
                      >
                        Import issue
                      </button>
                    ))}
                </li>
              )
            })}
          </ul>
          {!data.length && (
            <p className="github-empty">
              {query
                ? 'No matching items on this page. Clear your search or try another page.'
                : `No ${kind === 'issues' ? 'issues' : 'pull requests'} on this page. Try another state${result.data.nextPage ? ' or the next page' : ''}.`}
            </p>
          )}
          <div className="github-pagination">
            <button
              className="button button--outline"
              disabled={page === 1}
              onClick={() => setPage((n) => n - 1)}
            >
              Previous items
            </button>
            <span>Page {page}</span>
            <button
              className="button button--outline"
              disabled={!result.data.nextPage}
              onClick={() => setPage(result.data!.nextPage!)}
            >
              Next items
            </button>
          </div>
        </>
      )}
      <p className="github-footnote">
        Imports are local snapshots, not automatic synchronization. No issues or
        pull requests are changed on GitHub.
      </p>
    </section>
  )
}
