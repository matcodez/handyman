import { Briefcase } from 'lucide-react'
import { requireUser } from '@/lib/auth/session'
import { listOrders } from '@/lib/services/orders'
import { EmptyState, PageHeader, Section } from '@/components/ui/primitives'
import { OrderCard } from '@/components/domain/cards'

export const metadata = { title: 'Órdenes' }

export default async function ProOrders() {
  const user = await requireUser('professional')
  const orders = await listOrders(user)
  const active = orders.filter((o) => !['completed', 'cancelled'].includes(o.status))
  const past = orders.filter((o) => ['completed', 'cancelled'].includes(o.status))
  return (
    <>
      <PageHeader title="Órdenes" description="Agenda, llegada con QR, evidencia final y estado de cada trabajo asignado." />
      {orders.length === 0 ? (
        <EmptyState icon={Briefcase} title="Sin órdenes todavía" description="Cuando un cliente acepte tu cotización, la orden aparecerá aquí." />
      ) : (
        <>
          <Section title={`Activas (${active.length})`} className="mt-0">
            {active.length === 0 ? <p className="text-sm text-ink2">No tienes trabajos activos.</p> : <div className="space-y-3">{active.map((o) => <OrderCard key={o.id} o={o} viewer="professional" href={`/pro/ordenes/${o.id}`} />)}</div>}
          </Section>
          <Section title={`Historial (${past.length})`}>
            <div className="space-y-3">{past.map((o) => <OrderCard key={o.id} o={o} viewer="professional" href={`/pro/ordenes/${o.id}`} />)}</div>
          </Section>
        </>
      )}
    </>
  )
}
