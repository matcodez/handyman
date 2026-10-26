'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { AppError, runAction, type ActionState } from '@/lib/errors'
import { rateLimit } from '@/lib/auth/rate-limit'
import { requireUser } from '@/lib/auth/session'
import { uuidSchema, zoneSchema } from '@/lib/validation/schemas'
import { saveImages } from '@/lib/storage'
import { acceptEmergency, createEmergency, requestEvaluation, setAvailability } from '@/lib/services/urgent'

function id(formData: FormData, field: string) {
  const r = uuidSchema.safeParse(formData.get(field))
  if (!r.success) throw new AppError('Solicitud inválida.')
  return r.data
}

const refresh = () => revalidatePath('/', 'layout')

export async function createEmergencyAction(_: ActionState, formData: FormData) {
  return runAction(async () => {
    const user = await requireUser('customer')
    rateLimit(`urgent:${user.id}`, 5, 60 * 60 * 1000)
    const zone = zoneSchema.safeParse(formData.get('location_label'))
    if (!zone.success) throw new AppError('Selecciona tu zona.')
    const photos = await saveImages(formData, 'photos', { min: 0 })
    const requestId = await createEmergency(user, {
      kind: String(formData.get('kind') ?? ''),
      location_label: zone.data,
      address_private: String(formData.get('address_private') ?? '').slice(0, 300),
      details: String(formData.get('details') ?? '').slice(0, 600),
    }, photos)
    refresh()
    redirect(`/cliente/emergencia/${requestId}`)
  })
}

export async function acceptEmergencyAction(_: ActionState, formData: FormData) {
  return runAction(async () => {
    const user = await requireUser('professional')
    const orderId = await acceptEmergency(user, id(formData, 'request_id'), Number(formData.get('eta')))
    refresh()
    redirect(`/pro/ordenes/${orderId}`)
  })
}

export async function setAvailabilityAction(_: ActionState, formData: FormData) {
  return runAction(async () => {
    const user = await requireUser('professional')
    const on = formData.get('on') === '1'
    await setAvailability(user, on, Number(formData.get('hours') ?? 4))
    refresh()
    return { ok: on ? 'Ahora recibes emergencias cercanas.' : 'Dejaste de recibir emergencias.' }
  })
}

export async function requestEvaluationAction(_: ActionState, formData: FormData) {
  return runAction(async () => {
    const user = await requireUser('customer')
    const convId = await requestEvaluation(user, id(formData, 'request_id'))
    redirect(`/mensajes/${convId}`)
  })
}
