/**
 * Script para sincronizar tag IMPORTANTE (id 74) do CRM Evo Talks → Supabase.
 * Busca todas as oportunidades dos leads e marca importante=true no Supabase
 * para os que têm a tag 74.
 *
 * Uso: node scripts/sync-importante-tags.mjs
 */

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://axkrorkhnkfkpbjikwrb.supabase.co'
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const EVO_BASE = 'https://tracktecnologia.evotalks.com.br'
const QUEUE_ID = 10
const QUEUE_API_KEY = '5bb6aa653e204c4f9c302b79ef783c1a'
const TAG_IMPORTANTE = 74

if (!SUPABASE_KEY) {
  console.error('Defina SUPABASE_SERVICE_ROLE_KEY no ambiente')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

async function getOpportunity(oppId) {
  const res = await fetch(`${EVO_BASE}/int/getOpportunity`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ queueId: QUEUE_ID, apiKey: QUEUE_API_KEY, id: oppId }),
  })
  if (!res.ok) throw new Error(`getOpportunity ${oppId} → ${res.status}`)
  return res.json()
}

async function main() {
  // Busca todos os leads com oportunidade e que não são importantes ainda
  const { data: leads, error } = await supabase
    .from('sdr_leads')
    .select('id, nome, telefone, evotalks_opportunity_id')
    .not('evotalks_opportunity_id', 'is', null)
    .eq('importante', false)

  if (error) {
    console.error('Erro ao buscar leads:', error)
    return
  }

  console.log(`Verificando ${leads.length} leads com oportunidades...`)

  let marcados = 0
  let erros = 0

  for (const lead of leads) {
    try {
      const opp = await getOpportunity(Number(lead.evotalks_opportunity_id))
      const tags = opp.tags ?? []
      const tagIds = tags.map(t => typeof t === 'object' ? t.id : t)

      if (tagIds.includes(TAG_IMPORTANTE)) {
        await supabase.from('sdr_leads').update({ importante: true }).eq('id', lead.id)
        console.log(`★ ${lead.nome} (${lead.telefone}) — marcado como IMPORTANTE`)
        marcados++
      }
    } catch (err) {
      console.error(`Erro no lead ${lead.telefone} (opp #${lead.evotalks_opportunity_id}):`, err.message)
      erros++
    }

    // Rate limit: 100ms entre requisições
    await new Promise(r => setTimeout(r, 100))
  }

  console.log(`\nResumo: ${marcados} marcados como importante, ${erros} erros, ${leads.length - marcados - erros} sem tag`)
}

main()
