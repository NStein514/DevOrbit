import { AppShell } from '../components/layout/AppShell'
import { Dashboard } from '../features/dashboard/Dashboard'
import {
  BrowserRouter,
  Link,
  Route,
  Routes,
  useLocation,
} from 'react-router-dom'
import { lazy, Suspense, useEffect } from 'react'
import { WorkspaceProvider } from '../features/workspace/WorkspaceProvider'
import { WorkspaceNotice } from '../features/workspace/WorkspaceNotice'
import { BoardLanding, KanbanPage } from '../features/kanban/KanbanPage'
import { AppearanceProvider } from '../features/settings/AppearanceProvider'
import { BugLanding, BugPage } from '../features/bugs/BugPage'
import { SettingsPage } from '../features/settings/SettingsPage'

const MilestoneLanding = lazy(() =>
  import('../features/milestones/MilestonePage').then((module) => ({
    default: module.MilestoneLanding,
  })),
)
const MilestonePage = lazy(() =>
  import('../features/milestones/MilestonePage').then((module) => ({
    default: module.MilestonePage,
  })),
)

export function App() {
  return (
    <BrowserRouter>
      <AppearanceProvider>
        <WorkspaceProvider>
          <ScrollToLocation />
          <AppShell>
            <WorkspaceNotice />
            <Suspense fallback={<p role="status">Opening your workspace…</p>}>
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/boards" element={<BoardLanding />} />
                <Route path="/bugs" element={<BugLanding />} />
                <Route path="/projects/:projectId/bugs" element={<BugPage />} />
                <Route
                  path="/projects/:projectId/bugs/:bugId"
                  element={<BugPage />}
                />
                <Route path="/milestones" element={<MilestoneLanding />} />
                <Route
                  path="/projects/:projectId/milestones"
                  element={<MilestonePage />}
                />
                <Route
                  path="/projects/:projectId/milestones/:milestoneId"
                  element={<MilestonePage />}
                />
                <Route path="/settings" element={<SettingsPage />} />
                <Route
                  path="/projects/:projectId/boards/:boardId"
                  element={<KanbanPage />}
                />
                <Route
                  path="*"
                  element={
                    <div className="board-not-found">
                      <h1>Lost in space?</h1>
                      <Link className="button button--primary" to="/">
                        Back to mission control
                      </Link>
                    </div>
                  }
                />
              </Routes>
            </Suspense>
          </AppShell>
        </WorkspaceProvider>
      </AppearanceProvider>
    </BrowserRouter>
  )
}

function ScrollToLocation() {
  const { pathname, hash } = useLocation()
  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      if (hash) document.getElementById(hash.slice(1))?.scrollIntoView()
      else window.scrollTo(0, 0)
    })
    return () => cancelAnimationFrame(frame)
  }, [pathname, hash])
  return null
}
