import 'server-only'
import { db, tx, type Exec } from '@/lib/db/client'
import { AppError } from '@/lib/errors'
import type { SessionUser } from '@/lib/auth/session'
import { canVerificationTransition, type CaseStatus, type OrderStatus, type RequestStatus, type VerificationStatus, type WarrantyStatus } from '@/lib/domain/states'
import type { CasePriority } from '@/lib/domain/sla'
import { audit, notify } from './core'
import { slugify } from './catalog'
import { completeOrder } from './orders'
import { postSystemMessage } from './messaging'
import { getPaymentProvider } from '@/lib/payments/provider'

function assertAdmin(actor: SessionUser) {
  if (actor.role !== 'admin') throw new AppError('Acción reservada para administración.')
}

// ── Métricas (sección 13 del plan) ──────────────────────────────────────────

export async function getMetrics() {
  const [counts, byStatus, byCategory, rating] = await Promise.all([
    db.q1<{
      requests: number; requests_with_quotes: number; hired: number; orders: number; completed: number
      quotes_pending: number; pros_approved: number; pros_pending: number; cases_open: number; cases_total: number
      hours_first_quote: string | null
    }>(`select
        (select count(*)::int from service_requests) as requests,
        (select count(distinct request_id)::int from quotes) as requests_with_quotes,
        (select count(*)::int from service_requests where status = 'hired') as hired,
        (select count(*)::int from orders) as orders,
        (select count(*)::int from orders where status = 'completed') as completed,
        (select count(*)::int from quotes where status = 'sent') as quotes_pending,
        (select count(*)::int from professional_profiles where verification_status = 'approved') as pros_approved,
        (select count(*)::int from professional_profiles where verification_status in ('pending','in_review')) as pros_pending,
        (select count(*)::int from support_cases where status in ('open','in_review')) as cases_open,
        (select count(*)::int from support_cases) as cases_total,
        (select round(avg(extract(epoch from (fq.first_at - r.created_at)) / 3600)::numeric, 1)::text
           from service_requests r join (select request_id, min(created_at) as first_at from quotes group by request_id) fq
           on fq.request_id = r.id where fq.first_at >= r.created_at) as hours_first_quote`),
    db.q<{ status: RequestStatus; n: number }>(`select status, count(*)::int as n from service_requests group by status`),
    db.q<{ name: string; n: number }>(
      `select c.name, count(*)::int as n from service_requests r join categories c on c.id = r.category_id group by c.name order by n desc limit 6`,
    ),
    db.q1<{ avg: string | null; n: number }>(
      `select round(avg((punctuality_score + communication_score + cleanliness_score) / 3.0), 2)::text as avg, count(*)::int as n from reviews`,
    ),
  ])
  return { counts: counts!, byStatus, byCategory, rating: rating! }
}

// ── Verificación de profesionales ───────────────────────────────────────────

export interface ProQueueRow {
  user_id: string; public_name: string; full_name: string; email: string; verification_status: VerificationStatus
  years_experience: number; created_at: Date; documents: number; categories: string[]
}

export function listProsForAdmin() {
  return db.q<ProQueueRow>(
    `select p.user_id, p.public_name, u.full_name, u.email, p.verification_status, p.years_experience, u.created_at,
            (select count(*)::int from professional_documents d where d.professional_id = p.user_id) as documents,
            coalesce((select jsonb_agg(c.name) from professional_categories pc join categories c on c.id = pc.category_id
                      where pc.professional_id = p.user_id and pc.active), '[]'::jsonb) as categories
     from professional_profiles p join users u on u.id = p.user_id
     order by case p.verification_status when 'pending' then 0 when 'in_review' then 1 when 'rejected' then 3 when 'draft' then 4 else 2 end, u.created_at desc`,
  )
}

/**
 * Único punto donde cambia el estado de verificación. Registra quién decidió, cuándo y por qué.
 */
