import 'server-only'
import { db, tx } from '@/lib/db/client'
import { AppError } from '@/lib/errors'
import type { SessionUser } from '@/lib/auth/session'
import type { QuoteStatus, RequestStatus, VerificationStatus } from '@/lib/domain/states'
import { getPaymentProvider } from '@/lib/payments/provider'
import { audit, notify, publicCode } from './core'
import { getRequestForPro } from './requests'

export interface QuoteRow {
  id: string
  request_id: string
  professional_id: string
  price_amount: string
  scope_description: string
  materials_included: boolean
  materials_notes: string
  estimated_duration: string
  proposed_date: string
  notes: string
  status: QuoteStatus
  created_at: Date
  expires_at: Date
}

export interface QuoteWithPro extends QuoteRow {
  public_name: string
  avatar_url: string | null
  years_experience: number
  verification_status: VerificationStatus
  rating_average: string
  reviews_count: number
  completed_jobs_count: number
  availability: string
  portfolio_count: number
}

const QUOTE_COLS = `
  q.id, q.request_id, q.professional_id, q.price_amount::text as price_amount, q.scope_description,
  q.materials_included, q.materials_notes, q.estimated_duration, q.proposed_date::text as proposed_date,
  q.notes, q.status, q.created_at, q.expires_at`

export async function createQuote(
  actor: SessionUser,
  input: {
    request_id: string; price_amount: string; scope_description: string; materials_included: 'si' | 'no'
    materials_notes: string; estimated_duration: string; proposed_date: string; notes: string
  },
) {
  if (actor.role !== 'professional') throw new AppError('Solo los profesionales pueden cotizar.')
  const pro = await db.q1<{ verification_status: VerificationStatus; public_name: string }>(
    `select verification_status, public_name from professional_profiles where user_id = $1`, [actor.id],
  )
  // Regla obligatoria: solo profesionales aprobados pueden enviar cotizaciones.
  if (pro?.verification_status !== 'approved') {
    throw new AppError('Tu perfil aún no está aprobado. Completa la verificación para poder cotizar.')
  }
  const req = await getRequestForPro(actor.id, input.request_id)
  if (!req) throw new AppError('Esta solicitud no está disponible para ti.')
  if (!['open', 'quoting'].includes(req.status)) throw new AppError('La solicitud ya no recibe cotizaciones.')
  if (req.my_quote_id) throw new AppError('Ya enviaste una cotización para esta solicitud.')

  return tx(async (t) => {
    const row = await t.q1<{ id: string }>(
      `insert into quotes (request_id, professional_id, price_amount, scope_description, materials_included,
                           materials_notes, estimated_duration, proposed_date, notes, status)
       values ($1,$2,$3::numeric,$4,$5,$6,$7,$8,$9,'sent') returning id`,
      [input.request_id, actor.id, input.price_amount, input.scope_description, input.materials_included === 'si',
        input.materials_notes, input.estimated_duration, input.proposed_date, input.notes],
    )
    await t.q(`update service_requests set status = 'quoting' where id = $1 and status = 'open'`, [input.request_id])
    await notify(t, req.customer_id, {
      type: 'quote.new', title: 'Recibiste una cotización', body: `${pro.public_name} cotizó "${req.title}"`,
      href: `/cliente/solicitudes/${input.request_id}`,
    })
    await audit(t, actor.id, 'quote.sent', 'quote', row!.id, { request_id: input.request_id, price: input.price_amount })
    return row!.id
  })
}

export async function withdrawQuote(actor: SessionUser, quoteId: string) {
  await tx(async (t) => {
    const r = await t.q1<{ id: string }>(
      `update quotes set status = 'withdrawn' where id = $1 and professional_id = $2 and status = 'sent' returning id`,
      [quoteId, actor.id],
    )
    if (!r) throw new AppError('No se pudo retirar la cotización.')
    await audit(t, actor.id, 'quote.withdrawn', 'quote', quoteId)
  })
}

/** Cotizaciones de una solicitud con datos públicos del profesional (para comparar). */
export function listQuotesForRequest(requestId: string) {
  return db.q<QuoteWithPro>(
    `select ${QUOTE_COLS}, p.public_name, u.avatar_url, p.years_experience, p.verification_status,
            p.rating_average::text as rating_average, p.reviews_count, p.completed_jobs_count, p.availability,
            (select count(*)::int from portfolio_items pi where pi.professional_id = p.user_id and pi.visibility_status = 'visible') as portfolio_count
     from quotes q
     join professional_profiles p on p.user_id = q.professional_id
     join users u on u.id = q.professional_id
     where q.request_id = $1 and q.status in ('sent','accepted','rejected')
     order by (q.status = 'accepted') desc, q.price_amount asc`,
    [requestId],
  )
}

export interface ProQuoteRow extends QuoteRow {
  request_title: string
  request_status: RequestStatus
  category_name: string
  location_label: string
  order_id: string | null
}

