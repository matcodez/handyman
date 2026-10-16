'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { AppError, runAction, type ActionState } from '@/lib/errors'
import { rateLimit } from '@/lib/auth/rate-limit'
import { requireUser } from '@/lib/auth/session'
import { DOCUMENT_TYPES } from '@/lib/domain/states'
import { changeSchema, parseForm, portfolioSchema, proProfileSchema, quoteSchema, uuidSchema } from '@/lib/validation/schemas'
import { fileUrl, saveFile, saveImages } from '@/lib/storage'
import { createQuote, withdrawQuote } from '@/lib/services/quotes'
import { proMarkArrival, proRequestChange, proSetEnRoute, proStartWork, proSubmitCompletion } from '@/lib/services/orders'
import {
  addDocument, addPortfolioItem, deleteDocument, deletePortfolioItem, submitForVerification, updateProProfile,
} from '@/lib/services/professionals'

function id(formData: FormData, field: string) {
  const r = uuidSchema.safeParse(formData.get(field))
  if (!r.success) throw new AppError('Solicitud inválida.')
  return r.data
}

const refresh = () => revalidatePath('/', 'layout')

export async function createQuoteAction(_: ActionState, formData: FormData) {
  return runAction(async () => {
    const user = await requireUser('professional')
    rateLimit(`quote:${user.id}`, 20, 60 * 60 * 1000)
    const input = parseForm(quoteSchema, formData)
    await createQuote(user, input)
    refresh()
    redirect(`/pro/solicitudes/${input.request_id}?enviada=1`)
  })
}

export async function withdrawQuoteAction(_: ActionState, formData: FormData) {
  return runAction(async () => {
    const user = await requireUser('professional')
    await withdrawQuote(user, id(formData, 'quote_id'))
    refresh()
    return { ok: 'Cotización retirada.' }
  })
}

export async function orderStepAction(_: ActionState, formData: FormData) {
  return runAction(async () => {
    const user = await requireUser('professional')
    const orderId = id(formData, 'order_id')
    const step = formData.get('step')
    if (step === 'en_route') await proSetEnRoute(user, orderId)
    else if (step === 'arrival') await proMarkArrival(user, orderId)
    else if (step === 'start') await proStartWork(user, orderId)
    else throw new AppError('Acción no válida.')
    refresh()
    return { ok: step === 'en_route' ? 'El cliente fue notificado de que vas en camino.' : step === 'arrival' ? 'Llegada registrada. Muestra tu QR al cliente.' : 'Trabajo iniciado.' }
  })
}

export async function completeOrderAction(_: ActionState, formData: FormData) {
  return runAction(async () => {
    const user = await requireUser('professional')
    rateLimit(`upload:${user.id}`, 30, 10 * 60 * 1000)
    const orderId = id(formData, 'order_id')
    const photos = await saveImages(formData, 'photos', { min: 1 })
    await proSubmitCompletion(user, orderId, photos, String(formData.get('caption') ?? '').trim().slice(0, 200))
    refresh()
    return { ok: 'Evidencia enviada. El cliente debe aprobar el trabajo.' }
  })
}

export async function requestChangeAction(_: ActionState, formData: FormData) {
  return runAction(async () => {
    const user = await requireUser('professional')
    const input = parseForm(changeSchema, formData)
    await proRequestChange(user, input.order_id, input.description, input.new_price)
    refresh()
    return { ok: 'Modificación enviada al cliente para su aprobación.' }
  })
}

export async function updateProProfileAction(_: ActionState, formData: FormData) {
  return runAction(async () => {
    const user = await requireUser('professional')
    const input = parseForm(proProfileSchema, formData)
    const zones = formData.getAll('zones').map(String)
    const categories = formData.getAll('categories').map(String).filter((c) => uuidSchema.safeParse(c).success)
    const avatar = formData.get('avatar')
    let avatarUrl: string | null = null
    if (avatar instanceof File && avatar.size > 0) {
      rateLimit(`upload:${user.id}`, 30, 10 * 60 * 1000)
      avatarUrl = fileUrl(await saveFile(avatar, 'public'))
    }
    await updateProProfile(user, input, zones, categories, avatarUrl)
    refresh()
    return { ok: 'Perfil actualizado.' }
  })
}

export async function addPortfolioAction(_: ActionState, formData: FormData) {
  return runAction(async () => {
    const user = await requireUser('professional')
    rateLimit(`upload:${user.id}`, 30, 10 * 60 * 1000)
    const input = parseForm(portfolioSchema, formData)
    const photos = await saveImages(formData, 'photos', { min: 1 })
    await addPortfolioItem(user, input, photos)
    refresh()
    return { ok: 'Trabajo agregado a tu galería.' }
  })
}

export async function deletePortfolioAction(_: ActionState, formData: FormData) {
  return runAction(async () => {
    const user = await requireUser('professional')
    await deletePortfolioItem(user, id(formData, 'item_id'))
    refresh()
    return { ok: 'Trabajo eliminado de tu galería.' }
  })
}

export async function uploadDocumentAction(_: ActionState, formData: FormData) {
  return runAction(async () => {
    const user = await requireUser('professional')
    rateLimit(`upload:${user.id}`, 30, 10 * 60 * 1000)
    const type = String(formData.get('document_type') ?? '')
    if (!DOCUMENT_TYPES.some((d) => d.value === type)) throw new AppError('Selecciona el tipo de documento.')
    const file = formData.get('file')
    if (!(file instanceof File) || file.size === 0) throw new AppError('Selecciona un archivo.')
    // Los documentos de identidad van al almacenamiento privado.
    const storagePath = await saveFile(file, 'private', { allowPdf: true })
    await addDocument(user, type, storagePath, file.name)
    refresh()
    return { ok: 'Documento cargado.' }
  })
}

export async function deleteDocumentAction(_: ActionState, formData: FormData) {
  return runAction(async () => {
    const user = await requireUser('professional')
    await deleteDocument(user, id(formData, 'document_id'))
    refresh()
    return { ok: 'Documento eliminado.' }
  })
}

export async function submitVerificationAction(_: ActionState, _fd: FormData) {
  return runAction(async () => {
    const user = await requireUser('professional')
    await submitForVerification(user)
    refresh()
    return { ok: 'Expediente enviado. Administración lo revisará.' }
  })
}
