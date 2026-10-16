import Link from 'next/link'
import { FileText } from 'lucide-react'
import { requireUser } from '@/lib/auth/session'
import { formatDate, formatQ } from '@/lib/format'
import { QUOTE } from '@/lib/domain/states'
import { listProQuotes } from '@/lib/services/quotes'
import { EmptyState, PageHeader } from '@/components/ui/primitives'
import { StatusBadge } from '@/components/domain/visuals'

export const metadata = { title: 'Mis cotizaciones' }

export default async function ProQuotes() {
  const user = await requireUser('professional')
  const quotes = await listProQuotes(user.id)
  return (
    <>
      <PageHeader title="Mis cotizaciones" description="Seguimiento de todas las propuestas que has enviado." />
      {quotes.length === 0 ? (
        <EmptyState icon={FileText} title="Aún no envías cotizaciones" description="Revisa las solicitudes compatibles y envía tu primera propuesta." action={<Link href="/pro/solicitudes" className="btn-primary">Ver solicitudes</Link>} />
      ) : (
        <ul className="space-y-3">
          {quotes.map((q) => (
            <li key={q.id}>
              <Link href={q.order_id ? `/pro/ordenes/${q.order_id}` : `/pro/solicitudes/${q.request_id}`} className="card flex flex-wrap items-center gap-4 p-4 transition-shadow hover:shadow-lift sm:p-5">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-display text-[15px] font-semibold">{q.request_title}</p>
                  <p className="mt-0.5 text-sm text-ink2">{q.category_name} · {q.location_label} · enviada el {formatDate(q.created_at)}</p>
                </div>
                <p className="font-num text-lg font-semibold">{formatQ(q.price_amount)}</p>
                <StatusBadge map={QUOTE} status={q.status} />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  )
}
