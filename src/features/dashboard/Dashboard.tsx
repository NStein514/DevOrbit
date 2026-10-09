import { useState } from 'react'
import {
  ArrowDown,
  ArrowRight,
  ArrowUpRight,
  Bug,
  Check,
  Circle,
  Flag,
  GitBranch,
  Github,
  Layers3,
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
import { demoProjects, roadmap } from './data'
import { ProjectCard } from './ProjectCard'
import type { ProjectStatus } from './types'

const roadmapIcons = [Layers3, Bug, Flag, GitBranch, Sparkles]
type Filter = 'All projects' | ProjectStatus

export function Dashboard() {
  const [filter, setFilter] = useState<Filter>('All projects')
  const [query, setQuery] = useState('')
  const [detail, setDetail] = useState<Detail | null>(null)
  const projects = demoProjects.filter(
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
      <div className="overview-stats" aria-label="Example workspace summary">
        <div>
          <span className="stat-icon">
            <Rocket size={19} />
          </span>
          <span>
            <small>Projects in orbit</small>
            <strong>
              02 <span>of 3 projects</span>
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
              15 <span>small wins</span>
            </strong>
          </span>
        </div>
        <div>
          <span className="stat-icon">
            <Flag size={19} />
          </span>
          <span>
            <small>Next milestone</small>
            <strong className="stat-milestone">
              First light <span>DevOrbit · v0.1</span>
            </strong>
          </span>
        </div>
        <Badge>Sample workspace</Badge>
      </div>
      <section
        id="projects"
        aria-labelledby="projects-title"
        className="projects-section"
      >
        <SectionHeading
          id="projects-title"
          title="Your little universe"
          subtitle="A sample workspace for the things you’ll bring to life."
          action={<span className="section-count">03 PROJECTS</span>}
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
                  {item === 'All projects' && <span>3</span>}
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
                setDetail({
                  title: selected.name,
                  label: 'EXAMPLE PROJECT',
                  description: `${selected.description} This sample has ${selected.completed} of ${selected.total} tasks complete, with “${selected.milestone}” as its next milestone.`,
                })
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
              <strong>Lay the foundation</strong>
              <small>
                DevOrbit <span>·</span> First light milestone
              </small>
            </div>
            <Badge tone="green">In progress</Badge>
          </div>
          <a
            className="text-link"
            href={`${REPOSITORY_URL}#getting-started`}
            target="_blank"
            rel="noreferrer"
          >
            Get to know the project
            <ArrowUpRight size={16} />
          </a>
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
    </>
  )
}
