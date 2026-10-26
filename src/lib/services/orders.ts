import 'server-only'
import { db, tx, type Exec } from '@/lib/db/client'
import { AppError } from '@/lib/errors'
import type { SessionUser } from '@/lib/auth/session'
import {
  canOrderTransition, warrantyEnd,
  type CaseStatus, type OrderStatus, type PaymentStatus, type VerificationStatus, type WarrantyStatus,
} from '@/lib/domain/states'
import { getPaymentProvider } from '@/lib/payments/provider'
import { adminIds, audit, notify, publicCode } from './core'
import { postOrderEvent } from './messaging'
import { setupCase } from './support'

export interface ScopeSnapshot {
  title: string
  category: string
  scope_description: string
  materials_included: boolean
  materials_notes: string
  estimated_duration: string
  notes: string
  quoted_price: string
  accepted_at: string
}

export interface OrderRow {
  id: string
  order_number: string
  request_id: string
  customer_id: string
  professional_id: string
  agreed_price: string
  agreed_scope_snapshot: ScopeSnapshot
  scheduled_at: string
  status: OrderStatus
  en_route_at: Date | null
  arrival_marked_at: Date | null
  arrival_confirmed_at: Date | null
  started_at: Date | null
  completed_at: Date | null
  approved_at: Date | null
  created_at: Date
  customer_name: string
  customer_phone: string | null
  pro_name: string
  pro_avatar: string | null
  pro_phone: string | null
  pro_verification: VerificationStatus
  pro_qr_token: string
  category_id: string
  category_name: string
  location_label: string
  address_private: string
  preferred_time_window: string
  place_type: string
  payment_status: PaymentStatus
  payment_reference: string | null
  payment_is_demo: boolean
  is_urgent: boolean
  eta_at: Date | null
  eta_minutes: number | null
}

const ORDER_SELECT = `
  select o.id, o.order_number, o.request_id, o.customer_id, o.professional_id, o.agreed_price::text as agreed_price,
         o.agreed_scope_snapshot, o.scheduled_at::text as scheduled_at, o.status, o.en_route_at, o.arrival_marked_at,
         o.arrival_confirmed_at, o.started_at, o.completed_at, o.approved_at, o.created_at,
         cu.full_name as customer_name, cu.phone as customer_phone,
         p.public_name as pro_name, pu.avatar_url as pro_avatar, pu.phone as pro_phone,
         p.verification_status as pro_verification, p.qr_token as pro_qr_token,
         r.category_id, c.name as category_name, r.location_label, r.address_private, r.preferred_time_window, r.place_type,
         pay.status as payment_status, pay.provider_reference as payment_reference, pay.is_demo as payment_is_demo,
         o.is_urgent, o.eta_at, o.eta_minutes
  from orders o
  join users cu on cu.id = o.customer_id
  join users pu on pu.id = o.professional_id
  join professional_profiles p on p.user_id = o.professional_id
  join service_requests r on r.id = o.request_id
  join categories c on c.id = r.category_id
  join payments pay on pay.order_id = o.id`

/** Solo participantes de la orden y administración pueden verla (incluida la dirección exacta). */
export async function getOrder(actor: SessionUser, id: string) {
  const o = await db.q1<OrderRow>(`${ORDER_SELECT} where o.id = $1`, [id])
  if (!o) return null
  if (actor.role !== 'admin' && o.customer_id !== actor.id && o.professional_id !== actor.id) return null
  return o
}

export function listOrders(actor: SessionUser) {
  if (actor.role === 'admin') return db.q<OrderRow>(`${ORDER_SELECT} order by o.created_at desc`)
  const col = actor.role === 'customer' ? 'o.customer_id' : 'o.professional_id'
  return db.q<OrderRow>(`${ORDER_SELECT} where ${col} = $1 order by o.created_at desc`, [actor.id])
}

