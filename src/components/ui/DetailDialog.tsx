import { useEffect, useRef } from 'react'
import { Orbit, X } from 'lucide-react'

export interface Detail {
  title: string
  description: string
  label: string
}

export function DetailDialog({
  detail,
  onClose,
}: {
  detail: Detail | null
  onClose: () => void
}) {
  const ref = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    const dialog = ref.current
    if (detail && dialog && !dialog.open) dialog.showModal()
    if (!detail && dialog?.open) dialog.close()
  }, [detail])

  return (
    <dialog
      ref={ref}
      className="detail-dialog"
      aria-labelledby="dialog-title"
      onClose={onClose}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <div className="dialog-content">
        <button
          className="icon-button dialog-close"
          aria-label="Close details"
          onClick={onClose}
        >
          <X size={20} />
        </button>
        <span className="dialog-orbit">
          <Orbit size={30} />
        </span>
        <p className="eyebrow">{detail?.label}</p>
        <h2 id="dialog-title">{detail?.title}</h2>
        <p>{detail?.description}</p>
        <p className="dialog-note">
          You’re exploring the DevOrbit foundation. Project data is
          illustrative; management features are on the roadmap.
        </p>
        <button className="button button--primary" onClick={onClose}>
          Back to mission control
        </button>
      </div>
    </dialog>
  )
}
