// Disparo manual do template AIVA aprovação (id 15) para leads que falharam pelo hook
// Playcell (Carlos - 5541998574000) e Maricell (Marilya - 5511975759781)

const BASE_URL = 'https://tracktecnologia.evotalks.com.br'
const QUEUE_ID = 10
const QUEUE_API_KEY = '5bb6aa653e204c4f9c302b79ef783c1a'
const TEMPLATE_ID = 15

const leads = [
  { nome: 'Carlos', telefone: '5541998574000', loja: 'Playcell' },
  { nome: 'Marilya', telefone: '5511975759781', loja: 'Maricell' },
]

async function sendTemplate(number, nome) {
  const res = await fetch(`${BASE_URL}/int/sendWaTemplate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      queueId: QUEUE_ID,
      apiKey: QUEUE_API_KEY,
      number,
      templateId: TEMPLATE_ID,
      data: [nome],
      openNewChat: true,
    }),
  })
  const text = await res.text()
  return { status: res.status, body: text }
}

for (const lead of leads) {
  try {
    const result = await sendTemplate(lead.telefone, lead.nome)
    console.log(`${lead.loja} (${lead.telefone}) → HTTP ${result.status}: ${result.body}`)
  } catch (err) {
    console.error(`${lead.loja} (${lead.telefone}) → ERRO:`, err.message)
  }
}
