import { NextRequest, NextResponse } from 'next/server'
import { sendText } from '@/lib/evotalks'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 30

/**
 * GET /api/sdr/briefing-aldo
 *
 * Cron Vercel diário 8:55 BRT seg-sex (`55 11 * * 1-5` UTC) que monta
 * o briefing matinal do Aldo e manda direto pelo WhatsApp via Evo Talks.
 *
 * Por que aqui (em vez de rotina remota Anthropic):
 * - Sandbox da rotina remota tem allowlist curada que bloqueia chamadas
 *   pra hosts customizados como sdr-agente.vercel.app.
 * - Cron Vercel + Evo Talks roda no mesmo caminho da auditoria 5h
 *   (que já funciona).
 *
 * Auth: Bearer WEBHOOK_SECRET ou CRON_SECRET (Vercel cron envia auto).
 *
 * Template: hardcoded por dia da semana. Pendências em PENDENCIAS_ATIVAS
 * abaixo — atualizar via commit quando contexto mudar.
 */

type DiaSemana = 1 | 2 | 3 | 4 | 5
type FocoDia = {
  manhaAleria: string
  blocoProfundo: string
  conteudoBloco: string
  naoPodeEscapar: string
}

const TEMPLATE_POR_DIA: Record<DiaSemana, FocoDia> = {
  1: { // segunda
    manhaAleria: 'prep Khronos (refinar proposta + simular objeções)',
    blocoProfundo: 'Aleria deep — Khronos',
    conteudoBloco: 'Refinar proposta Khronos: pricing, entregáveis, cronograma. Foco total até pronta pra envio.',
    naoPodeEscapar: 'Cobrar Gustavo HOJE: HSM Singlo + HSM Treinar AIVA. Singlo continua bloqueado sem isso.',
  },
  2: { // terça
    manhaAleria: 'pesquisa Monuv (Smart Sampa SP) + decisor + abordagem',
    blocoProfundo: 'Cofre de Exames — review com Eder',
    conteudoBloco: 'Cofre: alinhar com Eder o que tá pronto, o que falta, próximos marcos. Decidir prazo de lançamento.',
    naoPodeEscapar: 'Monuv tem urgência: Smart Sampa é janela aberta, não deixa esfriar.',
  },
  3: { // quarta
    manhaAleria: 'cobrar Murilo Fischer + prep bancos (Itaú/Bradesco/BTG/Inter/BB)',
    blocoProfundo: 'Aleria — C6 Bank/abordagem bancária',
    conteudoBloco: 'C6 Bank via Murilo: prep deck PT-BR, identificar decisor, montar abordagem soberania BACEN.',
    naoPodeEscapar: 'Murilo é a porta bancária — sem ele, R$ 50-200mi/ano de pipeline fica fechado.',
  },
  4: { // quinta
    manhaAleria: 'Heineken pesquisa + Khronos follow-up',
    blocoProfundo: 'Aleria — Heineken + atualizar 5W2H semanal',
    conteudoBloco: 'Heineken: identificar CTO LATAM ou CIO BR. Atualizar planilha 5W2H das 14 contas (próximo passo + data).',
    naoPodeEscapar: 'Sem 5W2H atualizado, sexta vira teatro. Atualizar HOJE, 30min.',
  },
  5: { // sexta
    manhaAleria: 'outreach novos contatos + atualizar planilha',
    blocoProfundo: 'REVIEW SEMANA + plan próxima',
    conteudoBloco: 'Métricas todas frentes (AIVA/Singlo/Aleria/Essa.co) + onde mexeu, onde travou, top 3 prioridades semana próxima.',
    naoPodeEscapar: 'Fechar a semana com clareza ou começa segunda correndo.',
  },
}