export async function decideVerification(actor: SessionUser, proId: string, to: VerificationStatus, reason: string) {
  assertAdmin(actor)
  if ((to === 'rejected' || to === 'suspended') && reason.trim().length < 10) {
    throw new AppError('Escribe el motivo de la decisión (mínimo 10 caracteres).')
  }
  await tx(async (t) => {
    const p = await t.q1<{ verification_status: VerificationStatus; public_name: string }>(
      `select verification_status, public_name from professional_profiles where user_id = $1`, [proId],
    )
    if (!p) throw new AppError('Profesional no encontrado.')
    if (!canVerificationTransition(p.verification_status, to)) throw new AppError('Ese cambio de estado no está permitido.')
    await t.q(
      `update professional_profiles set verification_status = $1, verification_note = $2, verified_by = $3, verified_at = now() where user_id = $4`,
      [to, reason.trim() || null, actor.id, proId],
    )
    if (to === 'approved' || to === 'rejected') {
      await t.q(
        `update professional_documents set review_status = $1, reviewer_id = $2, reviewed_at = now(), rejection_reason = $3
         where professional_id = $4 and review_status = 'pending'`,
        [to, actor.id, to === 'rejected' ? reason.trim() : null, proId],
      )
    }
    const msg: Record<string, { title: string; body: string }> = {
      in_review: { title: 'Tu expediente está en revisión', body: 'Administración está revisando tus documentos.' },
      approved: { title: '¡Tu identidad fue verificada!', body: 'Ya puedes ver solicitudes y enviar cotizaciones.' },
      rejected: { title: 'Tu verificación fue rechazada', body: reason.trim() },
      suspended: { title: 'Tu perfil fue suspendido', body: reason.trim() },
    }
    if (msg[to]) await notify(t, proId, { type: `verification.${to}`, ...msg[to], href: '/pro/verificacion' })
    await audit(t, actor.id, `verification.${to}`, 'professional', proId, {
      from: p.verification_status, to, reason: reason.trim() || null, professional: p.public_name,
    })
  })
}

// ── Categorías y garantías ──────────────────────────────────────────────────

export async function saveCategory(
  actor: SessionUser, id: string | null,
  input: { name: string; description: string; icon_key: string; warranty_days: number; warranty_terms: string },
) {
  assertAdmin(actor)
  await tx(async (t) => {
    if (id) {
      const r = await t.q1<{ id: string }>(
        `update categories set name = $1, description = $2, icon_key = $3, warranty_days = $4, warranty_terms = $5 where id = $6 returning id`,
        [input.name, input.description, input.icon_key, input.warranty_days, input.warranty_terms, id],
      )
      if (!r) throw new AppError('Categoría no encontrada.')
      await audit(t, actor.id, 'category.updated', 'category', id, { name: input.name, warranty_days: input.warranty_days })
    } else {
      const slug = slugify(input.name)
      if (await t.q1(`select 1 from categories where slug = $1`, [slug])) throw new AppError('Ya existe una categoría con ese nombre.')
      const r = await t.q1<{ id: string }>(
        `insert into categories (name, slug, description, icon_key, warranty_days, warranty_terms, sort_order)
         values ($1,$2,$3,$4,$5,$6,(select coalesce(max(sort_order), 0) + 1 from categories)) returning id`,
        [input.name, slug, input.description, input.icon_key, input.warranty_days, input.warranty_terms],
      )
      await audit(t, actor.id, 'category.created', 'category', r!.id, { name: input.name })
    }
  })
}

export async function toggleCategory(actor: SessionUser, id: string) {
  assertAdmin(actor)
  await tx(async (t) => {
    const r = await t.q1<{ active: boolean; name: string }>(`update categories set active = not active where id = $1 returning active, name`, [id])
    if (!r) throw new AppError('Categoría no encontrada.')
    await audit(t, actor.id, r.active ? 'category.activated' : 'category.deactivated', 'category', id, { name: r.name })
  })
}

// ── Listados operativos ─────────────────────────────────────────────────────

export function listAllRequests() {
  return db.q<{
    id: string; title: string; status: RequestStatus; category_name: string; location_label: string
    customer_name: string; created_at: Date; quotes_count: number
  }>(
    `select r.id, r.title, r.status, c.name as category_name, r.location_label, u.full_name as customer_name, r.created_at,
            (select count(*)::int from quotes q where q.request_id = r.id) as quotes_count
     from service_requests r join categories c on c.id = r.category_id join users u on u.id = r.customer_id
     order by r.created_at desc`,
  )
}

export function listUsers() {
  return db.q<{ id: string; full_name: string; email: string; role: string; status: string; created_at: Date; is_demo: boolean }>(
    `select id, full_name, email, role, status, created_at, is_demo from users order by created_at desc`,
  )
}