export interface EvidenceRow { id: string; stage: 'before' | 'final' | 'claim'; photo_url: string; caption: string; created_at: Date }
export interface ChangeRow { id: string; description: string; new_price: string; status: 'pending' | 'approved' | 'rejected'; created_at: Date; resolved_at: Date | null }
export interface WarrantyRow {
  id: string; order_id: string; policy_version: string; terms_text: string; duration_days: number
  starts_at: Date; expires_at: Date; status: WarrantyStatus
}
export interface ReviewRow {
  id: string; punctuality_score: number; communication_score: number; cleanliness_score: number; comment: string; created_at: Date
}
export interface CaseRow {
  id: string; case_number: string; order_id: string; warranty_id: string | null; kind: 'dispute' | 'warranty'
  reason: string; description: string; evidence_urls: string[]; status: CaseStatus; resolution: string | null
  resolved_at: Date | null; created_at: Date; conversation_id: string | null
}

const CASE_COLS = `id, case_number, order_id, warranty_id, kind, reason, description, evidence_urls, status, resolution, resolved_at, created_at, conversation_id`

/** Datos relacionados de una orden. Llamar solo después de autorizar con getOrder. */
export async function getOrderExtras(orderId: string) {
  await expireWarranties()
  const [evidence, changes, warranty, review, cases] = await Promise.all([
    db.q<EvidenceRow>(`select id, stage, photo_url, caption, created_at from order_evidence where order_id = $1 order by created_at`, [orderId]),
    db.q<ChangeRow>(`select id, description, new_price::text as new_price, status, created_at, resolved_at from order_changes where order_id = $1 order by created_at desc`, [orderId]),
    db.q1<WarrantyRow>(`select * from warranties where order_id = $1`, [orderId]),
    db.q1<ReviewRow>(`select id, punctuality_score, communication_score, cleanliness_score, comment, created_at from reviews where order_id = $1`, [orderId]),
    db.q<CaseRow>(`select ${CASE_COLS} from support_cases where order_id = $1 order by created_at desc`, [orderId]),
  ])
  return { evidence, changes, warranty: warranty ?? null, review: review ?? null, cases }
}

// ── Helpers internos ────────────────────────────────────────────────────────

interface Locked { id: string; order_number: string; customer_id: string; professional_id: string; status: OrderStatus; agreed_price: string; category_id: string; title: string }

async function load(t: Exec, id: string): Promise<Locked> {
  const o = await t.q1<Locked>(
    `select o.id, o.order_number, o.customer_id, o.professional_id, o.status, o.agreed_price::text as agreed_price,
            r.category_id, r.title
     from orders o join service_requests r on r.id = o.request_id where o.id = $1`,
    [id],
  )
  if (!o) throw new AppError('Orden no encontrada.')
  return o
}

function assertPro(o: Locked, actor: SessionUser) {
  if (actor.role !== 'professional' || o.professional_id !== actor.id) throw new AppError('Orden no encontrada.')
}
function assertCustomer(o: Locked, actor: SessionUser) {
  // Regla obligatoria: solo el cliente propietario puede aprobar o reclamar.
  if (actor.role !== 'customer' || o.customer_id !== actor.id) throw new AppError('Orden no encontrada.')
}
function assertTransition(o: Locked, to: OrderStatus) {
  if (!canOrderTransition(o.status, to)) throw new AppError('Esta acción no está disponible en el estado actual de la orden.')
}

async function setPayment(t: Exec, orderId: string, action: 'release' | 'requestRefund' | 'cancel') {
  const provider = getPaymentProvider()
  const pay = await t.q1<{ provider_reference: string }>(`select provider_reference from payments where order_id = $1`, [orderId])
  const res = await provider[action](pay?.provider_reference ?? '')
  await t.q(`update payments set status = $1, updated_at = now() where order_id = $2`, [res.status, orderId])
  return res.status
}

/** Genera la garantía escrita al completarse la orden, con la política vigente de la categoría. */
export async function createWarranty(t: Exec, o: Locked) {
  const cat = await t.q1<{ warranty_days: number; warranty_terms: string; name: string }>(
    `select warranty_days, warranty_terms, name from categories where id = $1`, [o.category_id],
  )
  const days = cat?.warranty_days ?? 30
  const starts = new Date()
  const w = await t.q1<{ id: string }>(
    `insert into warranties (order_id, policy_version, terms_text, duration_days, starts_at, expires_at, status)
     values ($1,$2,$3,$4,$5,$6,'active') returning id`,
    [o.id, `${new Date().getUTCFullYear()}.1-${cat?.name ?? 'general'}`, cat?.warranty_terms ?? '', days, starts, warrantyEnd(starts, days)],
  )
  await audit(t, null, 'warranty.created', 'warranty', w!.id, { order: o.order_number, duration_days: days })
  return w!.id
}

