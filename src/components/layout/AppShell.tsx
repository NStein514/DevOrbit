import { useState, type ReactNode } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useWorkspace } from '../../features/workspace/context'
import {
  ArrowUpRight,
  Github,
  LayoutDashboard,
  Layers3,
  Menu,
  Orbit,
  Rocket,
  Sparkles,
  Telescope,
  X,
} from 'lucide-react'

export const REPOSITORY_URL = 'https://github.com/NStein514/DevOrbit'

export function AppShell({ children }: { children: ReactNode }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const { pathname } = useLocation()
  const isBoard = pathname !== '/'
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
              className={`nav-link ${!isBoard ? 'active' : ''}`}
              to="/"
              aria-current={!isBoard ? 'page' : undefined}
            >
              <LayoutDashboard size={18} />
              Overview
              <span className="nav-active-dot" />
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
            <Link className="nav-link" to="/#roadmap">
              <Telescope size={18} />
              On the horizon
              <ArrowUpRight size={14} className="nav-end" />
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
            <strong>{isBoard ? 'Kanban boards' : 'Overview'}</strong>
          </div>
          <div className="topbar-right">
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
