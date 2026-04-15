'use client'

import { useState } from 'react'

type Resultado = {
  ok: boolean
  total: number
  sucesso: number
  falha: number
  invalidos: number
  resultados: Array<{ telefone: string; ok: boolean; erro?: string; lead_id?: string }>
} | { error: string }

export default function CampanhaForm() {
  const [telefones, setTelefones] = useState('')
  const [nome, setNome] = useState('Loja')
  const [cidade, setCidade] = useState('')
  const [produto, setProduto] = useState<'AIVA' | 'SINGLO'>('AIVA')
  const [loading, setLoading] = useState(false)
  const [resultado, setResultado] = useState<Resultado | null>(null)

  // Pre-parsing: conta quantos telefones validos ha
  const telefonesPreview = telefones
    .split(/[\s,;]+/)
    .map((t) => t.replace(/\D/g, ''))
    .filter((t) => t.length >= 10 && t.length <= 13)
  const telefonesUnicos = Array.from(new Set(telefonesPreview))

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (telefonesUnicos.length === 0) return
    if (telefonesUnicos.length > 100) {
      if (!confirm(`Voce vai disparar para ${telefonesUnicos.length} leads. Continuar?`)) return
    }
    setLoading(true)
    setResultado(null)
    try {
      const res = await fetch('/api/leads/send-campaign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ telefones, nome, cidade, produto }),
      })
      const data = await res.json()
      setResultado(data)
    } catch (err) {
      setResultado({ error: err instanceof Error ? err.message : String(err) })
    } finally {
      setLoading(false)
    }
  }

  const inputStyle: React.CSSProperties = {
    width: '100%',
    background: '#0f0f0f',
    border: '1px solid #222',
    color: '#eee',
    padding: '0.6rem 0.8rem',
    borderRadius: 6,
    fontFamily: 'inherit',
    fontSize: '0.9rem',
    boxSizing: 'border-box',
  }

  const labelStyle: React.CSSProperties = {
    display: 'block',
    color: 'var(--text-muted)',
    fontSize: '0.75rem',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    marginBottom: '0.35rem',
    fontWeight: 600,
  }

  return (
    <div style={{ maxWidth: 720 }}>
      <form onSubmit={onSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div>
          <label style={labelStyle}>Telefones</label>
          <textarea
            value={telefones}
            onChange={(e) => setTelefones(e.target.value)}
            placeholder={'Cole aqui, um por linha ou separado por virgula\nEx:\n5511999998888\n5547996085000\n...'}
            rows={12}
            style={{ ...inputStyle, resize: 'vertical', fontFamily: 'monospace' }}
            required
          />
          <div style={{ color: 'var(--text-muted)', fontSize: '0.72rem', marginTop: '0.35rem' }}>
            {telefonesUnicos.length > 0
              ? `${telefonesUnicos.length} telefone${telefonesUnicos.length === 1 ? '' : 's'} unico${telefonesUnicos.length === 1 ? '' : 's'} detectado${telefonesUnicos.length === 1 ? '' : 's'}`
              : 'Cole pelo menos um telefone (min 10 digitos)'}
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem' }}>
          <div>
            <label style={labelStyle}>Nome padrao</label>
            <input
              type="text"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              style={inputStyle}
              placeholder="Loja"
            />
          </div>
          <div>
            <label style={labelStyle}>Cidade (opcional)</label>
            <input
              type="text"
              value={cidade}
              onChange={(e) => setCidade(e.target.value)}
              style={inputStyle}
              placeholder="Curitiba/PR"
            />
          </div>
          <div>
            <label style={labelStyle}>Produto</label>
            <select
              value={produto}
              onChange={(e) => setProduto(e.target.value as 'AIVA' | 'SINGLO')}
              style={inputStyle}
            >
              <option value="AIVA">AIVA</option>
              <option value="SINGLO" disabled>
                Singlo (em breve)
              </option>
            </select>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <button
            type="submit"
            disabled={loading || telefonesUnicos.length === 0}
            style={{
              background: loading ? '#1d2028' : 'linear-gradient(135deg, #60a5fa, #a78bfa)',
              color: '#fff',
              border: 'none',
              padding: '0.75rem 1.5rem',
              borderRadius: 6,
              cursor: loading || telefonesUnicos.length === 0 ? 'not-allowed' : 'pointer',
              fontFamily: 'inherit',
              fontSize: '0.9rem',
              fontWeight: 600,
              opacity: telefonesUnicos.length === 0 ? 0.5 : 1,
            }}
          >
            {loading ? 'Disparando...' : `Disparar para ${telefonesUnicos.length || 0} leads`}
          </button>
          {loading && (
            <span style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>
              Isso pode levar alguns minutos (validacao + envio HSM por lead)
            </span>
          )}
        </div>
      </form>

      {resultado && <ResultadoBox resultado={resultado} />}
    </div>
  )
}

function ResultadoBox({ resultado }: { resultado: Resultado }) {
  if ('error' in resultado) {
    return (
      <div
        style={{
          marginTop: '1.5rem',
          padding: '1rem',
          background: '#2b1020',
          border: '1px solid #7f1d1d',
          borderRadius: 8,
          color: '#fca5a5',
        }}
      >
        <strong>Erro:</strong> {resultado.error}
      </div>
    )
  }

  const { total, sucesso, falha, invalidos, resultados } = resultado
  const falhas = resultados.filter((r) => !r.ok && r.erro !== 'numero_sem_whatsapp')
  const semWhats = resultados.filter((r) => r.erro === 'numero_sem_whatsapp')

  return (
    <div
      style={{
        marginTop: '1.5rem',
        padding: '1rem 1.25rem',
        background: '#0d1a12',
        border: '1px solid #14532d',
        borderRadius: 8,
      }}
    >
      <div style={{ color: '#86efac', fontWeight: 600, marginBottom: '0.75rem' }}>
        Disparo concluido
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '0.5rem', fontSize: '0.85rem' }}>
        <div>Total: <strong>{total}</strong></div>
        <div style={{ color: '#86efac' }}>Sucesso: <strong>{sucesso}</strong></div>
        <div style={{ color: '#fca5a5' }}>Falha: <strong>{falha}</strong></div>
        <div style={{ color: '#fbbf24' }}>Sem WhatsApp: <strong>{invalidos}</strong></div>
      </div>
      {semWhats.length > 0 && (
        <details style={{ marginTop: '0.75rem' }}>
          <summary style={{ color: '#fbbf24', cursor: 'pointer', fontSize: '0.78rem' }}>
            Numeros sem WhatsApp ({semWhats.length})
          </summary>
          <ul style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
            {semWhats.map((r) => (
              <li key={r.telefone}>{r.telefone}</li>
            ))}
          </ul>
        </details>
      )}
      {falhas.length > 0 && (
        <details style={{ marginTop: '0.5rem' }}>
          <summary style={{ color: '#fca5a5', cursor: 'pointer', fontSize: '0.78rem' }}>
            Falhas ({falhas.length})
          </summary>
          <ul style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
            {falhas.map((r) => (
              <li key={r.telefone}>
                {r.telefone}: {r.erro}
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  )
}
