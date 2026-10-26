import 'server-only'
import { db, tx, type Exec } from '@/lib/db/client'
import { AppError } from '@/lib/errors'
import type { SessionUser } from '@/lib/auth/session'
import { notify } from './core'
import { getRequestForPro } from './requests'
import { maskContactInfo } from '@/lib/domain/privacy'
import { registerAgentReply } from './support'

export type ConversationKind = 'quote' | 'order' | 'support'

export interface ConversationSummary {
  id: string
  kind: ConversationKind
  subject: string
  status: 'open' | 'closed'
  request_id: string | null
  order_id: string | null
  last_message_at: Date
  last_body: string | null
  last_kind: 'text' | 'system' | null
  last_sender_id: string | null
  unread: number
  counterpart_name: string | null
  counterpart_avatar: string | null
}

export interface MessageRow {
  id: string
  sender_id: string | null
  sender_name: string | null
  sender_role: 'customer' | 'professional' | 'admin' | null
  kind: 'text' | 'system'
  body: string
  attachment_url: string | null
  created_at: Date
}

export const SUPPORT_PHONE = '+502 2300 0000'


async function addParticipant(t: Exec, conversationId: string, userId: string, role: 'customer' | 'professional' | 'agent') {
  await t.q(
    `insert into conversation_participants (conversation_id, user_id, role) values ($1,$2,$3)
     on conflict (conversation_id, user_id) do nothing`,
    [conversationId, userId, role],
  )
}

/** Mensaje automático del sistema dentro de una conversación (por ejemplo, "Va en camino"). */
export async function postSystemMessage(t: Exec, conversationId: string, body: string) {
  await t.q(`insert into messages (conversation_id, kind, body) values ($1,'system',$2)`, [conversationId, body])
  await t.q(`update conversations set last_message_at = now() where id = $1`, [conversationId])
}

/** Conversación de una orden (cliente + profesional). Se crea al contratar o la primera vez que se necesita. */
export async function ensureOrderConversation(t: Exec, orderId: string) {
  const found = await t.q1<{ id: string }>(`select id from conversations where kind = 'order' and order_id = $1`, [orderId])
  if (found) return found.id
  const o = await t.q1<{ customer_id: string; professional_id: string; request_id: string; order_number: string; title: string }>(
    `select o.customer_id, o.professional_id, o.request_id, o.order_number, r.title
     from orders o join service_requests r on r.id = o.request_id where o.id = $1`,
    [orderId],
  )
  if (!o) throw new AppError('Orden no encontrada.')
  const c = await t.q1<{ id: string }>(
    `insert into conversations (kind, order_id, request_id, professional_id, subject) values ('order',$1,$2,$3,$4) returning id`,
    [orderId, o.request_id, o.professional_id, `${o.title} · ${o.order_number}`],
  )
  await addParticipant(t, c!.id, o.customer_id, 'customer')
  await addParticipant(t, c!.id, o.professional_id, 'professional')
  return c!.id
}

/** Publica un evento de la orden en su chat. Nunca debe romper la operación principal. */
export async function postOrderEvent(t: Exec, orderId: string, body: string) {
  const convId = await ensureOrderConversation(t, orderId)
  await postSystemMessage(t, convId, body)
}

/** Chat previo a contratar entre el cliente dueño de la solicitud y un profesional que puede verla. */
export async function openQuoteConversation(actor: SessionUser, requestId: string, professionalId?: string) {
  const req = await db.q1<{ customer_id: string; title: string; status: string }>(
    `select customer_id, title, status from service_requests where id = $1`, [requestId],
  )
  if (!req) throw new AppError('Solicitud no encontrada.')
  let proId: string
  if (actor.role === 'customer') {
    if (req.customer_id !== actor.id || !professionalId) throw new AppError('Solicitud no encontrada.')
    // El cliente solo puede abrir chat con quien le cotizó o ya le escribió.
    const ok = await db.q1(
      `select 1 from quotes where request_id = $1 and professional_id = $2
       union select 1 from conversations where kind = 'quote' and request_id = $1 and professional_id = $2`,
      [requestId, professionalId],
    )
    if (!ok) throw new AppError('Este profesional aún no ha cotizado tu solicitud.')
    proId = professionalId
  } else if (actor.role === 'professional') {
    if (!(await getRequestForPro(actor.id, requestId))) throw new AppError('No tienes acceso a esta solicitud.')
    proId = actor.id
  } else throw new AppError('Acción no permitida.')

  return tx(async (t) => {
    const found = await t.q1<{ id: string }>(
      `select id from conversations where kind = 'quote' and request_id = $1 and professional_id = $2`, [requestId, proId],
    )
    if (found) return found.id
    const c = await t.q1<{ id: string }>(
      `insert into conversations (kind, request_id, professional_id, subject) values ('quote',$1,$2,$3) returning id`,
      [requestId, proId, req.title],
    )
    await addParticipant(t, c!.id, req.customer_id, 'customer')
    await addParticipant(t, c!.id, proId, 'professional')
    await postSystemMessage(t, c!.id, 'Conversación previa a la contratación. Por seguridad, los teléfonos y correos se ocultan hasta que aceptes una cotización.')
    return c!.id
  })
}