export async function completeOrder(t: Exec, o: Locked, actorId: string) {
  await t.q(`update orders set status = 'completed', approved_at = now(), completed_at = coalesce(completed_at, now()) where id = $1`, [o.id])
  await setPayment(t, o.id, 'release')
  await createWarranty(t, o)
  await t.q(`update professional_profiles set completed_jobs_count = completed_jobs_count + 1 where user_id = $1`, [o.professional_id])
  await audit(t, actorId, 'payment.released_demo', 'order', o.id, { demo: true })
}

export async function expireWarranties() {
  await db.q(`update warranties set status = 'expired' where status = 'active' and expires_at < now()`)
}

// ── Acciones del profesional ────────────────────────────────────────────────

export async function proSetEnRoute(actor: SessionUser, orderId: string) {
  await tx(async (t) => {
    const o = await load(t, orderId)
    assertPro(o, actor)
    assertTransition(o, 'en_route')
    await t.q(`update orders set status = 'en_route', en_route_at = now() where id = $1`, [o.id])
    await notify(t, o.customer_id, { type: 'order.en_route', title: 'Tu profesional va en camino', body: `Orden ${o.order_number}`, href: `/cliente/ordenes/${o.id}` })
    await postOrderEvent(t, o.id, '🚗 El profesional va en camino.')
    await audit(t, actor.id, 'order.en_route', 'order', o.id)
  })
}

/** El profesional indica que llegó. NO confirma identidad: eso lo hace el cliente con el QR. */
export async function proMarkArrival(actor: SessionUser, orderId: string) {
  await tx(async (t) => {
    const o = await load(t, orderId)
    assertPro(o, actor)
    if (!['scheduled', 'en_route'].includes(o.status)) throw new AppError('Esta acción no está disponible en el estado actual de la orden.')
    await t.q(`update orders set arrival_marked_at = now() where id = $1`, [o.id])
    await notify(t, o.customer_id, {
      type: 'order.arrival', title: 'Tu profesional llegó', body: 'Escanea su código QR para confirmar su identidad antes de dejarlo pasar.',
      href: `/cliente/ordenes/${o.id}`,
    })
    await postOrderEvent(t, o.id, '📍 El profesional indicó que llegó. Escanea su código QR para confirmar su identidad.')
    await audit(t, actor.id, 'order.arrival_marked', 'order', o.id)
  })
}

export async function proStartWork(actor: SessionUser, orderId: string) {
  await tx(async (t) => {
    const o = await load(t, orderId)
    assertPro(o, actor)
    if (o.status !== 'arrived') throw new AppError('El cliente debe confirmar tu identidad con el QR antes de iniciar el trabajo.')
    await t.q(`update orders set status = 'in_progress', started_at = now() where id = $1`, [o.id])
    await notify(t, o.customer_id, { type: 'order.started', title: 'El trabajo inició', body: `Orden ${o.order_number}`, href: `/cliente/ordenes/${o.id}` })
    await postOrderEvent(t, o.id, '🔧 El trabajo inició.')
    await audit(t, actor.id, 'order.started', 'order', o.id)
  })
}

export async function proSubmitCompletion(actor: SessionUser, orderId: string, photoUrls: string[], caption: string) {
  if (photoUrls.length < 1) throw new AppError('Adjunta al menos una foto del trabajo terminado.')
  await tx(async (t) => {
    const o = await load(t, orderId)
    assertPro(o, actor)
    assertTransition(o, 'pending_approval')
    for (const url of photoUrls) {
      await t.q(`insert into order_evidence (order_id, uploader_id, stage, photo_url, caption) values ($1,$2,'final',$3,$4)`, [o.id, actor.id, url, caption])
    }
    await t.q(`update orders set status = 'pending_approval', completed_at = now() where id = $1`, [o.id])
    await notify(t, o.customer_id, {
      type: 'order.pending_approval', title: 'Revisa y aprueba el trabajo', body: `El profesional terminó la orden ${o.order_number}.`,
      href: `/cliente/ordenes/${o.id}`,
    })
    await postOrderEvent(t, o.id, `📸 El profesional marcó el trabajo como terminado y subió ${photoUrls.length} foto(s). Revisa la evidencia para aprobarlo.`)
    await audit(t, actor.id, 'order.completion_submitted', 'order', o.id, { photos: photoUrls.length })
  })
}

