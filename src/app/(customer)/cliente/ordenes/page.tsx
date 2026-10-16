import Link from 'next/link'
import { Briefcase } from 'lucide-react'
import { requireUser } from '@/lib/auth/session'
import { listOrders } from '@/lib/services/orders'
import { EmptyState, PageHeader, Section } from '@/components/ui/primitives'
import { OrderCard } from '@/components/domain/cards'

export const metadata = { title: 'Órdenes' }

export default async function CustomerOrders() {
  const user = await requireUser('customer')
  const orders = await listOrders(user)
  const active = orders.filter((o) => !['completed', 'cancelled'].includes(o.status))
  const past = orders.filter((o) => ['completed', 'cancelled'].includes(o.status))
  return (
    <>
      <PageHeader title="Órdenes" description="Servicios contratados: estado, código QR de identidad, evidencia y garantía." />
      {orders.length === 0 ? (
        <EmptyState icon={Briefcase} title="Aún no contratas ningún servicio" description="Cuando aceptes una cotización, aquí podrás seguir la orden de principio a fin." action={<Link href="/cliente/solicitudes" className="btn-primary">Ver mis solicitudes</Link>} />
      ) : (
        <>
          <Section title={`En curso (${active.length})`} className="mt-0">
            {active.length === 0 ? <p className="text-sm text-ink2">No tienes órdenes en curso.</p> : <div className="space-y-3">{active.map((o) => <OrderCard key={o.id} o={o} viewer="customer" href={`/cliente/ordenes/${o.id}`} />)}</div>}
          </Section>
          <Section title={`Historial (${past.length})`}>
            <div className="space-y-3">{past.map((o) => <OrderCard key={o.id} o={o} viewer="customer" href={`/cliente/ordenes/${o.id}`} />)}</div>
          </Section>
        </>
      )}
    </>
  )
}