/** "Pregúntale a Handyman": una conversación de soporte abierta por usuario (y opcionalmente ligada a una orden). */
export async function openSupportConversation(actor: SessionUser, opts: { orderId?: string; subject?: string } = {}) {
  if (actor.role === 'admin') throw new AppError('Administración atiende las conversaciones de soporte desde su bandeja.')
  return tx(async (t) => {
    const found = await t.q1<{ id: string }>(
      `select id from conversations where kind = 'support' and owner_id = $1 and status = 'open'
         and coalesce(order_id::text, '') = coalesce($2::text, '')
         and not exists (select 1 from support_cases s where s.conversation_id = conversations.id)
       order by created_at desc limit 1`,
      [actor.id, opts.orderId ?? null],
    )
    if (found) return found.id
    if (opts.orderId) {
      const o = await t.q1(`select 1 from orders where id = $1 and (customer_id = $2 or professional_id = $2)`, [opts.orderId, actor.id])
      if (!o) throw new AppError('Orden no encontrada.')
    }
    const c = await t.q1<{ id: string }>(
      `insert into conversations (kind, owner_id, order_id, subject) values ('support',$1,$2,$3) returning id`,
      [actor.id, opts.orderId ?? null, opts.subject ?? 'Consulta con Handyman'],
    )
    await addParticipant(t, c!.id, actor.id, actor.role === 'professional' ? 'professional' : 'customer')
    await postSystemMessage(t, c!.id, `¡Hola! Soy el equipo de Handyman. Cuéntanos tu consulta y te respondemos aquí mismo. También puedes llamarnos al ${SUPPORT_PHONE} (línea de demostración).`)
    return c!.id
  })
}

interface ConvAccess {
  id: string; kind: ConversationKind; subject: string; status: 'open' | 'closed'; request_id: string | null; order_id: string | null
  professional_id: string | null; owner_id: string | null; is_participant: boolean; order_status: string | null
}

/** Autoriza el acceso: participantes; administración puede leer y responder soporte y órdenes (mediación). */
async function access(actor: SessionUser, conversationId: string) {
  const c = await db.q1<ConvAccess>(
    `select c.id, c.kind, c.subject, c.status, c.request_id, c.order_id, c.professional_id, c.owner_id,
            exists (select 1 from conversation_participants p where p.conversation_id = c.id and p.user_id = $2) as is_participant,
            (select o.status from orders o where o.id = c.order_id) as order_status
     from conversations c where c.id = $1`,
    [conversationId, actor.id],
  )
  if (!c) return null
  if (c.is_participant) return c
  if (actor.role === 'admin' && c.kind !== 'quote') return c
  return null
}

export async function getConversation(actor: SessionUser, conversationId: string) {
  const c = await access(actor, conversationId)
  if (!c) return null
  const participants = await db.q<{ user_id: string; role: string; full_name: string; public_name: string | null; avatar_url: string | null; phone: string | null }>(
    `select p.user_id, p.role, u.full_name, pp.public_name, u.avatar_url, u.phone
     from conversation_participants p join users u on u.id = p.user_id
     left join professional_profiles pp on pp.user_id = u.id
     where p.conversation_id = $1`,
    [conversationId],
  )
  return { ...c, participants }
}

export async function listMessages(actor: SessionUser, conversationId: string, after?: string) {
  if (!(await access(actor, conversationId))) throw new AppError('Conversación no encontrada.')
  return db.q<MessageRow>(
    `select m.id, m.sender_id, m.kind, m.body, m.attachment_url, m.created_at, u.role as sender_role,
            case when u.role = 'professional' then coalesce(pp.public_name, u.full_name)
                 when u.role = 'admin' then 'Soporte Handyman'
                 else u.full_name end as sender_name
     from messages m left join users u on u.id = m.sender_id left join professional_profiles pp on pp.user_id = u.id
     where m.conversation_id = $1 and ($2::timestamptz is null or m.created_at > $2::timestamptz)
     order by m.created_at asc limit 500`,
    [conversationId, after ?? null],
  )
}

