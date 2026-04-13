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

  const { data: mensagens } = await supabaseAdmin
    .from('sdr_mensagens')
    .select('*')
    .eq('lead_id', id)
    .order('enviado_em', { ascending: true })
    .limit(100)

  return NextResponse.json({ lead, mensagens: mensagens ?? [] })
}
