import 'server-only'
import { db, tx } from '@/lib/db/client'
import { AppError } from '@/lib/errors'
import type { SessionUser } from '@/lib/auth/session'
import type { QuoteStatus, RequestStatus } from '@/lib/domain/states'
import { audit, notify } from './core'

export interface RequestRow {
  id: string
  customer_id: string
  category_id: string
  category_name: string
  category_icon: string
  title: string
  description: string
  photo_urls: string[]
  place_type: 'casa' | 'oficina' | 'otro'
  location_label: string
  preferred_date: string
  preferred_time_window: string
  status: RequestStatus
  created_at: Date
  quotes_count: number
  order_id: string | null
}

// Columnas seguras para cualquier lector autorizado: NO incluyen address_private.
const SAFE_COLS = `
  r.id, r.customer_id, r.category_id, c.name as category_name, c.icon_key as category_icon,
  r.title, r.description, r.photo_urls, r.place_type, r.location_label,
  r.preferred_date::text as preferred_date, r.preferred_time_window, r.status, r.created_at,
  (select count(*)::int from quotes qq where qq.request_id = r.id and qq.status in ('sent','accepted','rejected')) as quotes_count,
  (select o.id from orders o where o.request_id = r.id) as order_id`

// Un profesional solo ve solicitudes abiertas de sus oficios y zonas, y únicamente si está aprobado.
const PRO_CAN_SEE = `
  exists (
    select 1 from professional_profiles p
    join professional_categories pc on pc.professional_id = p.user_id and pc.active
    where p.user_id = $1 and p.verification_status = 'approved'
      and pc.category_id = r.category_id
      and p.service_area @> to_jsonb(r.location_label)
  )`

export async function createRequest(
  actor: SessionUser,
  input: {
    category_id: string; title: string; description: string; place_type: string; location_label: string
    address_private: string; preferred_date: string; preferred_time_window: string
  },
  photoUrls: string[],
) {
  if (actor.role !== 'customer') throw new AppError('Solo los clientes pueden crear solicitudes.')
  if (photoUrls.length < 1) throw new AppError('Adjunta al menos una foto del problema.')
  return tx(async (t) => {
    const cat = await t.q1<{ id: string; name: string }>(`select id, name from categories where id = $1 and active`, [input.category_id])
    if (!cat) throw new AppError('La categoría seleccionada no está disponible.')
    const row = await t.q1<{ id: string }>(
      `insert into service_requests
        (customer_id, category_id, title, description, photo_urls, place_type, location_label, address_private,
         preferred_date, preferred_time_window, status)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'open') returning id`,
      [actor.id, cat.id, input.title, input.description, photoUrls, input.place_type, input.location_label,
        input.address_private, input.preferred_date, input.preferred_time_window],
    )
    const id = row!.id
    await audit(t, actor.id, 'request.created', 'service_request', id, { category: cat.name, zone: input.location_label })
    // Aviso a profesionales aprobados que cubren el oficio y la zona.
    const pros = await t.q<{ user_id: string }>(
      `select p.user_id from professional_profiles p
       join professional_categories pc on pc.professional_id = p.user_id and pc.active
       where p.verification_status = 'approved' and pc.category_id = $1 and p.service_area @> to_jsonb($2::text)`,
      [cat.id, input.location_label],
    )
    for (const p of pros) {
      await notify(t, p.user_id, {
        type: 'request.new', title: `Nueva solicitud de ${cat.name}`,
        body: `${input.title} · ${input.location_label}`, href: `/pro/solicitudes/${id}`,
      })
    }
    return id
  })
}

export function listCustomerRequests(customerId: string) {
  return db.q<RequestRow>(
    `select ${SAFE_COLS} from service_requests r join categories c on c.id = r.category_id
     where r.customer_id = $1 order by r.created_at desc`,
    [customerId],
  )
}

/** Detalle para el dueño (o administración). Incluye la dirección privada. */
export async function getRequestForOwner(actor: SessionUser, id: string) {
  const row = await db.q1<RequestRow & { address_private: string; customer_name: string }>(
    `select ${SAFE_COLS}, r.address_private, u.full_name as customer_name
     from service_requests r join categories c on c.id = r.category_id join users u on u.id = r.customer_id
     where r.id = $1`,
    [id],
  )
  if (!row) return null
  if (actor.role !== 'admin' && row.customer_id !== actor.id) return null
  return row
}

export interface ProRequestRow extends RequestRow {
  customer_first_name: string
  my_quote_id: string | null
  my_quote_status: QuoteStatus | null
}

