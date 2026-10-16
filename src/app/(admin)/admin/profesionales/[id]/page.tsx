import { notFound } from 'next/navigation'
import { FileText, Gavel, Lock } from 'lucide-react'
import { db } from '@/lib/db/client'
import { formatDate, formatDateTime } from '@/lib/format'
import { DOCUMENT_TYPES, canVerificationTransition } from '@/lib/domain/states'
import { uuidSchema } from '@/lib/validation/schemas'
import { getProProfile, listDocuments, listPortfolio, listProCategories, listReviews } from '@/lib/services/professionals'
import { decideVerificationAction } from '@/app/actions/admin'
import { ActionForm, SubmitButton } from '@/components/ui/action-form'
import { Badge, DefList, PageHeader, Section } from '@/components/ui/primitives'
import { ProProfileView } from '@/components/domain/pro-profile'

export const metadata = { title: 'Revisión de profesional' }

export default async function AdminProDetail({ params }: { params: { id: string } }) {
  if (!uuidSchema.safeParse(params.id).success) notFound()
  const pro = await getProProfile(params.id)
  if (!pro) notFound()
  const [docs, cats, portfolio, reviews, history, email] = await Promise.all([
    listDocuments(pro.user_id), listProCategories(pro.user_id), listPortfolio(pro.user_id), listReviews(pro.user_id),
    db.q<{ id: string; action: string; actor: string | null; metadata: { reason?: string | null }; created_at: Date }>(
      `select a.id, a.action, u.full_name as actor, a.metadata, a.created_at from audit_logs a left join users u on u.id = a.actor_id
       where a.entity_type = 'professional' and a.entity_id = $1 order by a.created_at desc`, [pro.user_id],
    ),
    db.q1<{ email: string }>(`select email from users where id = $1`, [pro.user_id]),
  ])
  const options = (['in_review', 'approved', 'rejected', 'suspended'] as const).filter((s) => canVerificationTransition(pro.verification_status, s))
  const labels = { in_review: 'Marcar en revisión', approved: 'Aprobar verificación', rejected: 'Rechazar', suspended: 'Suspender perfil' }

  return (
    <>
      <PageHeader title={pro.public_name} back={{ href: '/admin/profesionales', label: 'Profesionales' }} description="Expediente de verificación. Los documentos son privados: solo visibles para administración y el propio profesional." />

      <div className="mb-6 grid gap-6 lg:grid-cols-[1fr_360px]">
        <section className="card card-pad">
          <h2 className="flex items-center gap-2 text-lg font-semibold"><Lock className="h-5 w-5 text-brand" aria-hidden />Documentos privados</h2>
          <div className="mt-3"><DefList items={[['Nombre legal', pro.full_name], ['Correo', email?.email ?? '—'], ['Teléfono', pro.phone ?? '—'], ['Registrado', formatDate(pro.created_at)]]} /></div>
          {docs.length === 0 ? <p className="mt-4 text-sm text-ink3">No ha subido documentos.</p> : (
            <ul className="mt-4 divide-y divide-line rounded-xl border border-line">
              {docs.map((d) => (
                <li key={d.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                  <FileText className="h-5 w-5 text-brand" aria-hidden />
                  <div className="min-w-0 flex-1"><p className="font-display text-sm font-medium">{DOCUMENT_TYPES.find((t) => t.value === d.document_type)?.label ?? d.document_type}</p><p className="text-xs text-ink3">{d.original_name} · {formatDate(d.created_at)}</p></div>
                  <Badge tone={d.review_status === 'approved' ? 'ok' : d.review_status === 'rejected' ? 'bad' : 'warn'}>{d.review_status === 'approved' ? 'Aprobado' : d.review_status === 'rejected' ? 'Rechazado' : 'Pendiente'}</Badge>
                  <a href={`/api/files/${d.private_storage_path}`} target="_blank" rel="noreferrer" className="btn-secondary btn-sm">Abrir</a>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="card card-pad">
          <h2 className="flex items-center gap-2 text-lg font-semibold"><Gavel className="h-5 w-5 text-brand" aria-hidden />Decisión</h2>
          {options.length === 0 ? <p className="mt-2 text-sm text-ink2">No hay transiciones disponibles desde el estado actual.</p> : (
            <ActionForm action={decideVerificationAction} className="mt-3 space-y-3" confirm="¿Registrar esta decisión? Quedará en la auditoría con tu nombre, la fecha y el motivo.">
              <input type="hidden" name="professional_id" value={pro.user_id} />
              <div>
                <label className="label" htmlFor="reason">Motivo / observaciones</label>
                <textarea id="reason" name="reason" maxLength={600} className="input min-h-[90px]" placeholder="Obligatorio para rechazar o suspender. Ej.: DPI legible y vigente, antecedentes sin registros." />
              </div>
              <div className="grid gap-2">
                {options.map((o) => (
                  <SubmitButton key={o} name="decision" value={o} className={o === 'approved' ? 'btn-primary w-full' : o === 'in_review' ? 'btn-secondary w-full' : 'btn-danger w-full'}>{labels[o]}</SubmitButton>
                ))}
              </div>
            </ActionForm>
          )}
          <div className="mt-5 border-t border-line pt-4">
            <p className="text-xs font-medium uppercase tracking-wide text-ink3">Historial de decisiones</p>
            {history.length === 0 ? <p className="mt-2 text-sm text-ink3">Sin registros.</p> : (
              <ul className="mt-2 space-y-2 text-sm">
                {history.map((h) => (
                  <li key={h.id}><span className="font-num text-xs text-brand">{h.action}</span> · {h.actor ?? 'Sistema'} · <span className="text-ink3">{formatDateTime(h.created_at)}</span>{h.metadata?.reason && <p className="text-xs text-ink2">“{h.metadata.reason}”</p>}</li>
                ))}
              </ul>
            )}
          </div>
        </section>
      </div>

      <Section title="Vista del perfil público">
        <ProProfileView pro={pro} categories={cats} portfolio={portfolio} reviews={reviews} />
      </Section>
    </>
  )
}
