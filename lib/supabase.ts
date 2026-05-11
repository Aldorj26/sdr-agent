import { createClient } from '@supabase/supabase-js'

// ─── Tipos ────────────────────────────────────────────────────────────────────

export type LeadStatus =
  | 'DISPARO_REALIZADO'
  | 'INTERESSADO'
  | 'FORMULARIO_ENVIADO' // legacy — não usado no fluxo novo, mantido pra leads antigos
  | 'SEM_RESPOSTA'
  | 'OPT_OUT'
  | 'NAO_QUALIFICADO'
  | 'AGUARDANDO'
  | 'DESCARTADO'
  | 'BOT_DETECTADO' // número respondido por chatbot/atendimento automático sem acesso ao decisor
  | 'AGUARDANDO_APROVACAO' // 7 dados coletados, no stage 54 esperando análise
  | 'COLETANDO_COMPLEMENTO' // operador moveu pro stage 49, coletando 5 dados restantes
  | 'CADASTRO_COMPLETO'    // 12 dados coletados, HubSpot disparado
  | 'ANALISE_AIVA'         // stage 50 (Em Análise CAF) — link de onboarding enviado, aguardando lead concluir cadastro + biometria

export interface Lead {
  id: string
  nome: string
  telefone: string
  cidade: string | null
  produto: string
  status: LeadStatus
  etapa_cadencia: number
  evotalks_chat_id: string | null
  evotalks_client_id: string | null
  evotalks_opportunity_id: string | null
  data_disparo_inicial: string | null
  data_proximo_followup: string | null
  data_ultimo_contato: string | null
  acionar_humano: boolean
  importante: boolean
  observacoes: string | null
  criado_em: string
  webhook_lock_at: string | null
}

export interface Mensagem {
  id: string
  lead_id: string
  direcao: 'in' | 'out'
  conteudo: string
  template_hsm: string | null
  enviado_em: string
}

// ─── Clientes ─────────────────────────────────────────────────────────────────

// Cliente público (browser / API routes sem RLS bypass)
export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// Cliente admin (server only — usa service role key)
export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// ─── Helpers de leads ─────────────────────────────────────────────────────────

/**
 * Gera variações comuns do número brasileiro pra busca robusta no banco.
 *
 * Cobre os principais formatos que a Evo Talks/WhatsApp Business usa:
 * - E.164 com 9 do mobile: 5555999218930 (13 digitos)
 * - E.164 sem 9 do mobile: 555599218930  (12 digitos — WA Business as vezes dropa)
 * - Sem country code com 9: 55999218930  (11 digitos — DDD + mobile)
 * - Sem country code sem 9: 5599218930   (10 digitos)
 *
 * Sem isso, leads dispararados num formato sao criados como duplicatas TRIAGEM
 * quando a Evo Talks devolve webhook em formato diferente.
 */
function gerarVariacoesTelefone(raw: string): string[] {
  const digits = (raw ?? '').replace(/\D/g, '')
  if (!digits) return []
  const variacoes = new Set<string>([digits])

  // Extrai partes
  let comCountry: string
  let semCountry: string

  if (digits.startsWith('55') && (digits.length === 12 || digits.length === 13)) {
    comCountry = digits
    semCountry = digits.slice(2)
  } else if (digits.length === 10 || digits.length === 11) {
    comCountry = '55' + digits
    semCountry = digits
  } else {
    return Array.from(variacoes)
  }

  variacoes.add(comCountry)
  variacoes.add(semCountry)

  // Variação com 9 do mobile (Brasil) — pra numeros 12 digitos (com country) /
  // 10 digitos (sem) que tem 8 digit local, adiciona o 9 depois do DDD
  if (comCountry.length === 12) {
    // 55 + DDD(2) + 8digit → 55 + DDD + 9 + 8digit
    variacoes.add(comCountry.slice(0, 4) + '9' + comCountry.slice(4))
  }
  if (semCountry.length === 10) {
    variacoes.add(semCountry.slice(0, 2) + '9' + semCountry.slice(2))
  }

  // Variação SEM 9 do mobile — pra numeros 13 digitos (com country) /
  // 11 digitos (sem) que tem 9digit mobile, remove o 9 depois do DDD se for "9"
  if (comCountry.length === 13 && comCountry[4] === '9') {
    variacoes.add(comCountry.slice(0, 4) + comCountry.slice(5))
  }
  if (semCountry.length === 11 && semCountry[2] === '9') {
    variacoes.add(semCountry.slice(0, 2) + semCountry.slice(3))
  }

  return Array.from(variacoes)
}

