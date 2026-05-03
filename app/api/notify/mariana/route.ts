import { NextRequest, NextResponse } from 'next/server'
import { sendText } from '@/lib/evotalks'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 30

/**
 * POST /api/notify/mariana
 *
 * Endpoint estreito pra rotina remota Claude enviar lembrete diário pra
 * Mariana (esposa do Aldo) sobre tarefas Essa.co. Auth: Bearer WEBHOOK_SECRET.
 *
 * Body: { "message": "..." }
 *
 * Destino fixo: 5547996087000 (Mariana). Numero não vem como parametro,
 * blast radius nulo se secret vazar (so spam pra Mariana).
 *
 * IMPORTANTE: Mariana esta marcada como OPT_OUT no sdr_leads (bloqueia
 * VictorIA processar respostas dela como lead AIVA). Se ela responder
 * essas mensagens, webhook ignora silenciosamente.
 */
export async function POST(req: NextRequest) {
  const auth = req.headers.get('authorization') ?? ''
  if (auth !== `Bearer ${process.env.WEBHOOK_SECRET}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const marianaNumber = '5547996087000'

  let body: { message?: string } = {}
  try {
    body = (await req.json()) as { message?: string }
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 })
  }

  if (!body.message || typeof body.message !== 'string') {
    return NextResponse.json({ error: 'message_required' }, { status: 400 })
  }

  if (body.message.length > 4000) {
    return NextResponse.json({ error: 'message_too_long', maxChars: 4000, got: body.message.length }, { status: 400 })
  }

  try {
    await sendText(marianaNumber, body.message)
    return NextResponse.json({ ok: true, ts: new Date().toISOString() })
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err)
    console.error('[notify/mariana] sendText falhou:', errMsg)
    return NextResponse.json({ ok: false, error: errMsg }, { status: 502 })
  }
}
