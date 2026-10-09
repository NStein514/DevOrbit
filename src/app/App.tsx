import { AppShell } from '../components/layout/AppShell'
import { Dashboard } from '../features/dashboard/Dashboard'

export function App() {
  return (
    <AppShell>
      <Dashboard />
    </AppShell>
  )
}
