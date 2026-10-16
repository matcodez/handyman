import Link from 'next/link'
import { listProsForAdmin } from '@/lib/services/admin'
import { formatDate } from '@/lib/format'
import { PageHeader } from '@/components/ui/primitives'
import { Avatar, VerificationBadge } from '@/components/domain/visuals'

export const metadata = { title: 'Profesionales' }

export default async function AdminPros() {
  const pros = await listProsForAdmin()
  return (
    <>
      <PageHeader title="Profesionales" description="Cola de verificación: los pendientes aparecen primero. Solo administración puede aprobar, rechazar o suspender." />
      <ul className="space-y-3">
        {pros.map((p) => (
          <li key={p.user_id}>
            <Link href={`/admin/profesionales/${p.user_id}`} className="card flex flex-wrap items-center gap-4 p-4 transition-shadow hover:shadow-lift sm:p-5">
              <Avatar name={p.public_name} />
              <div className="min-w-0 flex-1">
                <p className="truncate font-display font-semibold">{p.public_name}</p>
                <p className="truncate text-sm text-ink2">{p.full_name} · {p.email}</p>
                <p className="text-xs text-ink3">{p.categories.join(', ') || 'Sin oficios'} · {p.documents} documento(s) · registrado {formatDate(p.created_at)}</p>
              </div>
              <VerificationBadge status={p.verification_status} />
            </Link>
          </li>
        ))}
      </ul>
    </>
  )
}
