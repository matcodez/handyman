'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { runAction, type ActionState } from '@/lib/errors'
import { clientIp, rateLimit } from '@/lib/auth/rate-limit'
import { createSession, destroySession, homeFor, requireUser } from '@/lib/auth/session'
import { loginSchema, parseForm, registerSchema } from '@/lib/validation/schemas'
import { registerUser, verifyCredentials } from '@/lib/services/accounts'
import { markAllRead } from '@/lib/services/core'

export async function loginAction(_: ActionState, formData: FormData) {
  return runAction(async () => {
    rateLimit(`login:${clientIp()}`, 10, 5 * 60 * 1000)
    const input = parseForm(loginSchema, formData)
    const user = await verifyCredentials(input.email, input.password)
    await createSession(user.id)
    redirect(homeFor(user.role))
  })
}

export async function registerAction(_: ActionState, formData: FormData) {
  return runAction(async () => {
    rateLimit(`register:${clientIp()}`, 6, 10 * 60 * 1000)
    const input = parseForm(registerSchema, formData)
    const id = await registerUser(input)
    await createSession(id)
    redirect(input.role === 'professional' ? '/pro/perfil?bienvenida=1' : '/cliente?bienvenida=1')
  })
}

export async function logoutAction() {
  destroySession()
  redirect('/')
}

export async function markNotificationsReadAction(_: ActionState, _fd: FormData) {
  return runAction(async () => {
    const user = await requireUser()
    await markAllRead(user.id)
    revalidatePath('/', 'layout')
    return { ok: 'Notificaciones marcadas como leídas.' }
  })
}
