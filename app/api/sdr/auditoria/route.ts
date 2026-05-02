import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getPipeOpportunities, alertHuman, PIPELINE_AIVA, STAGES } from '@/lib/evotalks'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

/**
 * Auditoria diária — cruza estado dos leads no Supabase com oportunidades
 * abertas no CRM Evo Talks pra detectar desincronização.
 *
 * Roda 1x/dia (madrugada). Quando acha discrepância: SÓ LOGA + alerta Aldo
 * via WhatsApp. Não auto-corrige nada — primeira rodada vai ter MUITA
 * discrepância acumulada e auto-correção em massa é arriscada.
 *
 * Discrepâncias detectadas:
 *   1. Lead INTERESSADO/AGUARDANDO/FORMULARIO_ENVIADO no Supabase
 *      mas opp no CRM está em SEM_RESPOSTA / BOT_DETECTADO / fechada.
 *   2. Lead FORMULARIO_ENVIADO no Supabase mas SEM opp aberta no CRM.
 *   3. Opp aberta no CRM (pipeline 15) com mainphone mas sem lead no Supabase.
 *
 * Auth: Bearer WEBHOOK_SECRET (igual outros crons)
 * Cron Vercel: agendar 1x/dia em vercel.json (sugerido 8h UTC = 5h BRT)
 */
export async function POST(req: NextRequest) {
  const auth = req.headers.get('authorization') ?? ''
  if (auth !== `Bearer ${process.env.WEBHOOK_SECRET}` && auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  const ts = new Date().toISOString()

  // 1. Pega oportunidades abertas no Evo Talks (pipeline 15 = Campanha AIVA)
  let opps
  try {
    opps = await getPipeOpportunities(PIPELINE_AIVA)
  } catch (err) {
    return NextResponse.json(
      { ok: false, ts, error: 'evotalks_unreachable', detail: String(err) },
      { status: 503 },
    )
  }

  // Index por telefone (limpo) — facilita lookup
  const oppByPhone = new Map<string, typeof opps[number]>()
  for (const o of opps) {
    const phone = (o.mainphone ?? '').replace(/\D/g, '')
    if (phone) oppByPhone.set(phone, o)
  }

  // 2. Pega leads "ativos" no Supabase
  const { data: leads, error: dbErr } = await supabaseAdmin
    .from('sdr_leads')
    .select('id, nome, telefone, status, evotalks_opportunity_id, criado_em')
    .in('status', ['INTERESSADO', 'AGUARDANDO', 'FORMULARIO_ENVIADO', 'DISPARO_REALIZADO'])

  if (dbErr) {
    return NextResponse.json({ ok: false, ts, error: 'supabase', detail: dbErr.message }, { status: 500 })
  }

  const leadsAtivos = leads ?? []

  // 3. Cruzamento — encontra discrepâncias
  const stageDead = new Set<number>([
    STAGES.SEM_RESPOSTA,
    STAGES.BOT_DETECTADO,
  ])

  type Discrepancia = {
    tipo: 'opp_morta_lead_vivo' | 'lead_formulario_sem_opp' | 'opp_orfa'
    leadId?: string
    nome?: string
    telefone?: string
    statusLead?: string
    oppId?: number
    oppStage?: number
  }
  const discrepancias: Discrepancia[] = []

  // 3a. Leads "vivos" cuja opp já tá morta no CRM
  for (const lead of leadsAtivos) {
    const phone = (lead.telefone ?? '').replace(/\D/g, '')
    const opp = oppByPhone.get(phone)
    if (!opp) {
      // 3b. Lead em FORMULARIO_ENVIADO mas sem opp aberta no CRM
      if (lead.status === 'FORMULARIO_ENVIADO') {
        discrepancias.push({
          tipo: 'lead_formulario_sem_opp',
          leadId: lead.id,
          nome: lead.nome,
          telefone: lead.telefone,
          statusLead: lead.status,
        })
      }
      continue
    }
    if (stageDead.has(opp.fkStage)) {
      discrepancias.push({
        tipo: 'opp_morta_lead_vivo',
        leadId: lead.id,
        nome: lead.nome,
        telefone: lead.telefone,
        statusLead: lead.status,
        oppId: opp.id,
        oppStage: opp.fkStage,
      })
    }
  }

  // 3c. Opps órfãs — abertas no CRM, telefone sem lead correspondente
  const phonesLead = new Set(leadsAtivos.map((l) => (l.telefone ?? '').replace(/\D/g, '')))
  // Também checa leads "encerrados" pra evitar falso positivo
  const { data: leadsTodos } = await supabaseAdmin
    .from('sdr_leads')
    .select('telefone')
  for (const l of leadsTodos ?? []) {
    phonesLead.add((l.telefone ?? '').replace(/\D/g, ''))
  }
  for (const [phone, opp] of oppByPhone) {
    if (!phonesLead.has(phone)) {
      discrepancias.push({
        tipo: 'opp_orfa',
        telefone: phone,
        oppId: opp.id,
        oppStage: opp.fkStage,
      })
    }
  }

  // 4. Alerta Aldo se houver discrepância
  const aldoNumber = process.env.ALDO_WHATSAPP
  let alertaEnviado = false
  if (discrepancias.length > 0 && aldoNumber) {
    const cnt = {
      opp_morta_lead_vivo: discrepancias.filter((d) => d.tipo === 'opp_morta_lead_vivo').length,
      lead_formulario_sem_opp: discrepancias.filter((d) => d.tipo === 'lead_formulario_sem_opp').length,
      opp_orfa: discrepancias.filter((d) => d.tipo === 'opp_orfa').length,
    }
    const msg =
      `[Auditoria SDR AIVA] ${discrepancias.length} divergencias encontradas:\n` +
      `- ${cnt.opp_morta_lead_vivo} leads ativos com opp morta no CRM\n` +
      `- ${cnt.lead_formulario_sem_opp} leads em FORMULARIO_ENVIADO sem opp\n` +
      `- ${cnt.opp_orfa} opps no CRM sem lead correspondente\n\n` +
      `Verifique o relatório completo via /api/sdr/auditoria.`
    const r = await alertHuman(aldoNumber, msg)
    alertaEnviado = r.ok
  }

  return NextResponse.json({
    ok: true,
    ts,
    leadsAtivos: leadsAtivos.length,
    oppsAbertas: opps.length,
    discrepancias,
    alertaEnviado,
  })
}

// Vercel cron envia GET — aceita os dois
export async function GET(req: NextRequest) {
  return POST(req)
}
