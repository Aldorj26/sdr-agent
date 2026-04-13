import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import type { LeadStatus } from '@/lib/supabase'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const status = searchParams.get('status') as LeadStatus | null
  const limit = Number(searchParams.get('limit') ?? '50')

  let query = supabaseAdmin
    .from('sdr_leads')
    .select('*')
    .order('criado_em', { ascending: false })
    .limit(limit)

  if (status) {
    query = query.eq('status', status)
  }

  const { data: leads, error } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Busca métricas da view
  const { data: metricas } = await supabaseAdmin.from('sdr_metricas').select('*')

  return NextResponse.json({ leads: leads ?? [], metricas: metricas ?? [] })
}
