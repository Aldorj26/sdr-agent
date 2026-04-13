'use client'

import { useState, useRef, useEffect } from 'react'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [nome, setNome] = useState('')
  const [started, setStarted] = useState(false)
  const [loading, setLoading] = useState(false)
  const messagesEnd = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const nameRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    messagesEnd.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  useEffect(() => {
    if (started) {
      setTimeout(() => inputRef.current?.focus(), 100)
    } else {
      setTimeout(() => nameRef.current?.focus(), 100)
    }
  }, [started])

  async function handleSend() {
    if (!input.trim() || loading) return

    const userMsg: Message = { role: 'user', content: input.trim() }
    const updated = [...messages, userMsg]
    setMessages(updated)
    setInput('')
    setLoading(true)

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mensagem: userMsg.content,
          historico: messages,
          nome: nome || 'Visitante',
        }),
      })
      const data = await res.json()
      if (data.mensagem) {
        setMessages([...updated, { role: 'assistant', content: data.mensagem }])
      }
    } catch {
      setMessages([...updated, { role: 'assistant', content: 'Erro ao processar. Tente novamente.' }])
    } finally {
      setLoading(false)
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }

  if (!started) {
    return (
      <>
        <style>{globalStyles}</style>
        <main className="container">
          <div className="start-box">
            <div className="logo">A</div>
            <h1 className="title">VictorIA — AIVA</h1>
            <p className="subtitle">Chat direto com o agente SDR</p>
            <input
              ref={nameRef}
              className="name-input"
              placeholder="Seu nome (simula o lead)"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && nome.trim() && setStarted(true)}
              autoFocus
            />
            <button
              className="start-btn"
              onClick={() => nome.trim() && setStarted(true)}
              disabled={!nome.trim()}
            >
              Iniciar conversa
            </button>
          </div>
        </main>
      </>
    )
  }

  return (
    <>
      <style>{globalStyles}</style>
      <main className="container">
        <div className="header">
          <div className="header-left">
            <div className="header-avatar">A</div>
            <div>
              <div className="header-title">VictorIA — AIVA</div>
              <div className="header-status">Online</div>
            </div>
          </div>
          <span className="badge">Lead: {nome}</span>
        </div>

        <div className="chat-area">
          {messages.length === 0 && (
            <div className="empty-state">
              Envie uma mensagem para iniciar a conversa com a VictorIA
            </div>
          )}
          {messages.map((m, i) => (
            <div key={i} className={m.role === 'user' ? 'bubble-user' : 'bubble-assistant'}>
              <span className="bubble-label">{m.role === 'user' ? nome : 'VictorIA'}</span>
              <p className="bubble-text">{m.content}</p>
            </div>
          ))}
          {loading && (
            <div className="bubble-assistant">
              <span className="bubble-label">VictorIA</span>
              <p className="bubble-text">
                <span className="typing">
                  <span className="dot" />
                  <span className="dot" />
                  <span className="dot" />
                </span>
              </p>
            </div>
          )}
          <div ref={messagesEnd} />
        </div>

        <div className="input-area">
          <input
            ref={inputRef}
            className="chat-input"
            placeholder="Digite uma mensagem..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            disabled={loading}
            autoFocus
          />
          <button className="send-btn" onClick={handleSend} disabled={loading || !input.trim()}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="22" y1="2" x2="11" y2="13" />
              <polygon points="22 2 15 22 11 13 2 9 22 2" />
            </svg>
          </button>
        </div>
      </main>
    </>
  )
}

