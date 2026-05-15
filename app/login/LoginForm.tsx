'use client'

import { useState } from 'react'
import { useSearchParams } from 'next/navigation'

export default function LoginForm() {
  const sp = useSearchParams()
  const from = sp.get('from') ?? '/'
  const [senha, setSenha] = useState('')
  const [erro, setErro] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    setErro(null)
    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ senha }),
      })
      if (!res.ok) {
        setErro('Senha incorreta')
        setBusy(false)
        return
      }
      window.location.href = from
    } catch {
      setErro('Erro ao autenticar')
      setBusy(false)
    }
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--bg)',
        color: 'var(--text)',
        padding: '1rem',
      }}
    >
      <form
        onSubmit={submit}
        style={{
          background: 'var(--bg-elev)',
          border: '1px solid var(--border)',
          borderRadius: '12px',
          padding: '2rem',
          width: 'min(360px, 90vw)',
          boxShadow: '0 4px 16px rgba(16,24,40,0.08)',
        }}
      >
        <div
          style={{
            width: 44,
            height: 44,
            borderRadius: 10,
            background: 'linear-gradient(135deg, #f97316, #fb923c)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 22,
            marginBottom: '1rem',
          }}
        >
          🤖
        </div>
        <h1 style={{ margin: '0 0 0.35rem', fontSize: '1.25rem' }}>
          SDR Agent AIVA
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: 0 }}>
          Acesso restrito
        </p>
        <input
          type="password"
          value={senha}
          onChange={(e) => setSenha(e.target.value)}
          placeholder="Senha"
          autoFocus
          style={{
            width: '100%',
            marginTop: '1rem',
            background: 'var(--bg)',
            border: '1px solid var(--border-strong)',
            color: 'var(--text)',
            padding: '0.6rem 0.75rem',
            borderRadius: '8px',
            fontFamily: 'inherit',
            fontSize: '0.9rem',
            boxSizing: 'border-box',
          }}
        />
        {erro && (
          <p style={{ color: 'var(--red)', fontSize: '0.8rem', margin: '0.5rem 0 0' }}>
            {erro}
          </p>
        )}
        <button
          type="submit"
          disabled={busy || !senha}
          style={{
            width: '100%',
            marginTop: '1rem',
            background: 'var(--accent)',
            border: 'none',
            color: '#fff',
            padding: '0.6rem',
            borderRadius: '8px',
            cursor: busy ? 'not-allowed' : 'pointer',
            fontFamily: 'inherit',
            fontSize: '0.9rem',
            fontWeight: 600,
            opacity: busy ? 0.5 : 1,
          }}
        >
          {busy ? 'Entrando…' : 'Entrar'}
        </button>
      </form>
    </div>
  )
}
