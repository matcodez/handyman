import 'server-only'
import { db, tx } from '@/lib/db/client'
import { AppError } from '@/lib/errors'
import type { SessionUser } from '@/lib/auth/session'
import type { RequestStatus, VerificationStatus } from '@/lib/domain/states'
import { emergencyByKey, ETA_OPTIONS, URGENT_VISIT_FEE } from '@/lib/domain/emergency'
import { adminIds, audit, notify } from './core'
import { insertOrder, type QuoteRow } from './quotes'
import { postOrderEvent } from './messaging'

/**
 * Carril de urgencias:
 *  1. El cliente elige qué pasó (un toque), confirma zona y dirección y envía: < 30 s.
 *  2. Se avisa primero a los profesionales "disponibles ahora" del oficio y la zona.
 *  3. El primero que acepta indica su tiempo de llegada; se crea la orden por la visita de
 *     diagnóstico (precio fijo) y el profesional queda en camino.
 *  4. En sitio, el presupuesto del trabajo se envía como modificación de la orden y el cliente lo aprueba.
 */

const today = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Guatemala' }).format(new Date())

export async function createEmergency(
  actor: SessionUser,
  input: { kind: string; location_label: string; address_private: string; details: string },
  photoUrls: string[],
) {
  if (actor.role !== 'customer') throw new AppError('Solo los clientes pueden pedir una emergencia.')
  const kind = emergencyByKey(input.kind)
  if (!kind) throw new AppError('Elige qué pasó.')
  if (!kind.categorySlug) throw new AppError('Por seguridad, una fuga de gas la atienden los bomberos: sal de la casa y llama al 122 o 123.')
  if (input.address_private.trim().length < 8) throw new AppError('Escribe la dirección para que el profesional pueda llegar.')

  return tx(async (t) => {
    const cat = await t.q1<{ id: string; name: string }>(`select id, name from categories where slug = $1 and active`, [kind.categorySlug])
    if (!cat) throw new AppError('Este tipo de emergencia no está disponible por ahora.')
    const description = input.details.trim() || kind.hint
    const row = await t.q1<{ id: string }>(
      `insert into service_requests
         (customer_id, category_id, title, description, photo_urls, place_type, location_label, address_private,
          preferred_date, preferred_time_window, status, is_urgent, urgent_kind, visit_fee)
       values ($1,$2,$3,$4,$5,'casa',$6,$7,$8,'Lo antes posible','open',true,$9,$10) returning id`,
      [actor.id, cat.id, `Emergencia: ${kind.label}`, description, photoUrls, input.location_label, input.address_private.trim(),
        today(), kind.key, URGENT_VISIT_FEE],
    )
    const id = row!.id
    // Primero los disponibles ahora; si no hay ninguno, todos los aprobados del oficio y la zona.
    const pros = await t.q<{ user_id: string; available: boolean }>(
      `select p.user_id, (p.available_now and coalesce(p.available_until, now()) >= now()) as available
       from professional_profiles p join professional_categories pc on pc.professional_id = p.user_id and pc.active
       where p.verification_status = 'approved' and pc.category_id = $1 and p.service_area @> to_jsonb($2::text)`,
      [cat.id, input.location_label],
    )
    const available = pros.filter((p) => p.available)
    const targets = available.length ? available : pros
    for (const p of targets) {
      await notify(t, p.user_id, {
        type: 'request.urgent', title: `🚨 Emergencia cerca: ${kind.label}`,
        body: `${input.location_label} · visita de diagnóstico Q ${URGENT_VISIT_FEE}. El primero que acepte la toma.`, href: `/pro/solicitudes/${id}`,
      })
    }
    for (const a of await adminIds(t)) {
      await notify(t, a, { type: 'request.urgent', title: `Emergencia nueva: ${kind.label}`, body: `${input.location_label} · ${targets.length} profesional(es) avisados`, href: `/admin/operaciones` })
    }
    await audit(t, actor.id, 'request.urgent_created', 'service_request', id, { kind: kind.key, zone: input.location_label, notified: targets.length, available: available.length })
    return id
  })
}

