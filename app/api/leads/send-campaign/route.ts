import { NextRequest, NextResponse } from 'next/server'

/**
 * Rota protegida pelo painel (middleware valida cookie dash_auth).
 * Recebe uma lista de telefones crus, normaliza, e delega pro
 * /api/sdr/send-initial usando o WEBHOOK_SECRET interno.
 */
export async function POST(req: NextRequest) {
  let body: { telefones?: unknown; nome?: unknown; cidade?: unknown; produto?: unknown }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Payload invalido' }, { status: 400 })
  }

  const telefonesRaw = typeof body.telefones === 'string' ? body.telefones : ''
  const nomeDefault = typeof body.nome === 'string' && body.nome.trim() ? body.nome.trim() : 'Loja'
  const cidadeDefault = typeof body.cidade === 'string' && body.cidade.trim() ? body.cidade.trim() : undefined
  const produto = typeof body.produto === 'string' ? body.produto.toUpperCase() : 'AIVA'

  // Normaliza: extrai apenas dígitos, adiciona 55 se faltar, dedup
  const telefones = new Set<string>()
  for (const raw of telefonesRaw.split(/[\s,;]+/)) {
    const digitos = raw.replace(/\D/g, '')
    if (!digitos) continue
    const comDdi = digitos.startsWith('55') ? digitos : `55${digitos}`
    // valida tamanho razoavel (11+2=13 ou 10+2=12)
    if (comDdi.length < 12 || comDdi.length > 13) continue
    telefones.add(comDdi)
  }

  if (telefones.size === 0) {
    return NextResponse.json({ error: 'Nenhum telefone valido encontrado' }, { status: 400 })
  }

  const leads = Array.from(telefones).map((telefone) => ({
    nome: nomeDefault,
    telefone,
    cidade: cidadeDefault,
  }))

  console.log(`[send-campaign] disparo requisitado: ${leads.length} leads, produto=${produto}`)

  // Chama o endpoint de disparo interno usando o secret
  const origin = new URL(req.url).origin
  try {
    const res = await fetch(`${origin}/api/sdr/send-initial`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // O send-initial nao exige header, mas enviamos por seguranca caso seja restrito no futuro
        'x-internal-secret': process.env.WEBHOOK_SECRET ?? '',
      },
      body: JSON.stringify({ leads, produto }),
    })

    const data = await res.json()
    return NextResponse.json({
      ok: res.ok,
      total: leads.length,
      sucesso: data.sucesso ?? 0,
      falha: data.falha ?? 0,
      invalidos: data.invalidos ?? 0,
      resultados: data.resultados ?? [],
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: `Erro ao disparar: ${msg}` }, { status: 500 })
  }
}
