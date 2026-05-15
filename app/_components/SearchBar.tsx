'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useState } from 'react'

const STATUSES = [
  'DISPARO_REALIZADO',
  'INTERESSADO',
  'AGUARDANDO',
  'AGUARDANDO_APROVACAO',
  'COLETANDO_COMPLEMENTO',
  'CADASTRO_COMPLETO',
  'ANALISE_AIVA',
  'TREINAMENTO',
  'FORMULARIO_ENVIADO',
  'SEM_RESPOSTA',
  'NAO_QUALIFICADO',
  'OPT_OUT',
  'BOT_DETECTADO',
  'DESCARTADO',
]

export default function SearchBar() {
  const router = useRouter()
  const sp = useSearchParams()
  const [q, setQ] = useState(sp.get('q') ?? '')
  const [status, setStatus] = useState(sp.get('status') ?? '')
  const [importante, setImportante] = useState(sp.get('importante') === 'true')
  const [atendimentoHumano, setAtendimentoHumano] = useState(sp.get('aguardando_humano') === 'true')

  function apply(nextQ: string, nextStatus: string, nextImportante: boolean, nextAH: boolean) {
    const params = new URLSearchParams()
    if (nextQ.trim()) params.set('q', nextQ.trim())
    if (nextStatus) params.set('status', nextStatus)
    if (nextImportante) params.set('importante', 'true')
    if (nextAH) params.set('aguardando_humano', 'true')
    router.push(params.toString() ? `/?${params.toString()}` : '/')
  }

  const inputStyle: React.CSSProperties = {
    background: 'var(--bg-elev)',
    border: '1px solid var(--border-strong)',
    color: 'var(--text)',
    padding: '0.5rem 0.75rem',
    borderRadius: '8px',
    fontFamily: 'inherit',
    fontSize: '0.85rem',
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', margin: '0.5rem 0 0' }}>
      {/* Linha 1: input de busca */}
      <form
        onSubmit={(e) => {
          e.preventDefault()
          apply(q, status, importante, atendimentoHumano)
        }}
      >
        <input
          type="text"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar por nome, telefone ou cidade…"
          style={{ ...inputStyle, width: '100%', boxSizing: 'border-box' }}
        />
      </form>
      {/* Linha 2: filtros */}
      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
        <select
          value={status}
          onChange={(e) => {
            setStatus(e.target.value)
            apply(q, e.target.value, importante, atendimentoHumano)
          }}
          style={inputStyle}
        >
          <option value="">Todos os status</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <button
          onClick={() => {
            const next = !atendimentoHumano
            setAtendimentoHumano(next)
            apply(q, status, importante, next)
          }}
          style={{
            background: atendimentoHumano ? '#fef3c7' : 'var(--bg-elev)',
            border: atendimentoHumano ? '1px solid #d97706' : '1px solid var(--border-strong)',
            color: atendimentoHumano ? '#b45309' : 'var(--text-muted)',
            padding: '0.5rem 0.75rem',
            borderRadius: '8px',
            cursor: 'pointer',
            fontFamily: 'inherit',
            fontSize: '0.85rem',
            fontWeight: atendimentoHumano ? 600 : 400,
            whiteSpace: 'nowrap',
          }}
        >
          🔔 Atendimento humano
        </button>
        <button
          onClick={() => {
            const next = !importante
            setImportante(next)
            apply(q, status, next, atendimentoHumano)
          }}
          style={{
            background: importante ? '#fff3e9' : 'var(--bg-elev)',
            border: importante ? '1px solid #f97316' : '1px solid var(--border-strong)',
            color: importante ? '#c2410c' : 'var(--text-muted)',
            padding: '0.5rem 0.75rem',
            borderRadius: '8px',
            cursor: 'pointer',
            fontFamily: 'inherit',
            fontSize: '0.85rem',
            fontWeight: importante ? 600 : 400,
            whiteSpace: 'nowrap',
          }}
        >
          ★ Importante
        </button>
        {(q || status || importante || atendimentoHumano) && (
          <button
            onClick={() => {
              setQ('')
              setStatus('')
              setImportante(false)
              setAtendimentoHumano(false)
              router.push('/')
            }}
            style={{
              background: 'var(--bg-elev)',
              border: '1px solid var(--border-strong)',
              color: 'var(--text-muted)',
              padding: '0.5rem 0.75rem',
              borderRadius: '8px',
              cursor: 'pointer',
              fontFamily: 'inherit',
              fontSize: '0.8rem',
            }}
          >
            ✕ Limpar
          </button>
        )}
      </div>
    </div>
  )
}
