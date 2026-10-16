import Link from 'next/link'
import { LifeBuoy } from 'lucide-react'
import { requireUser } from '@/lib/auth/session'
import { formatDate } from '@/lib/format'
import { CASE } from '@/lib/domain/states'
import { listCases } from '@/lib/services/orders'
import { Badge, EmptyState, PageHeader } from '@/components/ui/primitives'
import { StatusBadge } from '@/components/domain/visuals'

export const metadata = { title: 'Casos y reclamos' }

export default async function AdminCases() {
  const admin = await requireUser('admin')
  const cases = await listCases(admin)
  const open = cases.filter((c) => ['open', 'in_review'].includes(c.status))
  const closed = cases.filter((c) => !['open', 'in_review'].includes(c.status))
  const row = (c: (typeof cases)[number]) => (
    <li key={c.id}>
      <Link href={`/admin/casos/${c.id}`} className="card flex flex-wrap items-center gap-3 p-4 transition-shadow hover:shadow-lift sm:p-5">
        <div className="min-w-0 flex-1">
          <p className="font-display font-semibold">{c.case_number} · {c.reason}</p>
          <p className="truncate text-sm text-ink2">{c.title} · {c.customer_name} → {c.pro_name} · {formatDate(c.created_at)}</p>
        </div>
        <Badge tone={c.kind === 'dispute' ? 'bad' : 'info'}>{c.kind === 'dispute' ? 'Incidencia' : 'Garantía'}</Badge>
        <StatusBadge map={CASE} status={c.status} />
      </Link>
    </li>
  )
  return (
    <>
      <PageHeader title="Casos y reclamos" description="Incidencias abiertas antes de aprobar un trabajo y reportes de garantía posteriores." />
      {cases.length === 0 ? <EmptyState icon={LifeBuoy} title="Sin casos" description="No hay incidencias ni reportes de garantía." /> : (
        <>
          <h2 className="mb-3 text-lg font-semibold">Por resolver ({open.length})</h2>
          {open.length === 0 ? <p className="text-sm text-ink2">Todo al día.</p> : <ul className="space-y-3">{open.map(row)}</ul>}
          <h2 className="mb-3 mt-8 text-lg font-semibold">Cerrados ({closed.length})</h2>
          <ul className="space-y-3">{closed.map(row)}</ul>
        </>
      )}
    </>
  )
}
