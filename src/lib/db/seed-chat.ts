import type { RawTx } from './client'

/**
 * Migración de datos "conversaciones demo": chats de ejemplo para la cuenta de Andrea.
 *  - Chat previo a contratar con el plomero (incluye las preguntas que ya existían en la solicitud).
 *  - Chat de la orden de lámparas con el electricista, con mensajes del sistema.
 *  - Consulta de soporte respondida por el equipo de Handyman.
 * Idempotente: si no encuentra los datos base o ya existen las conversaciones, no hace nada.
 */
const HOUR = 3600000
const ago = (h: number) => new Date(Date.now() - h * HOUR)

export async function seedDemoConversations(t: RawTx) {
  const one = async <T>(sql: string, params: unknown[] = []) => (await t.query<T>(sql, params)).rows[0]
  const andrea = await one<{ id: string }>(`select id from users where email = 'cliente@handyman.demo'`)
  const admin = await one<{ id: string }>(`select id from users where email = 'admin@handyman.demo'`)
  const carlos = await one<{ id: string }>(`select id from users where email = 'plomero@handyman.demo'`)
  const marvin = await one<{ id: string }>(`select id from users where email = 'electricista@handyman.demo'`)
  if (!andrea || !admin || !carlos || !marvin) return

  const conv = async (row: Record<string, unknown>, participants: [string, string][]) => {
    const keys = Object.keys(row)
    const c = await one<{ id: string }>(
      `insert into conversations (${keys.join(',')}) values (${keys.map((_, i) => `$${i + 1}`).join(',')}) returning id`, Object.values(row),
    )
    for (const [uid, role] of participants) {
      await t.query(`insert into conversation_participants (conversation_id, user_id, role, last_read_at) values ($1,$2,$3,now()) on conflict do nothing`, [c!.id, uid, role])
    }
    return c!.id
  }
  const msg = (cid: string, sender: string | null, body: string, at: Date) =>
    t.query(`insert into messages (conversation_id, sender_id, kind, body, created_at) values ($1,$2,$3,$4,$5)`, [cid, sender, sender ? 'text' : 'system', body, at])

  // 1. Chat previo a contratar: fuga con Carlos
  const fuga = await one<{ id: string; title: string }>(`select id, title from service_requests where customer_id = $1 and title like 'Fuga de agua%' limit 1`, [andrea.id])
  if (fuga && !(await one(`select 1 from conversations where kind = 'quote' and request_id = $1 and professional_id = $2`, [fuga.id, carlos.id]))) {
    const cid = await conv({ kind: 'quote', request_id: fuga.id, professional_id: carlos.id, subject: fuga.title, created_at: ago(46), last_message_at: ago(44) },
      [[andrea.id, 'customer'], [carlos.id, 'professional']])
    await msg(cid, null, 'Conversación previa a la contratación. Por seguridad, los teléfonos y correos se ocultan hasta que aceptes una cotización.', ago(46))
    const old = (await t.query<{ author_id: string; body: string; created_at: Date }>(
      `select author_id, body, created_at from request_messages where request_id = $1 order by created_at`, [fuga.id])).rows
    for (const m of old) await msg(cid, m.author_id, m.body, new Date(m.created_at))
    await msg(cid, carlos.id, 'Perfecto. Por lo que describe, lo más probable es el empaque del sifón. Llevo repuestos de PVC para no tener que regresar. ¿Le parece bien en la mañana?', ago(44.5))
    await msg(cid, andrea.id, 'Sí, en la mañana me queda bien. Mientras tanto cerré la llave de paso.', ago(44))
  }

  // 2. Chat de la orden de lámparas con Marvin
  const lamps = await one<{ id: string; order_number: string; title: string; request_id: string }>(
    `select o.id, o.order_number, r.title, o.request_id from orders o join service_requests r on r.id = o.request_id
     where o.customer_id = $1 and r.title like 'Instalar 6 lámparas%' limit 1`, [andrea.id])
  if (lamps && !(await one(`select 1 from conversations where kind = 'order' and order_id = $1`, [lamps.id]))) {
    const cid = await conv({ kind: 'order', order_id: lamps.id, request_id: lamps.request_id, professional_id: marvin.id, subject: `${lamps.title} · ${lamps.order_number}`, created_at: ago(70), last_message_at: ago(5) },
      [[andrea.id, 'customer'], [marvin.id, 'professional']])
    await msg(cid, null, `🤝 Orden ${lamps.order_number} creada. Usen este chat para coordinar la visita; aquí también aparecerán los avisos del servicio.`, ago(70))
    await msg(cid, marvin.id, 'Buenas tardes, Andrea. Confirmo la visita para mañana. ¿Las luminarias ya están en la oficina?', ago(8))
    await msg(cid, andrea.id, 'Sí, están en la sala de juntas. ¿A qué hora llegaría?', ago(7))
    await msg(cid, marvin.id, 'A las 9:00 a. m. Llevo escalera y herramienta. Al llegar le muestro mi carné con QR.', ago(5))
  }

  // 3. Consulta de soporte de Andrea
  if (!(await one(`select 1 from conversations where kind = 'support' and owner_id = $1`, [andrea.id]))) {
    const cid = await conv({ kind: 'support', owner_id: andrea.id, subject: 'Consulta con Handyman', created_at: ago(30), last_message_at: ago(29) },
      [[andrea.id, 'customer'], [admin.id, 'agent']])
    await msg(cid, null, '¡Hola! Soy el equipo de Handyman. Cuéntanos tu consulta y te respondemos aquí mismo. También puedes llamarnos al +502 2300 0000 (línea de demostración).', ago(30))
    await msg(cid, andrea.id, 'Hola, ¿la garantía cubre si la pintura se mancha por humedad?', ago(29.8))
    await msg(cid, admin.id, 'Hola, Andrea. La garantía cubre defectos de mano de obra, como descascarado o burbujas. Si la mancha viene de una filtración, no la cubre, pero podemos enviarte a un profesional de techado para revisarla. ¿Quieres que te ayudemos a publicar la solicitud?', ago(29))
  }
}
