import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowUpCircle, FileSignature, Gavel, Headphones, MessagesSquare } from 'lucide-react'
import { requireUser } from '@/lib/auth/session'
import { formatDateTime, formatQ } from '@/lib/format'
import { CASE, ORDER, WARRANTY } from '@/lib/domain/states'
import { PRIORITY, relativeTime, SLA_LABEL, slaState } from '@/lib/domain/sla'
import { uuidSchema } from '@/lib/validation/schemas'
import { getCase } from '@/lib/services/admin'
import { listAgents, OUTCOME_LABEL, OUTCOMES_BY_KIND, type AgreementOutcome } from '@/lib/services/support'
import { resolveCaseAction } from '@/app/actions/admin'
import { assignCaseAction, escalateCaseAction, proposeAgreementAction } from '@/app/actions/support'
import { ActionForm, SubmitButton } from '@/components/ui/action-form'
import { Badge, DefList, Notice, PageHeader } from '@/components/ui/primitives'
import { PhotoGrid, StatusBadge } from '@/components/domain/visuals'

export const metadata = { title: 'Caso' }

export default async function AdminCaseDetail({ params }: { params: { id: string } }) {
  const admin = await requireUser('admin')
  if (!uuidSchema.safeParse(params.id).success) notFound()
  const [c, agents] = await Promise.all([getCase(params.id), listAgents()])
  if (!c) notFound()
  const closed = ['resolved', 'rejected'].includes(c.status)
  const sla = slaState({ ...c, closed })
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
  const outcomes = OUTCOMES_BY_KIND[c.kind]

  return (
    <>
      <PageHeader
        title={`${c.case_number} · ${c.reason}`}
        back={{ href: '/admin/casos', label: 'Centro de soporte' }}
        description={
          <span className="flex flex-wrap items-center gap-2">
            <Badge tone={c.kind === 'dispute' ? 'bad' : 'info'}>{c.kind === 'dispute' ? 'Incidencia antes de aprobar' : 'Reporte de garantía'}</Badge>
            <Badge tone={PRIORITY[c.priority].tone}>Prioridad {PRIORITY[c.priority].label.toLowerCase()}</Badge>
            {!closed && <Badge tone={SLA_LABEL[sla].tone}>{SLA_LABEL[sla].label}</Badge>}
            <StatusBadge map={CASE} status={c.status} />
          </span>
        }
        action={c.conversation_id && (
          <Link href={`/mensajes/${c.conversation_id}`} className="btn-primary"><MessagesSquare className="h-4 w-4" aria-hidden />Sala de mediación</Link>
        )}
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
              ['Agente asignado', c.agent_name ?? 'Sin asignar'],
              ['Primera respuesta', c.first_response_at ? formatDateTime(c.first_response_at) : c.sla_due_at ? `Pendiente · vence ${relativeTime(c.sla_due_at)}` : 'Pendiente'],
              ...(c.escalated_at ? [['Escalado', formatDateTime(c.escalated_at)] as [string, React.ReactNode]] : []),
            ]} />
          </section>

          {c.agreement_text && (
            <section className="card card-pad">
              <h2 className="flex items-center gap-2 text-base font-semibold"><FileSignature className="h-5 w-5 text-brand" aria-hidden />Acuerdo propuesto</h2>
              <p className="mt-2 whitespace-pre-wrap text-[15px] leading-relaxed text-ink2">{c.agreement_text}</p>
              {c.agreement_outcome && <p className="mt-2 text-sm"><span className="font-medium">Resultado:</span> {OUTCOME_LABEL[c.agreement_outcome as AgreementOutcome]}</p>}
              <div className="mt-3 flex flex-wrap gap-2">
                <Badge tone={c.agreement_customer_at ? 'ok' : 'warn'}>Cliente: {c.agreement_customer_at ? 'aceptó' : 'pendiente'}</Badge>
                <Badge tone={c.agreement_pro_at ? 'ok' : 'warn'}>Profesional: {c.agreement_pro_at ? 'aceptó' : 'pendiente'}</Badge>
              </div>
            </section>
          )}
          {c.resolution && <Notice tone={c.status === 'rejected' ? 'bad' : 'ok'} title="Resolución documentada">{c.resolution}{c.resolver_name && <span className="mt-1 block text-xs">Por {c.resolver_name} · {formatDateTime(c.resolved_at)}</span>}</Notice>}
        </div>

        <aside className="space-y-5">
          {closed ? (
            <Notice tone="neutral">Este caso está cerrado.</Notice>
          ) : (
            <>
              <section className="card card-pad">
                <h2 className="flex items-center gap-2 text-lg font-semibold"><Headphones className="h-5 w-5 text-brand" aria-hidden />Asignación</h2>
                <ActionForm action={assignCaseAction} className="mt-3 flex gap-2">
                  <input type="hidden" name="case_id" value={c.id} />
                  <label htmlFor="agent_id" className="sr-only">Agente</label>
                  <select id="agent_id" name="agent_id" defaultValue={c.assigned_to ?? admin.id} className="input flex-1">
                    {agents.map((a) => <option key={a.id} value={a.id}>{a.full_name}{a.id === admin.id ? ' (yo)' : ''}</option>)}
                  </select>
                  <SubmitButton className="btn-secondary">Asignar</SubmitButton>
                </ActionForm>
                {c.priority !== 'urgente' && (
                  <ActionForm action={escalateCaseAction} className="mt-4 space-y-2 border-t border-line pt-4">
                    <input type="hidden" name="case_id" value={c.id} />
                    <label className="label" htmlFor="esc_reason">Escalar a supervisor</label>
                    <input id="esc_reason" name="reason" className="input" maxLength={200} placeholder="Motivo (p. ej. cliente sin agua desde ayer)" />
                    <SubmitButton className="btn-ghost w-full text-bad"><ArrowUpCircle className="h-4 w-4" aria-hidden />Escalar a urgente</SubmitButton>
                  </ActionForm>
                )}
              </section>

              <section className="card card-pad">
                <h2 className="flex items-center gap-2 text-lg font-semibold"><FileSignature className="h-5 w-5 text-brand" aria-hidden />Proponer acuerdo</h2>
                <p className="mt-1 text-sm text-ink2">Después de mediar en la sala, escribe el acuerdo. Se cierra el caso cuando cliente y profesional lo aceptan.</p>
                <ActionForm action={proposeAgreementAction} className="mt-3 space-y-3">
                  <input type="hidden" name="case_id" value={c.id} />
                  <div>
                    <label className="label" htmlFor="agreement">Texto del acuerdo</label>
                    <textarea id="agreement" name="agreement" maxLength={1200} className="input" defaultValue={c.agreement_text ?? ''} placeholder="Ej.: El profesional regresa el jueves a las 9:00 a aplicar la segunda capa sin costo adicional." />
                  </div>
                  <fieldset>
                    <legend className="label">Resultado al aceptarse</legend>
                    <div className="space-y-1.5">
                      {outcomes.map((o) => (
                        <label key={o} className="flex items-start gap-2 text-sm">
                          <input type="radio" name="outcome" value={o} defaultChecked={(c.agreement_outcome ?? outcomes[0]) === o} className="mt-1" />
                          {OUTCOME_LABEL[o]}
                        </label>
                      ))}
                    </div>
                  </fieldset>
                  <SubmitButton className="btn-primary w-full">{c.agreement_text ? 'Actualizar propuesta' : 'Enviar propuesta a ambas partes'}</SubmitButton>
                </ActionForm>
              </section>

              <section className="card card-pad">
                <h2 className="flex items-center gap-2 text-lg font-semibold"><Gavel className="h-5 w-5 text-brand" aria-hidden />Decisión directa</h2>
                <p className="mt-1 text-sm text-ink2">Si no hay acuerdo, Handyman decide con base en la evidencia.</p>
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
            </>
          )}
        </aside>
      </div>
    </>
  )
}
