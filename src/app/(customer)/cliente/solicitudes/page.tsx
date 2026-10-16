import Link from 'next/link'
import { ClipboardList, Plus } from 'lucide-react'
import { cn } from '@/lib/cn'
import { requireUser } from '@/lib/auth/session'
import { listCustomerRequests } from '@/lib/services/requests'
import { EmptyState, PageHeader } from '@/components/ui/primitives'
import { RequestCard } from '@/components/domain/cards'

export const metadata = { title: 'Mis solicitudes' }

const FILTERS = [
  { key: 'activas', label: 'Activas', match: ['open', 'quoting'] },
  { key: 'contratadas', label: 'Contratadas', match: ['hired'] },
  { key: 'cerradas', label: 'Canceladas / expiradas', match: ['cancelled', 'expired'] },
  { key: 'todas', label: 'Todas', match: [] },
]

export default async function RequestsPage({ searchParams }: { searchParams: { estado?: string } }) {
  const user = await requireUser('customer')
  const all = await listCustomerRequests(user.id)
  const filter = FILTERS.find((f) => f.key === searchParams.estado) ?? FILTERS[0]
  const list = filter.match.length ? all.filter((r) => filter.match.includes(r.status)) : all

  return (
    <>
      <PageHeader title="Mis solicitudes" description="Consulta el estado de cada solicitud y compara las cotizaciones recibidas." action={<Link href="/cliente/solicitudes/nueva" className="btn-primary"><Plus className="h-4 w-4" aria-hidden />Nueva solicitud</Link>} />
      <nav aria-label="Filtrar por estado" className="mb-5 flex gap-2 overflow-x-auto pb-1">
        {FILTERS.map((f) => {
          const n = f.match.length ? all.filter((r) => f.match.includes(r.status)).length : all.length
          return (
            <Link key={f.key} href={`/cliente/solicitudes?estado=${f.key}`} aria-current={f.key === filter.key ? 'page' : undefined}
              className={cn('whitespace-nowrap rounded-full px-4 py-2 font-display text-sm transition-colors', f.key === filter.key ? 'bg-navy text-white' : 'bg-white text-ink2 shadow-card hover:text-ink')}>
              {f.label} <span className="ml-1 font-num opacity-70">{n}</span>
            </Link>
          )
        })}
      </nav>
      {list.length === 0 ? (
        <EmptyState icon={ClipboardList} title="No hay solicitudes en esta vista" description="Crea una solicitud para recibir cotizaciones de profesionales verificados." action={<Link href="/cliente/solicitudes/nueva" className="btn-primary">Crear solicitud</Link>} />
      ) : (
        <div className="space-y-3">{list.map((r) => <RequestCard key={r.id} r={r} href={`/cliente/solicitudes/${r.id}`} />)}</div>
      )}
    </>
  )
}
