#!/usr/bin/env node
/**
 * Disparo bulk do webinar AIVA "Pix, parcelado e o futuro dos meios de pagamento"
 * (12/05 terça-feira às 9h) — usa template HSM 21 (Reativação) com miolo customizado.
 *
 * Uso:
 *   node --env-file=.env.local scripts/dispatch_webinar.mjs           # disparo real
 *   node --env-file=.env.local scripts/dispatch_webinar.mjs --dry-run # só lista
 *
 * Filtro: todos os leads exceto OPT_OUT, NAO_QUALIFICADO, DESCARTADO,
 * BOT_DETECTADO, FORMULARIO_ENVIADO (status terminais ou opt-out).
 *
 * Rate limit: 5 envios paralelos + 1s entre lotes pra não estourar a Evo Talks.
 */

import { createClient } from '@supabase/supabase-js'

const args = process.argv.slice(2)
const dryRun = args.includes('--dry-run')

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
)

const BASE_URL = process.env.EVO_TALKS_BASE_URL ?? 'https://tracktecnologia.evotalks.com.br'
const QUEUE_ID = Number(process.env.EVO_TALKS_QUEUE_ID ?? 10)
const QUEUE_API_KEY = process.env.EVO_TALKS_QUEUE_API_KEY
const TEMPLATE_ID = Number(process.env.AIVA_REATIVACAO_TEMPLATE_ID ?? 21)

const MIOLO_WEBINAR =
  'amanhã 9h tem Webinar AIVA/UME: Pix, parcelado e o futuro dos meios de pagamento. Garanta sua vaga: https://www.trackcr.com.br/ume'

// Estratégia: disparar SÓ pros "frios/mornos" que estão fora do fluxo ativo.
// Status ATIVOS (excluídos) — esses leads tão num funil específico e receber
// HSM webinar atrapalha (VictorIA não sabe responder + crons criam spam):
//   COLETANDO_COMPLEMENTO, ANALISE_AIVA, TREINAMENTO, CADASTRO_COMPLETO
// Status TERMINAIS/OPT-OUT (excluídos):
//   OPT_OUT, NAO_QUALIFICADO, DESCARTADO, BOT_DETECTADO, FORMULARIO_ENVIADO
// Status ELEGÍVEIS (frios/mornos):
//   DISPARO_REALIZADO, INTERESSADO, AGUARDANDO, AGUARDANDO_APROVACAO, SEM_RESPOSTA
const STATUSES_ELEGIVEIS = [
  'DISPARO_REALIZADO',
  'INTERESSADO',
  'AGUARDANDO',
  'AGUARDANDO_APROVACAO',
  'SEM_RESPOSTA',
]

// Nomes genéricos que ficam estranhos no "Olá {{1}}, " do template
function ajustarNome(nome) {
  if (!nome) return 'lojista'
  const n = nome.trim()
  if (n.length === 0) return 'lojista'
  if (['loja', 'lojista', 'lead', 'cliente'].includes(n.toLowerCase())) return 'lojista'
  // Pega só primeiro nome
  return n.split(/\s+/)[0]
}

