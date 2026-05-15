import Link from 'next/link'
import { supabaseAdmin } from '@/lib/supabase'
import TokenChart from '../../_components/TokenChart'

export const dynamic = 'force-dynamic'
export const revalidate = 0

const USD_BRL = 5.2

interface DiarioRow {
  dia: string
  chamadas: number
  input_tokens: number
  output_tokens: number
  cache_read_tokens: number
  cache_creation_tokens: number
  tokens_totais: number
  custo_usd: number
}

async function getDiario(): Promise<DiarioRow[]> {
  const desde = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10)
  const { data } = await supabaseAdmin
    .from('sdr_token_usage_diario')
    .select('*')
    .gte('dia', desde)
    .order('dia', { ascending: true })
  return (data ?? []) as DiarioRow[]
}

function fmtNum(n: number): string {
  return Math.round(n).toLocaleString('pt-BR')
}

function fmtUsd(n: number): string {
  return `US$ ${n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function fmtBrl(n: number): string {
  return `R$ ${n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function fmtDiaCurto(iso: string): string {
  const [, m, d] = iso.split('-')
  return `${d}/${m}`
}

export default async function TokensPage() {
  const diario = await getDiario()

  const custoTotal = diario.reduce((s, d) => s + Number(d.custo_usd), 0)
  const tokensTotais = diario.reduce((s, d) => s + Number(d.tokens_totais), 0)
  const chamadas = diario.reduce((s, d) => s + Number(d.chamadas), 0)
  const inputTotal = diario.reduce((s, d) => s + Number(d.input_tokens), 0)
  const outputTotal = diario.reduce((s, d) => s + Number(d.output_tokens), 0)
  const cacheReadTotal = diario.reduce((s, d) => s + Number(d.cache_read_tokens), 0)
  const cacheCreationTotal = diario.reduce(
    (s, d) => s + Number(d.cache_creation_tokens),
    0,
  )
  const custoMedio = chamadas > 0 ? custoTotal / chamadas : 0

  const chartData = diario.map((d) => ({
    dia: fmtDiaCurto(d.dia),
    custo: Number(d.custo_usd),
  }))

  const breakdown = [
    { label: 'Input', value: inputTotal, color: '#f97316' },
    { label: 'Output', value: outputTotal, color: '#16a34a' },
    { label: 'Cache (leitura)', value: cacheReadTotal, color: '#2563eb' },
    { label: 'Cache (criação)', value: cacheCreationTotal, color: '#7c3aed' },
  ]
  const breakdownTotal =
    inputTotal + outputTotal + cacheReadTotal + cacheCreationTotal

  const semDados = diario.length === 0

  return (
    <main>
      {/* ─── Header ────────────────────────────────────────────────────── */}
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
          <h1 style={{ margin: 0 }}>Consumo de tokens</h1>
        </div>
        <p style={{ margin: '0.5rem 0 0', color: 'var(--text-muted)', fontSize: '0.82rem' }}>
          Uso e custo da API Anthropic · últimos 30 dias · câmbio estimado US$ 1 ≈ R$ {USD_BRL.toFixed(2)}
        </p>
      </header>

      {semDados ? (
        <div
          style={{
            padding: '3rem 2rem',
            textAlign: 'center',
            color: 'var(--text-muted)',
            background: 'var(--bg-elev)',
            border: '1px solid var(--border)',
            borderRadius: 12,
            boxShadow: 'var(--shadow)',
          }}
        >
          <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🪙</div>
          <strong style={{ color: 'var(--text)', display: 'block', marginBottom: '0.35rem' }}>
            Ainda sem dados de consumo
          </strong>
          O registro de tokens começa a partir de agora. Assim que a VictorIA
          processar conversas, os custos aparecerão aqui.
        </div>
      ) : (
        <>
          {/* ─── KPIs ──────────────────────────────────────────────────── */}
          <h2>Resumo</h2>
          <div className="cards-grid">
            <Kpi
              label="Custo total"
              value={fmtUsd(custoTotal)}
              hint={`≈ ${fmtBrl(custoTotal * USD_BRL)}`}
            />
            <Kpi
              label="Tokens totais"
              value={fmtNum(tokensTotais)}
              hint="input + output + cache"
            />
            <Kpi
              label="Chamadas IA"
              value={fmtNum(chamadas)}
              hint="requisições à API Claude"
            />
            <Kpi
              label="Custo médio / chamada"
              value={fmtUsd(custoMedio)}
              hint={`≈ ${fmtBrl(custoMedio * USD_BRL)}`}
            />
          </div>

          {/* ─── Gráfico ───────────────────────────────────────────────── */}
          <h2>Custo por dia</h2>
          <TokenChart data={chartData} />

          {/* ─── Composição ────────────────────────────────────────────── */}
          <h2>Composição dos tokens</h2>
          <div className="funnel">
            {breakdownTotal === 0 ? (
              <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                Sem tokens registrados no período.
              </div>
            ) : (
              breakdown.map((b) => {
                const pct = (b.value / breakdownTotal) * 100
                return (
                  <div key={b.label} className="breakdown-row">
                    <div className="breakdown-label">
                      <span>
                        {b.label}{' '}
                        <strong style={{ color: b.color, marginLeft: 6 }}>
                          {fmtNum(b.value)}
                        </strong>
                      </span>
                      <span style={{ color: 'var(--text-muted)' }}>
                        {pct.toFixed(1)}%
                      </span>
                    </div>
                    <div className="breakdown-bar-bg">
                      <div
                        className="breakdown-bar-fill"
                        style={{ width: `${pct}%`, background: b.color }}
                      />
                    </div>
                  </div>
                )
              })
            )}
          </div>

          {/* ─── Tabela diária ─────────────────────────────────────────── */}
          <h2>Detalhe diário</h2>
          <div style={{ overflowX: 'auto' }}>
            <table className="tbl" style={{ minWidth: 640 }}>
              <thead>
                <tr>
                  <th>Dia</th>
                  <th style={{ textAlign: 'right' }}>Chamadas</th>
                  <th style={{ textAlign: 'right' }}>Input</th>
                  <th style={{ textAlign: 'right' }}>Output</th>
                  <th style={{ textAlign: 'right' }}>Cache</th>
                  <th style={{ textAlign: 'right' }}>Tokens</th>
                  <th style={{ textAlign: 'right' }}>Custo</th>
                </tr>
              </thead>
              <tbody>
                {[...diario].reverse().map((d) => (
                  <tr key={d.dia}>
                    <td style={{ fontWeight: 600 }}>{fmtDiaCurto(d.dia)}</td>
                    <td style={{ textAlign: 'right' }}>{fmtNum(Number(d.chamadas))}</td>
                    <td style={{ textAlign: 'right', color: 'var(--text-dim)' }}>
                      {fmtNum(Number(d.input_tokens))}
                    </td>
                    <td style={{ textAlign: 'right', color: 'var(--text-dim)' }}>
                      {fmtNum(Number(d.output_tokens))}
                    </td>
                    <td style={{ textAlign: 'right', color: 'var(--text-dim)' }}>
                      {fmtNum(
                        Number(d.cache_read_tokens) +
                          Number(d.cache_creation_tokens),
                      )}
                    </td>
                    <td style={{ textAlign: 'right', fontWeight: 600 }}>
                      {fmtNum(Number(d.tokens_totais))}
                    </td>
                    <td style={{ textAlign: 'right', color: 'var(--accent)', fontWeight: 600 }}>
                      {fmtUsd(Number(d.custo_usd))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      <p style={{ marginTop: '3rem', color: 'var(--text-muted)', fontSize: '0.72rem', textAlign: 'center' }}>
        Dados da tabela sdr_token_usage · atualizados ao recarregar
      </p>
    </main>
  )
}

function Kpi({
  label,
  value,
  hint,
}: {
  label: string
  value: string
  hint: string
}) {
  return (
    <div className="card">
      <div className="card-label">{label}</div>
      <div className="card-value" style={{ color: 'var(--accent)' }}>
        {value}
      </div>
      <div className="card-hint">{hint}</div>
    </div>
  )
}
