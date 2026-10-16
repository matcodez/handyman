import 'server-only'
import bcrypt from 'bcryptjs'
import { db, tx } from '@/lib/db/client'
import { AppError } from '@/lib/errors'
import type { SessionUser } from '@/lib/auth/session'
import { audit } from './core'
import { newQrToken } from './professionals'

// Hash de relleno para igualar el tiempo de respuesta cuando el correo no existe.
const DUMMY_HASH = bcrypt.hashSync('handyman-dummy', 10)

export async function registerUser(input: {
  role: 'customer' | 'professional'; full_name: string; email: string; phone: string; password: string
}) {
  // El rol admin nunca se puede crear desde el registro público.
  const hash = await bcrypt.hash(input.password, 10)
  return tx(async (t) => {
    if (await t.q1(`select 1 from users where email = $1`, [input.email])) {
      throw new AppError('Ya existe una cuenta con ese correo. Inicia sesión.')
    }
    const u = await t.q1<{ id: string }>(
      `insert into users (role, full_name, email, phone, password_hash) values ($1,$2,$3,$4,$5) returning id`,
      [input.role, input.full_name, input.email, input.phone, hash],
    )
    if (input.role === 'customer') {
      await t.q(`insert into customer_profiles (user_id) values ($1)`, [u!.id])
    } else {
      // Todo profesional nuevo inicia sin verificar; no puede cotizar hasta que administración lo apruebe.
      await t.q(
        `insert into professional_profiles (user_id, public_name, qr_token, verification_status) values ($1,$2,$3,'draft')`,
        [u!.id, input.full_name, newQrToken()],
      )
    }
    await audit(t, u!.id, 'user.registered', 'user', u!.id, { role: input.role })
    return u!.id
  })
}

export async function verifyCredentials(email: string, password: string) {
  const u = await db.q1<{ id: string; password_hash: string; status: string; role: SessionUser['role'] }>(
    `select id, password_hash, status, role from users where email = $1`, [email],
  )
  const ok = await bcrypt.compare(password, u?.password_hash ?? DUMMY_HASH)
  if (!u || !ok) throw new AppError('Correo o contraseña incorrectos.')
  if (u.status !== 'active') throw new AppError('Esta cuenta está suspendida. Contacta a soporte.')
  return { id: u.id, role: u.role }
}

// ── Perfil y direcciones del cliente ────────────────────────────────────────

export interface AddressRow { id: string; label: string; zone: string; address_private: string }

export function listAddresses(userId: string) {
  return db.q<AddressRow>(`select id, label, zone, address_private from customer_addresses where user_id = $1 order by created_at`, [userId])
}

export async function addAddress(actor: SessionUser, input: { label: string; zone: string; address_private: string }) {
  if (actor.role !== 'customer') throw new AppError('Acción no permitida.')
  const n = await db.q1<{ n: number }>(`select count(*)::int as n from customer_addresses where user_id = $1`, [actor.id])
  if ((n?.n ?? 0) >= 8) throw new AppError('Puedes guardar un máximo de 8 direcciones.')
  await db.q(`insert into customer_addresses (user_id, label, zone, address_private) values ($1,$2,$3,$4)`, [actor.id, input.label, input.zone, input.address_private])
}

export async function deleteAddress(actor: SessionUser, id: string) {
  await db.q(`delete from customer_addresses where id = $1 and user_id = $2`, [id, actor.id])
}

export async function getCustomerProfile(userId: string) {
  return db.q1<{ preferred_contact: string }>(`select preferred_contact from customer_profiles where user_id = $1`, [userId])
}

export async function updateCustomerProfile(actor: SessionUser, input: { full_name: string; phone: string; preferred_contact: string }) {
  if (actor.role !== 'customer') throw new AppError('Acción no permitida.')
  await tx(async (t) => {
    await t.q(`update users set full_name = $1, phone = $2 where id = $3`, [input.full_name, input.phone, actor.id])
    await t.q(
      `insert into customer_profiles (user_id, preferred_contact) values ($1,$2)
       on conflict (user_id) do update set preferred_contact = excluded.preferred_contact`,
      [actor.id, input.preferred_contact],
    )
  })
}
