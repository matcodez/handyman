import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Briefcase, FileText, Inbox, Star } from 'lucide-react'
import { requireUser } from '@/lib/auth/session'
import { getProProfile } from '@/lib/services/professionals'
import { listOpenRequestsForPro } from '@/lib/services/requests'
import { listProQuotes } from '@/lib/services/quotes'
import { listOrders } from '@/lib/services/orders'
import { EmptyState, PageHeader, Section, Stat } from '@/components/ui/primitives'
import { OrderCard, QrBadge, RequestCard } from '@/components/domain/cards'
import { Stars, VerificationBadge } from '@/components/domain/visuals'
import { VerificationGate } from './verification-gate'

export const metadata = { title: 'Panel profesional' }

export default async function ProDashboard() {
  const user = await requireUser('professional')
  const pro = await getProProfile(user.id)
  if (!pro) notFound()
  const approved = pro.verification_status === 'approved'
  const [requests, quotes, orders] = await Promise.all([
    approved ? listOpenRequestsForPro(user.id) : Promise.resolve([]), listProQuotes(user.id), listOrders(user),
  ])
  const fresh = requests.filter((r) => !r.my_quote_id)
  const pendingQuotes = quotes.filter((q) => q.status === 'sent')
  const active = orders.filter((o) => ['scheduled', 'en_route', 'arrived', 'in_progress', 'pending_approval', 'disputed'].includes(o.status))

  return (
    <>
      <PageHeader title={`Hola, ${user.full_name.split(' ')[0]}`} description={<span className="flex flex-wrap items-center gap-2"><VerificationBadge status={pro.verification_status} /><Stars value={pro.rating_average} count={pro.reviews_count} /></span>} action={<Link href={`/profesionales/${user.id}`} className="btn-secondary">Ver mi perfil público</Link>} />
      <div className="mb-6"><VerificationGate status={pro.verification_status} note={pro.verification_note} /></div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat icon={Inbox} label="Solicitudes nuevas" value={fresh.length} tone="warn" href="/pro/solicitudes" />
        <Stat icon={FileText} label="Cotizaciones pendientes" value={pendingQuotes.length} href="/pro/cotizaciones" />
        <Stat icon={Briefcase} label="Trabajos activos" value={active.length} href="/pro/ordenes" />
        <Stat icon={Star} label="Trabajos completados" value={pro.completed_jobs_count} tone="ok" href="/pro/historial" />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_260px]">
        <div className="min-w-0">
          <Section title="Próximos servicios" action={<Link href="/pro/ordenes" className="text-sm font-medium text-brand hover:underline">Ver todas</Link>}>
            {active.length === 0 ? (
              <EmptyState icon={Briefcase} title="Sin trabajos activos" description="Cuando un cliente acepte tu cotización, la orden aparecerá aquí." />
            ) : (
              <div className="space-y-3">{active.slice(0, 4).map((o) => <OrderCard key={o.id} o={o} viewer="professional" href={`/pro/ordenes/${o.id}`} />)}</div>
            )}
          </Section>
          {approved && (
            <Section title="Solicitudes compatibles por cotizar" action={<Link href="/pro/solicitudes" className="text-sm font-medium text-brand hover:underline">Ver todas</Link>}>
              {fresh.length === 0 ? (
                <EmptyState icon={Inbox} title="No hay solicitudes nuevas" description="Te avisaremos cuando un cliente publique un trabajo de tus oficios en tu zona." />
              ) : (
                <div className="space-y-3">{fresh.slice(0, 4).map((r) => <RequestCard key={r.id} r={r} href={`/pro/solicitudes/${r.id}`} />)}</div>
              )}
            </Section>
          )}
        </div>
        {approved && (
          <Section title="Tu carné digital">
            <QrBadge token={pro.qr_token} name={pro.public_name} />
          </Section>
        )}
      </div>
    </>
  )
}