export async function setUserStatus(actor: SessionUser, userId: string, status: 'active' | 'suspended') {
  assertAdmin(actor)
  if (userId === actor.id) throw new AppError('No puedes suspender tu propia cuenta.')
  await tx(async (t) => {
    const r = await t.q1<{ role: string }>(`update users set status = $1 where id = $2 and role <> 'admin' returning role`, [status, userId])
    if (!r) throw new AppError('Usuario no encontrado o protegido.')
    await audit(t, actor.id, `user.${status}`, 'user', userId)
  })
}

export interface AuditRow { id: string; actor_name: string | null; actor_role: string | null; action: string; entity_type: string; entity_id: string | null; metadata: Record<string, unknown>; created_at: Date }

export function listAudit(limit = 200) {
  return db.q<AuditRow>(
    `select a.id, u.full_name as actor_name, u.role as actor_role, a.action, a.entity_type, a.entity_id, a.metadata, a.created_at
     from audit_logs a left join users u on u.id = a.actor_id order by a.created_at desc limit $1`,
    [limit],
  )
}

// ── Casos (incidencias y garantías) ─────────────────────────────────────────

export interface AdminCase {
  id: string; case_number: string; order_id: string; warranty_id: string | null; kind: 'dispute' | 'warranty'
  reason: string; description: string; evidence_urls: string[]; status: CaseStatus; resolution: string | null
  resolved_at: Date | null; created_at: Date; order_number: string; order_status: OrderStatus; agreed_price: string
  title: string; customer_name: string; customer_id: string; pro_name: string; professional_id: string
  warranty_status: WarrantyStatus | null; resolver_name: string | null
  priority: CasePriority; sla_due_at: Date | null; first_response_at: Date | null; escalated_at: Date | null
  assigned_to: string | null; agent_name: string | null; conversation_id: string | null
  agreement_text: string | null; agreement_outcome: string | null; agreement_proposed_at: Date | null
  agreement_customer_at: Date | null; agreement_pro_at: Date | null
}

export function getCase(id: string) {
  return db.q1<AdminCase>(
    `select s.id, s.case_number, s.order_id, s.warranty_id, s.kind, s.reason, s.description, s.evidence_urls, s.status,
            s.resolution, s.resolved_at, s.created_at, o.order_number, o.status as order_status, o.agreed_price::text as agreed_price,
            r.title, cu.full_name as customer_name, o.customer_id, p.public_name as pro_name, o.professional_id,
            w.status as warranty_status, ru.full_name as resolver_name,
            s.priority, s.sla_due_at, s.first_response_at, s.escalated_at, s.assigned_to, au.full_name as agent_name, s.conversation_id,
            s.agreement_text, s.agreement_outcome, s.agreement_proposed_at, s.agreement_customer_at, s.agreement_pro_at
     from support_cases s join orders o on o.id = s.order_id join service_requests r on r.id = o.request_id
     join users cu on cu.id = o.customer_id join professional_profiles p on p.user_id = o.professional_id
     left join warranties w on w.id = s.warranty_id left join users ru on ru.id = s.resolved_by left join users au on au.id = s.assigned_to
     where s.id = $1`,
    [id],
  )
}

export type CaseAction = 'review' | 'release' | 'refund' | 'approve_fix' | 'resolve' | 'reject'

/** Resolución documentada de un caso. Cada salida deja resolución escrita y auditoría. */
export async function resolveCase(actor: SessionUser, caseId: string, action: CaseAction, resolution: string) {
  assertAdmin(actor)
  await tx((t) => applyCaseAction(t, actor.id, caseId, action, resolution))
}

/**
 * Aplica una acción sobre un caso dentro de una transacción. La usa administración directamente
 * y también el centro de soporte cuando cliente y profesional aceptan un acuerdo de mediación.
 */