export async function getLeadByTelefone(telefone: string): Promise<Lead | null> {
  // .maybeSingle() retorna null quando não encontra (sem lançar erro do Supabase
  // como o .single() fazia). Erros reais (rede, permissão) ficam visíveis no log
  // ao invés de serem confundidos com "lead inexistente" — o que antes podia
  // criar duplicatas via fluxo TRIAGEM em caso de falha de conexão.
  //
  // Busca por VARIAÇÕES de formato (E.164 13/12 digitos, sem country 11/10,
  // com/sem o 9 do mobile). Cobre o caso onde o Evo Talks devolve o telefone
  // em formato diferente do que foi salvo no disparo — antes isso criava
  // duplicatas TRIAGEM.
  const variacoes = gerarVariacoesTelefone(telefone)
  if (variacoes.length === 0) return null

  const { data, error } = await supabaseAdmin
    .from('sdr_leads')
    .select('*')
    .in('telefone', variacoes)
    .order('criado_em', { ascending: true }) // se houver duplicata, pega o mais antigo (original)
    .limit(1)
    .maybeSingle()

  if (error) {
    console.error(`[getLeadByTelefone] erro ao buscar ${telefone}:`, error)
    return null
  }
  return (data as Lead) ?? null
}

export async function getLeadByChatId(chatId: string): Promise<Lead | null> {
  const { data, error } = await supabaseAdmin
    .from('sdr_leads')
    .select('*')
    .eq('evotalks_chat_id', chatId)
    .maybeSingle()

  if (error) {
    console.error(`[getLeadByChatId] erro ao buscar chatId=${chatId}:`, error)
    return null
  }
  return (data as Lead) ?? null
}

export async function updateLeadStatus(
  leadId: string,
  status: LeadStatus,
  extra: Partial<Lead> = {}
): Promise<void> {
  await supabaseAdmin
    .from('sdr_leads')
    .update({ status, data_ultimo_contato: new Date().toISOString(), ...extra })
    .eq('id', leadId)
}

export async function getLeadsForFollowup(): Promise<Lead[]> {
  const now = new Date().toISOString()
  const { data, error } = await supabaseAdmin
    .from('sdr_leads')
    .select('*')
    .lte('data_proximo_followup', now)
    .in('status', ['DISPARO_REALIZADO', 'SEM_RESPOSTA'])

  if (error) {
    console.error('Erro ao buscar leads para follow-up:', error)
    return []
  }

  return (data ?? []) as Lead[]
}

// ─── Helpers de mensagens ─────────────────────────────────────────────────────

export async function saveMensagem(
  leadId: string,
  direcao: 'in' | 'out',
  conteudo: string,
  templateHsm?: string,
  evotalksMid?: string | null
): Promise<void> {
  await supabaseAdmin.from('sdr_mensagens').insert({
    lead_id: leadId,
    direcao,
    conteudo,
    template_hsm: templateHsm ?? null,
    evotalks_mid: evotalksMid ?? null,
  })
}

/**
 * Verifica se um mId (messageid do WhatsApp via Evo Talks) já foi salvo.
 * Usado pra idempotência — se Evo Talks reentregar o mesmo webhook,
 * ignoramos a reprocessamento.
 */
export async function mensagemMidExiste(mid: string): Promise<boolean> {
  const { data } = await supabaseAdmin
    .from('sdr_mensagens')
    .select('id')
    .eq('evotalks_mid', mid)
    .limit(1)
    .maybeSingle()
  return !!data
}

/**
 * Tenta adquirir um lock de processamento do webhook para um lead.
 * Lock expira após `ttlSeconds` pra evitar locks órfãos em caso de crash.
 * Retorna true se conseguiu adquirir, false se outro processo está processando.
 */
export async function acquireWebhookLock(
  leadId: string,
  ttlSeconds = 60
): Promise<boolean> {
  const now = new Date()
  const expiredBefore = new Date(now.getTime() - ttlSeconds * 1000).toISOString()

  const { data, error } = await supabaseAdmin
    .from('sdr_leads')
    .update({ webhook_lock_at: now.toISOString() })
    .eq('id', leadId)
    .or(`webhook_lock_at.is.null,webhook_lock_at.lt.${expiredBefore}`)
    .select('id')
    .maybeSingle()

  if (error) {
    console.error('Erro ao adquirir webhook lock:', error)
    return false
  }
  return !!data
}

export async function releaseWebhookLock(leadId: string): Promise<void> {
  await supabaseAdmin
    .from('sdr_leads')
    .update({ webhook_lock_at: null })
    .eq('id', leadId)
}

export async function getMensagens(leadId: string, limit = 20): Promise<Mensagem[]> {
  const { data, error } = await supabaseAdmin
    .from('sdr_mensagens')
    .select('*')
    .eq('lead_id', leadId)
    .order('enviado_em', { ascending: false })
    .limit(limit)

  if (error) return []
  return ((data ?? []) as Mensagem[]).reverse()
}
