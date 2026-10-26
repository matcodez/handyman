'use server'

import { redirect } from 'next/navigation'
import { AppError, runAction, type ActionState } from '@/lib/errors'
import { requireUser } from '@/lib/auth/session'
import { uuidSchema } from '@/lib/validation/schemas'
import { openQuoteConversation, openSupportConversation } from '@/lib/services/messaging'

function optionalId(formData: FormData, field: string) {
  const raw = formData.get(field)
  if (!raw) return undefined
  const r = uuidSchema.safeParse(raw)
  if (!r.success) throw new AppError('Solicitud inválida.')
  return r.data
}

/** Abre (o retoma) el chat entre cliente y profesional sobre una solicitud. */
export async function openQuoteChatAction(_: ActionState, formData: FormData) {
  return runAction(async () => {
    const user = await requireUser()
    const requestId = optionalId(formData, 'request_id')
    if (!requestId) throw new AppError('Solicitud inválida.')
    const id = await openQuoteConversation(user, requestId, optionalId(formData, 'professional_id'))
    redirect(`/mensajes/${id}`)
  })
}

/** "Pregúntale a Handyman": abre la conversación con soporte (general o sobre una orden). */
export async function openSupportChatAction(_: ActionState, formData: FormData) {
  return runAction(async () => {
    const user = await requireUser()
    const subject = String(formData.get('subject') ?? '').trim().slice(0, 120) || undefined
    const id = await openSupportConversation(user, { orderId: optionalId(formData, 'order_id'), subject })
    redirect(`/mensajes/${id}`)
  })
}
