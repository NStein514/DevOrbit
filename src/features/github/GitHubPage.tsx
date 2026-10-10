import { useEffect, useState } from 'react'
import {
  Link,
  Navigate,
  useNavigate,
  useParams,
  useSearchParams,
} from 'react-router-dom'
import {
  ArrowLeft,
  ArrowUpRight,
  Download,
  Github,
  Link2,
  Unlink,
  Upload,
} from 'lucide-react'
import { Modal } from '../../components/ui/Modal'
import { useWorkspace } from '../workspace/context'
import {
  boardPath,
  bugsPath,
  downloadWorkspace,
  type Project,
} from '../workspace/model'
import { ImportWorkspace } from '../workspace/WorkspaceDialogs'
import {
  repositoryUrl,
  type GitHubItem,
  type GitHubSession,
  type Repository,
  type RepositoryRef,
} from '../../../shared/github'
import { useGitHubData } from './api'
import { ConnectionPanel } from './ConnectionPanel'
import { RepositoryPicker } from './RepositoryPicker'
import { RepositoryActivity } from './RepositoryActivity'
import { ImportIssue } from './ImportIssue'
import { importIssue, type ImportDraft } from './import'
import './github.css'

export default function GitHubPage() {
  const { workspace } = useWorkspace(),
    { projectId } = useParams()
  if (!projectId)
    return (
      <Navigate
        to={`/projects/${workspace.projects[0].id}/github${window.location.search}`}
        replace
      />
    )
  const project = workspace.projects.find((p) => p.id === projectId)
  if (!project)
    return (
      <div className="board-not-found">
        <h1>This project has left orbit.</h1>
        <Link className="button button--primary" to="/github">
          Open GitHub integration
        </Link>
      </div>
    )
  return <GitHubProject key={project.id} project={project} />
}
function GitHubProject({ project }: { project: Project }) {
  const { workspace, update, blocked, error: storageError } = useWorkspace(),
    navigate = useNavigate(),
    [params] = useSearchParams()
  const [revision, setRevision] = useState(0),
    [announcement, setAnnouncement] = useState(''),
    [error, setError] = useState(''),
    [unlink, setUnlink] = useState(false),
    [importBackup, setImportBackup] = useState(false)
  const session = useGitHubData<GitHubSession>('/session', revision, true)
  useEffect(() => {
    const refresh = () => setRevision((n) => n + 1)
    window.addEventListener('focus', refresh)
    return () => window.removeEventListener('focus', refresh)
  }, [])
  const repo = project.githubRepository
  function link(repository: Repository) {
    const ref = {
      id: repository.id,
      owner: repository.owner,
      name: repository.name,
    }
    let message = ''
    const saved = update((current) => ({
      ...current,
      projects: current.projects.map((p) => {
        if (p.id !== project.id) return p
        if (p.githubRepository) {
          message =
            'This project was linked in another tab. Unlink it before choosing another repository.'
          return p
        }
        return { ...p, githubRepository: ref }
      }),
    }))
    if (message) setError(message)
    else if (saved) {
      setError('')
      setAnnouncement(`Linked ${ref.owner}/${ref.name}.`)
    }
  }
  const connectionMessages: Record<string, string> = {
    success: 'GitHub connected. Choose a repository for your project.',
    cancelled: 'GitHub sign-in was cancelled. You can try again.',
    expired:
      'The sign-in request expired or could not be verified. Connect again.',
    failed: 'GitHub sign-in failed. Check OAuth configuration or try a token.',
  }
  return (
    <div className="github-page">
      <div className="board-context">
        <Link to="/#projects">
          <ArrowLeft size={14} /> Projects
        </Link>
        <span>/</span>
        <select
          aria-label="Project"
          value={project.id}
          onChange={(e) => navigate(`/projects/${e.target.value}/github`)}
        >
          {workspace.projects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
        <div className="github-context-links">
          <Link to={boardPath(project)}>Kanban board</Link>
          <Link to={bugsPath(project)}>Bug tracking</Link>
        </div>
      </div>
      <div className="page-heading">
        <div>
          <p className="eyebrow">
            <Github size={14} /> YOUR WORK, CONNECTED
          </p>
          <h1>
            GitHub<span>.</span>
          </h1>
          <p>From repository to your next small win.</p>
        </div>
        <div className="github-backup-actions">
          <button
            className="icon-button"
            aria-label="Export workspace"
            onClick={() => downloadWorkspace(workspace)}
          >
            <Download size={17} />
          </button>
          <button
            className="icon-button"
            aria-label="Import workspace"
            onClick={() => setImportBackup(true)}
          >
            <Upload size={17} />
          </button>
        </div>
      </div>
      {connectionMessages[params.get('connection') ?? ''] && (
        <p className="github-notice" role="status">
          {connectionMessages[params.get('connection')!]}
        </p>
      )}
      {session.loading && <p role="status">Checking your GitHub connection…</p>}
      {session.error && (
        <p role="alert" className="form-error">
          {session.error}{' '}
          <button
            className="text-button"
            onClick={() => setRevision((n) => n + 1)}
          >
            Retry connection
          </button>
        </p>
      )}
      {session.data && (
        <ConnectionPanel
          key={`connection-${session.data.user?.login ?? 'disconnected'}`}
          session={session.data}
          onChange={() => setRevision((n) => n + 1)}
        />
      )}
      {repo && (
        <section className="github-linked" aria-label="Linked repository">
          <span className="github-orbit-icon">
            <Link2 size={23} />
          </span>
          <div>
            <p className="eyebrow">PROJECT REPOSITORY</p>
            <h2>
              <a href={repositoryUrl(repo)} target="_blank" rel="noreferrer">
                {repo.owner}/{repo.name} <ArrowUpRight size={17} />
              </a>
            </h2>
            <p>
              Linked to {project.name}. Your imported work stays here when you
              unlink.
            </p>
          </div>
          <button
            className="button button--outline"
            disabled={blocked}
            onClick={() => setUnlink(true)}
          >
            <Unlink size={14} /> Unlink repository
          </button>
        </section>
      )}
      {session.data?.user &&
        (!repo ? (
          <RepositoryPicker
            key={`repositories-${session.data.user.login}`}
            onLink={link}
            blocked={blocked}
          />
        ) : (
          <LinkedRepository
            key={`${repo.id}/${repo.owner}/${repo.name}/${session.data.user.login}`}
            project={project}
            repo={repo}
          />
        ))}
      {!session.data?.user && repo && (
        <p className="github-notice">
          Connect your account to load this repository. Your imported tasks and
          bugs are available offline.
        </p>
      )}
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      <p role="status" className="sr-only">
        {announcement}
      </p>
      <div className="board-bottom-note">
        <span>
          <span className="status-dot" />
          {storageError
            ? 'Check workspace storage notice'
            : 'Repository links and imports are saved in this browser.'}
        </span>
      </div>
      {unlink && (
        <Modal title="Unlink repository?" onClose={() => setUnlink(false)}>
          <div className="editor-form">
            <p>
              Remove the repository link from this project? Imported tasks and
              bug reports, including their source links, will remain. Your
              GitHub connection stays active.
            </p>
            <footer className="modal-actions">
              <button
                className="button button--outline"
                onClick={() => setUnlink(false)}
              >
                Cancel
              </button>
              <button
                className="button button--danger"
                onClick={() => {
                  if (
                    update((current) => ({
                      ...current,
                      projects: current.projects.map((p) =>
                        p.id === project.id
                          ? { ...p, githubRepository: undefined }
                          : p,
                      ),
                    }))
                  ) {
                    setUnlink(false)
                    setAnnouncement('Repository unlinked.')
                  }
                }}
              >
                Confirm unlink
              </button>
            </footer>
          </div>
        </Modal>
      )}
      {importBackup && (
        <ImportWorkspace
          onClose={() => setImportBackup(false)}
          onImported={() => navigate('/github')}
        />
      )}
    </div>
  )
}
function LinkedRepository({
  project,
  repo,
}: {
  project: Project
  repo: RepositoryRef
}) {
  const { update, blocked } = useWorkspace()
  const [revision, setRevision] = useState(0),
    [selected, setSelected] = useState<GitHubItem | null>(null),
    [notice, setNotice] = useState('')
  const result = useGitHubData<Repository>(
    `/repositories/${repo.owner}/${repo.name}`,
    revision,
  )
  function save(draft: ImportDraft) {
    if (!selected) return 'Choose an issue to import.'
    let message = '',
      found = false
    const saved = update((current) => ({
      ...current,
      projects: current.projects.map((p) => {
        if (p.id !== project.id) return p
        found = true
        try {
          return importIssue(p, repo, selected, draft)
        } catch (e) {
          message =
            e instanceof Error ? e.message : 'Unable to import this issue.'
          return p
        }
      }),
    }))
    if (!found)
      return 'The project was removed. Close this dialog and choose another project.'
    if (message) return message
    if (!saved)
      return 'The issue could not be imported. Check the workspace message.'
    setNotice(
      `Issue #${selected.number} imported as a ${draft.kind === 'task' ? 'Kanban task' : 'bug report'}.`,
    )
  }
  return (
    <>
      {result.loading && <p role="status">Checking repository access…</p>}
      {result.error && (
        <p role="alert" className="form-error">
          {result.error}{' '}
          <button
            className="text-button"
            onClick={() => setRevision((n) => n + 1)}
          >
            Retry repository
          </button>
        </p>
      )}
      {result.data &&
        (result.data.id === repo.id ? (
          <RepositoryActivity
            project={project}
            repo={repo}
            blocked={blocked}
            onImport={setSelected}
          />
        ) : (
          <p role="alert">
            This repository name now points to a different repository. Unlink it
            and choose the correct repository before importing.
          </p>
        ))}
      <p role="status" className="github-import-result">
        {notice}
      </p>
      {selected && (
        <ImportIssue
          project={project}
          issue={selected}
          onClose={() => setSelected(null)}
          onSave={save}
        />
      )}
    </>
  )
}