export async function sendMessage(actor: SessionUser, conversationId: string, body: string, attachmentUrl: string | null) {
  const c = await access(actor, conversationId)
  if (!c) throw new AppError('Conversación no encontrada.')
  if (c.status === 'closed') throw new AppError('Esta conversación está cerrada.')
  let text = body.trim().slice(0, 2000)
  if (!text && !attachmentUrl) throw new AppError('Escribe un mensaje.')
  if (c.kind === 'quote') text = maskContactInfo(text)

  return tx(async (t) => {
    // Administración entra a la conversación como agente la primera vez que responde.
    if (!c.is_participant && actor.role === 'admin') await addParticipant(t, c.id, actor.id, 'agent')
    const m = await t.q1<{ id: string; created_at: Date }>(
      `insert into messages (conversation_id, sender_id, body, attachment_url) values ($1,$2,$3,$4) returning id, created_at`,
      [c.id, actor.id, text, attachmentUrl],
    )
    await t.q(`update conversations set last_message_at = now() where id = $1`, [c.id])
    if (c.kind === 'support' && actor.role === 'admin') await registerAgentReply(t, c.id)
    await t.q(`update conversation_participants set last_read_at = now() where conversation_id = $1 and user_id = $2`, [c.id, actor.id])

    // Aviso a los demás participantes, sin repetir mientras tengan uno sin leer de esta conversación.
    const others = await t.q<{ user_id: string }>(
      `select user_id from conversation_participants where conversation_id = $1 and user_id <> $2`, [c.id, actor.id],
    )
    const from = actor.role === 'admin' ? 'Soporte Handyman' : actor.full_name.split(' ')[0]
    for (const o of others) {
      const pending = await t.q1(
        `select 1 from notifications where user_id = $1 and type = 'message' and related_entity_id = $2 and read_at is null`, [o.user_id, c.id],
      )
      if (!pending) {
        await notify(t, o.user_id, {
          type: 'message', title: `Nuevo mensaje de ${from}`, body: text ? text.slice(0, 120) : 'Te enviaron una foto.',
          href: `/mensajes/${c.id}`, entityType: 'conversation', entityId: c.id,
        })
      }
    }
    // Si es soporte y nadie de administración participa aún, avisar a administración.
    if (c.kind === 'support' && actor.role !== 'admin') {
      const agents = await t.q<{ id: string }>(
        `select u.id from users u where u.role = 'admin' and u.status = 'active'
           and not exists (select 1 from conversation_participants p where p.conversation_id = $1 and p.user_id = u.id)`,
        [c.id],
      )
      for (const a of agents) {
        const pending = await t.q1(`select 1 from notifications where user_id = $1 and type = 'message' and related_entity_id = $2 and read_at is null`, [a.id, c.id])
        if (!pending) await notify(t, a.id, { type: 'message', title: 'Nueva consulta de soporte', body: text.slice(0, 120), href: `/mensajes/${c.id}`, entityType: 'conversation', entityId: c.id })
      }
    }
    return m!
  })
}

export async function markRead(actor: SessionUser, conversationId: string) {
  await db.q(`update conversation_participants set last_read_at = now() where conversation_id = $1 and user_id = $2`, [conversationId, actor.id])
  await db.q(`update notifications set read_at = now() where user_id = $1 and type = 'message' and related_entity_id = $2 and read_at is null`, [actor.id, conversationId])
}

/** Bandeja: conversaciones del usuario (administración ve además todas las de soporte). */
export function listConversations(actor: SessionUser) {
  const scope = actor.role === 'admin'
    ? `(c.kind = 'support' or exists (select 1 from conversation_participants p where p.conversation_id = c.id and p.user_id = $1))`
    : `exists (select 1 from conversation_participants p where p.conversation_id = c.id and p.user_id = $1)`
  return db.q<ConversationSummary>(
    `select c.id, c.kind, c.subject, c.status, c.request_id, c.order_id, c.last_message_at,
            lm.body as last_body, lm.kind as last_kind, lm.sender_id as last_sender_id,
            (select count(*)::int from messages m where m.conversation_id = c.id and m.created_at >
               coalesce((select p.last_read_at from conversation_participants p where p.conversation_id = c.id and p.user_id = $1), '1970-01-01')
               and coalesce(m.sender_id::text, '') <> $1::text) as unread,
            (select case when u.role = 'professional' then coalesce(pp.public_name, u.full_name) else u.full_name end
               from conversation_participants p join users u on u.id = p.user_id left join professional_profiles pp on pp.user_id = u.id
               where p.conversation_id = c.id and p.user_id <> $1 and p.role <> 'agent' order by p.role limit 1) as counterpart_name,
            (select u.avatar_url from conversation_participants p join users u on u.id = p.user_id
               where p.conversation_id = c.id and p.user_id <> $1 and p.role <> 'agent' limit 1) as counterpart_avatar
     from conversations c
     left join lateral (select body, kind, sender_id from messages m where m.conversation_id = c.id order by created_at desc limit 1) lm on true
     where ${scope}
     order by c.last_message_at desc limit 100`,
    [actor.id],
  )
}

export async function unreadConversations(userId: string) {
  const r = await db.q1<{ n: number }>(
    `select count(*)::int as n from conversation_participants p
     where p.user_id = $1 and exists (select 1 from messages m where m.conversation_id = p.conversation_id
       and m.created_at > p.last_read_at and coalesce(m.sender_id::text, '') <> $1::text)`,
    [userId],
  )
  return r?.n ?? 0
}

/** Conversaciones de una solicitud (para mostrar accesos desde el detalle). */
export function listRequestConversations(requestId: string) {
  return db.q<{ id: string; professional_id: string }>(
    `select id, professional_id from conversations where kind = 'quote' and request_id = $1`, [requestId],
  )
}

export async function orderConversationId(orderId: string) {
  return (await db.q1<{ id: string }>(`select id from conversations where kind = 'order' and order_id = $1`, [orderId]))?.id ?? null
}
