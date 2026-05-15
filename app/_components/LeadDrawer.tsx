'use client'

import { useEffect, useState } from 'react'

interface Lead {
  id: string
  nome: string
  telefone: string
  cidade: string | null
  produto: string
  status: string
  etapa_cadencia: number
  evotalks_chat_id: string | null
  evotalks_opportunity_id: string | null
  data_disparo_inicial: string | null
  data_proximo_followup: string | null
  data_ultimo_contato: string | null
  acionar_humano: boolean
  observacoes: string | null
  criado_em: string
  webhook_lock_at: string | null
}

interface Mensagem {
  id: string
  direcao: 'in' | 'out'
  conteudo: string
  template_hsm: string | null
  enviado_em: string
}

const STATUS_COLOR: Record<string, string> = {
  DISPARO_REALIZADO: '#64748b',
  INTERESSADO: '#16a34a',
  FORMULARIO_ENVIADO: '#2563eb',
  SEM_RESPOSTA: '#d97706',
  OPT_OUT: '#dc2626',
  NAO_QUALIFICADO: '#dc2626',
  AGUARDANDO: '#7c3aed',
  DESCARTADO: '#94a3b8',
}

export default function LeadDrawer() {
  const [leadId, setLeadId] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState<{ lead: Lead; mensagens: Mensagem[] } | null>(null)
  const [busy, setBusy] = useState(false)

  // Estado do painel de resposta manual
  const [showReply, setShowReply] = useState(false)
  const [replyText, setReplyText] = useState('')
  const [replying, setReplying] = useState(false)

  // Estado do painel de edição
  const [showEdit, setShowEdit] = useState(false)
  const [editNome, setEditNome] = useState('')
  const [editCidade, setEditCidade] = useState('')
  const [editObs, setEditObs] = useState('')
  const [saving, setSaving] = useState(false)

  async function refreshDrawer() {
    if (!leadId) return
    const r = await fetch(`/api/leads/${leadId}/detail`)
    const json = await r.json()
    if (!json.error) setData(json)
  }

  async function runAction(body: object, confirmMsg?: string) {
    if (!leadId) return
    if (confirmMsg && !window.confirm(confirmMsg)) return
    setBusy(true)
    try {
      const res = await fetch(`/api/leads/${leadId}/action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const json = await res.json()
      if (!res.ok) {
        window.alert(`Erro: ${json.error ?? 'desconhecido'}`)
        return
      }
      setLeadId(null)
      // força refresh da página pra atualizar contadores
      window.location.reload()
    } catch (err) {
      window.alert(`Erro: ${err}`)
    } finally {
      setBusy(false)
    }
  }

  async function sendManualReply() {
    if (!leadId || !replyText.trim()) return
    setReplying(true)
    try {
      const res = await fetch(`/api/leads/${leadId}/action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'send-manual', mensagem: replyText.trim() }),
      })
      const json = await res.json()
      if (!res.ok) {
        window.alert(`Erro: ${json.error ?? 'desconhecido'}`)
        return
      }
      setReplyText('')
      setShowReply(false)
      await refreshDrawer()
    } catch (err) {
      window.alert(`Erro: ${err}`)
    } finally {
      setReplying(false)
    }
  }

  async function runFollowupNow() {
    if (!leadId) return
    if (!window.confirm('Disparar follow-up agora? A VictorIA vai detectar se a janela 24h está aberta e mandar texto livre — caso contrário, dispara o template HSM de retomada.')) return
    setBusy(true)
    try {
      const res = await fetch(`/api/leads/${leadId}/action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'force-followup' }),
      })
      const json = await res.json()
      if (!res.ok) {
        window.alert(`Erro: ${json.error ?? 'desconhecido'}`)
        return
      }
      // Feedback explícito do modo que rodou — operador precisa saber se foi
      // texto livre (janela 24h aberta) ou template HSM (janela fechada)
      const dbg = json.debug
        ? `\n\n[debug] ultimaIn=${json.debug.ultimaIn ?? 'null'} janelaAberta=${json.debug.janelaAberta} totalMsgs=${json.debug.totalMsgs}`
        : ''
      if (json.modo === 'agendado') {
        window.alert(`📅 Agendado\n\n${json.info ?? 'Follow-up agendado pro próximo cron'}${dbg}`)
      } else if (json.modo === 'contextual') {
        window.alert(`💬 Texto livre enviado (janela 24h aberta)\n\n${json.mensagem ?? ''}${dbg}`)
      } else if (json.modo === 'hsm_retomada') {
        window.alert(`📨 Template HSM "Follow Up Aiva" enviado (janela 24h fechada)\n\n${json.mensagem ?? ''}${dbg}`)
      }
      await refreshDrawer()
    } catch (err) {
      window.alert(`Erro: ${err}`)
    } finally {
      setBusy(false)
    }
  }

  function openEditPanel() {
    if (!data) return
    // Tira o flag de pausa do textarea pra não confundir o usuário
    // (ele é re-aplicado no save pelo backend)
    const obsLimpa = (data.lead.observacoes ?? '').replace(/\s*\[PAUSA_ATE:[^\]]+\]/, '').trim()
    setEditNome(data.lead.nome ?? '')
    setEditCidade(data.lead.cidade ?? '')
    setEditObs(obsLimpa)
    setShowEdit(true)
    setShowReply(false)
  }

  async function saveEdit() {
    if (!leadId) return
    if (!editNome.trim()) {
      window.alert('Nome nao pode ficar vazio')
      return
    }
    setSaving(true)
    try {
      const res = await fetch(`/api/leads/${leadId}/action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'update-lead',
          nome: editNome,
          cidade: editCidade,
          observacoes: editObs,
        }),
      })
      const json = await res.json()
      if (!res.ok) {
        window.alert(`Erro: ${json.error ?? 'desconhecido'}`)
        return
      }
      setShowEdit(false)
      await refreshDrawer()
    } catch (err) {
      window.alert(`Erro: ${err}`)
    } finally {
      setSaving(false)
    }
  }

  useEffect(() => {
    const handler = (e: Event) => {
      const ce = e as CustomEvent<string>
      setLeadId(ce.detail)
    }
    window.addEventListener('open-lead', handler)
    const esc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setLeadId(null)
    }
    window.addEventListener('keydown', esc)
    return () => {
      window.removeEventListener('open-lead', handler)
      window.removeEventListener('keydown', esc)
    }
  }, [])

  useEffect(() => {
    if (!leadId) {
      setData(null)
      setShowReply(false)
      setReplyText('')
      setShowEdit(false)
      setEditNome('')
      setEditCidade('')
      setEditObs('')
      return
    }
    setLoading(true)
    fetch(`/api/leads/${leadId}/detail`)
      .then((r) => r.json())
      .then((json) => {
        if (json.error) {
          setData(null)
          return
        }
        setData(json)
      })
      .catch(() => setData(null))
      .finally(() => setLoading(false))
  }, [leadId])

  if (!leadId) return null

  return (
    <div
      onClick={() => setLeadId(null)}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0,0,0,0.6)',
        zIndex: 100,
        display: 'flex',
        justifyContent: 'flex-end',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 'min(700px, 90vw)',
          height: '100%',
          background: 'var(--bg)',
          borderLeft: '1px solid var(--border)',
          overflowY: 'auto',
          padding: '1.5rem',
          color: 'var(--text)',
          fontFamily: 'inherit',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ margin: 0, fontSize: '1.25rem' }}>
            {data?.lead.nome ?? (loading ? 'Carregando…' : 'Lead')}
          </h2>
          <button
            onClick={() => setLeadId(null)}
            style={{
              background: 'var(--bg-elev)',
              border: '1px solid var(--border-strong)',
              color: 'var(--text-muted)',
              padding: '0.25rem 0.75rem',
              borderRadius: '8px',
              cursor: 'pointer',
              fontFamily: 'inherit',
            }}
          >
            ✕ Fechar
          </button>
        </div>

        {loading && !data && <p style={{ color: 'var(--text-muted)' }}>Carregando dados…</p>}

        {data && (
          <>
            <div style={{ marginTop: '1rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              <ActionBtn
                disabled={busy || replying}
                onClick={() => { setShowReply((v) => !v); setReplyText('') }}
                color="#4ade80"
              >
                {showReply ? '✕ Cancelar' : '↩ Responder'}
              </ActionBtn>
              <ActionBtn
                disabled={busy || replying}
                onClick={() => runAction({ type: 'reprocess' }, 'Reprocessar a ultima mensagem com a VictorIA?')}
                color="#60a5fa"
              >
                ↺ Reprocessar
              </ActionBtn>
              <ActionBtn
                disabled={busy || replying || saving}
                onClick={() => (showEdit ? setShowEdit(false) : openEditPanel())}
                color="#fbbf24"
              >
                {showEdit ? '✕ Cancelar' : '✎ Editar'}
              </ActionBtn>
              <ActionBtn
                disabled={busy || replying}
                onClick={() => runAction({ type: 'pause', hours: 24 }, 'Pausar esse lead por 24h?')}
                color="#a78bfa"
              >
                ⏸ Pausar 24h
              </ActionBtn>
              <ActionBtn
                disabled={busy || replying}
                onClick={() => runAction({ type: 'pause', hours: 72 }, 'Pausar esse lead por 3 dias?')}
                color="#a78bfa"
              >
                ⏸ Pausar 3d
              </ActionBtn>
              {data.lead.observacoes?.includes('[PAUSA_ATE:') && (
                <ActionBtn
                  disabled={busy || replying}
                  onClick={() => runAction({ type: 'unpause' })}
                  color="#4ade80"
                >
                  ▶ Despausar
                </ActionBtn>
              )}
              <ActionBtn
                disabled={busy || replying}
                onClick={runFollowupNow}
                color="#60a5fa"
              >
                ⏩ Follow-up agora
              </ActionBtn>
              {data.lead.webhook_lock_at && (
                <ActionBtn
                  disabled={busy || replying}
                  onClick={() => runAction({ type: 'unlock' })}
                  color="#f59e0b"
                >
                  Liberar lock
                </ActionBtn>
              )}
              <ActionBtn
                disabled={busy || replying}
                onClick={() => runAction({ type: 'mark-descartado' }, 'Marcar esse lead como DESCARTADO?')}
                color="#ef4444"
              >
                ✖ Descartar
              </ActionBtn>
            </div>

            {/* Botão de destaque: Aprovar loja (dispara HSM cadastro AIVA).
                Posicionado APÓS as ações pequenas e separado por divisor pra
                ficar bem longe do botão Fechar (evita clique acidental). */}
            {data.lead.status !== 'FORMULARIO_ENVIADO' && (
              <div
                style={{
                  marginTop: '1.25rem',
                  paddingTop: '1.25rem',
                  borderTop: '1px dashed var(--border-strong)',
                }}
              >
                <button
                  onClick={() =>
                    runAction(
                      { type: 'approve' },
                      'Aprovar essa loja? Vai disparar o template HSM com o link de cadastro AIVA + aviso CNPJ. O lead vai ficar como FORMULARIO_ENVIADO.'
                    )
                  }
                  disabled={busy || replying}
                  style={{
                    width: '100%',
                    background: 'linear-gradient(135deg, #16a34a, #22c55e)',
                    border: 'none',
                    color: '#fff',
                    padding: '0.7rem 1rem',
                    borderRadius: 8,
                    cursor: busy || replying ? 'not-allowed' : 'pointer',
                    fontFamily: 'inherit',
                    fontSize: '0.9rem',
                    fontWeight: 700,
                    opacity: busy || replying ? 0.6 : 1,
                  }}
                >
                  ✓ Aprovar loja — disparar link de cadastro AIVA
                </button>
              </div>
            )}

            {/* Painel de resposta manual */}
            {showReply && (
              <div
                style={{
                  marginTop: '0.75rem',
                  display: 'flex',
                  gap: '0.5rem',
                  alignItems: 'flex-start',
                  background: '#f0fdf4',
                  border: '1px solid #bbf7d0',
                  borderRadius: 8,
                  padding: '0.75rem',
                }}
              >
                <textarea
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) sendManualReply()
                  }}
                  placeholder="Digite a mensagem... (Ctrl+Enter para enviar)"
                  rows={3}
                  style={{
                    flex: 1,
                    background: 'var(--bg-elev)',
                    border: '1px solid #bbf7d0',
                    color: 'var(--text)',
                    padding: '0.5rem 0.7rem',
                    borderRadius: 6,
                    fontFamily: 'inherit',
                    fontSize: '0.85rem',
                    resize: 'vertical',
                  }}
                />
                <button
                  onClick={sendManualReply}
                  disabled={replying || !replyText.trim()}
                  style={{
                    background: replying ? 'var(--border-strong)' : 'var(--green)',
                    border: 'none',
                    color: '#fff',
                    padding: '0.5rem 0.9rem',
                    borderRadius: 6,
                    cursor: replying || !replyText.trim() ? 'not-allowed' : 'pointer',
                    fontFamily: 'inherit',
                    fontSize: '0.82rem',
                    fontWeight: 600,
                    whiteSpace: 'nowrap',
                    opacity: !replyText.trim() ? 0.5 : 1,
                  }}
                >
                  {replying ? 'Enviando...' : 'Enviar'}
                </button>
              </div>
            )}

            {/* Painel de edição do lead */}
            {showEdit && (
              <div
                style={{
                  marginTop: '0.75rem',
                  background: '#fffbeb',
                  border: '1px solid #fde68a',
                  borderRadius: 8,
                  padding: '0.9rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.6rem',
                }}
              >
                <div style={{ color: '#b45309', fontSize: '0.78rem', fontWeight: 700 }}>
                  Editar dados do lead
                </div>
                <EditField
                  label="Nome"
                  value={editNome}
                  onChange={setEditNome}
                  placeholder="Nome da loja ou contato"
                />
                <EditField
                  label="Cidade"
                  value={editCidade}
                  onChange={setEditCidade}
                  placeholder="Curitiba/PR"
                />
                <EditField
                  label="Observações"
                  value={editObs}
                  onChange={setEditObs}
                  placeholder="Notas internas (a flag de pausa, se houver, é preservada automaticamente)"
                  multiline
                />
                <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                  <button
                    onClick={() => setShowEdit(false)}
                    disabled={saving}
                    style={{
                      background: 'var(--bg-elev)',
                      border: '1px solid var(--border-strong)',
                      color: 'var(--text-muted)',
                      padding: '0.45rem 0.9rem',
                      borderRadius: 6,
                      cursor: saving ? 'not-allowed' : 'pointer',
                      fontFamily: 'inherit',
                      fontSize: '0.82rem',
                    }}
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={saveEdit}
                    disabled={saving || !editNome.trim()}
                    style={{
                      background: saving ? 'var(--border-strong)' : '#d97706',
                      border: 'none',
                      color: '#fff',
                      padding: '0.45rem 1rem',
                      borderRadius: 6,
                      cursor: saving || !editNome.trim() ? 'not-allowed' : 'pointer',
                      fontFamily: 'inherit',
                      fontSize: '0.82rem',
                      fontWeight: 600,
                      opacity: !editNome.trim() ? 0.5 : 1,
                    }}
                  >
                    {saving ? 'Salvando...' : 'Salvar'}
                  </button>
                </div>
              </div>
            )}

            <div style={{ marginTop: '1rem', fontSize: '0.85rem', lineHeight: 1.7 }}>
              <Row label="Telefone" value={data.lead.telefone} />
              <Row label="Cidade" value={data.lead.cidade ?? '—'} />
              <Row
                label="Status"
                value={
                  <span style={{ color: STATUS_COLOR[data.lead.status] ?? '#fff' }}>
                    {data.lead.status}
                  </span>
                }
              />
              <Row label="Etapa" value={`D+${data.lead.etapa_cadencia}`} />
              <Row
                label="Último contato"
                value={
                  data.lead.data_ultimo_contato
                    ? new Date(data.lead.data_ultimo_contato).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })
                    : '—'
                }
              />
              <Row
                label="Próximo follow-up"
                value={
                  data.lead.data_proximo_followup
                    ? new Date(data.lead.data_proximo_followup).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })
                    : '—'
                }
              />
              <Row
                label="Acionar humano"
                value={
                  data.lead.acionar_humano ? (
                    <span style={{ color: '#d97706', fontWeight: 600 }}>SIM</span>
                  ) : (
                    'não'
                  )
                }
              />
              <Row
                label="Oportunidade CRM"
                value={data.lead.evotalks_opportunity_id ?? '—'}
              />
              {data.lead.observacoes && (
                <Row label="Observações" value={data.lead.observacoes} />
              )}
            </div>

            <h3 style={{ marginTop: '1.5rem', fontSize: '1rem', color: 'var(--text-dim)' }}>
              Histórico de mensagens ({data.mensagens.length})
            </h3>
            <div style={{ marginTop: '0.5rem' }}>
              {data.mensagens.length === 0 && (
                <p style={{ color: 'var(--text-muted)' }}>Sem mensagens ainda.</p>
              )}
              {data.mensagens.map((m) => {
                const mine = m.direcao === 'out'
                return (
                  <div
                    key={m.id}
                    style={{
                      display: 'flex',
                      justifyContent: mine ? 'flex-end' : 'flex-start',
                      margin: '0.5rem 0',
                    }}
                  >
                    <div
                      style={{
                        maxWidth: '75%',
                        background: mine ? '#fff3e9' : 'var(--bg-elev)',
                        border: `1px solid ${mine ? '#fdba74' : 'var(--border)'}`,
                        color: 'var(--text)',
                        padding: '0.6rem 0.9rem',
                        borderRadius: '0.75rem',
                        fontSize: '0.85rem',
                        whiteSpace: 'pre-wrap',
                        wordBreak: 'break-word',
                      }}
                    >
                      {m.template_hsm && (
                        <div style={{ color: 'var(--text-muted)', fontSize: '0.7rem', marginBottom: '0.25rem' }}>
                          📢 HSM: {m.template_hsm}
                        </div>
                      )}
                      <div>{m.conteudo}</div>
                      <div style={{ color: 'var(--text-muted)', fontSize: '0.7rem', marginTop: '0.3rem' }}>
                        {new Date(m.enviado_em).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

function ActionBtn({
  children,
  onClick,
  color,
  disabled,
}: {
  children: React.ReactNode
  onClick: () => void
  color: string
  disabled?: boolean
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        background: 'var(--bg-elev)',
        border: `1px solid ${color}`,
        color,
        padding: '0.35rem 0.7rem',
        borderRadius: '8px',
        cursor: disabled ? 'not-allowed' : 'pointer',
        fontFamily: 'inherit',
        fontSize: '0.8rem',
        fontWeight: 600,
        opacity: disabled ? 0.5 : 1,
      }}
    >
      {children}
    </button>
  )
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', padding: '0.35rem 0' }}>
      <span style={{ width: 160, color: 'var(--text-muted)' }}>{label}</span>
      <span style={{ flex: 1 }}>{value}</span>
    </div>
  )
}

function EditField({
  label,
  value,
  onChange,
  placeholder,
  multiline,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
  multiline?: boolean
}) {
  const inputStyle: React.CSSProperties = {
    width: '100%',
    background: 'var(--bg-elev)',
    border: '1px solid #fde68a',
    color: 'var(--text)',
    padding: '0.5rem 0.7rem',
    borderRadius: 6,
    fontFamily: 'inherit',
    fontSize: '0.85rem',
    boxSizing: 'border-box',
    resize: multiline ? 'vertical' : undefined,
  }
  return (
    <div>
      <label
        style={{
          display: 'block',
          color: '#b45309',
          fontSize: '0.7rem',
          textTransform: 'uppercase',
          letterSpacing: '0.04em',
          marginBottom: '0.25rem',
          fontWeight: 600,
        }}
      >
        {label}
      </label>
      {multiline ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          rows={3}
          style={inputStyle}
        />
      ) : (
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          style={inputStyle}
        />
      )}
    </div>
  )
}
