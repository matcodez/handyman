import 'server-only'
import crypto from 'node:crypto'
import { db, type Exec } from '@/lib/db/client'

/** Registro de auditoría para acciones sensibles. Solo inserta; nunca se edita ni se borra. */
export async function audit(
  t: Exec,
  actorId: string | null,
  action: string,
  entityType: string,
  entityId: string | null,
  metadata: Record<string, unknown> = {},
) {
  await t.q(
    `insert into audit_logs (actor_id, action, entity_type, entity_id, metadata) values ($1,$2,$3,$4,$5)`,
    [actorId, action, entityType, entityId, metadata],
  )
}

export async function notify(
  t: Exec,
  userId: string,
  n: { type: string; title: string; body?: string; href?: string; entityType?: string; entityId?: string },
) {
  await t.q(
    `insert into notifications (user_id, type, title, body, href, related_entity_type, related_entity_id)
     values ($1,$2,$3,$4,$5,$6,$7)`,
    [userId, n.type, n.title, n.body ?? '', n.href ?? null, n.entityType ?? null, n.entityId ?? null],
  )
}

export interface NotificationRow {
  id: string
  type: string
  title: string
  body: string
  href: string | null
  read_at: Date | null
  created_at: Date
}

export function listNotifications(userId: string, limit = 30) {
  return db.q<NotificationRow>(
    `select id, type, title, body, href, read_at, created_at from notifications
     where user_id = $1 order by created_at desc limit $2`,
    [userId, limit],
  )
}

export async function unreadCount(userId: string) {
  const r = await db.q1<{ n: number }>(
    `select count(*)::int as n from notifications where user_id = $1 and read_at is null`,
    [userId],
  )
  return r?.n ?? 0
}

export async function markAllRead(userId: string) {
  await db.q(`update notifications set read_at = now() where user_id = $1 and read_at is null`, [userId])
}

/** Código legible y no secuencial para órdenes y casos (p. ej. HM-7K2QX9). */
export function publicCode(prefix: string) {
  const alphabet = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ'
  const bytes = crypto.randomBytes(6)
  let out = ''
  for (const b of bytes) out += alphabet[b % alphabet.length]
  return `${prefix}-${out}`
}

export async function adminIds(t: Exec) {
  return (await t.q<{ id: string }>(`select id from users where role = 'admin' and status = 'active'`)).map((r) => r.id)
}
