# DevOrbit

A calmer mission control for individual developers and their side projects. A space-inspired workspace for planning, building, and shipping.

## Current scope

DevOrbit includes a responsive homepage, personalization settings, a customizable Kanban workspace, project-level bug tracking, and milestones built with React, TypeScript, and Vite. The homepage shows real project/task progress and bug/milestone summaries. Start with an empty DevOrbit project, or create your own projects and boards.

Kanban supports creating, renaming, and deleting projects and boards; custom column names, colors, ordering, completion states, and optional work-in-progress limits; and tasks with descriptions, priority, labels, and due dates. Drag tasks between columns, reorder tasks and columns, duplicate tasks, and search/filter work. Browser-local persistence and JSON backups are included.

GitHub integration and changelog generation remain **planned**. There is no backend, authentication, or external API connection. GitHub links open this repository; they are not an account integration.

## Using your Kanban workspace

1. Open **Kanban boards** in the sidebar or select a project on the homepage. `/boards` opens the first board; individual boards have bookmarkable URLs.
2. Use **New project** and the **+** next to the board tabs to create your own spaces. Project settings and board settings let you rename them and edit descriptions.
3. Use **Add column** or a column's settings button to customize your workflow. Choose a color, position, work-in-progress limit, and whether its tasks count as completed. A limit of `0` is unlimited. Limits show warnings rather than blocking work.
4. Use **New task** or **Add task** in a column. Set a title, description, priority, labels separated by commas, and an optional due date. Click a task to edit it, change its column, or set its position.
5. Drag by the grip handles to reorder tasks/columns. Keyboard users can focus a handle, press **Space**, use arrow keys, then **Space** to drop or **Escape** to cancel. The task/column editors provide explicit position controls as an alternative. On mobile, scroll the board horizontally to reach other columns.
6. Filter by text, priority, and label. Dragging is disabled while filters are active so hidden tasks cannot accidentally change position; editing remains available.
7. Export the complete workspace using the download button beside the board tabs. Import accepts a validated version 1 JSON backup up to 3 MB and requires confirmation before replacing current data.

Deleting a populated column moves its tasks to a destination you choose. Task, board, and project deletion requires confirmation and cannot be undone. At least one project, one board per project, and one column per board must remain. Workspace limits are 50 projects, 30 boards per project, 30 columns per board, and 1,000 tasks per column; browser storage capacity may be reached earlier.

## Tracking bugs

1. Open **Bug tracking** in the sidebar or mobile menu, or use the bug-tracking link on a Kanban board. Select a project to see only its reports. `/bugs` opens the first project's tracker.
2. Choose **Report a bug**. A title is required; add a description, reproduction steps, expected and actual behavior, environment details, and comma-separated labels. Severity defaults to Medium; choose Low (cosmetic), Medium (workaround available), High (broken feature), or Critical (blocker/data loss).
3. Open a report to view its complete details and bookmark its URL. Use **Edit bug** to revise any field. Reports retain their creation date and update their modified date when edited or when their status changes.
4. Change status in the list or on the report: **Open → In progress → Resolved → Closed**. Resolved means the fix is ready to verify; close it after verification. You can reopen any report by selecting Open. Active counts include Open and In progress.
5. Search across report references, titles, descriptions, reproduction details, environment, and labels. Combine status, severity, and label filters; sort by recent updates, report date, or highest severity. Clear filters to recover the full list.
6. Delete a report from its detail page after confirmation. Deleting a report does not change Kanban tasks. Deleting a project also deletes its bug reports; the confirmation explains this.
7. Export/import buttons on the issue list back up the **entire workspace**, including all projects, boards, tasks, bug reports, and milestones. Imports require confirmation before replacing existing data. A backup from before bug tracking is still accepted and contains no reports, so importing it also clears current reports.

Bug reports use the existing browser storage and cross-tab synchronization. Existing workspaces load with an empty bug list without losing boards or tasks. A stale report editor warns if another tab changes or removes the report before saving; close and reopen it to edit the current version. There is a limit of 1,000 reports per project, 12 labels per report (30 characters each), 120 characters per title, 1,000 for environment details, and 10,000 for each detailed text field. Browser storage limits may be reached sooner; the storage notice provides a backup action.

Bug tracking is local to your workspace. It does not yet synchronize with GitHub issues, attach files, or automatically create/move Kanban tasks. Share reports across devices by exporting and importing the workspace; a report URL alone does not transfer its data.

## Planning milestones

