import { notFound } from 'next/navigation'
import { History } from 'lucide-react'
import { requireUser } from '@/lib/auth/session'
import { formatDate, formatQ } from '@/lib/format'
import { WARRANTY } from '@/lib/domain/states'
import { getProProfile, listReviews } from '@/lib/services/professionals'
import { listOrders, listWarranties } from '@/lib/services/orders'
import { EmptyState, PageHeader, Section, Stat } from '@/components/ui/primitives'
import { OrderCard } from '@/components/domain/cards'
import { Stars, StatusBadge } from '@/components/domain/visuals'
import { ShieldCheck, Star, Briefcase } from 'lucide-react'

export const metadata = { title: 'Historial y reseñas' }

export default async function ProHistory() {
  const user = await requireUser('professional')
  const pro = await getProProfile(user.id)
  if (!pro) notFound()
  const [orders, reviews, warranties] = await Promise.all([listOrders(user), listReviews(user.id), listWarranties(user)])
  const done = orders.filter((o) => o.status === 'completed')
  const avg = (k: 'punctuality_score' | 'communication_score' | 'cleanliness_score') => reviews.length ? (reviews.reduce((a, r) => a + r[k], 0) / reviews.length).toFixed(1) : '—'

  return (
    <>
      <PageHeader title="Historial y reseñas" description="Tu reputación se construye con órdenes reales completadas en la plataforma." />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat icon={Briefcase} label="Trabajos completados" value={done.length} tone="ok" />
        <Stat icon={Star} label="Calificación promedio" value={Number(pro.rating_average) ? Number(pro.rating_average).toFixed(1) : '—'} hint={`${pro.reviews_count} reseñas`} tone="warn" />
        <Stat icon={ShieldCheck} label="Garantías vigentes" value={warranties.filter((w) => w.status === 'active').length} />
        <Stat icon={History} label="Ingresos aprobados (demo)" value={formatQ((done.reduce((a, o) => a + Math.round(Number(o.agreed_price) * 100), 0) / 100).toFixed(2))} hint="Montos simulados" />
      </div>

      <Section title="Reseñas recibidas">
        {reviews.length === 0 ? (
          <EmptyState icon={Star} title="Aún no tienes reseñas" description="Los clientes pueden calificarte después de aprobar un trabajo." />
        ) : (
          <>
            <div className="card card-pad mb-3 grid grid-cols-3 text-center">
              <div><p className="font-num text-2xl font-semibold">{avg('punctuality_score')}</p><p className="text-xs text-ink3">Puntualidad</p></div>
              <div><p className="font-num text-2xl font-semibold">{avg('communication_score')}</p><p className="text-xs text-ink3">Comunicación</p></div>
              <div><p className="font-num text-2xl font-semibold">{avg('cleanliness_score')}</p><p className="text-xs text-ink3">Limpieza</p></div>
            </div>
            <ul className="card divide-y divide-line">
              {reviews.map((r) => (
                <li key={r.id} className="px-5 py-4">
                  <div className="flex flex-wrap items-center justify-between gap-2"><p className="font-display text-sm font-medium">{r.reviewer_first_name} · {r.category_name}</p><Stars value={(r.punctuality_score + r.communication_score + r.cleanliness_score) / 3} /></div>
                  {r.comment && <p className="mt-1 text-sm text-ink2">{r.comment}</p>}
                  <p className="mt-1 text-xs text-ink3">{formatDate(r.created_at)}</p>
                </li>
              ))}
            </ul>
          </>
        )}
      </Section>

      <Section title="Garantías relacionadas">
        {warranties.length === 0 ? <p className="text-sm text-ink2">Sin garantías emitidas.</p> : (
          <div className="table-wrap">
            <table className="table">
              <thead><tr><th>Orden</th><th>Trabajo</th><th>Cliente</th><th>Vence</th><th>Estado</th></tr></thead>
              <tbody>
                {warranties.map((w) => (
                  <tr key={w.id}><td className="font-num">{w.order_number}</td><td>{w.title}</td><td>{w.customer_name.split(' ')[0]}</td><td>{formatDate(w.expires_at)}</td><td><StatusBadge map={WARRANTY} status={w.status} /></td></tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Section>

      <Section title="Trabajos completados">
        <div className="space-y-3">{done.map((o) => <OrderCard key={o.id} o={o} viewer="professional" href={`/pro/ordenes/${o.id}`} />)}</div>
      </Section>
    </>
  )
}
