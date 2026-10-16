import Link from 'next/link'
import { notFound } from 'next/navigation'
import { BadgeCheck, CircleCheck, Circle, FileText, Lock, Send, Trash2, Upload } from 'lucide-react'
import { requireUser } from '@/lib/auth/session'
import { formatDate, formatDateTime } from '@/lib/format'
import { DOCUMENT_TYPES } from '@/lib/domain/states'
import { getProProfile, listDocuments, listProCategories } from '@/lib/services/professionals'
import { deleteDocumentAction, submitVerificationAction, uploadDocumentAction } from '@/app/actions/pro'
import { ActionForm, SubmitButton } from '@/components/ui/action-form'
import { Badge, Notice, PageHeader } from '@/components/ui/primitives'
import { PhotoInput } from '@/components/domain/photo-input'
import { QrBadge } from '@/components/domain/cards'
import { VerificationBadge } from '@/components/domain/visuals'
import { cn } from '@/lib/cn'

export const metadata = { title: 'Centro de verificación' }

export default async function VerificationCenter() {
  const user = await requireUser('professional')
  const pro = await getProProfile(user.id)
  if (!pro) notFound()
  const [docs, cats] = await Promise.all([listDocuments(user.id), listProCategories(user.id)])
  const editable = ['draft', 'rejected'].includes(pro.verification_status)
  const pendingDocs = docs.filter((d) => d.review_status === 'pending')
  const checklist = [
    { done: pro.bio.length >= 20 && cats.length > 0 && pro.service_area.length > 0, label: 'Perfil completo: biografía, oficios y zonas', href: '/pro/perfil' },
    { done: pendingDocs.some((d) => d.document_type === 'dpi') || pro.verification_status === 'approved', label: 'DPI cargado', href: undefined },
    { done: pendingDocs.some((d) => d.document_type.startsWith('antecedentes')) || pro.verification_status === 'approved', label: 'Constancia de antecedentes (recomendada)', href: undefined },
  ]

  return (
    <>
      <PageHeader title="Centro de verificación" description="Tu identidad verificada es lo que hace que los clientes confíen en ti. Solo administración puede aprobarla." />
      <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
        <div className="min-w-0 space-y-5">
          <section className="card card-pad">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-lg font-semibold">Estado actual</h2>
              <VerificationBadge status={pro.verification_status} />
            </div>
            {pro.verification_status === 'approved' && <p className="mt-2 text-sm text-ink2">Verificado el {formatDateTime(pro.verified_at)}. Ya puedes cotizar solicitudes de tu zona.</p>}
            {(pro.verification_status === 'pending' || pro.verification_status === 'in_review') && <p className="mt-2 text-sm text-ink2">Tu expediente fue enviado y está en revisión. Te notificaremos la decisión.</p>}
            {pro.verification_status === 'rejected' && pro.verification_note && <div className="mt-3"><Notice tone="bad" title="Motivo del rechazo">{pro.verification_note}</Notice></div>}
            {pro.verification_status === 'suspended' && pro.verification_note && <div className="mt-3"><Notice tone="bad" title="Motivo de la suspensión">{pro.verification_note}</Notice></div>}
            <ol className="mt-5 flex flex-wrap items-center gap-2 font-display text-xs">
              {['Borrador', 'Pendiente', 'En revisión', 'Aprobado'].map((s, i) => {
                const idx = { draft: 0, rejected: 0, pending: 1, in_review: 2, approved: 3, suspended: 3 }[pro.verification_status]
                return <li key={s} className={cn('rounded-full px-3 py-1', i <= idx ? 'bg-brand text-white' : 'bg-paper2 text-ink3')}>{s}</li>
              })}
            </ol>
          </section>

          {editable && (
            <section className="card card-pad">
              <h2 className="text-lg font-semibold">Lista de requisitos</h2>
              <ul className="mt-3 space-y-2">
                {checklist.map((c) => (
                  <li key={c.label} className="flex items-center gap-2.5 text-sm">
                    {c.done ? <CircleCheck className="h-5 w-5 text-ok" aria-hidden /> : <Circle className="h-5 w-5 text-line2" aria-hidden />}
                    <span className={c.done ? 'text-ink' : 'text-ink2'}>{c.label}</span>
                    {!c.done && c.href && <Link href={c.href} className="text-brand hover:underline">Completar</Link>}
                    <span className="sr-only">{c.done ? '(completo)' : '(pendiente)'}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section className="card card-pad">
            <h2 className="text-lg font-semibold">Documentos</h2>
            <p className="mt-1 flex items-start gap-1.5 text-sm text-ink2"><Lock className="mt-0.5 h-4 w-4 shrink-0 text-ink3" aria-hidden />Se guardan en almacenamiento privado. Solo tú y administración pueden verlos; nunca aparecen en tu perfil público.</p>
            {docs.length === 0 ? (
              <p className="mt-4 text-sm text-ink3">Aún no has subido documentos.</p>
            ) : (
              <ul className="mt-4 divide-y divide-line rounded-xl border border-line">
                {docs.map((d) => (
                  <li key={d.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                    <FileText className="h-5 w-5 text-brand" aria-hidden />
                    <div className="min-w-0 flex-1">
                      <p className="font-display text-sm font-medium">{DOCUMENT_TYPES.find((t) => t.value === d.document_type)?.label ?? d.document_type}</p>
                      <p className="text-xs text-ink3">{d.original_name} · {formatDate(d.created_at)}</p>
                      {d.rejection_reason && <p className="mt-1 text-xs text-bad">{d.rejection_reason}</p>}
                    </div>
                    <Badge tone={d.review_status === 'approved' ? 'ok' : d.review_status === 'rejected' ? 'bad' : 'warn'}>{d.review_status === 'approved' ? 'Aprobado' : d.review_status === 'rejected' ? 'Rechazado' : 'Pendiente'}</Badge>
                    <a href={`/api/files/${d.private_storage_path}`} target="_blank" rel="noreferrer" className="btn-ghost btn-sm">Ver</a>
                    {editable && d.review_status === 'pending' && (
                      <ActionForm action={deleteDocumentAction} confirm="¿Eliminar este documento?">
                        <input type="hidden" name="document_id" value={d.id} />
                        <SubmitButton className="btn-ghost btn-sm px-2" pendingText="…"><Trash2 className="h-4 w-4" aria-hidden /><span className="sr-only">Eliminar</span></SubmitButton>
                      </ActionForm>
                    )}
                  </li>
                ))}
              </ul>
            )}

            {editable && (
              <ActionForm action={uploadDocumentAction} className="mt-5 space-y-4 rounded-2xl bg-paper p-4">
                <div>
                  <label className="label" htmlFor="document_type">Tipo de documento</label>
                  <select id="document_type" name="document_type" required defaultValue="" className="input">
                    <option value="" disabled>Selecciona</option>
                    {DOCUMENT_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </div>
                <PhotoInput name="file" label="Archivo" single required accept="image/jpeg,image/png,image/webp,application/pdf" hint="PDF, JPG, PNG o WEBP · hasta 5 MB" max={1} />
                <SubmitButton className="btn-secondary"><Upload className="h-4 w-4" aria-hidden />Subir documento</SubmitButton>
              </ActionForm>
            )}
          </section>

          {editable && (
            <ActionForm action={submitVerificationAction} confirm="¿Enviar tu expediente a revisión? No podrás modificar los documentos mientras se revisa.">
              <SubmitButton className="btn-primary w-full" pendingText="Enviando…"><Send className="h-4 w-4" aria-hidden />Enviar expediente a revisión</SubmitButton>
            </ActionForm>
          )}
        </div>

        <aside className="space-y-4">
          {pro.verification_status === 'approved' ? (
            <QrBadge token={pro.qr_token} name={pro.public_name} />
          ) : (
            <div className="card card-pad text-sm text-ink2">
              <BadgeCheck className="h-8 w-8 text-ink3" aria-hidden />
              <p className="mt-2 font-display font-semibold text-ink">Tu carné con QR</p>
              <p className="mt-1">Se activa cuando administración aprueba tu verificación. Los clientes lo escanean al llegar para confirmar tu identidad.</p>
            </div>
          )}
          <Notice tone="neutral">En este MVP la revisión la hace un administrador con los documentos cargados; no hay conexión con registros oficiales de antecedentes.</Notice>
        </aside>
      </div>
    </>
  )
}
