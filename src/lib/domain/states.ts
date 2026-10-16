// Estados del sistema, etiquetas en español y transiciones permitidas.
// Módulo puro (sin dependencias de servidor) para poder probarlo y usarlo en la UI.

export type Role = 'customer' | 'professional' | 'admin'

export type VerificationStatus = 'draft' | 'pending' | 'in_review' | 'approved' | 'rejected' | 'suspended'
export type RequestStatus = 'draft' | 'open' | 'quoting' | 'hired' | 'cancelled' | 'expired'
export type QuoteStatus = 'draft' | 'sent' | 'accepted' | 'rejected' | 'withdrawn' | 'expired'
export type OrderStatus =
  | 'scheduled' | 'en_route' | 'arrived' | 'in_progress' | 'pending_approval' | 'completed' | 'disputed' | 'cancelled'
export type WarrantyStatus = 'active' | 'reported' | 'in_review' | 'approved_fix' | 'rejected' | 'resolved' | 'expired'
export type PaymentStatus = 'not_started' | 'pending' | 'held_demo' | 'released_demo' | 'refund_review' | 'cancelled'
export type CaseStatus = 'open' | 'in_review' | 'resolved' | 'rejected'

export type Tone = 'neutral' | 'info' | 'ok' | 'warn' | 'bad'

export const ROLE_LABEL: Record<Role, string> = {
  customer: 'Cliente',
  professional: 'Profesional',
  admin: 'Administración',
}

export const VERIFICATION: Record<VerificationStatus, { label: string; tone: Tone }> = {
  draft: { label: 'No verificado', tone: 'neutral' },
  pending: { label: 'Verificación pendiente', tone: 'warn' },
  in_review: { label: 'Verificación en revisión', tone: 'warn' },
  approved: { label: 'Identidad verificada', tone: 'ok' },
  rejected: { label: 'Verificación rechazada', tone: 'bad' },
  suspended: { label: 'Perfil suspendido', tone: 'bad' },
}

export const REQUEST: Record<RequestStatus, { label: string; tone: Tone }> = {
  draft: { label: 'Borrador', tone: 'neutral' },
  open: { label: 'Abierta', tone: 'info' },
  quoting: { label: 'Recibiendo cotizaciones', tone: 'info' },
  hired: { label: 'Contratada', tone: 'ok' },
  cancelled: { label: 'Cancelada', tone: 'neutral' },
  expired: { label: 'Expirada', tone: 'neutral' },
}

export const QUOTE: Record<QuoteStatus, { label: string; tone: Tone }> = {
  draft: { label: 'Borrador', tone: 'neutral' },
  sent: { label: 'Enviada', tone: 'info' },
  accepted: { label: 'Aceptada', tone: 'ok' },
  rejected: { label: 'No seleccionada', tone: 'neutral' },
  withdrawn: { label: 'Retirada', tone: 'neutral' },
  expired: { label: 'Expirada', tone: 'neutral' },
}

export const ORDER: Record<OrderStatus, { label: string; tone: Tone }> = {
  scheduled: { label: 'Programada', tone: 'info' },
  en_route: { label: 'Profesional en camino', tone: 'info' },
  arrived: { label: 'Llegada confirmada', tone: 'info' },
  in_progress: { label: 'En progreso', tone: 'info' },
  pending_approval: { label: 'Pendiente de tu aprobación', tone: 'warn' },
  completed: { label: 'Completada', tone: 'ok' },
  disputed: { label: 'En disputa', tone: 'bad' },
  cancelled: { label: 'Cancelada', tone: 'neutral' },
}

export const WARRANTY: Record<WarrantyStatus, { label: string; tone: Tone }> = {
  active: { label: 'Activa', tone: 'ok' },
  reported: { label: 'Reportada', tone: 'warn' },
  in_review: { label: 'En revisión', tone: 'warn' },
  approved_fix: { label: 'Aprobada para corrección', tone: 'info' },
  rejected: { label: 'Rechazada con motivo', tone: 'bad' },
  resolved: { label: 'Resuelta', tone: 'ok' },
  expired: { label: 'Expirada', tone: 'neutral' },
}

