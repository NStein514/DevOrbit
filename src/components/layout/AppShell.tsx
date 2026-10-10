import { useState, type ReactNode } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useWorkspace } from '../../features/workspace/context'
import { usePomodoro } from '../../features/pomodoro/context'
import { formatTime, labels } from '../../features/pomodoro/model'
import '../../features/pomodoro/pomodoro.css'
import {
  ArrowUpRight,
  Github,
  FileText,
  Bug,
  Flag,
  LayoutDashboard,
  Layers3,
  Menu,
  Orbit,
  Rocket,
  Sparkles,
  Settings,
  Telescope,
  X,
  Timer,
  Gamepad2,
} from 'lucide-react'

export const REPOSITORY_URL = 'https://github.com/NStein514/DevOrbit'

export function AppShell({ children }: { children: ReactNode }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const { pathname } = useLocation()
  const isBoard =
    pathname === '/boards' || /^\/projects\/[^/]+\/boards\//.test(pathname)
  const isBugs =
    pathname === '/bugs' || /^\/projects\/[^/]+\/bugs(?:\/|$)/.test(pathname)
  const isMilestones =
    pathname === '/milestones' ||
    /^\/projects\/[^/]+\/milestones(?:\/|$)/.test(pathname)
  const isGitHub =
    pathname === '/github' || /^\/projects\/[^/]+\/github$/.test(pathname)
  const isChangelog =
    pathname === '/changelog' ||
    /^\/projects\/[^/]+\/changelog(?:\/|$)/.test(pathname)
  const isSettings = pathname === '/settings'
  const isPomodoro = pathname === '/pomodoro'
  const isGames = pathname === '/games' || pathname.startsWith('/games/')
  const pomodoro = usePomodoro()
  const isOverview = pathname === '/'
  const { workspace } = useWorkspace()
  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>
      <aside className="sidebar">
        <Link className="brand" to="/" aria-label="DevOrbit home">
          <span className="brand-mark">
            <Orbit size={25} strokeWidth={1.6} />
          </span>
          DevOrbit<span className="brand-dot">.</span>
        </Link>
        <button
          className="icon-button mobile-menu"
          aria-label={menuOpen ? 'Close navigation' : 'Open navigation'}
          aria-expanded={menuOpen}
          aria-controls="sidebar-navigation"
          onClick={() => setMenuOpen(!menuOpen)}
        >
          {menuOpen ? <X /> : <Menu />}
        </button>
        <div
          id="sidebar-navigation"
          className={`sidebar-content ${menuOpen ? 'is-open' : ''}`}
          onKeyDown={(event) => {
            if (event.key === 'Escape') setMenuOpen(false)
          }}
        >
          <div className="workspace-label">
            <span className="workspace-avatar">N</span>
            <div>
              Personal workspace<small>Solo developer</small>
            </div>
            <span className="workspace-indicator" />
          </div>
          <p className="nav-label">WORKSPACE</p>
          <nav aria-label="Main navigation" onClick={() => setMenuOpen(false)}>
            <Link
              className={`nav-link ${isOverview ? 'active' : ''}`}
              to="/"
              aria-current={isOverview ? 'page' : undefined}
            >
              <LayoutDashboard size={18} />
              Overview
              {isOverview && <span className="nav-active-dot" />}
            </Link>
            <Link className="nav-link" to="/#projects">
              <Rocket size={18} />
              Projects
              <span className="nav-count">{workspace.projects.length}</span>
            </Link>
            <Link
              className={`nav-link ${isBoard ? 'active' : ''}`}
              to="/boards"
              aria-current={isBoard ? 'page' : undefined}
            >
              <Layers3 size={18} />
              Kanban boards
            </Link>
            <Link
              className={`nav-link ${isBugs ? 'active' : ''}`}
              to="/bugs"
              aria-current={isBugs ? 'page' : undefined}
            >
              <Bug size={18} /> Bug tracking
            </Link>
            <Link
              className={`nav-link ${isMilestones ? 'active' : ''}`}
              to="/milestones"
              aria-current={isMilestones ? 'page' : undefined}
            >
              <Flag size={18} /> Milestones
            </Link>
            <Link
              className={`nav-link ${isGitHub ? 'active' : ''}`}
              to="/github"
              aria-current={isGitHub ? 'page' : undefined}
            >
              <Github size={18} /> GitHub integration
            </Link>
            <Link
              className={`nav-link ${isChangelog ? 'active' : ''}`}
              to="/changelog"
              aria-current={isChangelog ? 'page' : undefined}
            >
              <FileText size={18} /> Changelogs
            </Link>
            <Link className="nav-link" to="/#roadmap">
              <Telescope size={18} />
              On the horizon
              <ArrowUpRight size={14} className="nav-end" />
            </Link>
            <Link
              className={`nav-link ${isGames ? 'active' : ''}`}
              to="/games"
              aria-current={isGames ? 'page' : undefined}
            >
              <Gamepad2 size={18} /> Games arcade
            </Link>
            <Link
              className={`nav-link ${isPomodoro ? 'active' : ''}`}
              to="/pomodoro"
              aria-current={isPomodoro ? 'page' : undefined}
            >
              <Timer size={18} /> Pomodoro Timer
            </Link>
            <Link
              className={`nav-link ${isSettings ? 'active' : ''}`}
              to="/settings"
              aria-current={isSettings ? 'page' : undefined}
            >
              <Settings size={18} />
              Settings{isSettings && <span className="nav-active-dot" />}
            </Link>
          </nav>
          <div className="sidebar-bottom">
            <div className="sidebar-note">
              <Sparkles size={20} />
              <h3>
                Less overhead.
                <br />
                More liftoff.
              </h3>
              <p>A little space for your next big thing.</p>
              <span>BUILT FOR YOUR ORBIT</span>
            </div>
            <a
              className="nav-link"
              href={`${REPOSITORY_URL}#readme`}
              target="_blank"
              rel="noreferrer"
            >
              <Github size={18} />
              Project documentation
              <ArrowUpRight size={14} />
            </a>
            <div className="sidebar-footer">
              <span className="status-dot" />
              Personal workspace<span>v0.2</span>
            </div>
          </div>
        </div>
      </aside>
      <div className="main-shell">
        <header className="topbar">
          <div className="breadcrumb">
            Workspace<span>/</span>
            <strong>
              {isChangelog
                ? 'Changelogs'
                : isGames
                  ? 'Games arcade'
                  : isPomodoro
                    ? 'Pomodoro Timer'
                    : isGitHub
                      ? 'GitHub integration'
                      : isSettings
                        ? 'Settings'
                        : isMilestones
                          ? 'Milestones'
                          : isBugs
                            ? 'Bug tracking'
                            : isBoard
                              ? 'Kanban boards'
                              : 'Overview'}
            </strong>
          </div>
          <div className="topbar-right">
            {!isPomodoro &&
              (pomodoro.timer.deadline !== null ||
                pomodoro.remaining < pomodoro.timer.duration) && (
                <Link
                  className="pomodoro-mini"
                  to="/pomodoro"
                  aria-label={`${labels[pomodoro.timer.phase]} ${formatTime(pomodoro.remaining)}${pomodoro.timer.deadline === null ? ' paused' : ''}. Open timer`}
                >
                  <Timer size={16} />
                  <span className="pomodoro-mini-label">
                    {labels[pomodoro.timer.phase]}
                  </span>
                  {formatTime(pomodoro.remaining)}
                  {pomodoro.timer.deadline === null && (
                    <span className="pomodoro-mini-label"> · Paused</span>
                  )}
                </Link>
              )}
            <span className="personal-label">
              <span className="status-dot" />
              Your personal mission control
            </span>
            <span className="user-avatar" aria-label="Personal workspace">
              N
            </span>
          </div>
        </header>
        <main id="main-content" tabIndex={-1}>
          {children}
        </main>
        <footer className="page-footer">
          <span>
            DevOrbit <span className="footer-star">✦</span> A small space for
            big ideas.
          </span>
          <span>Made for the way you build.</span>
        </footer>
      </div>
    </div>
  )
}