/** Cambio de precio/alcance: se registra como modificación y requiere aprobación del cliente. */
export async function proRequestChange(actor: SessionUser, orderId: string, description: string, newPrice: string) {
  await tx(async (t) => {
    const o = await load(t, orderId)
    assertPro(o, actor)
    if (!['scheduled', 'en_route', 'arrived', 'in_progress'].includes(o.status)) throw new AppError('Ya no es posible solicitar cambios en esta orden.')
    const pending = await t.q1(`select 1 from order_changes where order_id = $1 and status = 'pending'`, [o.id])
    if (pending) throw new AppError('Ya hay una modificación pendiente de respuesta del cliente.')
    const c = await t.q1<{ id: string }>(
      `insert into order_changes (order_id, requested_by, description, new_price) values ($1,$2,$3,$4::numeric) returning id`,
      [o.id, actor.id, description, newPrice],
    )
    await notify(t, o.customer_id, {
      type: 'order.change_requested', title: 'Solicitud de modificación de precio', body: `Orden ${o.order_number}: requiere tu aprobación.`,
      href: `/cliente/ordenes/${o.id}`,
    })
    await postOrderEvent(t, o.id, `📝 Solicitud de modificación: ${description} → nuevo precio Q ${newPrice}. Requiere tu aprobación.`)
    await audit(t, actor.id, 'order.change_requested', 'order', o.id, { change_id: c!.id, from: o.agreed_price, to: newPrice })
  })
}

// ── Acciones del cliente ────────────────────────────────────────────────────

export async function customerResolveChange(actor: SessionUser, changeId: string, approve: boolean) {
  await tx(async (t) => {
    const ch = await t.q1<{ order_id: string; new_price: string; status: string }>(
      `select order_id, new_price::text as new_price, status from order_changes where id = $1`, [changeId],
    )
    if (!ch) throw new AppError('Modificación no encontrada.')
    const o = await load(t, ch.order_id)
    assertCustomer(o, actor)
    if (ch.status !== 'pending') throw new AppError('Esta modificación ya fue respondida.')
    await t.q(`update order_changes set status = $1, resolved_at = now() where id = $2`, [approve ? 'approved' : 'rejected', changeId])
    if (approve) {
      await t.q(`update orders set agreed_price = $1::numeric where id = $2`, [ch.new_price, o.id])
      await t.q(`update payments set amount = $1::numeric, updated_at = now() where order_id = $2`, [ch.new_price, o.id])
    }
    await notify(t, o.professional_id, {
      type: 'order.change_resolved', title: approve ? 'El cliente aprobó la modificación' : 'El cliente rechazó la modificación',
      body: `Orden ${o.order_number}`, href: `/pro/ordenes/${o.id}`,
    })
    await postOrderEvent(t, o.id, approve ? `✅ El cliente aprobó la modificación. Nuevo precio: Q ${ch.new_price}.` : '❌ El cliente rechazó la modificación. Se mantiene el precio acordado.')
    await audit(t, actor.id, approve ? 'order.price_changed' : 'order.change_rejected', 'order', o.id, {
      change_id: changeId, from: o.agreed_price, to: ch.new_price,
    })
  })
}

/**
 * Confirmación de identidad: el cliente, autenticado y dueño de la orden, confirma que la
 * persona presente coincide con el perfil del QR. El QR por sí solo no cambia nada.
 */
export async function customerConfirmArrival(actor: SessionUser, orderId: string, qrToken: string) {
  await tx(async (t) => {
    const o = await load(t, orderId)
    assertCustomer(o, actor)
    assertTransition(o, 'arrived')
    const p = await t.q1<{ qr_token: string; verification_status: VerificationStatus }>(
      `select qr_token, verification_status from professional_profiles where user_id = $1`, [o.professional_id],
    )
    if (!p || p.qr_token !== qrToken) throw new AppError('Este código QR no corresponde al profesional asignado a tu orden.')
    if (p.verification_status !== 'approved') throw new AppError('El perfil de este profesional ya no está verificado. Contacta a soporte.')
    await t.q(`update orders set status = 'arrived', arrival_confirmed_at = now(), arrival_marked_at = coalesce(arrival_marked_at, now()) where id = $1`, [o.id])
    await notify(t, o.professional_id, { type: 'order.identity_confirmed', title: 'El cliente confirmó tu identidad', body: 'Ya puedes iniciar el trabajo.', href: `/pro/ordenes/${o.id}` })
    await postOrderEvent(t, o.id, '✅ El cliente confirmó la identidad del profesional con el código QR.')
    await audit(t, actor.id, 'order.identity_confirmed', 'order', o.id, { method: 'qr' })
  })
}

