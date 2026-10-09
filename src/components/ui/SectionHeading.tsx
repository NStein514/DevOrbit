import type { ReactNode } from 'react'

export function SectionHeading({
  id,
  title,
  subtitle,
  action,
}: {
  id: string
  title: string
  subtitle?: string
  action?: ReactNode
}) {
  return (
    <div className="section-heading">
      <div>
        <h2 id={id}>{title}</h2>
        {subtitle && <p>{subtitle}</p>}
      </div>
      {action}
    </div>
  )
}