export async function applyCaseAction(t: Exec, actorId: string, caseId: string, action: CaseAction, resolution: string) {
  const text = resolution.trim()
  if (action !== 'review' && text.length < 10) throw new AppError('Documenta la resolución (mínimo 10 caracteres).')
  const c = await t.q1<{ id: string; case_number: string; kind: 'dispute' | 'warranty'; status: CaseStatus; order_id: string; warranty_id: string | null; conversation_id: string | null }>(
    `select id, case_number, kind, status, order_id, warranty_id, conversation_id from support_cases where id = $1`, [caseId],
  )
  if (!c) throw new AppError('Caso no encontrado.')
  if (['resolved', 'rejected'].includes(c.status)) throw new AppError('Este caso ya está cerrado.')
  const o = (await t.q1<{ id: string; order_number: string; customer_id: string; professional_id: string; status: OrderStatus; agreed_price: string; category_id: string; title: string }>(
    `select o.id, o.order_number, o.customer_id, o.professional_id, o.status, o.agreed_price::text as agreed_price, r.category_id, r.title
     from orders o join service_requests r on r.id = o.request_id where o.id = $1`, [c.order_id],
  ))!
  const close = async (status: CaseStatus) =>
    t.q(`update support_cases set status = $1, resolution = $2, resolved_by = $3, resolved_at = now() where id = $4`, [status, text, actorId, c.id])
  let customerMsg = ''

  if (action === 'review') {
    await t.q(
      `update support_cases set status = 'in_review', assigned_to = coalesce(assigned_to, $2), first_response_at = coalesce(first_response_at, now()) where id = $1`,
      [c.id, actorId],
    )
    if (c.warranty_id) await t.q(`update warranties set status = 'in_review' where id = $1 and status = 'reported'`, [c.warranty_id])
    customerMsg = 'Tu caso está en revisión.'
  } else if (c.kind === 'dispute' && action === 'release') {
    if (o.status !== 'disputed') throw new AppError('La orden ya no está en disputa.')
    await completeOrder(t, o, actorId)
    await close('resolved')
    customerMsg = 'Caso resuelto: el trabajo se dio por completado y tu garantía quedó activa.'
  } else if (c.kind === 'dispute' && action === 'refund') {
    if (o.status !== 'disputed') throw new AppError('La orden ya no está en disputa.')
    const pay = await t.q1<{ provider_reference: string }>(`select provider_reference from payments where order_id = $1`, [o.id])
    const res = await getPaymentProvider().cancel(pay?.provider_reference ?? '')
    await t.q(`update payments set status = $1, updated_at = now() where order_id = $2`, [res.status, o.id])
    await t.q(`update orders set status = 'cancelled' where id = $1`, [o.id])
    await close('resolved')
    customerMsg = 'Caso resuelto a tu favor: la orden fue cancelada y el pago demo quedó cancelado.'
  } else if (c.kind === 'warranty' && action === 'approve_fix') {
    await t.q(`update warranties set status = 'approved_fix' where id = $1`, [c.warranty_id])
    await t.q(`update support_cases set status = 'in_review', resolution = $1 where id = $2`, [text, c.id])
    customerMsg = 'Tu garantía fue aprobada para corrección. El profesional coordinará la visita.'
  } else if (c.kind === 'warranty' && action === 'resolve') {
    await t.q(`update warranties set status = 'resolved' where id = $1`, [c.warranty_id])
    await close('resolved')
    customerMsg = 'Tu caso de garantía fue resuelto.'
  } else if (c.kind === 'warranty' && action === 'reject') {
    await t.q(`update warranties set status = 'rejected' where id = $1`, [c.warranty_id])
    await close('rejected')
    customerMsg = 'Tu reporte de garantía fue rechazado. Revisa el motivo en el detalle.'
  } else {
    throw new AppError('Acción no válida para este tipo de caso.')
  }

  // La sala de mediación refleja cada decisión y se cierra cuando el caso termina.
  if (c.conversation_id && action !== 'review') {
    await postSystemMessage(t, c.conversation_id, `🧾 Resolución del caso ${c.case_number}: ${text}`)
    if (action !== 'approve_fix') await t.q(`update conversations set status = 'closed' where id = $1`, [c.conversation_id])
  }
  const customerHref = c.conversation_id ? `/mensajes/${c.conversation_id}` : '/cliente/garantias'
  await notify(t, o.customer_id, { type: 'case.updated', title: `Actualización del caso ${c.case_number}`, body: customerMsg, href: customerHref })
  await notify(t, o.professional_id, { type: 'case.updated', title: `Actualización del caso ${c.case_number}`, body: text || 'El caso está en revisión.', href: `/pro/ordenes/${o.id}` })
  await audit(t, actorId, `case.${action}`, 'support_case', c.id, { case: c.case_number, order: o.order_number, resolution: text || null })
}