/** Pendências ativas (atualizar via commit quando contexto mudar) */
const PENDENCIAS_ATIVAS = [
  'Rotação de chaves essa semana (ANTHROPIC, SUPABASE, EVO_TALKS, WEBHOOK)',
  'Cobrar Murilo Fischer sobre quais bancos abrir porta',
  'Cobrar Gustavo: HSM Singlo + HSM Treinar AIVA',
  'Khronos: meta fechar até 30/05',
  'Mariana Essa.co: Dia das Mães 11/05 mini-campanha',
  'Validar logs cron auditoria SDR-AIVA (rodou 5h BRT)',
]

const NOMES_DIA = ['DOMINGO', 'SEGUNDA', 'TERÇA', 'QUARTA', 'QUINTA', 'SEXTA', 'SÁBADO']

function brtNow(): { dia: number; data: string; nomeDia: string } {
  // Converte UTC pra BRT (-3h)
  const now = new Date()
  const brtDate = new Date(now.getTime() - 3 * 60 * 60 * 1000)
  const dia = brtDate.getUTCDay() // 0=dom, 1=seg, ..., 6=sab
  const dd = String(brtDate.getUTCDate()).padStart(2, '0')
  const mm = String(brtDate.getUTCMonth() + 1).padStart(2, '0')
  return {
    dia,
    data: `${dd}/${mm}`,
    nomeDia: NOMES_DIA[dia] ?? 'DIA',
  }
}

function montarBriefing(): string | null {
  const { dia, data, nomeDia } = brtNow()
  if (dia < 1 || dia > 5) return null // fim de semana, sem briefing

  const foco = TEMPLATE_POR_DIA[dia as DiaSemana]
  if (!foco) return null

  // Top 3 lembretes (rotaciona por dia pra não repetir os mesmos)
  const lembretes = PENDENCIAS_ATIVAS.slice(((dia - 1) * 3) % PENDENCIAS_ATIVAS.length, ((dia - 1) * 3) % PENDENCIAS_ATIVAS.length + 3)
  // Se não pegou 3, completa do início
  while (lembretes.length < 3) {
    const idx = lembretes.length
    if (PENDENCIAS_ATIVAS[idx] && !lembretes.includes(PENDENCIAS_ATIVAS[idx])) {
      lembretes.push(PENDENCIAS_ATIVAS[idx])
    } else {
      break
    }
  }

  return [
    `☀️ *Briefing ${nomeDia} ${data}*`,
    '',
    `🎯 *Manhã (09:30-11:45)*`,
    `AIVA gestão funil + Aleria: ${foco.manhaAleria}.`,
    '',
    `🔍 *Bloco profundo (13:30-15:30)*`,
    `${foco.blocoProfundo} — ${foco.conteudoBloco}`,
    '',
    `📝 *Lembretes hoje*`,
    ...lembretes.map((l) => `• ${l}`),
    '',
    `⚡ *NÃO PODE ESCAPAR*`,
    foco.naoPodeEscapar,
  ].join('\n')
}

export async function GET(req: NextRequest) {
  const auth = req.headers.get('authorization') ?? ''
  if (auth !== `Bearer ${process.env.WEBHOOK_SECRET}` && auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const briefing = montarBriefing()
  if (!briefing) {
    const { nomeDia } = brtNow()
    return NextResponse.json({ ok: true, ignorado: 'fim_de_semana', dia: nomeDia })
  }

  const aldoNumber = process.env.ALDO_WHATSAPP
  if (!aldoNumber) {
    return NextResponse.json({ ok: false, error: 'aldo_not_configured' }, { status: 500 })
  }

  try {
    await sendText(aldoNumber, briefing)
    return NextResponse.json({ ok: true, ts: new Date().toISOString(), briefing })
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err)
    console.error('[briefing-aldo] sendText falhou:', errMsg)
    return NextResponse.json({ ok: false, error: errMsg, briefing }, { status: 502 })
  }
}

// Vercel cron envia GET — aceita também POST por consistência com outros endpoints
export async function POST(req: NextRequest) {
  return GET(req)
}
