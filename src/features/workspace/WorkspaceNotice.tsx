import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useWorkspace } from './context'
import { createWorkspace, downloadWorkspace } from './model'
import { ImportWorkspace } from './WorkspaceDialogs'
import { ConfirmDialog } from '../kanban/ConfirmDialog'

export function WorkspaceNotice() {
  const { error, blocked, workspace, replace } = useWorkspace()
  const [dialog, setDialog] = useState<'import' | 'reset' | null>(null)
  const [downloadError, setDownloadError] = useState('')
  const navigate = useNavigate()
  if (!error) return null
  return (
    <div className="workspace-notice">
      <p role="alert">{error}</p>
      <div className="notice-actions">
        <button
          className="text-button"
          onClick={() => {
            if (!blocked) {
              downloadWorkspace(workspace)
              return
            }
            try {
              const raw = localStorage.getItem('devorbit.workspace.v1') ?? ''
              const url = URL.createObjectURL(
                new Blob([raw], { type: 'application/json' }),
              )
              const link = document.createElement('a')
              link.href = url
              link.download = 'devorbit-original-workspace.json'
              link.click()
              setTimeout(() => URL.revokeObjectURL(url), 1000)
            } catch {
              setDownloadError(
                'The browser did not allow access to the original data.',
              )
            }
          }}
        >
          {blocked ? 'Download original data' : 'Export unsaved workspace'}
        </button>
        <button className="text-button" onClick={() => setDialog('import')}>
          Import backup
        </button>
        {blocked && (
          <button className="text-button" onClick={() => setDialog('reset')}>
            Reset workspace
          </button>
        )}
      </div>
      {downloadError && <p role="alert">{downloadError}</p>}
      {dialog === 'import' && (
        <ImportWorkspace
          onClose={() => {
            setDialog(null)
            navigate('/boards')
          }}
        />
      )}
      {dialog === 'reset' && (
        <ConfirmDialog
          title="Reset unreadable workspace?"
          onClose={() => setDialog(null)}
          onConfirm={() => {
            const saved = replace(createWorkspace())
            if (saved) navigate('/boards')
            return saved
          }}
        >
          <p>
            This removes the saved workspace from this browser. Download the
            original data first if you need to recover it. This cannot be
            undone.
          </p>
        </ConfirmDialog>
      )}
    </div>
  )
}
