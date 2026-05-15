import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  const { data: lead, error: leadErr } = await supabaseAdmin
    .from('sdr_leads')
    .select('*')
    .eq('id', id)
    .maybeSingle()

  if (leadErr || !lead) {
    return NextResponse.json({ error: 'lead_nao_encontrado' }, { status: 404 })
  }

  const { data: mensagensRaw } = await supabaseAdmin
    .from('sdr_mensagens')
    .select('*')
    .eq('lead_id', id)
    .order('enviado_em', { ascending: true })
    .limit(100)

  const mensagens = mensagensRaw ?? []

  // Anexa a avaliação de curadoria (joia/não joia) em cada mensagem
  const { data: curRaw } = await supabaseAdmin
    .from('sdr_curadoria')
    .select('mensagem_id, avaliacao')
    .in('mensagem_id', mensagens.map((m) => m.id))

  const curMap = new Map(
    (curRaw ?? []).map((c) => [c.mensagem_id as string, c.avaliacao as 'boa' | 'ruim']),
  )
  const mensagensComAvaliacao = mensagens.map((m) => ({
    ...m,
    avaliacao: curMap.get(m.id) ?? null,
  }))

  return NextResponse.json({ lead, mensagens: mensagensComAvaliacao })
}
