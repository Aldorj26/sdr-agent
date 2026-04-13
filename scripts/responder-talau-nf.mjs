// Resposta manual Talau (5546999402773) — pergunta travada "É preciso emitir nota fiscal?"

const BASE_URL = 'https://tracktecnologia.evotalks.com.br'
const QUEUE_ID = 10
const QUEUE_API_KEY = '5bb6aa653e204c4f9c302b79ef783c1a'
const TELEFONE = '5546999402773'

const MSG =
  `Não, a AIVA não exige emissão de nota fiscal pra liberar o financiamento. ` +
  `Você pode trabalhar normal, do jeito que sua loja já opera.\n\n` +
  `Qualquer outra dúvida antes de eu seguir com o cadastro? 😊`

async function post(path, body) {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ queueId: QUEUE_ID, apiKey: QUEUE_API_KEY, ...body }),
  })
  return { status: res.status, body: await res.text() }
}

const chatRes = await post('/int/getClientOpenChats', { number: TELEFONE })
const chatId = JSON.parse(chatRes.body).chats?.[0]?.chatId
console.log('chatId:', chatId)

if (chatId) {
  const r = await post('/int/sendMessageToChat', { chatId, text: MSG })
  console.log('send →', r.status, r.body)
} else {
  const r = await post('/int/openChat', { number: TELEFONE, message: MSG })
  console.log('openChat →', r.status, r.body)
}
