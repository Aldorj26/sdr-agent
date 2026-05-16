import { createClient } from '@supabase/supabase-js'
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
const TEL = process.argv[2]
const { data: lead } = await sb.from('sdr_leads').select('id').eq('telefone', TEL).single()
const { data: msgs } = await sb.from('sdr_mensagens')
  .select('*')
  .eq('lead_id', lead.id)
  .order('enviado_em', { ascending: false })
  .limit(3)
for (const m of msgs.reverse()) {
  console.log('---', m.enviado_em, m.direcao, m.template_hsm ?? '')
  console.log(m.conteudo)
}
