#!/usr/bin/env node
/**
 * Migração one-off: aplica tag INBOUND (id 77) nas opps já existentes
 * que foram criadas a partir de leads inbound (TRIAGEM ou obs com "inbound").
 *
 * Uso:
 *   node --env-file=.env.local scripts/tag_inbound_existentes.mjs
 *
 * Idempotente: o endpoint /int/updateOpportunity da Evo Talks aceita add tags
 * sem duplicar — se a tag já tá, não cria duplicata.
 */

import { createClient } from '@supabase/supabase-js'

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
)

const BASE_URL = process.env.EVO_TALKS_BASE_URL ?? 'https://tracktecnologia.evotalks.com.br'
const QUEUE_ID = Number(process.env.EVO_TALKS_QUEUE_ID ?? 10)
const QUEUE_API_KEY = process.env.EVO_TALKS_QUEUE_API_KEY

const TAG_INBOUND = 77

async function addOpportunityTags(opportunityId, tagIds) {
  const url = `${BASE_URL}/int/updateOpportunity`
  // Campo correto = "id" (não "opportunityId"). Mesma assinatura usada
  // em lib/evotalks.ts → addOpportunityTags.
  const body = {
    queueId: QUEUE_ID,
    apiKey: QUEUE_API_KEY,
    id: opportunityId,
    tags: tagIds,
  }
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Evo Talks /int/updateOpportunity → ${res.status}: ${text}`)
  }
  return res.json()
}

async function main() {
  // Lista hardcoded dos opp IDs inbound (extraida via SQL direto no Supabase).
  // Inclui leads com produto=TRIAGEM ou observacoes contendo 'inbound'.
  // O supabase-js paginava em 1000 com filtro IS NOT NULL e perdia leads
  // mais antigos — por isso a lista vem hardcoded.
  const inbound = [
    { oppId: 5011, telefone: '5555999982427' },
    { oppId: 5006, telefone: '5555999759645' },
    { oppId: 4996, telefone: '5555999218930' },
    { oppId: 4990, telefone: '5555997120384' },
    { oppId: 4988, telefone: '5555996966565' },
    { oppId: 4971, telefone: '5555991377788' },
    { oppId: 4650, telefone: '5514996142915' },
    { oppId: 3715, telefone: '5528999261383' },
    { oppId: 3690, telefone: '5527996616071' },
    { oppId: 3565, telefone: '555192146639'  },
    { oppId: 3563, telefone: '554784196636'  },
    { oppId: 3562, telefone: '554796613449'  },
  ]

  console.log(`Aplicando tag INBOUND em ${inbound.length} opps inbound legadas`)

  let sucesso = 0
  let falha = 0
  const erros = []

  for (const lead of inbound) {
    const oppId = Number(lead.oppId)
    if (!oppId) continue
    try {
      await addOpportunityTags(oppId, [TAG_INBOUND])
      sucesso++
      console.log(`✓ Opp #${oppId} (${lead.telefone}) → tag INBOUND aplicada`)
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      if (msg.includes('OPP_001')) {
        // Opp não existe mais no Evo Talks (deletada/arquivada) — skip silencioso
        console.warn(`⚠ Opp #${oppId} (${lead.telefone}) → não existe mais (OPP_001), pulando`)
      } else {
        falha++
        erros.push({ oppId, telefone: lead.telefone, error: msg })
        console.error(`✗ Opp #${oppId} (${lead.telefone}) → ${msg}`)
      }
    }
    // pausa pequena pra não estourar rate limit
    await new Promise((r) => setTimeout(r, 300))
  }

  console.log('\n--- Resumo ---')
  console.log(`Sucesso: ${sucesso} | Falha: ${falha}`)
  if (erros.length) console.log('Erros:', erros)
}

main().catch((err) => {
  console.error('Erro fatal:', err)
  process.exit(1)
})
