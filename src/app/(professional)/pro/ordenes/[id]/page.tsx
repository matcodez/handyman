import { notFound } from 'next/navigation'
import { requireUser } from '@/lib/auth/session'
import { uuidSchema } from '@/lib/validation/schemas'
import { getOrder, getOrderExtras } from '@/lib/services/orders'
import { OrderDetail } from '@/components/domain/order-detail'

export const metadata = { title: 'Orden' }

export default async function ProOrderPage({ params }: { params: { id: string } }) {
  const user = await requireUser('professional')
  if (!uuidSchema.safeParse(params.id).success) notFound()
  const o = await getOrder(user, params.id)
  if (!o) notFound()
  return <OrderDetail o={o} x={await getOrderExtras(o.id)} viewer="professional" back={{ href: '/pro/ordenes', label: 'Órdenes' }} />
}
