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
        background: '#000',
        color: '#eee',
        fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
      }}
    >
      <form
        onSubmit={submit}
        style={{
          background: '#0a0a0a',
          border: '1px solid #222',
          borderRadius: '0.5rem',
          padding: '2rem',
          width: 'min(360px, 90vw)',
        }}
      >
        <h1 style={{ margin: '0 0 0.5rem', fontSize: '1.25rem' }}>
          SDR Agent AIVA
        </h1>
        <p style={{ color: '#666', fontSize: '0.85rem', marginTop: 0 }}>
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
            background: '#0f0f0f',
            border: '1px solid #222',
            color: '#eee',
            padding: '0.6rem 0.75rem',
            borderRadius: '0.25rem',
            fontFamily: 'inherit',
            fontSize: '0.9rem',
            boxSizing: 'border-box',
          }}
        />
        {erro && (
          <p style={{ color: '#ef4444', fontSize: '0.8rem', margin: '0.5rem 0 0' }}>
            {erro}
          </p>
        )}
        <button
          type="submit"
          disabled={busy || !senha}
          style={{
            width: '100%',
            marginTop: '1rem',
            background: '#1e3a5f',
            border: '1px solid #2d5a8c',
            color: '#eee',
            padding: '0.6rem',
            borderRadius: '0.25rem',
            cursor: busy ? 'not-allowed' : 'pointer',
            fontFamily: 'inherit',
            fontSize: '0.9rem',
            opacity: busy ? 0.5 : 1,
          }}
        >
          {busy ? 'Entrando…' : 'Entrar'}
        </button>
      </form>
    </div>
  )
}