/** Oportunidades para un profesional aprobado. Solo zona aproximada, nunca la dirección exacta. */
export function listOpenRequestsForPro(proId: string) {
  return db.q<ProRequestRow>(
    `select ${SAFE_COLS}, split_part(u.full_name, ' ', 1) as customer_first_name,
            mq.id as my_quote_id, mq.status as my_quote_status
     from service_requests r
     join categories c on c.id = r.category_id
     join users u on u.id = r.customer_id
     left join quotes mq on mq.request_id = r.id and mq.professional_id = $1
     where r.status in ('open','quoting') and ${PRO_CAN_SEE}
     order by r.created_at desc`,
    [proId],
  )
}

export async function getRequestForPro(proId: string, id: string) {
  return db.q1<ProRequestRow>(
    `select ${SAFE_COLS}, split_part(u.full_name, ' ', 1) as customer_first_name,
            mq.id as my_quote_id, mq.status as my_quote_status
     from service_requests r
     join categories c on c.id = r.category_id
     join users u on u.id = r.customer_id
     left join quotes mq on mq.request_id = r.id and mq.professional_id = $1
     where r.id = $2 and (mq.id is not null or (r.status in ('open','quoting') and ${PRO_CAN_SEE}))`,
    [proId, id],
  )
}

export async function cancelRequest(actor: SessionUser, id: string) {
  await tx(async (t) => {
    const r = await t.q1<{ customer_id: string; status: RequestStatus; title: string }>(
      `select customer_id, status, title from service_requests where id = $1`, [id],
    )
    if (!r || (r.customer_id !== actor.id && actor.role !== 'admin')) throw new AppError('Solicitud no encontrada.')
    if (!['open', 'quoting'].includes(r.status)) throw new AppError('Esta solicitud ya no se puede cancelar.')
    await t.q(`update service_requests set status = 'cancelled' where id = $1`, [id])
    const quotes = await t.q<{ professional_id: string }>(
      `update quotes set status = 'rejected' where request_id = $1 and status = 'sent' returning professional_id`, [id],
    )
    for (const qt of quotes) {
      await notify(t, qt.professional_id, { type: 'request.cancelled', title: 'Solicitud cancelada', body: r.title, href: '/pro/cotizaciones' })
    }
    await audit(t, actor.id, 'request.cancelled', 'service_request', id)
  })
}

// ── Preguntas y respuestas ──────────────────────────────────────────────────

export interface MessageRow {
  id: string
  author_id: string
  author_name: string
  author_role: 'customer' | 'professional' | 'admin'
  body: string
  created_at: Date
}

export function listMessages(requestId: string) {
  return db.q<MessageRow>(
    `select m.id, m.author_id, m.body, m.created_at, u.role as author_role,
            case when u.role = 'professional' then coalesce(p.public_name, u.full_name) else split_part(u.full_name, ' ', 1) end as author_name
     from request_messages m join users u on u.id = m.author_id
     left join professional_profiles p on p.user_id = u.id
     where m.request_id = $1 order by m.created_at`,
    [requestId],
  )
}

export async function addMessage(actor: SessionUser, requestId: string, body: string) {
  const req = await db.q1<{ customer_id: string; title: string; status: RequestStatus }>(
    `select customer_id, title, status from service_requests where id = $1`, [requestId],
  )
  if (!req) throw new AppError('Solicitud no encontrada.')
  if (actor.role === 'customer') {
    if (req.customer_id !== actor.id) throw new AppError('Solicitud no encontrada.')
  } else if (actor.role === 'professional') {
    if (!(await getRequestForPro(actor.id, requestId))) throw new AppError('No tienes acceso a esta solicitud.')
  } else throw new AppError('Acción no permitida.')
  if (!['open', 'quoting'].includes(req.status)) throw new AppError('La solicitud ya no admite preguntas.')

  await tx(async (t) => {
    await t.q(`insert into request_messages (request_id, author_id, body) values ($1,$2,$3)`, [requestId, actor.id, body])
    if (actor.role === 'professional') {
      await notify(t, req.customer_id, {
        type: 'request.question', title: 'Nueva pregunta sobre tu solicitud', body: req.title, href: `/cliente/solicitudes/${requestId}`,
      })
    } else {
      const pros = await t.q<{ author_id: string }>(
        `select distinct author_id from request_messages where request_id = $1 and author_id <> $2`, [requestId, actor.id],
      )
      for (const p of pros) {
        await notify(t, p.author_id, { type: 'request.answer', title: 'El cliente respondió', body: req.title, href: `/pro/solicitudes/${requestId}` })
      }
    }
  })
}
