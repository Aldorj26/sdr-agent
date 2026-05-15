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
 * GET /api/curadoria?filtro=todas|nao_avaliadas|ruins
 * Lista as últimas respostas de texto livre da VictorIA (não-templates) com a
 * mensagem do lead que as precedeu e o estado de avaliação atual.
 */
export async function GET(req: NextRequest) {
  const filtro = req.nextUrl.searchParams.get('filtro') ?? 'todas'

  // Últimas 250 mensagens — janela suficiente pra parear in/out por lead
  const { data: msgsRaw } = await supabaseAdmin
    .from('sdr_mensagens')
    .select('id, lead_id, direcao, conteudo, template_hsm, enviado_em')
    .order('enviado_em', { ascending: false })
    .limit(250)

  const msgs = (msgsRaw ?? []) as MensagemRow[]

  // Ordena ascendente e agrupa por lead pra encontrar o "in" antes de cada "out"
  const asc = [...msgs].sort((a, b) => a.enviado_em.localeCompare(b.enviado_em))
  const porLead: Record<string, MensagemRow[]> = {}
  for (const m of asc) {
    ;(porLead[m.lead_id] ??= []).push(m)
  }

  // Coleta as respostas curáveis: out + texto livre (sem template_hsm)
  const itens: Omit<ItemCuradoria, 'lead_nome' | 'lead_telefone' | 'avaliacao' | 'correcao'>[] = []
  for (const seq of Object.values(porLead)) {
    for (let i = 0; i < seq.length; i++) {
      const m = seq[i]
      if (m.direcao !== 'out' || m.template_hsm) continue
      // Acha o último "in" antes dessa resposta
      let pergunta: string | null = null
      for (let j = i - 1; j >= 0; j--) {
        if (seq[j].direcao === 'in') {
          pergunta = seq[j].conteudo
          break
        }
      }
      itens.push({
        mensagem_id: m.id,
        lead_id: m.lead_id,
        pergunta,
        resposta: m.conteudo,
        enviado_em: m.enviado_em,
      })
    }
  }

  // Mais recentes primeiro, limita a 60
  itens.sort((a, b) => b.enviado_em.localeCompare(a.enviado_em))
  const top = itens.slice(0, 60)

  // Busca nomes dos leads e avaliações existentes
  const leadIds = [...new Set(top.map((i) => i.lead_id))]
  const msgIds = top.map((i) => i.mensagem_id)

  const [{ data: leadsRaw }, { data: curRaw }] = await Promise.all([
    supabaseAdmin.from('sdr_leads').select('id, nome, telefone').in('id', leadIds),
    supabaseAdmin
      .from('sdr_curadoria')
      .select('mensagem_id, avaliacao, correcao')
      .in('mensagem_id', msgIds),
  ])

  const leadMap = new Map(
    (leadsRaw ?? []).map((l) => [l.id as string, l as { id: string; nome: string; telefone: string }]),
  )
  const curMap = new Map(
    (curRaw ?? []).map((c) => [
      c.mensagem_id as string,
      c as { mensagem_id: string; avaliacao: 'boa' | 'ruim'; correcao: string | null },
    ]),
  )

  let resultado: ItemCuradoria[] = top.map((i) => {
    const lead = leadMap.get(i.lead_id)
    const cur = curMap.get(i.mensagem_id)
    return {
      ...i,
      lead_nome: lead?.nome ?? 'Lead',
      lead_telefone: lead?.telefone ?? '',
      avaliacao: cur?.avaliacao ?? null,
      correcao: cur?.correcao ?? null,
    }
  })

  if (filtro === 'nao_avaliadas') {
    resultado = resultado.filter((i) => i.avaliacao === null)
  } else if (filtro === 'ruins') {
    resultado = resultado.filter((i) => i.avaliacao === 'ruim')
  }

  // Contadores pro cabeçalho
  const total = top.length
  const avaliadas = top.filter((i) => curMap.has(i.mensagem_id)).length
  const ruins = [...curMap.values()].filter((c) => c.avaliacao === 'ruim').length

  return NextResponse.json({ itens: resultado, stats: { total, avaliadas, ruins } })
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

  const { error } = await supabaseAdmin.from('sdr_curadoria').upsert(
    {
      mensagem_id,
      lead_id: lead_id ?? null,
      avaliacao,
      correcao: correcao?.trim() || null,
      atualizado_em: new Date().toISOString(),
    },
    { onConflict: 'mensagem_id' },
  )

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json({ ok: true })
}
