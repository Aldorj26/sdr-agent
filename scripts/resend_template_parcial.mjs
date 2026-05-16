import { createClient } from '@supabase/supabase-js'
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

const BASE = process.env.EVO_TALKS_BASE_URL
const QUEUE_ID = Number(process.env.EVO_TALKS_QUEUE_ID)
const API_KEY = process.env.EVO_TALKS_QUEUE_API_KEY

const TELEFONE = '5528999252695'
const TEMPLATE_ID = 9
const vars = [
  'Vender mais celulares sem risco de calote',
  'vi que vocês trabalham com venda de celular e queria apresentar uma parceria rapida:',
  'A *AIVA* ajuda lojas como a sua a venderem mais — sem dor de cabeça:',
  '*Aprovação do cliente em 2 minutos*',
  '*Você recebe em 2 dias úteis*',
  '*Zero risco de inadimplência (o risco é nosso)*',
  '*Parcelamento em até 12x pro cliente*',
]

const res = await fetch(`${BASE}/int/sendWaTemplate`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    queueId: QUEUE_ID,
    apiKey: API_KEY,
    number: TELEFONE,
    templateId: TEMPLATE_ID,
    data: vars,
    openNewChat: true,
  }),
})
console.log('HTTP', res.status)
console.log(await res.text())

if (res.ok) {
  const { data: lead } = await sb.from('sdr_leads').select('id').eq('telefone', TELEFONE).single()
  await sb.from('sdr_mensagens').insert({
    lead_id: lead.id,
    direcao: 'out',
    conteudo: '[Template AIVA enviado para Loja]',
    template_hsm: 'aiva_campanha',
  })
  console.log('Mensagem registrada no histórico.')
}
