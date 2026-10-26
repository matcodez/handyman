'use server'

import { revalidatePath } from 'next/cache'
import { AppError, runAction, type ActionState } from '@/lib/errors'
import { requireUser } from '@/lib/auth/session'
import { uuidSchema } from '@/lib/validation/schemas'
import { acceptAgreement, assignCase, escalateCase, proposeAgreement, type AgreementOutcome } from '@/lib/services/support'

function id(formData: FormData, field: string) {
  const r = uuidSchema.safeParse(formData.get(field))
  if (!r.success) throw new AppError('Solicitud inválida.')
  return r.data
}

const refresh = () => revalidatePath('/', 'layout')

export async function assignCaseAction(_: ActionState, formData: FormData) {
  return runAction(async () => {
    const admin = await requireUser('admin')
    await assignCase(admin, id(formData, 'case_id'), formData.get('agent_id') === 'me' ? admin.id : id(formData, 'agent_id'))
    refresh()
    return { ok: 'Caso asignado.' }
  })
}

export async function escalateCaseAction(_: ActionState, formData: FormData) {
  return runAction(async () => {
    const admin = await requireUser('admin')
    await escalateCase(admin, id(formData, 'case_id'), String(formData.get('reason') ?? ''))
    refresh()
    return { ok: 'Caso escalado a urgente. Se avisó al equipo.' }
  })
}

export async function proposeAgreementAction(_: ActionState, formData: FormData) {
  return runAction(async () => {
    const admin = await requireUser('admin')
    const outcome = String(formData.get('outcome'))
    if (!['release', 'refund', 'approve_fix', 'resolve'].includes(outcome)) throw new AppError('Elige el resultado del acuerdo.')
    await proposeAgreement(admin, id(formData, 'case_id'), String(formData.get('agreement') ?? ''), outcome as AgreementOutcome)
    refresh()
    return { ok: 'Propuesta enviada a cliente y profesional.' }
  })
}

export async function acceptAgreementAction(_: ActionState, formData: FormData) {
  return runAction(async () => {
    const user = await requireUser()
    const closed = await acceptAgreement(user, id(formData, 'case_id'))
    refresh()
    return { ok: closed ? 'Ambas partes aceptaron: el caso quedó cerrado con este acuerdo.' : 'Aceptaste el acuerdo. Falta la otra parte.' }
  })
}
