import Link from 'next/link'
import { Briefcase, CalendarPlus, ChevronRight, ClipboardList, FileText, ShieldCheck, Siren, Sparkles, TriangleAlert } from 'lucide-react'
import { requireUser } from '@/lib/auth/session'
import { listCustomerRequests } from '@/lib/services/requests'
import { listOrders, listWarranties } from '@/lib/services/orders'
import { listCategories } from '@/lib/services/catalog'
import { EmptyState, Notice, PageHeader, Section, Stat } from '@/components/ui/primitives'
import { OrderCard, RequestCard } from '@/components/domain/cards'
import { CategoryIcon } from '@/components/domain/visuals'

export const metadata = { title: 'Mi panel' }

export default async function CustomerDashboard({ searchParams }: { searchParams: { bienvenida?: string } }) {
  const user = await requireUser('customer')
  const [requests, orders, warranties, categories] = await Promise.all([
    listCustomerRequests(user.id), listOrders(user), listWarranties(user), listCategories(),
  ])
  const openReqs = requests.filter((r) => ['open', 'quoting'].includes(r.status))
  const newQuotes = openReqs.reduce((a, r) => a + r.quotes_count, 0)
  const toApprove = orders.filter((o) => o.status === 'pending_approval')
  const upcoming = orders.filter((o) => ['scheduled', 'en_route', 'arrived', 'in_progress', 'disputed'].includes(o.status))
  const activeW = warranties.filter((w) => ['active', 'reported', 'in_review', 'approved_fix'].includes(w.status))

  return (
    <>
      <PageHeader
        title={`Hola, ${user.full_name.split(' ')[0]}`}
        description="¿Qué necesitas hoy?"
      />
      <div className="mb-6 grid gap-3 sm:grid-cols-2">
        <Link href="/cliente/emergencia" className="group flex min-h-[124px] items-center gap-4 rounded-3xl bg-bad p-5 text-white shadow-lift transition-transform hover:-translate-y-0.5">
          <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white/15"><Siren className="h-8 w-8" aria-hidden /></span>
          <span className="min-w-0 flex-1"><span className="block font-display text-2xl font-bold">Emergencia</span><span className="block text-white/90">Fuga, corto, cerradura… ayuda ahora mismo</span></span>
          <ChevronRight className="h-6 w-6 shrink-0" aria-hidden />
        </Link>
        <Link href="/cliente/solicitudes/nueva" className="group flex min-h-[124px] items-center gap-4 rounded-3xl bg-navy p-5 text-white shadow-lift transition-transform hover:-translate-y-0.5">
          <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white/10 text-accent"><CalendarPlus className="h-8 w-8" aria-hidden /></span>
          <span className="min-w-0 flex-1"><span className="block font-display text-2xl font-bold">Planificar un trabajo</span><span className="block text-white/80">Recibe cotizaciones y elige con calma</span></span>
          <ChevronRight className="h-6 w-6 shrink-0" aria-hidden />
        </Link>
      </div>
      {searchParams.bienvenida && (
        <div className="mb-6"><Notice tone="ok" icon={Sparkles} title="¡Tu cuenta está lista!">Publica tu primera solicitud y empieza a recibir cotizaciones de profesionales verificados.</Notice></div>
      )}
      {toApprove.map((o) => (
        <div key={o.id} className="mb-3">
          <Notice tone="warn" icon={TriangleAlert} title="Tienes un trabajo pendiente de aprobar">
            {o.pro_name} terminó “{o.agreed_scope_snapshot.title}”. <Link href={`/cliente/ordenes/${o.id}`} className="font-semibold underline">Revisar evidencia y aprobar</Link>
          </Notice>
        </div>
      ))}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat icon={ClipboardList} label="Solicitudes activas" value={openReqs.length} href="/cliente/solicitudes" />
        <Stat icon={FileText} label="Cotizaciones recibidas" value={newQuotes} tone="warn" href="/cliente/solicitudes" />
        <Stat icon={Briefcase} label="Servicios en curso" value={upcoming.length} href="/cliente/ordenes" />
        <Stat icon={ShieldCheck} label="Garantías vigentes" value={activeW.length} tone="ok" href="/cliente/garantias" />
      </div>

      <Section title="Próximos servicios" action={<Link href="/cliente/ordenes" className="text-sm font-medium text-brand hover:underline">Ver todas</Link>}>
        {upcoming.length + toApprove.length === 0 ? (
          <EmptyState icon={Briefcase} title="No tienes servicios programados" description="Cuando aceptes una cotización, la orden aparecerá aquí con su fecha y estado." />
        ) : (
          <div className="space-y-3">{[...toApprove, ...upcoming].slice(0, 4).map((o) => <OrderCard key={o.id} o={o} viewer="customer" href={`/cliente/ordenes/${o.id}`} />)}</div>
        )}
      </Section>

      <Section title="Solicitudes recibiendo cotizaciones" action={<Link href="/cliente/solicitudes" className="text-sm font-medium text-brand hover:underline">Ver todas</Link>}>
        {openReqs.length === 0 ? (
          <EmptyState icon={ClipboardList} title="No tienes solicitudes abiertas" description="Describe lo que necesitas y profesionales verificados de tu zona te enviarán su cotización." action={<Link href="/cliente/solicitudes/nueva" className="btn-primary">Crear solicitud</Link>} />
        ) : (
          <div className="space-y-3">{openReqs.map((r) => <RequestCard key={r.id} r={r} href={`/cliente/solicitudes/${r.id}`} />)}</div>
        )}
      </Section>

      <Section title="Solicita de nuevo">
        <ul className="grid grid-cols-3 gap-2 sm:grid-cols-6">
          {categories.slice(0, 6).map((c) => (
            <li key={c.id}>
              <Link href={`/cliente/solicitudes/nueva?oficio=${c.slug}`} className="card flex h-full flex-col items-center gap-2 p-3 text-center transition-shadow hover:shadow-lift">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-bg text-brand"><CategoryIcon iconKey={c.icon_key} className="h-5 w-5" /></span>
                <span className="font-display text-xs font-medium leading-tight">{c.name.split(' /')[0]}</span>
              </Link>
            </li>
          ))}
        </ul>
      </Section>
    </>
  )
}