export function listProQuotes(proId: string) {
  return db.q<ProQuoteRow>(
    `select ${QUOTE_COLS}, r.title as request_title, r.status as request_status, c.name as category_name,
            r.location_label, (select o.id from orders o where o.accepted_quote_id = q.id) as order_id
     from quotes q join service_requests r on r.id = q.request_id join categories c on c.id = r.category_id
     where q.professional_id = $1 order by q.created_at desc`,
    [proId],
  )
}

export function getMyQuote(proId: string, requestId: string) {
  return db.q1<QuoteRow>(`select ${QUOTE_COLS} from quotes q where q.professional_id = $1 and q.request_id = $2`, [proId, requestId])
}

/**
 * El cliente acepta UNA cotización: la solicitud pasa a "Contratada", se crea la orden con
 * una copia congelada del precio y el alcance, y se registra el pago retenido (DEMO).
 */
export async function acceptQuote(actor: SessionUser, quoteId: string) {
  if (actor.role !== 'customer') throw new AppError('Solo el cliente puede aceptar una cotización.')
  const provider = getPaymentProvider()
  return tx(async (t) => {
    const q = await t.q1<
      QuoteRow & { customer_id: string; request_status: RequestStatus; request_title: string; category_name: string
        verification_status: VerificationStatus; public_name: string; expired: boolean }
    >(
      `select ${QUOTE_COLS}, r.customer_id, r.status as request_status, r.title as request_title, c.name as category_name,
              p.verification_status, p.public_name, (q.expires_at < now()) as expired
       from quotes q join service_requests r on r.id = q.request_id join categories c on c.id = r.category_id
       join professional_profiles p on p.user_id = q.professional_id
       where q.id = $1`,
      [quoteId],
    )
    if (!q || q.customer_id !== actor.id) throw new AppError('Cotización no encontrada.')
    if (!['open', 'quoting'].includes(q.request_status)) throw new AppError('Esta solicitud ya tiene una cotización aceptada o fue cerrada.')
    if (q.status !== 'sent') throw new AppError('Esta cotización ya no está disponible.')
    if (q.expired) throw new AppError('Esta cotización expiró. Pide al profesional que la actualice.')
    if (q.verification_status !== 'approved') throw new AppError('Este profesional ya no está verificado y no puede ser contratado.')

    await t.q(`update quotes set status = 'accepted' where id = $1`, [quoteId])
    const others = await t.q<{ professional_id: string }>(
      `update quotes set status = 'rejected' where request_id = $1 and id <> $2 and status = 'sent' returning professional_id`,
      [q.request_id, quoteId],
    )
    await t.q(`update service_requests set status = 'hired' where id = $1`, [q.request_id])

    const snapshot = {
      title: q.request_title,
      category: q.category_name,
      scope_description: q.scope_description,
      materials_included: q.materials_included,
      materials_notes: q.materials_notes,
      estimated_duration: q.estimated_duration,
      notes: q.notes,
      quoted_price: q.price_amount,
      accepted_at: new Date().toISOString(),
    }
    const order = await t.q1<{ id: string; order_number: string }>(
      `insert into orders (order_number, request_id, accepted_quote_id, customer_id, professional_id,
                           agreed_price, agreed_scope_snapshot, scheduled_at, status)
       values ($1,$2,$3,$4,$5,$6::numeric,$7,$8,'scheduled') returning id, order_number`,
      [publicCode('HM'), q.request_id, quoteId, actor.id, q.professional_id, q.price_amount, snapshot, q.proposed_date],
    )
    const hold = await provider.hold({ orderId: order!.id, amount: q.price_amount, currency: 'GTQ' })
    await t.q(
      `insert into payments (order_id, amount, currency, status, provider, provider_reference, is_demo)
       values ($1,$2::numeric,'GTQ',$3,$4,$5,$6)`,
      [order!.id, q.price_amount, hold.status, provider.name, hold.reference, provider.isDemo],
    )

    await notify(t, q.professional_id, {
      type: 'quote.accepted', title: '¡Aceptaron tu cotización!', body: `${q.request_title} · Orden ${order!.order_number}`,
      href: `/pro/ordenes/${order!.id}`,
    })
    for (const o of others) {
      await notify(t, o.professional_id, { type: 'quote.rejected', title: 'Cotización no seleccionada', body: q.request_title, href: '/pro/cotizaciones' })
    }
    await audit(t, actor.id, 'quote.accepted', 'quote', quoteId, { order_id: order!.id, price: q.price_amount })
    await audit(t, actor.id, 'order.created', 'order', order!.id, { order_number: order!.order_number, agreed_price: q.price_amount })
    await audit(t, actor.id, 'payment.held_demo', 'order', order!.id, { amount: q.price_amount, reference: hold.reference, demo: true })
    return order!.id
  })
}