1. Open **Milestones** in the sidebar or mobile menu, or follow the Milestones link from a board or bug tracker. Select a project to see its goals. `/milestones` opens the first project's list; each milestone has a bookmarkable detail URL.
2. Choose **New milestone**. Give it a name, describe the goal, and optionally set a target date. Link tasks from any board in that project and bug reports using the searchable work picker. Filter by Tasks, Bugs, or Selected only while keeping your selections.
3. Open a milestone to see its scope, progress, and target date. Follow linked tasks to their board or bugs to their report. Task editors and bug details show links back to their milestones. **Edit milestone** or **Manage work** lets you revise the goal or change its scope.
4. Use **Start milestone** to move from Planned to In progress. Progress is calculated from tasks in columns marked completed and bugs marked Resolved or Closed, with each item weighted equally. Completing all linked work enables **Complete milestone**; completion stays an explicit decision. Goals without linked work show “No work linked yet” and can be completed manually.
5. Reopen completed milestones or return active ones to Planned. Reopening linked work, changing its column to incomplete, or adding unfinished work automatically reopens a completed milestone as In progress and clears its completion date.
6. Search names/descriptions, filter by status or Overdue, and sort by target date or recent updates. Undated goals sort last by target date. Deadlines use your local calendar date: a goal due today is not overdue, and completed goals are never overdue.
7. Delete milestones after confirmation without deleting their linked tasks or bugs. Deleting tasks, boards, or bugs removes those links and recalculates progress. Deleting a project also removes its milestones.

A task or bug can belong to multiple milestones within its project. There is a limit of 100 milestones per project, 1,000 linked tasks and 1,000 linked bugs per milestone, 120 characters per name, and 10,000 per description. Milestones share workspace persistence, storage recovery, cross-tab synchronization, and JSON backups. Stale editors warn before overwriting another tab's milestone changes.

Export/import buttons on the milestone list transfer the **entire workspace**. Older version 1 backups remain supported and load with no milestones; importing one replaces current data, including milestones. Invalid, duplicate, or cross-project work references are rejected. Milestone URLs identify browser-local data and do not share it across devices.

## Personalizing DevOrbit

Open **Settings** in the sidebar (or the mobile navigation menu), then **Personalization**. You can also open `/settings` directly.

- **Light**, **Dark**, or **System** appearance. System is the default and follows your device's color scheme, including changes while DevOrbit is open. Light and Dark override your device preference.
- **Green**, **Red**, **Orange**, **Yellow**, **Blue**, **Purple**, or **Violet** accents. Green is the default. The accent updates buttons, links, navigation, highlights, progress bars, the planet artwork, and the browser-tab icon background. A live preview shows your choices immediately.
- **Restore defaults** returns to System appearance and Green accents without changing projects, boards, or tasks.

Preferences save automatically under `devorbit.appearance.v1` in browser `localStorage`, separately from workspace data. They survive reloads and synchronize with other tabs on the same origin. Workspace JSON backups contain project data only; they do not import or export appearance preferences. If storage is unavailable, appearance changes still apply for the current session and Settings explains why they could not be saved.

The Kanban column color **Theme accent** follows your selected accent (existing sage/green columns use this option). Other explicitly chosen column colors and priority/error indicators retain their meaning and adapt for readability in dark mode.

## Where your data lives

Data is saved under `devorbit.workspace.v1` in `localStorage` after each change. It survives reloads and browser restarts on the **same browser profile and origin**. Different ports, browsers, devices, and private browsing sessions have separate workspaces. Running the production preview on another port will not show your development-server data automatically; use export/import to transfer it.

There is no account or cloud sync. Clearing site data removes the workspace, so keep JSON backups. Saved changes appear in other tabs on the same origin; this is a single-user workspace, not a collaborative editor. Avoid editing the same task simultaneously in multiple tabs.

Malformed or unsupported saved data is preserved and editing is blocked until you import a valid backup or explicitly reset. The recovery notice lets you download the original data first. If storage is full or unavailable, changes stay in memory and an explicit warning provides an export action; export before closing or refreshing the page.

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

The browser suite covers homepage rendering/navigation and Kanban task creation/editing/moving/duplication/deletion, column customization and safe task migration, board/project isolation, filters, pointer and keyboard ordering, reload persistence, export/import validation, storage failure recovery, multi-tab updates, homepage progress, and mobile layouts. Personalization checks cover all seven accents in both themes, text contrast, live system appearance changes, keyboard controls, cross-tab updates, favicon/artwork changes, persistence, and storage recovery. Bug-tracking tests cover report lifecycle, direct URLs, search/filter/sort, project isolation, legacy backups, malformed imports, cross-tab conflicts, storage recovery, limits, and responsive themed layouts. Milestone tests cover linked work across boards and bugs, live progress, completion/reopening, safe deletion, local deadlines, filters, project isolation, backup compatibility, invalid references, cross-tab conflicts, storage recovery, limits, and mobile layouts. Tests use isolated browser contexts and do not change your personal workspace. Mobile tests emulate a Chromium device; they are not a substitute for testing Safari or physical devices.

## Project structure

