import { notFound, redirect } from 'next/navigation'
import { requireUser } from '@/lib/auth/session'
import { tx } from '@/lib/db/client'
import { uuidSchema } from '@/lib/validation/schemas'
import { getOrder } from '@/lib/services/orders'
import { ensureOrderConversation } from '@/lib/services/messaging'

/** Abre el chat de una orden (lo crea si la orden es anterior a la mensajería). */
export default async function OrderChatRedirect({ params }: { params: { orderId: string } }) {
  const user = await requireUser()
  if (!uuidSchema.safeParse(params.orderId).success) notFound()
  const o = await getOrder(user, params.orderId)
  if (!o) notFound()
  const id = await tx((t) => ensureOrderConversation(t, o.id))
  redirect(`/mensajes/${id}`)
}
