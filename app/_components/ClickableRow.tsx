'use client'

interface Props {
  leadId: string
  children: React.ReactNode
}

export default function ClickableRow({ leadId, children }: Props) {
  return (
    <tr
      onClick={() => {
        window.dispatchEvent(new CustomEvent('open-lead', { detail: leadId }))
      }}
      style={{ cursor: 'pointer' }}
      className="clickable-row"
    >
      {children}
    </tr>
  )
}
