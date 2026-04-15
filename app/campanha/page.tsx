import CampanhaForm from './CampanhaForm'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default function CampanhaPage() {
  return (
    <main>
      <header style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <a
            href="/"
            style={{
              color: 'var(--text-muted)',
              textDecoration: 'none',
              fontSize: '0.85rem',
              padding: '0.35rem 0.6rem',
              border: '1px solid var(--border)',
              borderRadius: 6,
            }}
          >
            ← Voltar
          </a>
          <h1 style={{ margin: 0 }}>Disparar campanha</h1>
        </div>
        <p style={{ margin: '0.5rem 0 0', color: 'var(--text-muted)', fontSize: '0.82rem' }}>
          Cole a lista de telefones e dispare o template HSM inicial
        </p>
      </header>
      <CampanhaForm />
    </main>
  )
}
