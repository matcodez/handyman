import { notFound } from 'next/navigation'
import { BadgeCheck, PartyPopper } from 'lucide-react'
import { requireUser } from '@/lib/auth/session'
import { uuidSchema } from '@/lib/validation/schemas'
import { getOrder, getOrderExtras } from '@/lib/services/orders'
import { Notice } from '@/components/ui/primitives'
import { OrderDetail } from '@/components/domain/order-detail'

export const metadata = { title: 'Orden' }

export default async function CustomerOrderPage({ params, searchParams }: { params: { id: string }; searchParams: { contratada?: string; identidad?: string } }) {
  const user = await requireUser('customer')
  if (!uuidSchema.safeParse(params.id).success) notFound()
  const o = await getOrder(user, params.id)
  if (!o) notFound()
  const x = await getOrderExtras(o.id)
  const banner = searchParams.contratada ? (
    <Notice tone="ok" icon={PartyPopper} title="¡Contrataste el servicio!">La orden quedó creada con el precio y alcance acordados. El pago aparece como “Retenido en demo” (simulado).</Notice>
  ) : searchParams.identidad ? (
    <Notice tone="ok" icon={BadgeCheck} title="Identidad confirmada">Registramos la confirmación. El profesional ya puede iniciar el trabajo.</Notice>
  ) : undefined
  return <OrderDetail o={o} x={x} viewer="customer" back={{ href: '/cliente/ordenes', label: 'Órdenes' }} banner={banner} />
}
