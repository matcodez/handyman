import 'server-only'
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { cache } from 'react'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { SignJWT, jwtVerify } from 'jose'
import { db, dataDir, databaseUrl } from '@/lib/db/client'
import type { Role } from '@/lib/domain/states'

/**
 * Sesiones — implementación demo.
 * Cookie httpOnly firmada (JWT HS256) que solo contiene el id de usuario; el rol y el
 * estado se leen de la base en cada request, de modo que nadie puede elevar su propio rol.
 * En producción este módulo se reemplaza por Supabase Auth manteniendo `getSession/requireUser`.
 */
const COOKIE = 'hm_session'
const MAX_AGE = 60 * 60 * 24 * 7

export interface SessionUser {
  id: string
  role: Role
  full_name: string
  email: string
  phone: string | null
  avatar_url: string | null
}

function secret() {
  let s = process.env.AUTH_SECRET
  if (!s && databaseUrl()) {
    // Serverless (varias instancias, sin disco compartido): secreto estable derivado de la
    // cadena de conexión, que ya es secreta. Definir AUTH_SECRET sigue siendo lo recomendado.
    s = crypto.createHash('sha256').update(`handyman-session:${databaseUrl()}`).digest('hex')
  }
  if (!s) {
    const file = path.join(dataDir(), 'auth-secret')
    if (fs.existsSync(file)) s = fs.readFileSync(file, 'utf8')
    else {
      s = crypto.randomBytes(48).toString('hex')
      fs.mkdirSync(dataDir(), { recursive: true })
      fs.writeFileSync(file, s, { mode: 0o600 })
    }
  }
  return new TextEncoder().encode(s)
}

export async function createSession(userId: string) {
  const token = await new SignJWT({})
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(userId)
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE}s`)
    .sign(secret())
  cookies().set(COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production' && process.env.HANDYMAN_INSECURE_COOKIE !== '1',
    path: '/',
    maxAge: MAX_AGE,
  })
}

export function destroySession() {
  cookies().delete(COOKIE)
}

export const getSession = cache(async (): Promise<SessionUser | null> => {
  const token = cookies().get(COOKIE)?.value
  if (!token) return null
  try {
    const { payload } = await jwtVerify(token, secret())
    if (!payload.sub) return null
    const user = await db.q1<SessionUser & { status: string }>(
      `select id, role, full_name, email, phone, avatar_url, status from users where id = $1`,
      [payload.sub],
    )
    if (!user || user.status !== 'active') return null
    return user
  } catch {
    return null
  }
})

export function homeFor(role: Role) {
  return role === 'admin' ? '/admin' : role === 'professional' ? '/pro' : '/cliente'
}

/** Exige sesión (y opcionalmente un rol). Redirige si no se cumple. */
export async function requireUser(role?: Role): Promise<SessionUser> {
  const user = await getSession()
  if (!user) redirect('/login')
  if (role && user.role !== role) redirect(homeFor(user.role))
  return user
}
