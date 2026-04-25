import Link from 'next/link'
import { supabaseAdmin } from '@/lib/supabase'

export const dynamic = 'force-dynamic'
export const revalidate = 0

interface CampanhaDia {
  dia: string
  total_leads: number
  responderam: number
  interessados: number
  formulario_enviado: number
  opt_out: number
  nao_qualificado: number
  descartados: number
  sem_resposta: number
  disparo_realizado: number
  produtos: string[] | null
}

async function getCampanhasPorDia(): Promise<CampanhaDia[]> {
  const { data } = await supabaseAdmin.rpc('get_campanhas_por_dia')
  return (data ?? []) as CampanhaDia[]
}

function fmtDia(iso: string): string {
  // iso vem como 'YYYY-MM-DD' (já em BRT). Não usar Date pra evitar shift de timezone.
  const [y, m, d] = iso.split('-')
  return `${d}/${m}/${y}`
}

function pct(num: number, den: number): string {
  if (den === 0) return '—'
  return `${((num / den) * 100).toFixed(1)}%`
}

function pctColor(pct: number): string {
  if (pct >= 25) return '#34d399'
  if (pct >= 10) return '#fbbf24'
  return '#f87171'
}

export default async function CampanhasPage() {
  const campanhas = await getCampanhasPorDia()

  const totalGeral = campanhas.reduce((s, c) => s + Number(c.total_leads), 0)
  const respondGeral = campanhas.reduce((s, c) => s + Number(c.responderam), 0)
  const formGeral = campanhas.reduce((s, c) => s + Number(c.formulario_enviado), 0)

  return (
    <main>
      <header style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <Link
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
          </Link>
          <h1 style={{ margin: 0 }}>Campanhas por dia</h1>
        </div>
        <p style={{ margin: '0.5rem 0 0', color: 'var(--text-muted)', fontSize: '0.82rem' }}>
          Funil de cada lote disparado · agrupado pelo dia em BRT
        </p>
      </header>

      {/* Resumo geral */}
      <div className="cards-grid" style={{ marginBottom: '2rem' }}>
        <SummaryCard label="Total disparado" value={totalGeral} hint="todos os lotes" color="#6b7280" />
        <SummaryCard
          label="Responderam"
          value={respondGeral}
          hint={pct(respondGeral, totalGeral) + ' de conversão'}
          color="#fb923c"
        />
        <SummaryCard
          label="Formulário enviado"
          value={formGeral}
          hint={pct(formGeral, totalGeral) + ' do total'}
          color="#60a5fa"
        />
        <SummaryCard
          label="Lotes (dias)"
          value={campanhas.length}
          hint="dias com disparo registrado"
          color="#a78bfa"
        />
      </div>

      {/* Tabela por dia */}
      {campanhas.length === 0 ? (
        <div
          style={{
            padding: '2rem',
            textAlign: 'center',
            color: 'var(--text-muted)',
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: 8,
          }}
        >
          Nenhuma campanha disparada ainda.
        </div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table className="tbl" style={{ minWidth: 720 }}>
            <thead>
              <tr>
                <th>Dia</th>
                <th style={{ textAlign: 'right' }}>Total</th>
                <th style={{ textAlign: 'right' }}>Responderam</th>
                <th style={{ textAlign: 'right' }}>Interessados</th>
                <th style={{ textAlign: 'right' }}>Form. enviado</th>
                <th style={{ textAlign: 'right' }}>Opt-out</th>
                <th style={{ textAlign: 'right' }}>Não qualif.</th>
                <th style={{ textAlign: 'right' }}>Sem resposta</th>
                <th>Conv.</th>
              </tr>
            </thead>
            <tbody>
              {campanhas.map((c) => {
                const total = Number(c.total_leads)
                const responderam = Number(c.responderam)
                const form = Number(c.formulario_enviado)
                const taxaResp = total > 0 ? (responderam / total) * 100 : 0
                const taxaForm = total > 0 ? (form / total) * 100 : 0
                return (
                  <tr key={c.dia}>
                    <td>
                      <Link
                        href={`/?disparo_dia=${c.dia}`}
                        style={{
                          color: '#e5e7eb',
                          textDecoration: 'none',
                          fontWeight: 600,
                          borderBottom: '1px dotted #444',
                        }}
                        title="Ver leads desse lote"
                      >
                        {fmtDia(c.dia)}
                      </Link>
                      {c.produtos && c.produtos.length > 0 && (
                        <div style={{ color: 'var(--text-muted)', fontSize: '0.68rem' }}>
                          {c.produtos.join(', ')}
                        </div>
                      )}
                    </td>
                    <td style={{ textAlign: 'right', fontWeight: 600 }}>{total}</td>
                    <td style={{ textAlign: 'right', color: '#fb923c' }}>{responderam}</td>
                    <td style={{ textAlign: 'right', color: '#34d399' }}>
                      {Number(c.interessados)}
                    </td>
                    <td style={{ textAlign: 'right', color: '#60a5fa', fontWeight: 600 }}>
                      {form}
                    </td>
                    <td style={{ textAlign: 'right', color: 'var(--text-muted)' }}>
                      {Number(c.opt_out)}
                    </td>
                    <td style={{ textAlign: 'right', color: 'var(--text-muted)' }}>
                      {Number(c.nao_qualificado)}
                    </td>
                    <td style={{ textAlign: 'right', color: 'var(--text-muted)' }}>
                      {Number(c.sem_resposta)}
                    </td>
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.1rem' }}>
                        <span
                          style={{
                            color: pctColor(taxaResp),
                            fontSize: '0.78rem',
                            fontWeight: 600,
                          }}
                          title="Taxa de resposta"
                        >
                          {taxaResp.toFixed(1)}%
                        </span>
                        <span
                          style={{
                            color: pctColor(taxaForm * 4),
                            fontSize: '0.68rem',
                          }}
                          title="Taxa de formulário enviado"
                        >
                          form: {taxaForm.toFixed(1)}%
                        </span>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      <p style={{ marginTop: '2rem', color: 'var(--text-muted)', fontSize: '0.72rem', textAlign: 'center' }}>
        Clique no dia pra ver os leads daquele lote · taxas calculadas sobre o total disparado naquele dia
      </p>
    </main>
  )
}

function SummaryCard({
  label,
  value,
  hint,
  color,
}: {
  label: string
  value: number
  hint: string
  color: string
}) {
  return (
    <div className="card">
      <div className="card-label">{label}</div>
      <div className="card-value" style={{ color }}>
        {value}
      </div>
      <div className="card-hint">{hint}</div>
    </div>
  )
}
