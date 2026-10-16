'use server'

import { revalidatePath } from 'next/cache'
import { AppError, runAction, type ActionState } from '@/lib/errors'
import { requireUser } from '@/lib/auth/session'
import type { VerificationStatus } from '@/lib/domain/states'
import { categorySchema, parseForm, uuidSchema } from '@/lib/validation/schemas'
import { decideVerification, resolveCase, saveCategory, setUserStatus, toggleCategory, type CaseAction } from '@/lib/services/admin'

function id(formData: FormData, field: string) {
  const r = uuidSchema.safeParse(formData.get(field))
  if (!r.success) throw new AppError('Solicitud inválida.')
  return r.data
}

const refresh = () => revalidatePath('/', 'layout')

export async function decideVerificationAction(_: ActionState, formData: FormData) {
  return runAction(async () => {
    const admin = await requireUser('admin')
    const decision = String(formData.get('decision'))
    if (!['in_review', 'approved', 'rejected', 'suspended'].includes(decision)) throw new AppError('Decisión no válida.')
    await decideVerification(admin, id(formData, 'professional_id'), decision as VerificationStatus, String(formData.get('reason') ?? ''))
    refresh()
    return { ok: 'Decisión registrada en la auditoría.' }
  })
}

export async function saveCategoryAction(_: ActionState, formData: FormData) {
  return runAction(async () => {
    const admin = await requireUser('admin')
    const raw = formData.get('category_id')
    await saveCategory(admin, raw ? id(formData, 'category_id') : null, parseForm(categorySchema, formData))
    refresh()
    return { ok: raw ? 'Categoría actualizada.' : 'Categoría creada.' }
  })
}

export async function toggleCategoryAction(_: ActionState, formData: FormData) {
  return runAction(async () => {
    const admin = await requireUser('admin')
    await toggleCategory(admin, id(formData, 'category_id'))
    refresh()
    return { ok: 'Estado de la categoría actualizado.' }
  })
}

export async function resolveCaseAction(_: ActionState, formData: FormData) {
  return runAction(async () => {
    const admin = await requireUser('admin')
    const action = String(formData.get('case_action'))
    if (!['review', 'release', 'refund', 'approve_fix', 'resolve', 'reject'].includes(action)) throw new AppError('Acción no válida.')
    await resolveCase(admin, id(formData, 'case_id'), action as CaseAction, String(formData.get('resolution') ?? ''))
    refresh()
    return { ok: 'Caso actualizado y registrado en la auditoría.' }
  })
}

export async function setUserStatusAction(_: ActionState, formData: FormData) {
  return runAction(async () => {
    const admin = await requireUser('admin')
    const status = formData.get('status') === 'suspended' ? 'suspended' : 'active'
    await setUserStatus(admin, id(formData, 'user_id'), status)
    refresh()
    return { ok: status === 'suspended' ? 'Cuenta suspendida.' : 'Cuenta reactivada.' }
  })
}
