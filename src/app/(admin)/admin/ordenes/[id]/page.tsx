import { notFound } from 'next/navigation'
import { requireUser } from '@/lib/auth/session'
import { uuidSchema } from '@/lib/validation/schemas'
import { getOrder, getOrderExtras } from '@/lib/services/orders'
import { OrderDetail } from '@/components/domain/order-detail'

export const metadata = { title: 'Orden' }

export default async function AdminOrderPage({ params }: { params: { id: string } }) {
  const admin = await requireUser('admin')
  if (!uuidSchema.safeParse(params.id).success) notFound()
  const o = await getOrder(admin, params.id)
  if (!o) notFound()
  return <OrderDetail o={o} x={await getOrderExtras(o.id)} viewer="admin" back={{ href: '/admin/operaciones', label: 'Operaciones' }} />
}
