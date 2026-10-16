import Link from 'next/link'
import { Briefcase, CircleCheck, ClipboardList, Clock, FileText, LifeBuoy, Star, UserCheck } from 'lucide-react'
import { getMetrics, listAudit } from '@/lib/services/admin'
import { REQUEST } from '@/lib/domain/states'
import { timeAgo } from '@/lib/format'
import { DemoBadge, PageHeader, Section, Stat } from '@/components/ui/primitives'

export const metadata = { title: 'Panel de operaciones' }

const pct = (a: number, b: number) => (b ? `${Math.round((a / b) * 100)}%` : '—')

export default async function AdminDashboard() {
  const [{ counts: c, byStatus, byCategory, rating }, audit] = await Promise.all([getMetrics(), listAudit(8)])
  const maxCat = Math.max(1, ...byCategory.map((x) => x.n))
  const totalReq = byStatus.reduce((a, s) => a + s.n, 0) || 1

  return (
    <>
      <PageHeader title="Panel de operaciones" description={<span className="flex flex-wrap items-center gap-2">Indicadores del MVP calculados en vivo sobre la base de datos. <DemoBadge>Datos de demostración</DemoBadge></span>} />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat icon={UserCheck} label="Profesionales por verificar" value={c.pros_pending} tone="warn" href="/admin/profesionales" />
        <Stat icon={LifeBuoy} label="Casos abiertos" value={c.cases_open} tone="bad" href="/admin/casos" />
        <Stat icon={FileText} label="Cotizaciones pendientes" value={c.quotes_pending} href="/admin/operaciones" />
        <Stat icon={CircleCheck} label="Profesionales verificados" value={c.pros_approved} tone="ok" />
      </div>

      <Section title="Indicadores del embudo">
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
          <Stat icon={ClipboardList} label="Solicitudes creadas" value={c.requests} />
          <Stat icon={FileText} label="Tasa de cotización" value={pct(c.requests_with_quotes, c.requests)} hint="Solicitudes con al menos 1 cotización" />
          <Stat icon={Briefcase} label="Conversión a contratación" value={pct(c.hired, c.requests_with_quotes)} hint="Contratadas / con cotizaciones" />
          <Stat icon={Clock} label="Tiempo a primera cotización" value={c.hours_first_quote ? `${c.hours_first_quote} h` : '—'} hint="Promedio" />
          <Stat icon={CircleCheck} label="Tasa de finalización" value={pct(c.completed, c.orders)} hint={`${c.completed} de ${c.orders} órdenes`} tone="ok" />
          <Stat icon={LifeBuoy} label="Incidencias por orden completada" value={c.completed ? (c.cases_total / c.completed).toFixed(2) : '—'} tone="bad" />
        </div>
      </Section>

      <div className="grid gap-6 lg:grid-cols-2">
        <Section title="Solicitudes por estado">
          <div className="card card-pad space-y-3">
            {byStatus.map((s) => (
              <div key={s.status}>
                <div className="flex justify-between text-sm"><span>{REQUEST[s.status].label}</span><span className="font-num font-medium">{s.n}</span></div>
                <div className="mt-1 h-2 rounded-full bg-paper2"><div className="h-2 rounded-full bg-brand" style={{ width: `${(s.n / totalReq) * 100}%` }} /></div>
              </div>
            ))}
          </div>
        </Section>
        <Section title="Categorías más solicitadas">
          <div className="card card-pad space-y-3">
            {byCategory.map((x) => (
              <div key={x.name}>
                <div className="flex justify-between text-sm"><span>{x.name}</span><span className="font-num font-medium">{x.n}</span></div>
                <div className="mt-1 h-2 rounded-full bg-paper2"><div className="h-2 rounded-full bg-accent" style={{ width: `${(x.n / maxCat) * 100}%` }} /></div>
              </div>
            ))}
          </div>
        </Section>
      </div>

      <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
        <Section title="Satisfacción">
          <div className="card card-pad text-center">
            <Star className="mx-auto h-8 w-8 fill-accent text-accent" aria-hidden />
            <p className="mt-2 font-num text-4xl font-semibold">{rating.avg ?? '—'}</p>
            <p className="text-sm text-ink2">promedio de {rating.n} reseñas</p>
          </div>
        </Section>
        <Section title="Actividad reciente" action={<Link href="/admin/auditoria" className="text-sm font-medium text-brand hover:underline">Ver auditoría</Link>}>
          <ul className="card divide-y divide-line">
            {audit.map((a) => (
              <li key={a.id} className="flex items-center justify-between gap-3 px-5 py-3 text-sm">
                <span className="min-w-0 truncate"><span className="font-display font-medium">{a.actor_name ?? 'Sistema'}</span> <span className="font-num text-ink3">{a.action}</span></span>
                <span className="shrink-0 text-xs text-ink3">{timeAgo(a.created_at)}</span>
              </li>
            ))}
          </ul>
        </Section>
      </div>
    </>
  )
}