export const PAYMENT: Record<PaymentStatus, { label: string; tone: Tone }> = {
  not_started: { label: 'No iniciado', tone: 'neutral' },
  pending: { label: 'Pendiente', tone: 'warn' },
  held_demo: { label: 'Retenido en demo', tone: 'info' },
  released_demo: { label: 'Liberado en demo', tone: 'ok' },
  refund_review: { label: 'Reembolso en revisión', tone: 'warn' },
  cancelled: { label: 'Cancelado', tone: 'neutral' },
}

export const CASE: Record<CaseStatus, { label: string; tone: Tone }> = {
  open: { label: 'Abierto', tone: 'warn' },
  in_review: { label: 'En revisión', tone: 'info' },
  resolved: { label: 'Resuelto', tone: 'ok' },
  rejected: { label: 'Rechazado con motivo', tone: 'bad' },
}

// ── Transiciones ────────────────────────────────────────────────────────────

const ORDER_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  scheduled: ['en_route', 'arrived', 'cancelled'],
  en_route: ['arrived', 'cancelled'],
  arrived: ['in_progress', 'cancelled'],
  in_progress: ['pending_approval'],
  pending_approval: ['completed', 'disputed'],
  disputed: ['completed', 'cancelled'],
  completed: [],
  cancelled: [],
}

export function canOrderTransition(from: OrderStatus, to: OrderStatus) {
  return ORDER_TRANSITIONS[from]?.includes(to) ?? false
}

const VERIFICATION_TRANSITIONS: Record<VerificationStatus, VerificationStatus[]> = {
  draft: ['pending'],
  pending: ['in_review', 'approved', 'rejected'],
  in_review: ['approved', 'rejected'],
  approved: ['suspended'],
  rejected: ['pending'],
  suspended: ['approved'],
}

export function canVerificationTransition(from: VerificationStatus, to: VerificationStatus) {
  return VERIFICATION_TRANSITIONS[from]?.includes(to) ?? false
}

/** Pasos visibles de una orden, en orden cronológico, para la línea de tiempo. */
export const ORDER_STEPS: { key: OrderStatus; label: string }[] = [
  { key: 'scheduled', label: 'Programada' },
  { key: 'arrived', label: 'Identidad confirmada' },
  { key: 'in_progress', label: 'En progreso' },
  { key: 'pending_approval', label: 'Por aprobar' },
  { key: 'completed', label: 'Completada' },
]

export function orderStepIndex(status: OrderStatus) {
  if (status === 'en_route') return 0
  if (status === 'disputed') return 3
  const i = ORDER_STEPS.findIndex((s) => s.key === status)
  return i < 0 ? 0 : i
}

export function warrantyEnd(startsAt: Date, durationDays: number) {
  return new Date(startsAt.getTime() + durationDays * 24 * 60 * 60 * 1000)
}

export const ZONES = [
  'Zona 1', 'Zona 4', 'Zona 9', 'Zona 10', 'Zona 11', 'Zona 12', 'Zona 13', 'Zona 14', 'Zona 15', 'Zona 16',
  'Mixco', 'Villa Nueva', 'San Cristóbal', 'Santa Catarina Pinula', 'Carretera a El Salvador', 'Fraijanes',
] as const

export const TIME_WINDOWS = ['Mañana (8:00 – 12:00)', 'Tarde (12:00 – 17:00)', 'Noche (17:00 – 20:00)', 'Flexible'] as const

export const PLACE_TYPES = [
  { value: 'casa', label: 'Casa' },
  { value: 'oficina', label: 'Oficina' },
  { value: 'otro', label: 'Otro espacio' },
] as const

export const DOCUMENT_TYPES = [
  { value: 'dpi', label: 'DPI (documento de identificación)' },
  { value: 'antecedentes_penales', label: 'Constancia de antecedentes penales' },
  { value: 'antecedentes_policiacos', label: 'Constancia de antecedentes policiacos' },
  { value: 'referencia', label: 'Carta de referencia o constancia de experiencia' },
] as const

export const DISPUTE_REASONS = [
  'El trabajo quedó incompleto',
  'El resultado no coincide con el alcance acordado',
  'Hay daños causados durante el servicio',
  'Se usaron materiales distintos a los acordados',
  'Otro motivo',
] as const

export const WARRANTY_REASONS = [
  'La falla original volvió a presentarse',
  'El acabado se deterioró antes de lo esperado',
  'Una pieza instalada dejó de funcionar',
  'Otro motivo',
] as const
