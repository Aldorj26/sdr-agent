import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

type Action =
  | { type: 'pause'; hours: number }
  | { type: 'unpause' }
  | { type: 'force-followup' }
  | { type: 'mark-descartado' }
  | { type: 'unlock' }

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const action = (await req.json()) as Action

  const { data: lead, error: leadErr } = await supabaseAdmin
    .from('sdr_leads')
    .select('observacoes')
    .eq('id', id)
    .maybeSingle()
  if (leadErr || !lead) {
    return NextResponse.json({ error: 'lead_nao_encontrado' }, { status: 404 })
  }

  const updates: Record<string, unknown> = {}

  switch (action.type) {
    case 'pause': {
      const hours = Math.max(1, Math.min(720, Number(action.hours) || 24))
      const ate = new Date(Date.now() + hours * 60 * 60 * 1000).toISOString()
      const base = (lead.observacoes ?? '').replace(/\s*\[PAUSA_ATE:[^\]]+\]/, '')
      updates.observacoes = `${base} [PAUSA_ATE:${ate}]`.trim()
      updates.status = 'AGUARDANDO'
      updates.data_proximo_followup = ate
      break
    }
    case 'unpause': {
      updates.observacoes = (lead.observacoes ?? '').replace(/\s*\[PAUSA_ATE:[^\]]+\]/, '').trim() || null
      break
    }
    case 'force-followup': {
      updates.data_proximo_followup = new Date().toISOString()
      break
    }
    case 'mark-descartado': {
      updates.status = 'DESCARTADO'
      updates.data_proximo_followup = null
      break
    }
    case 'unlock': {
      updates.webhook_lock_at = null
      break
    }
    default:
      return NextResponse.json({ error: 'acao_invalida' }, { status: 400 })
  }

  const { error: updErr } = await supabaseAdmin
    .from('sdr_leads')
    .update(updates)
    .eq('id', id)

  if (updErr) {
    return NextResponse.json({ error: updErr.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true, action: action.type, updates })
}
