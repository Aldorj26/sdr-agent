// Cria oportunidade de teste e move até "Cadastro Recebido" (49)
// pra validar o webhook do Gustavo quando movermos pra "Em Análise AIVA" (50)

const BASE_URL = 'https://tracktecnologia.evotalks.com.br'
const QUEUE_ID = 10
const QUEUE_API_KEY = '5bb6aa653e204c4f9c302b79ef783c1a'

const PIPELINE_AIVA = 15
const STAGES = {
  INTERESSADO: 47,
  PRE_APROVACAO: 54,
  CADASTRO_RECEBIDO: 49,
}

async function call(path, body) {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ queueId: QUEUE_ID, apiKey: QUEUE_API_KEY, ...body }),
  })
  const text = await res.text()
  return { status: res.status, body: text }
}

// 1. Cria em Interessado
const create = await call('/int/createOpportunity', {
  fkPipeline: PIPELINE_AIVA,
  fkStage: STAGES.INTERESSADO,
  responsableid: 507,
  title: 'TESTE WEBHOOK — Aldo',
  mainphone: '5547996085000',
  city: 'Brusque',
})
console.log('createOpportunity →', create.status, create.body)

if (create.status !== 200) process.exit(1)

const oppId = JSON.parse(create.body).id
console.log(`\nOpp criada: #${oppId}`)

// 2. Move para Pré Aprovação
const s1 = await call('/int/changeOpportunityStage', {
  id: oppId,
  destStageId: STAGES.PRE_APROVACAO,
})
console.log(`→ Pré Aprovação: ${s1.status} ${s1.body}`)

// 3. Move para Cadastro Recebido
const s2 = await call('/int/changeOpportunityStage', {
  id: oppId,
  destStageId: STAGES.CADASTRO_RECEBIDO,
})
console.log(`→ Cadastro Recebido: ${s2.status} ${s2.body}`)

console.log(`\n✅ Opp #${oppId} em "Cadastro Recebido". Pronta pra mover pra "Em Análise AIVA".`)
