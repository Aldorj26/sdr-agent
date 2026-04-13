// Resposta manual pra lead Talau (5546999402773) — pergunta travada "Tem limite de crédito?"

const BASE_URL = 'https://tracktecnologia.evotalks.com.br'
const QUEUE_ID = 10
const QUEUE_API_KEY = '5bb6aa653e204c4f9c302b79ef783c1a'
const TELEFONE = '5546999402773'

const MSG =
  `Oi! Desculpa a demora aqui 😊\n\n` +
  `Sobre o limite de crédito: não existe limite fixo pra loja — cada cliente final passa por uma análise individual na hora da compra. A AIVA aprova ou recusa em cerca de 2 minutos, com base no perfil de crédito de cada pessoa.\n\n` +
  `Ou seja, o limite é por cliente, não por loja. Quanto mais clientes você passar pela análise, mais vendas aprovadas.\n\n` +
  `Quer seguir com o cadastro da sua loja pra começar a oferecer o parcelamento AIVA?`

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
