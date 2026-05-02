import { NextResponse } from 'next/server'
import { getQueueStatus, validateTagIds } from '@/lib/evotalks'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * Health check do SDR AIVA.
 *
 * Pinga a fila Evo Talks (queueId=10) pra detectar antes que o SDR
 * passe a não entregar mensagem porque a fila caiu.
 *
 * - 200 quando connected + authenticated + enabled === true
 * - 503 caso contrário (com detalhes pra debug)
 *
 * Sem auth — endpoint público pra Uptime/Vercel monitor poder chamar.
 */
export async function GET() {
  const ts = new Date().toISOString()

  try {
    const [queue, tagsCheck] = await Promise.all([
      getQueueStatus(),
      validateTagIds().catch((err) => ({
        ok: false,
        drift: [{ id: 0, expected: 'fetch_failed', actual: String(err) }],
      })),
    ])

    const queueOk = queue.connected && queue.authenticated && queue.enabled
    const ok = queueOk && tagsCheck.ok

    return NextResponse.json(
      {
        ok,
        ts,
        produto: 'AIVA',
        queue: {
          name: queue.name,
          connected: queue.connected,
          authenticated: queue.authenticated,
          enabled: queue.enabled,
          openChats: queue.openChats,
        },
        tags: tagsCheck,
      },
      { status: ok ? 200 : 503 },
    )
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err)
    return NextResponse.json(
      { ok: false, ts, produto: 'AIVA', error: 'evotalks_unreachable', detail: errMsg },
      { status: 503 },
    )
  }
}
