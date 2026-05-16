import { createClient } from '@supabase/supabase-js'
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

const TEL = process.argv[2]
if (!TEL) { console.error('Uso: node scripts/check_lead.mjs 555192146639'); process.exit(1) }

const { data: lead } = await sb.from('sdr_leads').select('*').eq('telefone', TEL).single()
console.log('Lead:', lead)

const { data: msgs } = await sb.from('sdr_mensagens')
  .select('direcao, conteudo, template_hsm, enviado_em')
  .eq('lead_id', lead.id)
  .order('enviado_em', { ascending: true })
console.log(`\nMensagens (${msgs.length}):`)
for (const m of msgs) {
  console.log(`  ${m.enviado_em} | ${m.direcao} | ${(m.template_hsm ?? '').padEnd(20)} | ${(m.conteudo ?? '').slice(0, 100)}`)
}