async function sendTemplate(number, vars) {
  const url = `${BASE_URL}/int/sendWaTemplate`
  const body = {
    queueId: QUEUE_ID,
    apiKey: QUEUE_API_KEY,
    number,
    templateId: TEMPLATE_ID,
    data: vars,
    openNewChat: true,
  }
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Evo Talks /int/sendWaTemplate → ${res.status}: ${text}`)
  }
  return res.json()
}

// Busca paginada (supabase-js limita 1000 por request)
async function fetchAllLeads() {
  const result = []
  let offset = 0
  const PAGE = 1000
  while (true) {
    const { data, error } = await sb
      .from('sdr_leads')
      .select('id, nome, telefone, status, observacoes')
      .order('criado_em', { ascending: true })
      .range(offset, offset + PAGE - 1)
    if (error) throw new Error(`Supabase select: ${error.message}`)
    if (!data || data.length === 0) break
    result.push(...data)
    if (data.length < PAGE) break
    offset += PAGE
  }
  return result
}

async function main() {
  console.log(`Miolo: "${MIOLO_WEBINAR}" (${MIOLO_WEBINAR.length} chars)`)
  console.log(`Template: ${TEMPLATE_ID}`)
  console.log(`Dry run: ${dryRun}`)
  console.log('---')

  const todos = await fetchAllLeads()
  console.log(`Total leads no banco: ${todos.length}`)

  const elegiveis = todos.filter((l) => l.telefone && STATUSES_ELEGIVEIS.includes(l.status))
  console.log(`Elegíveis (frios/mornos): ${elegiveis.length}`)

  // Breakdown por status pra audit
  const breakdown = {}
  elegiveis.forEach((l) => { breakdown[l.status] = (breakdown[l.status] ?? 0) + 1 })
  console.log('Breakdown por status:', breakdown)

  // Filtra também flag de já enviado pro mesmo webinar (idempotência)
  const naoEnviados = elegiveis.filter(
    (l) => !(l.observacoes ?? '').includes('[WEBINAR_12_05_ENVIADO'),
  )
  console.log(`Ainda não receberam o webinar: ${naoEnviados.length}`)

  if (dryRun) {
    console.log('\n--- DRY RUN — primeiros 20 ---')
    naoEnviados.slice(0, 20).forEach((l) =>
      console.log(`  ${l.telefone}  ${ajustarNome(l.nome)}  (status: ${l.status})`),
    )
    console.log(`\nTotal que receberia: ${naoEnviados.length}`)
    return
  }

  let sucesso = 0
  let falha = 0
  const erros = []
  const CHUNK = 5

  for (let i = 0; i < naoEnviados.length; i += CHUNK) {
    const batch = naoEnviados.slice(i, i + CHUNK)
    const total = Math.ceil(naoEnviados.length / CHUNK)
    const idx = Math.floor(i / CHUNK) + 1

    const results = await Promise.allSettled(
      batch.map(async (lead) => {
        const nome = ajustarNome(lead.nome)
        await sendTemplate(lead.telefone, [nome, MIOLO_WEBINAR])

        // Salva no histórico: marker + texto completo (pra Claude ter contexto)
        const textoCompleto = `Olá ${nome}, ${MIOLO_WEBINAR}`
        const flag = `[WEBINAR_12_05_ENVIADO:${new Date().toISOString()}]`
        const obsNova = `${flag} ${lead.observacoes ?? ''}`.trim()

        await sb.from('sdr_mensagens').insert([
          {
            lead_id: lead.id,
            direcao: 'out',
            conteudo: `[Template ${TEMPLATE_ID} enviado — Webinar Pix/Parcelado 12/05]`,
            template_hsm: 'aiva_webinar_12_05',
          },
          {
            lead_id: lead.id,
            direcao: 'out',
            conteudo: textoCompleto,
          },
        ])
        // NÃO atualiza data_ultimo_contato — preserva o cronômetro dos crons
        // followup/followup-fase (eles medem "tempo sem resposta do lead" e o
        // HSM webinar é envio nosso, não resposta do lead).
        await sb
          .from('sdr_leads')
          .update({ observacoes: obsNova })
          .eq('id', lead.id)

        return { telefone: lead.telefone, ok: true }
      }),
    )

    for (const r of results) {
      if (r.status === 'fulfilled') {
        sucesso++
      } else {
        falha++
        erros.push(r.reason?.message ?? String(r.reason))
      }
    }

    console.log(`Lote ${idx}/${total} (${batch.length}) → sucesso=${sucesso} falha=${falha}`)

    // Rate limit
    if (i + CHUNK < naoEnviados.length) {
      await new Promise((r) => setTimeout(r, 1000))
    }
  }

  console.log('\n--- Resumo ---')
  console.log(`Total enviado: ${naoEnviados.length}`)
  console.log(`Sucesso: ${sucesso} | Falha: ${falha}`)
  if (erros.length) {
    console.log('\nErros (primeiros 5):')
    erros.slice(0, 5).forEach((e) => console.log(`  ${e}`))
  }
}

main().catch((err) => {
  console.error('Erro fatal:', err)
  process.exit(1)
})
