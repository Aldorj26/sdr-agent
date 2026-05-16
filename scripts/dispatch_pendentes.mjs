const pendentes = [
  '5528999265300','5528999289309','5528999314904','5528999363310','5528999440920',
  '5528999631897','5528999642807','5528999777260','5528999788333','5528999845151',
  '5528999852730','5528999865740','5528999990777','5528999993149','5528999999999',
  '5531971133936','5531971456588','5531971473429','5531971562887','5531971711215',
  '5531972116143','5531972160348','5531972337505',
]

const url = 'https://sdr-aiva.vercel.app/api/sdr/send-initial'
const CHUNK = 8

for (let i = 0; i < pendentes.length; i += CHUNK) {
  const slice = pendentes.slice(i, i + CHUNK)
  const leads = slice.map(t => ({ nome: 'Loja', telefone: t }))
  console.log(`\n--- Chunk ${i/CHUNK + 1} (${slice.length} leads) ---`)
  const t0 = Date.now()
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ leads }),
  })
  const txt = await res.text()
  console.log(`HTTP ${res.status} em ${((Date.now()-t0)/1000).toFixed(1)}s`)
  console.log(txt.slice(0, 1500))
}
