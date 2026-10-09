import { useState, type ReactNode } from 'react'
import { Modal } from '../../components/ui/Modal'

export function ConfirmDialog({
  title,
  children,
  onConfirm,
  onClose,
}: {
  title: string
  children: ReactNode
  onConfirm: () => boolean
  onClose: () => void
}) {
  const [error, setError] = useState(false)
  return (
    <Modal title={title} onClose={onClose}>
      <div className="editor-form">
        <div className="confirmation-copy">{children}</div>
        {error && (
          <p role="alert">
            This change could not be saved. Check the workspace message.
          </p>
        )}
        <footer className="modal-actions">
          <button
            className="button button--outline"
            onClick={onClose}
            autoFocus
          >
            Cancel
          </button>
          <button
            className="button button--danger"
            onClick={() => {
              if (onConfirm()) onClose()
              else setError(true)
            }}
          >
            Confirm deletion
          </button>
        </footer>
      </div>
    </Modal>
  )
}