```text
public/
  favicon.svg                  # Orbit brand mark
  images/devorbit-planet.png    # Original space artwork
src/
  app/App.tsx                  # Router and application composition
  components/
    layout/AppShell.tsx         # Sidebar, mobile navigation, header, footer
    ui/                        # Shared badges, headings, native modals
  features/
    dashboard/
      Dashboard.tsx            # Homepage and local UI state
      ProjectCard.tsx          # Reusable project summary
      data.ts                  # Planned feature descriptions
      types.ts                 # Dashboard presentation types
    kanban/
      KanbanPage.tsx           # Board orchestration, filters, drag-and-drop
      BoardColumn.tsx         # Sortable column and task collection
      TaskCard.tsx            # Sortable card with task actions
      TaskEditor.tsx          # Task details, column and position controls
      ColumnEditor.tsx        # Column customization
      ConfirmDialog.tsx       # Destructive-action confirmation
      kanban.css              # Board, editor, and responsive styling
    bugs/
      BugPage.tsx             # Project tracker, filters, sorting, workflow actions
      BugEditor.tsx           # Validated reporting and editing form
      BugDetails.tsx          # Bookmarkable reproduction details and properties
      presentation.ts         # Status/severity labels and report formatting
      bugs.css                # Responsive tracker, details, and dashboard summary
    milestones/
      MilestonePage.tsx       # Lazy-loaded project list, filters, routing, actions
      MilestoneEditor.tsx     # Goal details and scope editing
      MilestoneDetails.tsx    # Linked work, progress, deadlines, status controls
      MilestoneCard.tsx       # Goal summary and accessible progress display
      WorkPicker.tsx          # Searchable project task/bug selection
      RelatedMilestones.tsx   # Links back from task and bug details
      presentation.ts         # Status labels and local date formatting
      milestones.css          # Responsive milestone list, details, and editor
    settings/
      SettingsPage.tsx        # Appearance controls and live preview
      AppearanceProvider.tsx  # Preferences, system detection, tab synchronization
      appearance.ts           # Palette definitions, validation, theme/favicon updates
      context.ts              # Typed appearance context and hook
      settings.css            # Responsive personalization layout
    workspace/
      model.ts                # Versioned Zod schemas and domain helpers
      context.ts              # Workspace context and typed hook
      WorkspaceProvider.tsx   # Shared state and browser persistence
      WorkspaceDialogs.tsx    # Project/board editing and backup import
      WorkspaceNotice.tsx     # Storage errors and recovery
  styles/global.css            # Shared components and responsive layouts
  styles/theme.css             # Light/dark tokens and accent-aware surfaces
  main.tsx                     # React entry point
tests/homepage.spec.ts          # Homepage regression checks
tests/kanban.spec.ts            # Kanban workflows and persistence checks
tests/bugs.spec.ts              # Bug lifecycle, isolation, backups, recovery checks
tests/milestones.spec.ts        # Scope, progress, lifecycle, backups, recovery checks
tests/settings.spec.ts          # Appearance, accent, persistence, and contrast checks
```

Feature-specific components, types, and future API adapters live together. Broadly reusable UI lives in `components/`. The UI uses semantic HTML, visible keyboard focus, a skip link, native modal focus management, and reduced-motion support.

React Router provides `/`, `/settings`, `/boards`, `/projects/:projectId/boards/:boardId`, `/bugs`, `/projects/:projectId/bugs`, `/projects/:projectId/bugs/:bugId`, `/milestones`, `/projects/:projectId/milestones`, and `/projects/:projectId/milestones/:milestoneId`. Vite serves direct application URLs in development and preview; a production host must rewrite application routes to `index.html`. Unknown routes and missing boards, projects, reports, or milestones have recovery links.

The appearance provider applies CSS variables at the document root so all pages and modal dialogs share the same theme. Stored preferences apply before React mounts; the artwork is tinted through CSS and the favicon is updated with a local SVG data URL. No extra artwork downloads or external requests are needed when changing accents.

The workspace provider owns shared state and persistence, Zod validates stored/imported data, and dnd-kit handles pointer and keyboard drag-and-drop. Storage uses a versioned format, with stable IDs and duplicate-ID checks. Features consume a shared context instead of directly writing browser storage. A future server adapter can replace this boundary without putting network logic inside task cards.

Typography uses self-hosted DM Sans and Manrope through Fontsource. Fonts and original planet artwork are served locally; the homepage needs no third-party requests at runtime.

## Product roadmap

- **Kanban boards (implemented):** project-scoped tasks, multiple boards, custom workflows, ordering, and local backups.
- **Personalization (implemented):** Light/Dark/System modes, seven accents, matching planet artwork and tab icon, and browser-local preferences.
- **Bug tracking (implemented):** project-scoped reports, severity, reproduction details, status lifecycle, filters, stable URLs, and local backups.
- **Milestones (implemented):** project-scoped goals, linked Kanban tasks and bugs, live progress, target dates, lifecycle controls, and local backups.
- **GitHub integration:** authenticated repositories, issues, and pull requests.
- **Changelog generation:** editable release notes from completed work.

Before adding cloud sync, establish server persistence and authentication. GitHub credentials must stay behind a backend or secure OAuth flow; never put secrets in `VITE_*` variables, which are bundled into the browser.

## Contribution and ownership

Use your own Git identity for commits. This project does not configure an author, add automated co-author trailers, or create commits during setup. Review and commit changes with your normal Git workflow.
