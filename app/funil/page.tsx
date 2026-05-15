import Link from 'next/link'
import { supabaseAdmin } from '@/lib/supabase'
import FunilBoard, { type LeadCard } from './FunilBoard'
import LeadDrawer from '../_components/LeadDrawer'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function FunilPage() {
  const [{ data: metricas }, { data: leadsRaw }] = await Promise.all([
    supabaseAdmin.from('sdr_metricas').select('status, total'),
    supabaseAdmin
      .from('sdr_leads')
      .select('id, nome, telefone, cidade, status, data_ultimo_contato, importante, acionar_humano')
      .order('data_ultimo_contato', { ascending: false, nullsFirst: false })
      .limit(700),
  ])

  const counts: Record<string, number> = {}
  for (const m of metricas ?? []) counts[m.status] = Number(m.total)

  const leads = (leadsRaw ?? []) as LeadCard[]
  const total = Object.values(counts).reduce((s, n) => s + n, 0)

  return (
    <main>
      <header style={{ marginBottom: '1.5rem' }}>
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
          <h1 style={{ margin: 0 }}>Funil AIVA</h1>
        </div>
        <p style={{ margin: '0.5rem 0 0', color: 'var(--text-muted)', fontSize: '0.82rem' }}>
          {total.toLocaleString('pt-BR')} leads no funil · clique num card pra abrir o lead
        </p>
      </header>

      <FunilBoard counts={counts} leads={leads} />
      <LeadDrawer />
    </main>
  )
}
