import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Gavel } from 'lucide-react'
import { formatDateTime, formatQ } from '@/lib/format'
import { CASE, ORDER, WARRANTY } from '@/lib/domain/states'
import { uuidSchema } from '@/lib/validation/schemas'
import { getCase } from '@/lib/services/admin'
import { resolveCaseAction } from '@/app/actions/admin'
import { ActionForm, SubmitButton } from '@/components/ui/action-form'
import { Badge, DefList, Notice, PageHeader } from '@/components/ui/primitives'
import { PhotoGrid, StatusBadge } from '@/components/domain/visuals'

export const metadata = { title: 'Caso' }

export default async function AdminCaseDetail({ params }: { params: { id: string } }) {
  if (!uuidSchema.safeParse(params.id).success) notFound()
  const c = await getCase(params.id)
  if (!c) notFound()
  const closed = ['resolved', 'rejected'].includes(c.status)
  const actions: { value: string; label: string; cls: string }[] =
    c.kind === 'dispute'
      ? [
          ...(c.status === 'open' ? [{ value: 'review', label: 'Tomar caso (en revisión)', cls: 'btn-secondary' }] : []),
          { value: 'release', label: 'Resolver a favor del profesional: completar y liberar pago demo', cls: 'btn-primary' },
          { value: 'refund', label: 'Resolver a favor del cliente: cancelar orden y pago demo', cls: 'btn-danger' },
        ]
      : [
          ...(c.status === 'open' ? [{ value: 'review', label: 'Tomar caso (en revisión)', cls: 'btn-secondary' }] : []),
          ...(c.warranty_status !== 'approved_fix' ? [{ value: 'approve_fix', label: 'Aprobar para corrección', cls: 'btn-primary' }] : []),
          { value: 'resolve', label: 'Marcar como resuelta', cls: 'btn-secondary' },
          { value: 'reject', label: 'Rechazar con motivo', cls: 'btn-danger' },
        ]

  return (
    <>
      <PageHeader
        title={`${c.case_number} · ${c.reason}`}
        back={{ href: '/admin/casos', label: 'Casos' }}
        description={<span className="flex flex-wrap items-center gap-2"><Badge tone={c.kind === 'dispute' ? 'bad' : 'info'}>{c.kind === 'dispute' ? 'Incidencia antes de aprobar' : 'Reporte de garantía'}</Badge><StatusBadge map={CASE} status={c.status} /></span>}
      />
      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="min-w-0 space-y-5">
          <section className="card card-pad">
            <h2 className="text-base font-semibold">Relato del cliente</h2>
            <p className="mt-2 text-[15px] leading-relaxed text-ink2">{c.description}</p>
            <p className="mt-2 text-xs text-ink3">Abierto el {formatDateTime(c.created_at)}</p>
            {c.evidence_urls.length > 0 && <PhotoGrid urls={c.evidence_urls} alt="Evidencia del reclamo" className="mt-4" />}
          </section>
          <section className="card card-pad">
            <DefList items={[
              ['Orden', <Link key="o" href={`/admin/ordenes/${c.order_id}`} className="font-num text-brand hover:underline">{c.order_number}</Link>],
              ['Trabajo', c.title],
              ['Cliente', c.customer_name],
              ['Profesional', c.pro_name],
              ['Precio acordado', formatQ(c.agreed_price)],
              ['Estado de la orden', <StatusBadge key="s" map={ORDER} status={c.order_status} />],
              ...(c.warranty_status ? [['Estado de la garantía', <StatusBadge key="w" map={WARRANTY} status={c.warranty_status} />] as [string, React.ReactNode]] : []),
            ]} />
          </section>
          {c.resolution && <Notice tone={c.status === 'rejected' ? 'bad' : 'ok'} title="Resolución documentada">{c.resolution}{c.resolver_name && <span className="mt-1 block text-xs">Por {c.resolver_name} · {formatDateTime(c.resolved_at)}</span>}</Notice>}
        </div>

        <aside>
          {closed ? (
            <Notice tone="neutral">Este caso está cerrado.</Notice>
          ) : (
            <section className="card card-pad">
              <h2 className="flex items-center gap-2 text-lg font-semibold"><Gavel className="h-5 w-5 text-brand" aria-hidden />Resolver</h2>
              <ActionForm action={resolveCaseAction} className="mt-3 space-y-3" confirm="¿Registrar esta acción? Se notificará a ambas partes y quedará en la auditoría.">
                <input type="hidden" name="case_id" value={c.id} />
                <div>
                  <label className="label" htmlFor="resolution">Resolución documentada</label>
                  <textarea id="resolution" name="resolution" maxLength={1200} className="input" placeholder="Qué se revisó, qué se decidió y por qué. Obligatorio salvo para tomar el caso." />
                </div>
                <div className="grid gap-2">
                  {actions.map((a) => <SubmitButton key={a.value} name="case_action" value={a.value} className={`${a.cls} h-auto w-full whitespace-normal py-2.5 text-left`}>{a.label}</SubmitButton>)}
                </div>
                <p className="text-xs text-ink3">Los movimientos de pago son simulados (DEMO).</p>
              </ActionForm>
            </section>
          )}
        </aside>
      </div>
    </>
  )
}