/** El primer profesional que acepta toma la emergencia. Los demás ven que ya fue asignada. */
export async function acceptEmergency(actor: SessionUser, requestId: string, etaMinutes: number) {
  if (actor.role !== 'professional') throw new AppError('Acción reservada para profesionales.')
  if (!(ETA_OPTIONS as readonly number[]).includes(etaMinutes)) throw new AppError('Elige en cuánto tiempo llegas.')
  return tx(async (t) => {
    // Bloqueo de la fila: si dos profesionales aceptan a la vez, solo uno gana.
    const r = await t.q1<{ id: string; customer_id: string; title: string; status: RequestStatus; is_urgent: boolean; visit_fee: string; category_id: string; category_name: string; location_label: string }>(
      `select r.id, r.customer_id, r.title, r.status, r.is_urgent, r.visit_fee::text as visit_fee, r.category_id, c.name as category_name, r.location_label
       from service_requests r join categories c on c.id = r.category_id where r.id = $1 for update of r`,
      [requestId],
    )
    if (!r || !r.is_urgent) throw new AppError('Emergencia no encontrada.')
    if (r.status !== 'open') throw new AppError('Otro profesional ya tomó esta emergencia.')
    const p = await t.q1<{ verification_status: VerificationStatus; public_name: string; ok: boolean }>(
      `select p.verification_status, p.public_name,
              exists (select 1 from professional_categories pc where pc.professional_id = p.user_id and pc.category_id = $2 and pc.active)
                and p.service_area @> to_jsonb($3::text) as ok
       from professional_profiles p where p.user_id = $1`,
      [actor.id, r.category_id, r.location_label],
    )
    if (p?.verification_status !== 'approved') throw new AppError('Tu perfil debe estar verificado para atender emergencias.')
    if (!p.ok) throw new AppError('Esta emergencia no es de tu oficio o zona.')

    const quote = await t.q1<QuoteRow>(
      `insert into quotes (request_id, professional_id, price_amount, scope_description, materials_included, materials_notes,
                           estimated_duration, proposed_date, notes, status)
       values ($1,$2,$3::numeric,$4,false,'',$5,$6,$7,'accepted')
       returning id, request_id, professional_id, price_amount::text as price_amount, scope_description, materials_included,
                 materials_notes, estimated_duration, proposed_date::text as proposed_date, notes, status, created_at, expires_at`,
      [r.id, actor.id, r.visit_fee,
        'Visita de diagnóstico urgente. En sitio, el profesional envía el presupuesto del trabajo desde la orden y solo se realiza si el cliente lo aprueba.',
        'Diagnóstico: 30 a 60 minutos', today(),
        `Precio fijo de la visita. Si contratas la reparación, los Q ${r.visit_fee} se descuentan del total.`],
    )
    await t.q(`update service_requests set status = 'hired' where id = $1`, [r.id])
    const { order } = await insertOrder(t, { ...quote!, request_title: r.title, category_name: r.category_name }, r.customer_id,
      { status: 'en_route', isUrgent: true, etaMinutes })

    await postOrderEvent(t, order.id,
      `🚨 ${p.public_name} tomó tu emergencia y va en camino. Llegada estimada: ${etaMinutes} min.\n` +
      `La visita de diagnóstico cuesta Q ${r.visit_fee} (pago retenido DEMO). Al revisar, te enviará el presupuesto del trabajo aquí para que lo apruebes.`)
    await notify(t, r.customer_id, {
      type: 'order.urgent_accepted', title: `${p.public_name.split(' · ')[0]} va en camino`, body: `Llega en unos ${etaMinutes} minutos.`,
      href: `/cliente/ordenes/${order.id}`,
    })
    await audit(t, actor.id, 'request.urgent_accepted', 'service_request', r.id, { order: order.order_number, eta_minutes: etaMinutes })
    return order.id
  })
}

