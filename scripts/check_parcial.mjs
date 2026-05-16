import { createClient } from '@supabase/supabase-js'
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

const since = new Date()
since.setHours(0,0,0,0)

const { data: leads } = await sb
  .from('sdr_leads')
  .select('id, telefone, evotalks_opportunity_id, criado_em, data_disparo_inicial')
  .gte('data_disparo_inicial', since.toISOString())
const ids = leads.map(l => l.id)

const { data: msgs } = await sb
  .from('sdr_mensagens')
  .select('lead_id, direcao, template_hsm')
  .in('lead_id', ids)
  .eq('direcao', 'out')
  .eq('template_hsm', 'aiva_campanha')

const comTemplate = new Set(msgs.map(m => m.lead_id))

const parciais = leads.filter(l => !comTemplate.has(l.id))
const completos = leads.filter(l => comTemplate.has(l.id))

console.log('Total leads do dia:', leads.length)
console.log('Com template enviado:', completos.length)
console.log('SEM template (parciais):', parciais.length)
for (const p of parciais) console.log(' →', p.telefone, '| opp:', p.evotalks_opportunity_id)
