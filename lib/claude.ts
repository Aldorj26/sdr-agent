import Anthropic from '@anthropic-ai/sdk'
import Groq, { toFile } from 'groq-sdk'
import { AIVA_SYSTEM_PROMPT } from '@/prompts/aiva'
import type { Mensagem } from '@/lib/supabase'
import { readFileSync } from 'fs'
import { join } from 'path'

function loadEnvKey(key: string): string | undefined {
  // Tenta process.env primeiro
  if (process.env[key]) return process.env[key]
  // Fallback: lê .env.local diretamente
  try {
    const content = readFileSync(join(process.cwd(), '.env.local'), 'utf8')
    const match = content.match(new RegExp(`^${key}=(.+)$`, 'm'))
    return match?.[1]?.trim()
  } catch {
    return undefined
  }
}

function getClient() {
  const apiKey = loadEnvKey('ANTHROPIC_API_KEY')
  console.log('ANTHROPIC_API_KEY present:', !!apiKey, 'length:', apiKey?.length ?? 0)
  return new Anthropic({ apiKey })
}

function getGroqClient() {
  const apiKey = loadEnvKey('GROQ_API_KEY')
  return new Groq({ apiKey })
}

export interface DadosColetados {
  nome_socio?: string | null
  email_socio?: string | null
  nome_varejo?: string | null
  cnpj_matriz?: string | null
  faturamento_anual?: string | null
  valor_boleto_mensal?: string | null
  regiao_varejo?: string | null
  numero_lojas?: string | null
  localizacao_lojas?: string | null
  possui_outra_financeira?: string | null
  cnpjs_adicionais?: string | null
}

export interface ClaudeResponse {
  mensagem: string
  novo_status: 'INTERESSADO' | 'FORMULARIO_ENVIADO' | 'OPT_OUT' | 'NAO_QUALIFICADO' | 'AGUARDANDO'
  acionar_humano: boolean
  motivo_humano: string | null
  dados_coletados: DadosColetados | null
}

/**
 * Transcreve áudio usando OpenAI Whisper API.
 * Retorna o texto transcrito.
 */
export async function transcreverAudio(
  audioBuffer: Buffer,
  mimeType: string
): Promise<string> {
  // Define extensão baseada no mimeType
  const extMap: Record<string, string> = {
    'audio/ogg': 'ogg',
    'audio/ogg; codecs=opus': 'ogg',
    'audio/opus': 'ogg',
    'audio/mpeg': 'mp3',
    'audio/mp3': 'mp3',
    'audio/wav': 'wav',
    'audio/webm': 'webm',
    'audio/x-wav': 'wav',
    'application/ogg': 'ogg',
  }
  const ext = extMap[mimeType] ?? 'ogg'

  const file = await toFile(audioBuffer, `audio.${ext}`, { type: mimeType })

  const transcription = await getGroqClient().audio.transcriptions.create({
    model: 'whisper-large-v3',
    file,
    language: 'pt',
  })

  return transcription.text.trim()
}

/**
 * Processa uma mensagem recebida do lead com histórico de conversa.
 * Retorna a resposta estruturada da VictorIA.
 */
export async function processarMensagem(
  mensagemRecebida: string,
  historico: Mensagem[],
  nomeDoLead: string
): Promise<ClaudeResponse> {
  // Monta histórico no formato Claude, agrupando mensagens consecutivas do
  // mesmo role (Claude API exige alternância user/assistant — se duas user
  // messages chegam seguidas, retorna 400 "messages: roles must alternate")
  const messages: Anthropic.MessageParam[] = []
  for (const m of historico) {
    const role: 'user' | 'assistant' = m.direcao === 'out' ? 'assistant' : 'user'
    const last = messages[messages.length - 1]
    if (last && last.role === role && typeof last.content === 'string') {
      last.content = `${last.content}\n${m.conteudo}`
    } else {
      messages.push({ role, content: m.conteudo })
    }
  }

  // A mensagem recebida normalmente já está no histórico (o webhook salva
  // antes de chamar Claude). Só appenda se por alguma razão não estiver.
  const ultimaUser = messages[messages.length - 1]
  if (!ultimaUser || ultimaUser.role !== 'user') {
    messages.push({ role: 'user', content: mensagemRecebida })
  } else if (
    typeof ultimaUser.content === 'string' &&
    !ultimaUser.content.includes(mensagemRecebida)
  ) {
    ultimaUser.content = `${ultimaUser.content}\n${mensagemRecebida}`
  }

  // Claude exige que a conversa comece com 'user'. Se começar com assistant,
  // descarta até achar o primeiro user.
  while (messages.length > 0 && messages[0].role !== 'user') {
    messages.shift()
  }

  if (messages.length === 0) {
    messages.push({ role: 'user', content: mensagemRecebida })
  }

  // Prefill: força o Claude a começar a resposta com "{" (garante JSON)
  messages.push({ role: 'assistant', content: '{' })

  const response = await getClient().messages.create({
    model: 'claude-sonnet-4-5',
    max_tokens: 1024,
    system: AIVA_SYSTEM_PROMPT.replace('{{nome}}', nomeDoLead),
    messages,
  })

  const text = response.content
    .filter((b) => b.type === 'text')
    .map((b) => (b as Anthropic.TextBlock).text)
    .join('')

  // Parse do JSON — o prefill já fornece o "{" inicial
  const fullJson = `{${text}`
  const jsonMatch = fullJson.match(/\{[\s\S]*\}/)
  if (!jsonMatch) {
    throw new Error(`Claude não retornou JSON válido: ${text.substring(0, 200)}`)
  }
  const parsed = JSON.parse(jsonMatch[0]) as ClaudeResponse
  return parsed
}
