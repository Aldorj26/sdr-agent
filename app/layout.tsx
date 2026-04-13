import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'SDR Agent AIVA',
  description: 'Agente SDR autônomo para prospecção AIVA — Track Tecnologia',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  )
}
