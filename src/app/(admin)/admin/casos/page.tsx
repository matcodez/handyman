import Link from 'next/link'
import { AlarmClock, CheckCircle2, Headphones, LifeBuoy, MessageCircle, Timer } from 'lucide-react'
import { requireUser } from '@/lib/auth/session'
import { formatDate } from '@/lib/format'
import { CASE } from '@/lib/domain/states'
import { PRIORITY, relativeTime, SLA_LABEL, slaState } from '@/lib/domain/sla'
import { getSupportQueue, type QueueCase } from '@/lib/services/support'
import { Badge, EmptyState, PageHeader, Stat } from '@/components/ui/primitives'
import { Avatar, StatusBadge } from '@/components/domain/visuals'

export const metadata = { title: 'Centro de soporte' }

export default async function SupportCenter({ searchParams }: { searchParams: { vista?: string } }) {
  const admin = await requireUser('admin')
  const { cases, chats, kpi, agents } = await getSupportQueue()
  const now = new Date()
  const isOpen = (c: QueueCase) => ['open', 'in_review'].includes(c.status)
  const open = cases.filter(isOpen)
  const overdue = open.filter((c) => slaState({ ...c }, now) === 'overdue')
  const view = searchParams.vista === 'mios' ? 'mios' : searchParams.vista === 'cerrados' ? 'cerrados' : 'cola'
  const shown = view === 'mios' ? open.filter((c) => c.agent_id === admin.id) : view === 'cerrados' ? cases.filter((c) => !isOpen(c)) : open

  const row = (c: QueueCase) => {
    const sla = slaState({ ...c, closed: !isOpen(c) }, now)
    const waitingAgreement = c.agreement_text && isOpen(c)
    return (
      <li key={c.id}>
        <Link href={`/admin/casos/${c.id}`} className="card flex flex-wrap items-center gap-3 p-4 transition-shadow hover:shadow-lift sm:p-5">
          <div className="min-w-0 flex-1">
            <p className="flex flex-wrap items-center gap-2 font-display font-semibold">
              <span className="font-num">{c.case_number}</span> · {c.reason}
            </p>
            <p className="truncate text-sm text-ink2">{c.title} · {c.customer_name} → {c.pro_name} · {formatDate(c.created_at)}</p>
            <p className="mt-1.5 flex flex-wrap items-center gap-1.5 text-xs text-ink3">
              <Headphones className="h-3.5 w-3.5" aria-hidden />{c.agent_name ?? 'Sin asignar'}
              {isOpen(c) && !c.first_response_at && c.sla_due_at && <span>· responder {relativeTime(c.sla_due_at, now)}</span>}
              {waitingAgreement && <span>· acuerdo propuesto ({[c.agreement_customer_at && 'cliente ✓', c.agreement_pro_at && 'profesional ✓'].filter(Boolean).join(', ') || 'sin aceptar'})</span>}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            <Badge tone={c.kind === 'dispute' ? 'bad' : 'info'}>{c.kind === 'dispute' ? 'Incidencia' : 'Garantía'}</Badge>
            <Badge tone={PRIORITY[c.priority].tone}>{PRIORITY[c.priority].label}</Badge>
            {isOpen(c) && <Badge tone={SLA_LABEL[sla].tone}>{SLA_LABEL[sla].label}</Badge>}
            <StatusBadge map={CASE} status={c.status} />
          </div>
        </Link>
      </li>
    )
  }

  const tab = (key: string, label: string, n: number) => (
    <Link href={key === 'cola' ? '/admin/casos' : `/admin/casos?vista=${key}`} aria-current={view === key ? 'page' : undefined}
      className={`rounded-xl px-3.5 py-2 font-display text-sm font-medium ${view === key ? 'bg-navy text-white' : 'text-ink2 hover:bg-paper2'}`}>
      {label} <span className="font-num opacity-70">{n}</span>
    </Link>
  )

  return (
    <>
      <PageHeader title="Centro de soporte" description="Cola de casos con agente asignado, tiempo de respuesta comprometido y mediación entre cliente y profesional." />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat icon={LifeBuoy} label="Casos abiertos" value={open.length} tone="info" />
        <Stat icon={AlarmClock} label="Fuera de tiempo" value={overdue.length} tone={overdue.length ? 'bad' : 'ok'} hint="Sin primera respuesta y con el plazo vencido" />
        <Stat icon={Timer} label="Primera respuesta promedio" value={kpi.avg_first_hours ? `${kpi.avg_first_hours} h` : '—'} tone="neutral" hint={kpi.met_pct != null ? `${kpi.met_pct}% dentro del plazo` : undefined} />
        <Stat icon={CheckCircle2} label="Resueltos (7 días)" value={kpi.resolved_7d} tone="ok" />
      </div>

      <section className="mt-6 card card-pad">
        <h2 className="flex items-center gap-2 text-base font-semibold"><Headphones className="h-5 w-5 text-brand" aria-hidden />Equipo de turno</h2>
        <ul className="mt-3 flex flex-wrap gap-3">
          {agents.map((a) => (
            <li key={a.id} className="flex items-center gap-2 rounded-xl bg-paper px-3 py-2">
              <Avatar name={a.full_name} size="sm" />
              <span className="text-sm"><span className="font-medium">{a.full_name}</span>{a.id === admin.id && ' (tú)'}<span className="block text-xs text-ink3">{a.open_cases} caso(s) abiertos</span></span>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-xs text-ink3">Los casos nuevos se asignan automáticamente al agente con menos carga. Tiempos de respuesta: urgente 1 h · alta 4 h · normal 24 h.</p>
      </section>

      <section className="mt-6">
        <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold"><MessageCircle className="h-5 w-5 text-brand" aria-hidden />Consultas esperando respuesta ({chats.length})</h2>
        {chats.length === 0 ? <p className="text-sm text-ink2">Ninguna consulta pendiente.</p> : (
          <ul className="space-y-2">
            {chats.map((c) => (
              <li key={c.id}>
                <Link href={`/mensajes/${c.id}`} className="card flex items-center gap-3 p-3.5 hover:shadow-lift">
                  <Avatar name={c.owner_name} size="sm" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-display text-sm font-semibold">{c.owner_name} <span className="font-normal text-ink3">· {c.owner_role === 'professional' ? 'Profesional' : 'Cliente'} · {c.subject}</span></p>
                    <p className="truncate text-sm text-ink2">{c.last_body}</p>
                  </div>
                  <Badge tone="warn">Espera {relativeTime(c.last_message_at, now).replace('hace ', '')}</Badge>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-8">
        <nav className="mb-3 flex flex-wrap gap-1.5" aria-label="Vistas de casos">
          {tab('cola', 'Cola por atender', open.length)}
          {tab('mios', 'Mis casos', open.filter((c) => c.agent_id === admin.id).length)}
          {tab('cerrados', 'Cerrados', cases.length - open.length)}
        </nav>
        {shown.length === 0
          ? <EmptyState icon={LifeBuoy} title={view === 'cerrados' ? 'Sin casos cerrados' : 'Todo al día'} description="No hay casos en esta vista." />
          : <ul className="space-y-3">{shown.map(row)}</ul>}
      </section>
    </>
  )
}
