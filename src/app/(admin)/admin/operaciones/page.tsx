import Link from 'next/link'
import { cn } from '@/lib/cn'
import { requireUser } from '@/lib/auth/session'
import { formatDate, formatQ } from '@/lib/format'
import { ORDER, REQUEST } from '@/lib/domain/states'
import { listAllRequests } from '@/lib/services/admin'
import { listOrders } from '@/lib/services/orders'
import { PageHeader } from '@/components/ui/primitives'
import { StatusBadge } from '@/components/domain/visuals'
import { PaymentBadge } from '@/components/domain/cards'

export const metadata = { title: 'Operaciones' }

export default async function AdminOps({ searchParams }: { searchParams: { vista?: string } }) {
  const admin = await requireUser('admin')
  const view = searchParams.vista === 'solicitudes' ? 'solicitudes' : 'ordenes'
  const [requests, orders] = await Promise.all([listAllRequests(), listOrders(admin)])

  return (
    <>
      <PageHeader title="Operaciones" description="Todas las solicitudes, cotizaciones y órdenes de la plataforma." />
      <nav className="mb-5 flex gap-2" aria-label="Vista">
        {[['ordenes', `Órdenes (${orders.length})`], ['solicitudes', `Solicitudes (${requests.length})`]].map(([k, l]) => (
          <Link key={k} href={`/admin/operaciones?vista=${k}`} aria-current={view === k ? 'page' : undefined} className={cn('rounded-full px-4 py-2 font-display text-sm', view === k ? 'bg-navy text-white' : 'bg-white text-ink2 shadow-card')}>{l}</Link>
        ))}
      </nav>
      {view === 'ordenes' ? (
        <div className="table-wrap">
          <table className="table">
            <thead><tr><th>Orden</th><th>Trabajo</th><th>Cliente → Profesional</th><th>Fecha</th><th>Precio</th><th>Estado</th><th>Pago</th></tr></thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o.id}>
                  <td className="font-num"><Link href={`/admin/ordenes/${o.id}`} className="text-brand hover:underline">{o.order_number}</Link></td>
                  <td className="max-w-[220px] truncate">{o.agreed_scope_snapshot.title}</td>
                  <td className="text-ink2">{o.customer_name} → {o.pro_name}</td>
                  <td className="whitespace-nowrap">{formatDate(o.scheduled_at)}</td>
                  <td className="whitespace-nowrap font-num">{formatQ(o.agreed_price)}</td>
                  <td><StatusBadge map={ORDER} status={o.status} /></td>
                  <td><PaymentBadge status={o.payment_status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="table-wrap">
          <table className="table">
            <thead><tr><th>Solicitud</th><th>Categoría</th><th>Cliente</th><th>Zona</th><th>Creada</th><th>Cotizaciones</th><th>Estado</th></tr></thead>
            <tbody>
              {requests.map((r) => (
                <tr key={r.id}>
                  <td className="max-w-[240px] truncate font-medium">{r.title}</td>
                  <td>{r.category_name}</td><td>{r.customer_name}</td><td>{r.location_label}</td>
                  <td className="whitespace-nowrap">{formatDate(r.created_at)}</td>
                  <td className="font-num">{r.quotes_count}</td>
                  <td><StatusBadge map={REQUEST} status={r.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  )
}
