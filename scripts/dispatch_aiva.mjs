#!/usr/bin/env node
// Wrapper de disparo AIVA com chunking automático.
//
// Uso:
//   node scripts/dispatch_aiva.mjs <arquivo.txt> [--nome=Loja] [--chunk=10] [--dry-run]
//
// Formato do arquivo: 1 telefone por linha. Aceita com ou sem prefixo 55.
// Linhas vazias e duplicatas são ignoradas.
//
// Reconcilia ao final:
// - Confere via Supabase quem entrou hoje (tabela sdr_leads + sdr_mensagens)
// - Lista parciais (opportunity criada mas template HSM não enviado)

import { readFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'

const args = process.argv.slice(2)
const file = args.find(a => !a.startsWith('--'))
const nome = (args.find(a => a.startsWith('--nome=')) ?? '--nome=Loja').split('=')[1]
const CHUNK = Number((args.find(a => a.startsWith('--chunk=')) ?? '--chunk=10').split('=')[1])
const dryRun = args.includes('--dry-run')

if (!file) {
  console.error('Uso: node scripts/dispatch_aiva.mjs <arquivo.txt> [--nome=Loja] [--chunk=10] [--dry-run]')
  process.exit(1)
}

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
const URL = 'https://sdr-aiva.vercel.app/api/sdr/send-initial'

const raw = readFileSync(file, 'utf8')
const numeros = Array.from(new Set(
  raw.split('\n')
    .map(s => s.trim().replace(/\D/g, ''))
    .filter(s => s.length >= 10)
    // Normaliza pra E.164 13 digitos (55 + DDD + 9digit mobile).
    // Bug anterior: usava `startsWith('55')` que falhava pra DDD 55 (RS) —
    // ex: "55999218930" (11 digitos = DDD 55 + mobile) virava lead sem
    // country code, e o webhook criava DUPLICATA quando lead respondia em
    // formato 12 digitos. Solução: usar LENGTH em vez de prefix.
    .map(s => {
      // Ja tem country code (12 = 8digit antigo, 13 = 9digit moderno)
      if (s.length === 12 || s.length === 13) return s
      // Sem country code (10 = DDD+8digit, 11 = DDD+9digit) → adiciona
      if (s.length === 10 || s.length === 11) return '55' + s
      return s
    })
))

console.log(`Arquivo: ${file}`)
console.log(`Únicos: ${numeros.length} | Chunk: ${CHUNK} | Nome: "${nome}"`)
if (dryRun) {
  console.log('--- DRY RUN ---')
  for (const n of numeros) console.log(n)
  process.exit(0)
}

const t0 = Date.now()
let sucesso = 0, falha = 0, invalidos = 0
const erros = []

for (let i = 0; i < numeros.length; i += CHUNK) {
  const slice = numeros.slice(i, i + CHUNK)
  const leads = slice.map(t => ({ nome, telefone: t }))
  const chunkN = Math.floor(i / CHUNK) + 1
  const totalChunks = Math.ceil(numeros.length / CHUNK)
  process.stdout.write(`Chunk ${chunkN}/${totalChunks} (${slice.length}) → `)

  const t1 = Date.now()
  try {
    const res = await fetch(URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ leads }),
    })
    const txt = await res.text()
    if (!res.ok) {
      console.log(`HTTP ${res.status} em ${((Date.now() - t1) / 1000).toFixed(1)}s — ${txt.slice(0, 200)}`)
      erros.push({ chunk: chunkN, status: res.status, body: txt.slice(0, 500) })
      continue
    }
    const json = JSON.parse(txt)
    sucesso += json.sucesso ?? 0
    falha += json.falha ?? 0
    invalidos += json.invalidos ?? 0
    console.log(`ok ${json.sucesso}/${slice.length} em ${((Date.now() - t1) / 1000).toFixed(1)}s`)
  } catch (err) {
    console.log(`erro: ${err.message}`)
    erros.push({ chunk: chunkN, error: err.message })
  }
}

console.log(`\n--- Resumo ---`)
console.log(`Tempo total: ${((Date.now() - t0) / 1000).toFixed(1)}s`)
console.log(`Sucesso: ${sucesso} | Falha: ${falha} | Sem WhatsApp: ${invalidos}`)
if (erros.length) console.log(`Chunks com erro:`, erros)

// Reconciliação via Supabase
console.log(`\n--- Reconciliação ---`)
const since = new Date(); since.setHours(0, 0, 0, 0)
const { data: leads } = await sb
  .from('sdr_leads')
  .select('id, telefone')
  .in('telefone', numeros)
  .gte('data_disparo_inicial', since.toISOString())
const ids = leads.map(l => l.id)
const { data: msgs } = await sb
  .from('sdr_mensagens')
  .select('lead_id')
  .in('lead_id', ids)
  .eq('direcao', 'out')
  .eq('template_hsm', 'aiva_campanha')
const comTemplate = new Set(msgs.map(m => m.lead_id))
const parciais = leads.filter(l => !comTemplate.has(l.id))

console.log(`Da lista no DB: ${leads.length}/${numeros.length}`)
console.log(`Com template HSM: ${leads.length - parciais.length}`)
if (parciais.length) {
  console.log(`PARCIAIS (opp criada, HSM não enviado) — reenviar via /int/sendWaTemplate:`)
  for (const p of parciais) console.log(`  ${p.telefone}`)
}
const semNoDb = numeros.filter(n => !leads.find(l => l.telefone === n))
if (semNoDb.length) {
  console.log(`NÃO ENTROU NO DB — re-disparar:`)
  for (const t of semNoDb) console.log(`  ${t}`)
}
