import Link from 'next/link'
import CuradoriaList from './CuradoriaList'

export const dynamic = 'force-dynamic'

export default function CuradoriaPage() {
  return (
    <main>
      <header style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <Link
            href="/"
            style={{
              color: 'var(--text-dim)',
              textDecoration: 'none',
              fontSize: '0.85rem',
              padding: '0.35rem 0.6rem',
              border: '1px solid var(--border)',
              borderRadius: 6,
              background: 'var(--bg-elev)',
            }}
          >
            ← Voltar
          </Link>
          <h1 style={{ margin: 0 }}>Curadoria de mensagens</h1>
        </div>
        <p style={{ margin: '0.5rem 0 0', color: 'var(--text-muted)', fontSize: '0.82rem' }}>
          Avalie as respostas da VictorIA e anote correções — base pra melhorar o agente.
        </p>
      </header>

      <CuradoriaList />
    </main>
  )
}
