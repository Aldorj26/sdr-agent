import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

// ─── Tipos ──────────────────────────────────────────────────────────────────

interface MensagemRow {
  id: string
  lead_id: string
  direcao: 'in' | 'out'
  conteudo: string
  template_hsm: string | null
  enviado_em: string
}

export interface ItemCuradoria {
  mensagem_id: string
  lead_id: string
  lead_nome: string
  lead_telefone: string
  pergunta: string | null      // mensagem do lead que precedeu a resposta
  resposta: string             // resposta da VictorIA
  enviado_em: string
  avaliacao: 'boa' | 'ruim' | null
  correcao: string | null
}

/**
 * GET /api/curadoria?filtro=todas|sem_correcao|ruins
 * Lista as respostas da VictorIA que foram AVALIADAS (joia/não joia) na tela
 * de conversa do painel. Cada item traz a mensagem do lead que a precedeu,
 * a avaliação e a correção (preenchida aqui na curadoria).
 */
export async function GET(req: NextRequest) {
  const filtro = req.nextUrl.searchParams.get('filtro') ?? 'todas'

  // 1. Avaliações registradas (joia/não joia), mais recentes primeiro
  const { data: curRaw } = await supabaseAdmin
    .from('sdr_curadoria')
    .select('mensagem_id, lead_id, avaliacao, correcao, criado_em')
    .order('criado_em', { ascending: false })
    .limit(150)

  const curados = (curRaw ?? []) as Array<{
    mensagem_id: string
    lead_id: string | null
    avaliacao: 'boa' | 'ruim'
    correcao: string | null
    criado_em: string
  }>

  if (curados.length === 0) {
    return NextResponse.json({ itens: [], stats: { total: 0, sem_correcao: 0, ruins: 0 } })
  }

  // 2. Mensagens avaliadas + janela de mensagens dos leads envolvidos (p/ contexto)
  const msgIds = curados.map((c) => c.mensagem_id)
  const leadIds = [...new Set(curados.map((c) => c.lead_id).filter(Boolean))] as string[]

  const [{ data: avaliadasRaw }, { data: contextoRaw }, { data: leadsRaw }] =
    await Promise.all([
      supabaseAdmin
        .from('sdr_mensagens')
        .select('id, lead_id, direcao, conteudo, template_hsm, enviado_em')
        .in('id', msgIds),
      supabaseAdmin
        .from('sdr_mensagens')
        .select('id, lead_id, direcao, conteudo, template_hsm, enviado_em')
        .in('lead_id', leadIds)
        .order('enviado_em', { ascending: true })
        .limit(1500),
      supabaseAdmin.from('sdr_leads').select('id, nome, telefone').in('id', leadIds),
    ])

  const avaliadas = new Map(
    ((avaliadasRaw ?? []) as MensagemRow[]).map((m) => [m.id, m]),
  )
  const leadMap = new Map(
    (leadsRaw ?? []).map((l) => [
      l.id as string,
      l as { id: string; nome: string; telefone: string },
    ]),
  )

  // Agrupa o contexto por lead pra achar o "in" antes de cada resposta
  const porLead: Record<string, MensagemRow[]> = {}
  for (const m of (contextoRaw ?? []) as MensagemRow[]) {
    ;(porLead[m.lead_id] ??= []).push(m)
  }
  function perguntaAntes(leadId: string, enviadoEm: string): string | null {
    const seq = porLead[leadId] ?? []
    let pergunta: string | null = null
    for (const m of seq) {
      if (m.enviado_em >= enviadoEm) break
      if (m.direcao === 'in') pergunta = m.conteudo
    }
    return pergunta
  }

  // 3. Monta os itens
  let itens: ItemCuradoria[] = curados
    .map((c) => {
      const msg = avaliadas.get(c.mensagem_id)
      if (!msg) return null
      const lead = c.lead_id ? leadMap.get(c.lead_id) : undefined
      return {
        mensagem_id: c.mensagem_id,
        lead_id: c.lead_id ?? '',
        lead_nome: lead?.nome ?? 'Lead',
        lead_telefone: lead?.telefone ?? '',
        pergunta: perguntaAntes(msg.lead_id, msg.enviado_em),
        resposta: msg.conteudo,
        enviado_em: msg.enviado_em,
        avaliacao: c.avaliacao,
        correcao: c.correcao,
      } as ItemCuradoria
    })
    .filter((x): x is ItemCuradoria => x !== null)

  const total = itens.length
  const semCorrecao = itens.filter((i) => !i.correcao).length
  const ruins = itens.filter((i) => i.avaliacao === 'ruim').length

  if (filtro === 'sem_correcao') {
    itens = itens.filter((i) => !i.correcao)
  } else if (filtro === 'ruins') {
    itens = itens.filter((i) => i.avaliacao === 'ruim')
  }

  return NextResponse.json({
    itens,
    stats: { total, sem_correcao: semCorrecao, ruins },
  })
}

/**
 * POST /api/curadoria
 * Salva (upsert) a avaliação de uma resposta da VictorIA.
 * Body: { mensagem_id, lead_id, avaliacao: 'boa'|'ruim', correcao?: string }
 */
export async function POST(req: NextRequest) {
  const body = await req.json()
  const { mensagem_id, lead_id, avaliacao, correcao } = body as {
    mensagem_id?: string
    lead_id?: string
    avaliacao?: 'boa' | 'ruim'
    correcao?: string
  }

  if (!mensagem_id || (avaliacao !== 'boa' && avaliacao !== 'ruim')) {
    return NextResponse.json({ error: 'mensagem_id e avaliacao são obrigatórios' }, { status: 400 })
  }

  // Captura um snapshot do contexto (resposta avaliada + pergunta do lead que
  // a precedeu). Guardado direto na linha pra alimentar o few-shot do prompt
  // sem precisar de joins — e fica imune a mensagem deletada depois.
  let pergunta: string | null = null
  let resposta: string | null = null
  const { data: msg } = await supabaseAdmin
    .from('sdr_mensagens')
    .select('lead_id, conteudo, enviado_em')
    .eq('id', mensagem_id)
    .maybeSingle()
  if (msg) {
    resposta = msg.conteudo as string
    const { data: anterior } = await supabaseAdmin
      .from('sdr_mensagens')
      .select('conteudo')
      .eq('lead_id', msg.lead_id)
      .eq('direcao', 'in')
      .lt('enviado_em', msg.enviado_em)
      .order('enviado_em', { ascending: false })
      .limit(1)
      .maybeSingle()
    pergunta = (anterior?.conteudo as string) ?? null
  }

  const { error } = await supabaseAdmin.from('sdr_curadoria').upsert(
    {
      mensagem_id,
      lead_id: lead_id ?? null,
      avaliacao,
      correcao: correcao?.trim() || null,
      pergunta,
      resposta,
      atualizado_em: new Date().toISOString(),
    },
    { onConflict: 'mensagem_id' },
  )

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json({ ok: true })
}
