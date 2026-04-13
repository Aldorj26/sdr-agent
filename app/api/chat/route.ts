import { NextRequest, NextResponse } from 'next/server'
import { processarMensagem } from '@/lib/claude'
import type { Mensagem } from '@/lib/supabase'

export async function POST(req: NextRequest) {
  const { mensagem, historico, nome } = await req.json()

  if (!mensagem?.trim()) {
    return NextResponse.json({ error: 'Mensagem vazia' }, { status: 400 })
  }

  // Converte histórico do frontend para formato Mensagem
  const msgs: Mensagem[] = (historico ?? []).map((m: { role: string; content: string }, i: number) => ({
    id: String(i),
    lead_id: '0',
    direcao: m.role === 'user' ? 'in' as const : 'out' as const,
    conteudo: m.content,
    template_hsm: null,
    enviado_em: new Date().toISOString(),
  }))

  try {
    const resposta = await processarMensagem(mensagem, msgs, nome || 'Visitante')
    return NextResponse.json(resposta)
  } catch (err) {
    console.error('Erro no chat:', err)
    return NextResponse.json({ error: 'Erro ao processar' }, { status: 500 })
  }
}