export async function setAvailability(actor: SessionUser, on: boolean, hours: number) {
  if (actor.role !== 'professional') throw new AppError('Acción reservada para profesionales.')
  const h = Math.min(Math.max(hours, 1), 12)
  await tx(async (t) => {
    await t.q(
      `update professional_profiles set available_now = $1, available_until = case when $1 then now() + make_interval(hours => $2::int) else null end where user_id = $3`,
      [on, h, actor.id],
    )
    await audit(t, actor.id, on ? 'pro.available_on' : 'pro.available_off', 'professional', actor.id, on ? { hours: h } : {})
  })
}

export async function getAvailability(proId: string) {
  const r = await db.q1<{ available_now: boolean; available_until: Date | null }>(
    `select (available_now and coalesce(available_until, now()) >= now()) as available_now, available_until
     from professional_profiles where user_id = $1`,
    [proId],
  )
  return r ?? { available_now: false, available_until: null }
}

/** Estado de una emergencia para la pantalla de espera del cliente. */
export async function getEmergencyStatus(actor: SessionUser, requestId: string) {
  const r = await db.q1<{
    id: string; customer_id: string; title: string; status: RequestStatus; urgent_kind: string | null; visit_fee: string | null
    location_label: string; created_at: Date; category_id: string; order_id: string | null; pro_name: string | null; eta_at: Date | null; eta_minutes: number | null
  }>(
    `select r.id, r.customer_id, r.title, r.status, r.urgent_kind, r.visit_fee::text as visit_fee, r.location_label, r.created_at, r.category_id,
            o.id as order_id, p.public_name as pro_name, o.eta_at, o.eta_minutes
     from service_requests r left join orders o on o.request_id = r.id left join professional_profiles p on p.user_id = o.professional_id
     where r.id = $1 and r.is_urgent`,
    [requestId],
  )
  if (!r || (r.customer_id !== actor.id && actor.role !== 'admin')) return null
  const counts = await db.q1<{ available: number; total: number }>(
    `select count(*) filter (where p.available_now and coalesce(p.available_until, now()) >= now())::int as available, count(*)::int as total
     from professional_profiles p join professional_categories pc on pc.professional_id = p.user_id and pc.active
     where p.verification_status = 'approved' and pc.category_id = $1 and p.service_area @> to_jsonb($2::text)`,
    [r.category_id, r.location_label],
  )
  return { ...r, available: counts?.available ?? 0, notified: (counts?.available || counts?.total) ?? 0 }
}

/**
 * Evaluación por un técnico de Handyman: abre una conversación de soporte ligada a la solicitud
 * para que un evaluador revise fotos y relato y oriente sobre el precio justo o el oficio correcto.
 */
export async function requestEvaluation(actor: SessionUser, requestId: string) {
  if (actor.role !== 'customer') throw new AppError('Acción reservada para clientes.')
  const r = await db.q1<{ title: string }>(`select title from service_requests where id = $1 and customer_id = $2`, [requestId, actor.id])
  if (!r) throw new AppError('Solicitud no encontrada.')
  const { openSupportConversation } = await import('./messaging')
  const id = await openSupportConversation(actor, {
    requestId, subject: `Evaluación técnica · ${r.title}`.slice(0, 120),
    intro: '🧰 Pediste una evaluación técnica. Un evaluador de Handyman revisará las fotos y el relato de tu solicitud y te dirá qué oficio necesitas y un rango de precio justo. Si quieres, agrega más fotos o un video corto aquí.',
  })
  const pending = await db.q1(`select 1 from notifications where type = 'evaluation.requested' and related_entity_id = $1`, [id])
  if (!pending) {
    for (const a of await adminIds(db)) {
      await notify(db, a, { type: 'evaluation.requested', title: 'Nueva evaluación técnica solicitada', body: r.title, href: `/mensajes/${id}`, entityType: 'conversation', entityId: id })
    }
  }
  return id
}
