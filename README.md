# DevOrbit

A calmer mission control for individual developers and their side projects. A space-inspired workspace for planning, building, and shipping.

## Current scope

This is the application foundation: React, TypeScript, Vite, and a responsive homepage. It includes sample projects, client-side search and status filtering, accessible detail dialogs, and a preview of the product roadmap. Project information is illustrative, held in memory, and resets on reload.

Kanban boards, bug tracking, milestones, GitHub integration, and changelog generation are **planned**, not implemented. There is no backend, authentication, persistence, or external API connection. GitHub links open this repository; they are not an account integration. No game mechanics are included.

## Getting started

Use Node.js 24 LTS (see `.nvmrc`) and npm. The project requires Node.js 24 or newer for a consistent toolchain.

```sh
nvm use # if you use nvm
npm ci
npm run dev
```

Vite prints the local development address. For a development container, use `npm run dev -- --host 0.0.0.0`. No environment variables or credentials are required.

If your environment has a read-only home directory, use a writable npm cache: `export npm_config_cache=/tmp/devorbit-npm-cache`.

## Development commands

| Command                | Purpose                                                |
| ---------------------- | ------------------------------------------------------ |
| `npm run dev`          | Start Vite with fast refresh                           |
| `npm run build`        | Type-check and create the production bundle in `dist/` |
| `npm run preview`      | Serve the production build locally                     |
| `npm run typecheck`    | Check TypeScript project references                    |
| `npm run lint`         | ESLint with zero warnings permitted                    |
| `npm run format`       | Format source and configuration with Prettier          |
| `npm run format:check` | Check formatting without modifying files               |
| `npm test`             | Playwright desktop and mobile Chromium checks          |
| `npm run test:ui`      | Interactive Playwright test runner                     |
| `npm run check`        | Lint, formatting, production build, and browser tests  |

Before the first browser test run, install Chromium:

```sh
npx playwright install chromium
npm run check
```

On Linux, Playwright may need system packages; use `npx playwright install --with-deps chromium` where supported. To reuse installed Chromium, set `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` to its absolute executable path instead. Tests start their own Vite server on port 4173 and use two workers. CI does not reuse an existing server.

The browser suite checks rendering, local image delivery, browser errors, horizontal overflow, combined search/filtering, empty results, sample project dialogs, keyboard dismissal and focus restoration, and desktop/mobile navigation.

## Project structure

```text
public/
  favicon.svg                  # Orbit brand mark
  images/devorbit-planet.png    # Original space artwork
src/
  app/App.tsx                  # Application composition
  components/
    layout/AppShell.tsx         # Sidebar, mobile navigation, header, footer
    ui/                        # Shared badges, headings, native dialog
  features/
    dashboard/
      Dashboard.tsx            # Homepage and local UI state
      ProjectCard.tsx          # Reusable project summary
      data.ts                  # Demonstration data
      types.ts                 # Project domain types
  styles/global.css            # Tokens, components, responsive layouts
  main.tsx                     # React entry point
tests/homepage.spec.ts          # Browser behavior checks
```

Feature-specific components, types, and future API adapters live together. Broadly reusable UI lives in `components/`. The UI uses semantic HTML, visible keyboard focus, a skip link, native modal focus management, and reduced-motion support.

There is one screen, so navigation uses section anchors. Add a router when project and issue screens need distinct URLs. Local React state serves the current UI; introduce server-state management with a real API.

Typography uses self-hosted DM Sans and Manrope through Fontsource. Fonts and original planet artwork are served locally; the homepage needs no third-party requests at runtime.

## Product roadmap

- **Kanban boards:** project-scoped tasks, ordering, and workflow columns.
- **Bug tracking:** severity, reproduction steps, and issue context.
- **Milestones:** scoped release goals and progress.
- **GitHub integration:** authenticated repositories, issues, and pull requests.
- **Changelog generation:** editable release notes from completed work.

Before enabling real data, establish persistence and authentication. GitHub credentials must stay behind a backend or secure OAuth flow; never put secrets in `VITE_*` variables, which are bundled into the browser.

## Contribution and ownership

Use your own Git identity for commits. This project does not configure an author, add automated co-author trailers, or create commits during setup. Review and commit changes with your normal Git workflow.
