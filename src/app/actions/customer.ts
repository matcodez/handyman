'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { AppError, runAction, type ActionState } from '@/lib/errors'
import { rateLimit } from '@/lib/auth/rate-limit'
import { requireUser } from '@/lib/auth/session'
import {
  addressSchema, customerProfileSchema, disputeSchema, messageSchema, parseForm, requestSchema, reviewSchema, uuidSchema, warrantyClaimSchema,
} from '@/lib/validation/schemas'
import { saveImages } from '@/lib/storage'
import { addMessage, cancelRequest, createRequest } from '@/lib/services/requests'
import { acceptQuote } from '@/lib/services/quotes'
import {
  createReview, customerApprove, customerConfirmArrival, customerOpenDispute, customerOpenWarrantyClaim, customerResolveChange,
} from '@/lib/services/orders'
import { addAddress, deleteAddress, updateCustomerProfile } from '@/lib/services/accounts'

function id(formData: FormData, field: string) {
  const r = uuidSchema.safeParse(formData.get(field))
  if (!r.success) throw new AppError('Solicitud inválida.')
  return r.data
}

const refresh = () => revalidatePath('/', 'layout')

export async function createRequestAction(_: ActionState, formData: FormData) {
  return runAction(async () => {
    const user = await requireUser('customer')
    rateLimit(`request:${user.id}`, 10, 60 * 60 * 1000)
    const input = parseForm(requestSchema, formData)
    const photos = await saveImages(formData, 'photos', { min: 1 })
    const requestId = await createRequest(user, input, photos)
    refresh()
    redirect(`/cliente/solicitudes/${requestId}?creada=1`)
  })
}

export async function cancelRequestAction(_: ActionState, formData: FormData) {
  return runAction(async () => {
    const user = await requireUser('customer')
    await cancelRequest(user, id(formData, 'request_id'))
    refresh()
    return { ok: 'Solicitud cancelada.' }
  })
}

/** Preguntas y respuestas: la usan tanto el cliente como el profesional. */
export async function messageAction(_: ActionState, formData: FormData) {
  return runAction(async () => {
    const user = await requireUser()
    rateLimit(`message:${user.id}`, 30, 10 * 60 * 1000)
    const input = parseForm(messageSchema, formData)
    await addMessage(user, input.request_id, input.body)
    refresh()
    return { ok: 'Mensaje enviado.' }
  })
}

export async function acceptQuoteAction(_: ActionState, formData: FormData) {
  return runAction(async () => {
    const user = await requireUser('customer')
    const orderId = await acceptQuote(user, id(formData, 'quote_id'))
    refresh()
    redirect(`/cliente/ordenes/${orderId}?contratada=1`)
  })
}

export async function confirmArrivalAction(_: ActionState, formData: FormData) {
  return runAction(async () => {
    const user = await requireUser('customer')
    const orderId = id(formData, 'order_id')
    await customerConfirmArrival(user, orderId, String(formData.get('token') ?? ''))
    refresh()
    redirect(`/cliente/ordenes/${orderId}?identidad=1`)
  })
}

export async function resolveChangeAction(_: ActionState, formData: FormData) {
  return runAction(async () => {
    const user = await requireUser('customer')
    const approve = formData.get('decision') === 'approve'
    await customerResolveChange(user, id(formData, 'change_id'), approve)
    refresh()
    return { ok: approve ? 'Modificación aprobada. El nuevo precio quedó registrado.' : 'Modificación rechazada.' }
  })
}

export async function approveOrderAction(_: ActionState, formData: FormData) {
  return runAction(async () => {
    const user = await requireUser('customer')
    await customerApprove(user, id(formData, 'order_id'))
    refresh()
    return { ok: 'Trabajo aprobado. Tu garantía escrita ya está activa.' }
  })
}

export async function disputeAction(_: ActionState, formData: FormData) {
  return runAction(async () => {
    const user = await requireUser('customer')
    rateLimit(`upload:${user.id}`, 30, 10 * 60 * 1000)
    const input = parseForm(disputeSchema, formData)
    const photos = await saveImages(formData, 'photos')
    await customerOpenDispute(user, input.order_id, input, photos)
    refresh()
    return { ok: 'Incidencia abierta. Administración revisará tu caso.' }
  })
}

export async function reviewAction(_: ActionState, formData: FormData) {
  return runAction(async () => {
    const user = await requireUser('customer')
    await createReview(user, parseForm(reviewSchema, formData))
    refresh()
    return { ok: '¡Gracias por calificar!' }
  })
}

export async function warrantyClaimAction(_: ActionState, formData: FormData) {
  return runAction(async () => {
    const user = await requireUser('customer')
    rateLimit(`upload:${user.id}`, 30, 10 * 60 * 1000)
    const input = parseForm(warrantyClaimSchema, formData)
    const photos = await saveImages(formData, 'photos')
    await customerOpenWarrantyClaim(user, input.warranty_id, input, photos)
    refresh()
    return { ok: 'Reporte de garantía enviado. Te avisaremos cuando haya una resolución.' }
  })
}

export async function updateCustomerProfileAction(_: ActionState, formData: FormData) {
  return runAction(async () => {
    const user = await requireUser('customer')
    await updateCustomerProfile(user, parseForm(customerProfileSchema, formData))
    refresh()
    return { ok: 'Perfil actualizado.' }
  })
}

export async function addAddressAction(_: ActionState, formData: FormData) {
  return runAction(async () => {
    const user = await requireUser('customer')
    await addAddress(user, parseForm(addressSchema, formData))
    refresh()
    return { ok: 'Dirección guardada.' }
  })
}

export async function deleteAddressAction(_: ActionState, formData: FormData) {
  return runAction(async () => {
    const user = await requireUser('customer')
    await deleteAddress(user, id(formData, 'address_id'))
    refresh()
    return { ok: 'Dirección eliminada.' }
  })
}
