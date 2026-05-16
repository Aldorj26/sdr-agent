import { createClient } from '@supabase/supabase-js'
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
const since = new Date()
since.setHours(0,0,0,0)
const { data, error } = await sb.from('sdr_leads').select('telefone, data_disparo_inicial').gte('data_disparo_inicial', since.toISOString()).order('data_disparo_inicial', { ascending: true })
if (error) { console.error(error); process.exit(1) }
console.log('Disparos hoje:', data.length)
for (const r of data) console.log(r.telefone)