const globalStyles = `
  * { box-sizing: border-box; margin: 0; padding: 0; }
  html, body { height: 100%; overflow: hidden; background: #0a0a0a; }

  .container {
    max-width: 600px;
    margin: 0 auto;
    height: 100dvh;
    display: flex;
    flex-direction: column;
    background: #0a0a0a;
    color: #ededed;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
  }

  .start-box {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    flex: 1;
    gap: 16px;
    padding: 24px;
  }

  .logo {
    width: 64px; height: 64px;
    border-radius: 50%;
    background: linear-gradient(135deg, #16a34a, #059669);
    display: flex; align-items: center; justify-content: center;
    font-size: 28px; font-weight: bold; color: #fff;
  }

  .title { font-size: 24px; font-weight: 700; }
  .subtitle { color: #888; font-size: 14px; }

  .name-input {
    width: 100%;
    max-width: 320px;
    padding: 14px 16px;
    border-radius: 12px;
    border: 1px solid #333;
    background: #141414;
    color: #fff;
    font-size: 16px;
    outline: none;
    caret-color: #16a34a;
    transition: border-color 0.2s;
  }
  .name-input:focus { border-color: #16a34a; }

  .start-btn {
    padding: 14px 36px;
    border-radius: 12px;
    border: none;
    background: #16a34a;
    color: #fff;
    font-size: 16px;
    font-weight: 600;
    cursor: pointer;
    transition: background 0.2s;
  }
  .start-btn:hover:not(:disabled) { background: #15803d; }
  .start-btn:disabled { opacity: 0.4; cursor: default; }

  .header {
    padding: 12px 16px;
    border-bottom: 1px solid #1a1a1a;
    display: flex;
    align-items: center;
    justify-content: space-between;
    background: #111;
    flex-shrink: 0;
  }

  .header-left { display: flex; align-items: center; gap: 10px; }

  .header-avatar {
    width: 36px; height: 36px;
    border-radius: 50%;
    background: linear-gradient(135deg, #16a34a, #059669);
    display: flex; align-items: center; justify-content: center;
    font-size: 16px; font-weight: bold; color: #fff;
  }

  .header-title { font-size: 15px; font-weight: 600; }
  .header-status { font-size: 11px; color: #4ade80; }

  .badge {
    background: #14532d;
    padding: 4px 10px;
    border-radius: 10px;
    font-size: 11px;
    color: #4ade80;
    white-space: nowrap;
  }

  .chat-area {
    flex: 1;
    overflow-y: auto;
    padding: 16px;
    display: flex;
    flex-direction: column;
    gap: 10px;
    -webkit-overflow-scrolling: touch;
  }

  .empty-state {
    text-align: center;
    color: #555;
    font-size: 14px;
    margin-top: 40px;
  }

  .bubble-user {
    align-self: flex-end;
    background: #14532d;
    border-radius: 18px 18px 4px 18px;
    padding: 8px 14px;
    max-width: 85%;
    word-break: break-word;
  }

  .bubble-assistant {
    align-self: flex-start;
    background: #161616;
    border-radius: 18px 18px 18px 4px;
    padding: 8px 14px;
    max-width: 85%;
    border: 1px solid #262626;
    word-break: break-word;
  }

  .bubble-label { font-size: 10px; color: #666; display: block; margin-bottom: 2px; }
  .bubble-text { margin: 0; line-height: 1.5; font-size: 15px; white-space: pre-wrap; }

  .typing { display: inline-flex; gap: 4px; align-items: center; height: 20px; }
  .dot {
    width: 7px; height: 7px;
    border-radius: 50%;
    background: #555;
    animation: bounce 1.4s infinite ease-in-out both;
  }
  .dot:nth-child(1) { animation-delay: -0.32s; }
  .dot:nth-child(2) { animation-delay: -0.16s; }
  @keyframes bounce {
    0%, 80%, 100% { transform: scale(0); }
    40% { transform: scale(1); }
  }

  .input-area {
    padding: 10px 12px;
    padding-bottom: max(10px, env(safe-area-inset-bottom));
    border-top: 1px solid #1a1a1a;
    display: flex;
    gap: 8px;
    background: #111;
    flex-shrink: 0;
  }

  .chat-input {
    flex: 1;
    padding: 12px 16px;
    border-radius: 24px;
    border: 1px solid #333;
    background: #1a1a1a;
    color: #fff;
    font-size: 16px;
    outline: none;
    caret-color: #16a34a;
    transition: border-color 0.2s;
    min-width: 0;
  }
  .chat-input:focus { border-color: #16a34a; }
  .chat-input:disabled { opacity: 0.5; }

  .send-btn {
    width: 44px; height: 44px;
    border-radius: 50%;
    border: none;
    background: #16a34a;
    color: #fff;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    transition: background 0.2s;
  }
  .send-btn:hover:not(:disabled) { background: #15803d; }
  .send-btn:disabled { opacity: 0.3; cursor: default; }

  @media (max-width: 640px) {
    .container { max-width: 100%; }
    .header { padding: 10px 12px; }
    .chat-area { padding: 12px; }
    .bubble-user, .bubble-assistant { max-width: 90%; }
  }
`
