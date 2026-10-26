import type { Exec, RawTx } from './client'

/**
 * Migración de datos "centro de soporte": segundo agente del equipo, salas de mediación para los
 * casos demo existentes y una consulta general pendiente de respuesta. Idempotente.
 */
export async function seedSupportCenter(t: RawTx) {
  const exec: Exec = {
    q: async <T>(sql: string, params: unknown[] = []) => (await t.query<T>(sql, params)).rows,
    q1: async <T>(sql: string, params: unknown[] = []) => (await t.query<T>(sql, params)).rows[0],
  }
  const admin = await exec.q1<{ id: string; password_hash: string }>(`select id, password_hash from users where email = 'admin@handyman.demo'`)
  if (!admin) return

  // Segundo agente: Jorge atiende soporte y evaluaciones técnicas (misma contraseña demo que administración).
  if (!(await exec.q1(`select 1 from users where email = 'soporte@handyman.demo'`))) {
    await exec.q(
      `insert into users (role, full_name, email, phone, password_hash, is_demo, created_at)
       values ('admin','Jorge Herrera','soporte@handyman.demo','5550 0002',$1,true, now() - interval '100 days')`,
      [admin.password_hash],
    )
  }

  const { setupCase } = await import('@/lib/services/support')
  const { postSystemMessage } = await import('@/lib/services/messaging')
  const cases = await exec.q<{ id: string; status: string; resolution: string | null; created_at: Date }>(
    `select id, status, resolution, created_at from support_cases where conversation_id is null order by created_at`,
  )
  for (const c of cases) {
    const conv = await setupCase(exec, c.id)
    if (c.status !== 'open') {
      await exec.q(`update support_cases set first_response_at = created_at + interval '90 minutes' where id = $1`, [c.id])
    }
    if (c.status === 'resolved' || c.status === 'rejected') {
      if (c.resolution) await postSystemMessage(exec, conv, `🧾 Resolución: ${c.resolution}`)
      await exec.q(`update conversations set status = 'closed' where id = $1`, [conv])
    }
  }

  // Consulta general de un profesional que espera respuesta (aparece en la cola del centro de soporte).
  const pro = await exec.q1<{ id: string }>(`select id from users where email = 'electricista@handyman.demo'`)
  if (pro && !(await exec.q1(`select 1 from conversations where kind = 'support' and owner_id = $1`, [pro.id]))) {
    const c = await exec.q1<{ id: string }>(
      `insert into conversations (kind, owner_id, subject, created_at, last_message_at)
       values ('support',$1,'¿Cuándo se libera mi pago?', now() - interval '50 minutes', now() - interval '45 minutes') returning id`,
      [pro.id],
    )
    await exec.q(`insert into conversation_participants (conversation_id, user_id, role, last_read_at) values ($1,$2,'professional',now())`, [c!.id, pro.id])
    await exec.q(
      `insert into messages (conversation_id, sender_id, kind, body, created_at) values
       ($1, null, 'system', '¡Hola! Soy el equipo de Handyman. Cuéntanos tu consulta y te respondemos aquí mismo.', now() - interval '50 minutes'),
       ($1, $2, 'text', 'Buenas tardes. Terminé un trabajo ayer y el cliente ya lo aprobó, ¿en cuánto tiempo se libera el pago?', now() - interval '45 minutes')`,
      [c!.id, pro.id],
    )
  }
}