export async function customerApprove(actor: SessionUser, orderId: string) {
  await tx(async (t) => {
    const o = await load(t, orderId)
    assertCustomer(o, actor)
    if (o.status !== 'pending_approval') throw new AppError('Esta orden no está pendiente de aprobación.')
    await completeOrder(t, o, actor.id)
    await notify(t, o.professional_id, { type: 'order.approved', title: 'El cliente aprobó tu trabajo', body: `Orden ${o.order_number} completada.`, href: `/pro/ordenes/${o.id}` })
    await postOrderEvent(t, o.id, '🎉 El cliente aprobó el trabajo. La garantía escrita ya está activa.')
    await audit(t, actor.id, 'order.approved', 'order', o.id)
  })
}

export async function customerOpenDispute(
  actor: SessionUser, orderId: string, input: { reason: string; description: string }, evidenceUrls: string[],
) {
  return tx(async (t) => {
    const o = await load(t, orderId)
    assertCustomer(o, actor)
    if (o.status !== 'pending_approval') throw new AppError('Solo puedes abrir una incidencia cuando el trabajo está pendiente de tu aprobación.')
    const c = await t.q1<{ id: string; case_number: string }>(
      `insert into support_cases (case_number, order_id, opened_by, kind, reason, description, evidence_urls)
       values ($1,$2,$3,'dispute',$4,$5,$6) returning id, case_number`,
      [publicCode('CASO'), o.id, actor.id, input.reason, input.description, evidenceUrls],
    )
    for (const url of evidenceUrls) {
      await t.q(`insert into order_evidence (order_id, uploader_id, stage, photo_url, caption) values ($1,$2,'claim',$3,$4)`, [o.id, actor.id, url, input.reason])
    }
    await setupCase(t, c!.id)
    await t.q(`update orders set status = 'disputed' where id = $1`, [o.id])
    await setPayment(t, o.id, 'requestRefund')
    await notify(t, o.professional_id, { type: 'order.disputed', title: 'El cliente abrió una incidencia', body: `Orden ${o.order_number}: ${input.reason}`, href: `/pro/ordenes/${o.id}` })
    for (const a of await adminIds(t)) {
      await notify(t, a, { type: 'case.new', title: `Nueva incidencia ${c!.case_number}`, body: input.reason, href: `/admin/casos/${c!.id}` })
    }
    await postOrderEvent(t, o.id, `⚠️ El cliente abrió una incidencia (${c!.case_number}): ${input.reason}. Soporte Handyman abrió una sala de mediación para resolverlo.`)
    await audit(t, actor.id, 'case.opened', 'support_case', c!.id, { kind: 'dispute', order: o.order_number, reason: input.reason })
    return c!.id
  })
}

/** Reseña: solo tras una orden completada y solo por el cliente real de esa orden. */
export async function createReview(
  actor: SessionUser,
  input: { order_id: string; punctuality_score: number; communication_score: number; cleanliness_score: number; comment: string },
) {
  await tx(async (t) => {
    const o = await load(t, input.order_id)
    assertCustomer(o, actor)
    if (o.status !== 'completed') throw new AppError('Solo puedes calificar órdenes completadas.')
    if (await t.q1(`select 1 from reviews where order_id = $1`, [o.id])) throw new AppError('Ya calificaste esta orden.')
    await t.q(
      `insert into reviews (order_id, reviewer_id, reviewee_id, punctuality_score, communication_score, cleanliness_score, comment)
       values ($1,$2,$3,$4,$5,$6,$7)`,
      [o.id, actor.id, o.professional_id, input.punctuality_score, input.communication_score, input.cleanliness_score, input.comment],
    )
    await t.q(
      `update professional_profiles p set
         rating_average = coalesce((select round(avg((punctuality_score + communication_score + cleanliness_score) / 3.0), 2)
                                    from reviews where reviewee_id = p.user_id and moderation_status = 'published'), 0),
         reviews_count = (select count(*)::int from reviews where reviewee_id = p.user_id and moderation_status = 'published')
       where p.user_id = $1`,
      [o.professional_id],
    )
    await notify(t, o.professional_id, { type: 'review.new', title: 'Recibiste una calificación', body: `Orden ${o.order_number}`, href: '/pro/historial' })
    await audit(t, actor.id, 'review.created', 'order', o.id)
  })
}

