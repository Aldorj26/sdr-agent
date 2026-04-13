'use client'

interface Props {
  leadId: string
  children: React.ReactNode
}

export default function TimelineRow({ leadId, children }: Props) {
  return (
    <div
      className="timeline-item"
      onClick={() => {
        window.dispatchEvent(new CustomEvent('open-lead', { detail: leadId }))
      }}
    >
      {children}
    </div>
  )
}
