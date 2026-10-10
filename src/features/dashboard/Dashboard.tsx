import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useWorkspace } from '../workspace/context'
import { boardPath, createBoard, isActiveBug, newId } from '../workspace/model'
import { EntityEditor } from '../workspace/WorkspaceDialogs'
import {
  ArrowDown,
  ArrowRight,
  ArrowUpRight,
  Bug,
  Check,
  Circle,
  Flag,
  Timer,
  Gamepad2,
  Github,
  Orbit,
  Rocket,
  Search,
  Sparkles,
  Telescope,
} from 'lucide-react'
import { REPOSITORY_URL } from '../../components/layout/AppShell'
import { Badge } from '../../components/ui/Badge'
import { DetailDialog, type Detail } from '../../components/ui/DetailDialog'
import { SectionHeading } from '../../components/ui/SectionHeading'
import { roadmap } from './data'
import { ProjectCard } from './ProjectCard'
import type { Project, ProjectStatus } from './types'

const roadmapIcons = [Sparkles, Gamepad2]
type Filter = 'All projects' | ProjectStatus

export function Dashboard() {
  const { workspace, update, blocked } = useWorkspace()
  const navigate = useNavigate()
  const [newProject, setNewProject] = useState(false)
  const projectSummaries: Project[] = workspace.projects.map((project) => {
    const columns = project.boards.flatMap((board) => board.columns)
    const total = columns.reduce((sum, column) => sum + column.tasks.length, 0)
    return {
      id: project.id,
      name: project.name,
      description: project.description,
      category: `${project.boards.length} ${project.boards.length === 1 ? 'board' : 'boards'}`,
      status: total ? 'In orbit' : 'Pre-launch',
      completed: columns
        .filter((column) => column.completed)
        .reduce((sum, column) => sum + column.tasks.length, 0),
      total,
      milestone: 'Open Kanban workspace',
      color: 'mint',
    }
  })
  const [filter, setFilter] = useState<Filter>('All projects')
  const [query, setQuery] = useState('')
  const [detail, setDetail] = useState<Detail | null>(null)
  const projects = projectSummaries.filter(
    (project) =>
      (filter === 'All projects' || project.status === filter) &&
      `${project.name} ${project.description} ${project.category}`
        .toLowerCase()
        .includes(query.toLowerCase().trim()),
  )

  return (
    <>
      <div className="page-heading">
        <div>
          <p className="eyebrow">
            <span className="tiny-orbit" /> A LITTLE FOCUS. A LOT OF
            POSSIBILITY.
          </p>
          <h1>
            Mission control<span>.</span>
          </h1>
          <p>
            Your projects, in perspective. Your next launch, a little closer.
          </p>
        </div>
        <a
          className="button button--outline github-button"
          href={REPOSITORY_URL}
          target="_blank"
          rel="noreferrer"
        >
          <Github size={17} />
          View on GitHub
          <ArrowUpRight size={15} />
        </a>
      </div>
      <section className="hero" aria-labelledby="hero-title">
        <div className="hero-content">
          <span className="hero-label">
            <span className="status-dot" />
            WELCOME TO YOUR ORBIT
          </span>
          <h2 id="hero-title">
            Big ideas.
            <br />
            Clear trajectory.
          </h2>
          <p>
            A home for the things you’re building.
            <br />
            Less managing. More making.
          </p>
          <a className="button button--primary" href="#projects">
            Explore your workspace
            <ArrowRight size={17} />
          </a>
        </div>
        <div className="hero-coordinate">
          <Orbit size={14} />
          YOUR NEXT CHAPTER STARTS HERE<span>01 / ∞</span>
        </div>
      </section>
      <div className="overview-stats" aria-label="Workspace summary">
        <div>
          <span className="stat-icon">
            <Rocket size={19} />
          </span>
          <span>
            <small>Projects in orbit</small>
            <strong>
              {
                projectSummaries.filter(
                  (project) => project.status === 'In orbit',
                ).length
              }{' '}
              <span>of {workspace.projects.length} projects</span>
            </strong>
          </span>
        </div>
        <div>
          <span className="stat-icon">
            <Check size={19} />
          </span>
          <span>
            <small>Tasks completed</small>
            <strong>
              {projectSummaries.reduce(
                (sum, project) => sum + project.completed,
                0,
              )}{' '}
              <span>small wins</span>
            </strong>
          </span>
        </div>
        <div>
          <span className="stat-icon">
            <Flag size={19} />
          </span>
          <span>
            <small>Your boards</small>
            <strong className="stat-milestone">
              {workspace.projects.reduce(
                (sum, project) => sum + project.boards.length,
                0,
              )}{' '}
              <span>Custom workflows</span>
            </strong>
          </span>
        </div>
        <Badge>Local workspace</Badge>
      </div>
      <section
        id="projects"
        aria-labelledby="projects-title"
        className="projects-section"
      >
        <SectionHeading
          id="projects-title"
          title="Your little universe"
          subtitle="Your projects, your boards, your way of working."
          action={
            <button
              className="button button--outline"
              disabled={blocked || workspace.projects.length >= 50}
              onClick={() => setNewProject(true)}
            >
              New project
            </button>
          }
        />
        <div className="project-toolbar">
          <div
            className="filter-group"
            role="group"
            aria-label="Filter projects"
          >
            {(['All projects', 'In orbit', 'Pre-launch'] as const).map(
              (item) => (
                <button
                  key={item}
                  className={
                    filter === item ? 'filter-button selected' : 'filter-button'
                  }
                  aria-pressed={filter === item}
                  onClick={() => setFilter(item)}
                >
                  {item}
                  {item === 'All projects' && (
                    <span>{workspace.projects.length}</span>
                  )}
                </button>
              ),
            )}
          </div>
          <label className="search-field">
            <Search size={16} />
            <input
              type="search"
              aria-label="Search projects"
              placeholder="Find a project…"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
            <span aria-hidden="true">⌕</span>
          </label>
        </div>
        <div className="project-grid">
          {projects.map((project) => (
            <ProjectCard
              key={project.id}
              project={project}
              onSelect={(selected) =>
                navigate(
                  boardPath(
                    workspace.projects.find(
                      (project) => project.id === selected.id,
                    )!,
                  ),
                )
              }
            />
          ))}
        </div>
        <p
          className={projects.length ? 'sr-only' : 'empty-state'}
          role="status"
        >
          {projects.length
            ? `${projects.length} projects shown`
            : 'No projects in this orbit. Try another search or filter.'}
        </p>
      </section>
      <section className="dashboard-bugs" aria-label="Bug tracking summary">
        <span className="bug-stat-icon">
          <Bug size={20} />
        </span>
        <div>
          <h2>Keep the unexpected in sight.</h2>
          <p>
            {workspace.projects.reduce(
              (sum, project) => sum + project.bugs.filter(isActiveBug).length,
              0,
            )}{' '}
            active bugs across your projects.
          </p>
        </div>
        <Link className="text-link" to="/bugs">
          Open bug tracking <ArrowUpRight size={15} />
        </Link>
      </section>
      <section className="dashboard-bugs" aria-label="Milestone summary">
        <span className="bug-stat-icon">
          <Flag size={20} />
        </span>
        <div>
          <h2>A destination for your next launch.</h2>
          <p>
            {workspace.projects.reduce(
              (sum, project) =>
                sum +
                project.milestones.filter(
                  (milestone) => milestone.status === 'completed',
                ).length,
              0,
            )}{' '}
            of{' '}
            {workspace.projects.reduce(
              (sum, project) => sum + project.milestones.length,
              0,
            )}{' '}
            milestones completed.
          </p>
        </div>
        <Link className="text-link" to="/milestones">
          Open milestones <ArrowUpRight size={15} />
        </Link>
      </section>
      <section className="dashboard-bugs" aria-label="GitHub summary">
        <span className="bug-stat-icon">
          <Github size={20} />
        </span>
        <div>
          <h2>Your code, in the same orbit.</h2>
          <p>
            {
              workspace.projects.filter((project) => project.githubRepository)
                .length
            }{' '}
            projects linked to GitHub repositories.
          </p>
        </div>
        <Link className="text-link" to="/github">
          Open GitHub integration <ArrowUpRight size={15} />
        </Link>
      </section>
      <section className="dashboard-bugs" aria-label="Games arcade summary">
        <span className="bug-stat-icon">
          <Gamepad2 size={20} />
        </span>
        <div>
          <h2>Your next escape is in orbit.</h2>
          <p>
            Dodge asteroids, collect energy, and play a little between focus
            sessions.
          </p>
        </div>
        <Link className="text-link" to="/games">
          Open Games arcade <ArrowUpRight size={15} />
        </Link>
      </section>
      <div className="lower-grid">
        <section className="focus-panel" aria-labelledby="focus-title">
          <div className="panel-eyebrow">
            <span>
              <span className="status-dot" />A GOOD PLACE TO START
            </span>
            <Telescope size={19} />
          </div>
          <h2 id="focus-title">
            Make space for
            <br />
            your next small win.
          </h2>
          <p>
            You don’t need a sprint planning meeting.
            <br />
            Just one clear next step.
          </p>
          <div className="next-step">
            <span className="step-circle">
              <Circle size={18} />
            </span>
            <div>
              <strong>Find your focus rhythm</strong>
              <small>
                Personal focus sessions <span>·</span> Breaks that fit your day
              </small>
            </div>
            <Badge tone="green">Ready</Badge>
          </div>
          <Link className="text-link" to="/pomodoro">
            <Timer size={16} /> Open Pomodoro Timer
            <ArrowUpRight size={16} />
          </Link>
          <span className="focus-orbit" aria-hidden="true" />
        </section>
        <section
          id="roadmap"
          className="roadmap-panel"
          aria-labelledby="roadmap-title"
        >
          <SectionHeading
            id="roadmap-title"
            title="On the horizon"
            subtitle="Your workspace is just getting started."
            action={<Badge>Planned</Badge>}
          />
          <div className="roadmap-list">
            {roadmap.map((feature, index) => {
              const Icon = roadmapIcons[index]
              return (
                <button
                  key={feature.id}
                  className="roadmap-item"
                  onClick={() =>
                    setDetail({
                      title: feature.title,
                      description: feature.description,
                      label: 'ON THE HORIZON · PLANNED',
                    })
                  }
                >
                  <span className="roadmap-icon">
                    <Icon size={18} />
                  </span>
                  <span>
                    <strong>{feature.title}</strong>
                    <small>{feature.caption}</small>
                  </span>
                  <ArrowUpRight size={16} />
                </button>
              )
            })}
          </div>
        </section>
      </div>
      <div className="foundation-note">
        <span>
          <Sparkles size={16} />
          Built for solo flights. Room to grow.
        </span>
        <a href="#main-content">
          Back to the stars
          <ArrowDown size={14} />
        </a>
      </div>
      <DetailDialog detail={detail} onClose={() => setDetail(null)} />
      {newProject && (
        <EntityEditor
          title="New project"
          onClose={() => setNewProject(false)}
          onSave={(name, description) => {
            const project = {
              id: newId(),
              name,
              description,
              boards: [createBoard()],
              bugs: [],
              milestones: [],
            }
            const saved = update((current) => ({
              ...current,
              projects: [...current.projects, project],
            }))
            if (saved) navigate(boardPath(project))
            return saved
          }}
        />
      )}
    </>
  )
}