// ── Garantías ───────────────────────────────────────────────────────────────

export interface WarrantyListRow extends WarrantyRow {
  order_number: string; title: string; category_name: string; pro_name: string; customer_name: string
}

export async function listWarranties(actor: SessionUser) {
  await expireWarranties()
  const where = actor.role === 'customer' ? 'where o.customer_id = $1' : actor.role === 'professional' ? 'where o.professional_id = $1' : ''
  return db.q<WarrantyListRow>(
    `select w.*, o.order_number, r.title, c.name as category_name, p.public_name as pro_name, cu.full_name as customer_name
     from warranties w join orders o on o.id = w.order_id join service_requests r on r.id = o.request_id
     join categories c on c.id = r.category_id join professional_profiles p on p.user_id = o.professional_id
     join users cu on cu.id = o.customer_id
     ${where} order by w.starts_at desc`,
    where ? [actor.id] : [],
  )
}

export function listCases(actor: SessionUser) {
  const where = actor.role === 'customer' ? 'where s.opened_by = $1' : actor.role === 'professional' ? 'where o.professional_id = $1' : ''
  return db.q<CaseRow & { order_number: string; title: string; pro_name: string; customer_name: string }>(
    `select s.id, s.case_number, s.order_id, s.warranty_id, s.kind, s.reason, s.description, s.evidence_urls, s.status,
            s.resolution, s.resolved_at, s.created_at, o.order_number, r.title, p.public_name as pro_name, cu.full_name as customer_name, s.conversation_id
     from support_cases s join orders o on o.id = s.order_id join service_requests r on r.id = o.request_id
     join professional_profiles p on p.user_id = o.professional_id join users cu on cu.id = o.customer_id
     ${where} order by s.created_at desc`,
    where ? [actor.id] : [],
  )
}

export async function customerOpenWarrantyClaim(
  actor: SessionUser, warrantyId: string, input: { reason: string; description: string }, evidenceUrls: string[],
) {
  await expireWarranties()
  return tx(async (t) => {
    const w = await t.q1<{ id: string; order_id: string; status: WarrantyStatus }>(`select id, order_id, status from warranties where id = $1`, [warrantyId])
    if (!w) throw new AppError('Garantía no encontrada.')
    const o = await load(t, w.order_id)
    assertCustomer(o, actor)
    if (w.status === 'expired') throw new AppError('Esta garantía ya expiró.')
    if (w.status !== 'active') throw new AppError('Esta garantía ya tiene un reporte en curso o fue cerrada.')
    const c = await t.q1<{ id: string; case_number: string }>(
      `insert into support_cases (case_number, order_id, warranty_id, opened_by, kind, reason, description, evidence_urls)
       values ($1,$2,$3,$4,'warranty',$5,$6,$7) returning id, case_number`,
      [publicCode('CASO'), o.id, w.id, actor.id, input.reason, input.description, evidenceUrls],
    )
    await setupCase(t, c!.id)
    await t.q(`update warranties set status = 'reported' where id = $1`, [w.id])
    await notify(t, o.professional_id, { type: 'warranty.reported', title: 'Reporte de garantía', body: `Orden ${o.order_number}: ${input.reason}`, href: `/pro/ordenes/${o.id}` })
    for (const a of await adminIds(t)) {
      await notify(t, a, { type: 'case.new', title: `Nuevo caso de garantía ${c!.case_number}`, body: input.reason, href: `/admin/casos/${c!.id}` })
    }
    await audit(t, actor.id, 'case.opened', 'support_case', c!.id, { kind: 'warranty', order: o.order_number, reason: input.reason })
    return c!.id
  })
}
