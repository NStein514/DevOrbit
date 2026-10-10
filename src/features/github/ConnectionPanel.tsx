import { useState, type FormEvent } from 'react'
import { Github, KeyRound, Link2 } from 'lucide-react'
import { githubApi } from './api'
import type { GitHubSession } from '../../../shared/github'

export function ConnectionPanel({
  session,
  onChange,
}: {
  session: GitHubSession
  onChange: () => void
}) {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState('')
  async function tokenLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = event.currentTarget
    const token = String(new FormData(form).get('token'))
    form.reset()
    setBusy(true)
    setError('')
    try {
      await githubApi('/token', { token })
      onChange()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Connection failed.')
    } finally {
      setBusy(false)
    }
  }
  async function action(path: string) {
    setBusy(true)
    setError('')
    try {
      const result = await githubApi<{ url?: string }>(path, {})
      if (result.url) window.location.assign(result.url)
      else onChange()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Connection failed.')
    } finally {
      setBusy(false)
    }
  }
  return (
    <section className="github-connection" aria-label="GitHub connection">
      <div className="github-connection-heading">
        <span className="github-orbit-icon">
          <Github size={26} />
        </span>
        <div>
          <h2>
            {session.user
              ? `Connected as ${session.user.login}`
              : 'Bring your code into orbit.'}
          </h2>
          <p>
            {session.user
              ? 'Your connection is shared across tabs in this browser.'
              : 'Connect once, then choose a repository for each project.'}
          </p>
        </div>
        {session.user && (
          <button
            className="button button--outline"
            disabled={busy}
            onClick={() => void action('/disconnect')}
          >
            Disconnect GitHub
          </button>
        )}
      </div>
      {!session.user && (
        <div className="github-connect-options">
          <div>
            <h3>
              <Link2 size={17} /> Sign in with GitHub
            </h3>
            <p>Authorize DevOrbit through your GitHub account.</p>
            <button
              className="button button--primary"
              disabled={busy || !session.oauthAvailable}
              onClick={() => void action('/oauth/start')}
            >
              Connect with GitHub
            </button>
            {!session.oauthAvailable && (
              <p className="github-setup-note">
                OAuth setup is needed. Configure your GitHub OAuth app using the
                README, or connect with a token below.
              </p>
            )}
          </div>
          <form onSubmit={tokenLogin}>
            <h3>
              <KeyRound size={17} /> Use a personal access token
            </h3>
            <p>
              For selected repositories, grant read access to Metadata, Issues,
              and Pull requests.
            </p>
            <label htmlFor="github-token">GitHub token</label>
            <input
              id="github-token"
              type="password"
              name="token"
              autoComplete="off"
              required
              minLength={10}
              maxLength={500}
              placeholder="Paste your fine-grained token"
              disabled={busy}
            />
            <button
              className="button button--outline"
              disabled={busy}
              type="submit"
            >
              {busy ? 'Connecting…' : 'Connect token'}
            </button>
          </form>
        </div>
      )}
      <p className="github-privacy">
        {session.user
          ? 'Disconnect removes this server session; it keeps your linked repositories and imported work. Manage token revocation in GitHub settings.'
          : 'Credentials stay in the server session and are never included in workspace backups. Sessions expire after eight hours or a server restart.'}
      </p>
      {error && (
        <p role="alert" className="form-error">
          {error}
        </p>
      )}
    </section>
  )
}
