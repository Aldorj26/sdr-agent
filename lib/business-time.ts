/**
 * Helpers de horário comercial em BRT (America/Sao_Paulo).
 *
 * Regras:
 * - Dia útil = segunda a sexta (não conta feriado nacional por enquanto).
 * - Horário comercial = 8h às 20h.
 *
 * Usado pra bloquear automações de "impacto" (disparo HSM inicial, follow-up,
 * nudge) fora do horário comercial / fim de semana. O webhook de resposta
 * continua rodando normal — lojista pode falar com a VictorIA a qualquer hora.
 */

function getDataBrt(): { diaSemana: number; hora: number } {
  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Sao_Paulo',
    weekday: 'short',
    hour: 'numeric',
    hour12: false,
  }).formatToParts(new Date())

  const weekday = fmt.find((p) => p.type === 'weekday')?.value ?? ''
  const hour = Number(fmt.find((p) => p.type === 'hour')?.value ?? 0)

  // dom=0, seg=1, ..., sáb=6
  const map: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 }
  return { diaSemana: map[weekday] ?? 0, hora: hour }
}

/** Retorna true se hoje (em BRT) é segunda a sexta. */
export function isDiaUtil(): boolean {
  const { diaSemana } = getDataBrt()
  return diaSemana >= 1 && diaSemana <= 5
}

/** Retorna true se agora é horário comercial BRT (8h–20h, seg-sex). */
export function isHorarioComercial(): boolean {
  const { diaSemana, hora } = getDataBrt()
  if (diaSemana < 1 || diaSemana > 5) return false
  return hora >= 8 && hora < 20
}

/** Rótulo descritivo pra logs/retornos. */
export function rotuloHorario(): string {
  const { diaSemana, hora } = getDataBrt()
  const nomes = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado']
  return `${nomes[diaSemana]} ${hora}h BRT`
}
