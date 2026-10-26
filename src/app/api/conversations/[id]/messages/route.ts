import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { rateLimit } from '@/lib/auth/rate-limit'
import { AppError } from '@/lib/errors'
import { fileUrl, saveFile } from '@/lib/storage'
import { uuidSchema } from '@/lib/validation/schemas'
import { listMessages, markRead, sendMessage } from '@/lib/services/messaging'

/** Las mutaciones solo se aceptan desde el propio sitio (protección CSRF para route handlers). */
function sameOrigin(req: Request) {
  const origin = req.headers.get('origin')
  if (!origin) return false
  const host = req.headers.get('x-forwarded-host') ?? req.headers.get('host')
  try {
    return new URL(origin).host === host
  } catch {
    return false
  }
}

const fail = (e: unknown) => {
  if (e instanceof AppError) return NextResponse.json({ error: e.message }, { status: 400 })
  console.error('[chat]', e)
  return NextResponse.json({ error: 'No se pudo completar la acción.' }, { status: 500 })
}

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const user = await getSession()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  if (!uuidSchema.safeParse(params.id).success) return NextResponse.json({ error: 'No encontrado' }, { status: 404 })
  try {
    const after = new URL(req.url).searchParams.get('after') ?? undefined
    const messages = await listMessages(user, params.id, after && !Number.isNaN(Date.parse(after)) ? after : undefined)
    if (messages.length) await markRead(user, params.id)
    return NextResponse.json({ messages }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (e) {
    return fail(e)
  }
}

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const user = await getSession()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  if (!sameOrigin(req)) return NextResponse.json({ error: 'Origen no permitido' }, { status: 403 })
  if (!uuidSchema.safeParse(params.id).success) return NextResponse.json({ error: 'No encontrado' }, { status: 404 })
  try {
    rateLimit(`chat:${user.id}`, 40, 60 * 1000)
    const form = await req.formData()
    const body = String(form.get('body') ?? '')
    const photo = form.get('photo')
    let attachment: string | null = null
    if (photo instanceof File && photo.size > 0) attachment = fileUrl(await saveFile(photo, 'public'))
    const m = await sendMessage(user, params.id, body, attachment)
    return NextResponse.json({ id: m.id, created_at: m.created_at })
  } catch (e) {
    return fail(e)
  }
}
