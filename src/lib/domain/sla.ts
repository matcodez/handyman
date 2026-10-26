// Tiempos de respuesta comprometidos del centro de soporte. Módulo puro (UI, servicios y pruebas).

export type CasePriority = 'normal' | 'alta' | 'urgente'
export type CaseKind = 'dispute' | 'warranty'

export const PRIORITY: Record<CasePriority, { label: string; tone: 'neutral' | 'warn' | 'bad'; hours: number }> = {
  normal: { label: 'Normal', tone: 'neutral', hours: 24 },
  alta: { label: 'Alta', tone: 'warn', hours: 4 },
  urgente: { label: 'Urgente', tone: 'bad', hours: 1 },
}

/** Una incidencia antes de aprobar retiene el pago del profesional: se atiende con prioridad alta. */
export function defaultPriority(kind: CaseKind): CasePriority {
  return kind === 'dispute' ? 'alta' : 'normal'
}

export function slaDue(from: Date, priority: CasePriority) {
  return new Date(from.getTime() + PRIORITY[priority].hours * 3600_000)
}

export type SlaState = 'met' | 'late_met' | 'on_time' | 'due_soon' | 'overdue' | 'closed'

/**
 * Estado del compromiso de primera respuesta:
 *  met / late_met → ya se respondió (a tiempo o tarde); due_soon → queda menos de una hora
 *  (o de un cuarto del plazo, si este es más corto); overdue → venció sin respuesta.
 */
export function slaState(
  c: { sla_due_at: Date | string | null; first_response_at: Date | string | null; closed?: boolean; priority: CasePriority },
  now = new Date(),
): SlaState {
  if (c.first_response_at) {
    if (!c.sla_due_at) return 'met'
    return new Date(c.first_response_at) <= new Date(c.sla_due_at) ? 'met' : 'late_met'
  }
  if (c.closed) return 'closed'
  if (!c.sla_due_at) return 'on_time'
  const left = new Date(c.sla_due_at).getTime() - now.getTime()
  if (left <= 0) return 'overdue'
  const window = PRIORITY[c.priority].hours * 3600_000
  return left <= Math.min(3600_000, window / 4) ? 'due_soon' : 'on_time'
}

export const SLA_LABEL: Record<SlaState, { label: string; tone: 'neutral' | 'info' | 'ok' | 'warn' | 'bad' }> = {
  met: { label: 'Respondido a tiempo', tone: 'ok' },
  late_met: { label: 'Respondido fuera de tiempo', tone: 'warn' },
  on_time: { label: 'En tiempo', tone: 'info' },
  due_soon: { label: 'Por vencer', tone: 'warn' },
  overdue: { label: 'Vencido', tone: 'bad' },
  closed: { label: 'Cerrado', tone: 'neutral' },
}

/** "en 3 h 20 min", "hace 15 min". */
export function relativeTime(target: Date | string, now = new Date()) {
  const diff = new Date(target).getTime() - now.getTime()
  const mins = Math.round(Math.abs(diff) / 60000)
  const text = mins < 60 ? `${mins} min` : `${Math.floor(mins / 60)} h${mins % 60 ? ` ${mins % 60} min` : ''}`
  return diff >= 0 ? `en ${text}` : `hace ${text}`
}
