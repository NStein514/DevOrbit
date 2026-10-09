import type { Project } from './types'

// Deliberately local examples, not persisted user projects.
export const demoProjects: Project[] = [
  {
    id: 'devorbit',
    name: 'DevOrbit',
    description: 'A calmer mission control for side projects.',
    category: 'Developer tools',
    status: 'In orbit',
    completed: 8,
    total: 12,
    milestone: 'First light · v0.1',
    color: 'mint',
  },
  {
    id: 'cosmic-notes',
    name: 'Cosmic Notes',
    description: 'A quiet place for ideas worth keeping.',
    category: 'Productivity',
    status: 'In orbit',
    completed: 5,
    total: 16,
    milestone: 'An idea takes shape',
    color: 'lavender',
  },
  {
    id: 'launchpad',
    name: 'Launchpad',
    description: 'Give your next idea a beautiful landing.',
    category: 'Web app',
    status: 'Pre-launch',
    completed: 2,
    total: 10,
    milestone: 'Ready for countdown',
    color: 'peach',
  },
]

export const roadmap = [
  {
    id: 'kanban',
    title: 'Kanban boards',
    description:
      'Give every idea a place. Plan work visually, set priorities, and move tasks from the backlog to done.',
    caption: 'A clear path from idea to done.',
  },
  {
    id: 'bugs',
    title: 'Bug tracking',
    description:
      'Capture issues with severity, reproduction steps, and project context, so fixes stay connected to the work.',
    caption: 'Keep the small things from drifting.',
  },
  {
    id: 'milestones',
    title: 'Milestones',
    description:
      'Turn big goals into smaller launches. Group work into milestones and see what is left before release.',
    caption: 'Big ambitions. Reachable checkpoints.',
  },
  {
    id: 'github',
    title: 'GitHub integration',
    description:
      'Connect repositories, issues, and pull requests to your projects. Secure authentication and synchronization will be built in a later phase.',
    caption: 'Your code and your plans, connected.',
  },
  {
    id: 'changelog',
    title: 'Changelog generation',
    description:
      'Turn completed work into readable release notes. Review and edit each changelog before publishing.',
    caption: 'Every little launch deserves a story.',
  },
] as const
