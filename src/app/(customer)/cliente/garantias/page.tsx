import Link from 'next/link'
import { Headphones, LifeBuoy, MessagesSquare, ShieldCheck, TriangleAlert } from 'lucide-react'
import { requireUser } from '@/lib/auth/session'
import { formatDate } from '@/lib/format'
import { CASE, WARRANTY_REASONS } from '@/lib/domain/states'
import { listCases, listWarranties } from '@/lib/services/orders'
import { warrantyClaimAction } from '@/app/actions/customer'
import { openSupportChatAction } from '@/app/actions/messaging'
import { ActionForm, SubmitButton } from '@/components/ui/action-form'
import { EmptyState, PageHeader, Section } from '@/components/ui/primitives'
import { WarrantyCard } from '@/components/domain/cards'
import { PhotoInput } from '@/components/domain/photo-input'
import { StatusBadge } from '@/components/domain/visuals'

export const metadata = { title: 'Garantías y reclamos' }

export default async function WarrantiesPage() {
  const user = await requireUser('customer')
  const [warranties, cases] = await Promise.all([listWarranties(user), listCases(user)])
  const live = warranties.filter((w) => w.status !== 'expired')
  const expired = warranties.filter((w) => w.status === 'expired')

  return (
    <>
      <PageHeader title="Garantías y reclamos" description="Cada trabajo aprobado tiene una garantía escrita. Si el problema reaparece dentro del plazo, repórtalo aquí con fotos." />

      <Section title="Casos abiertos y resueltos" className="mt-0">
        {cases.length === 0 ? (
          <p className="text-sm text-ink2">No has abierto reclamos. ¡Qué bien!</p>
        ) : (
          <ul className="space-y-3">
            {cases.map((c) => (
              <li key={c.id} className="card card-pad">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-display text-sm font-semibold">{c.case_number} · {c.kind === 'dispute' ? 'Incidencia' : 'Garantía'} · {c.title}</p>
                  <StatusBadge map={CASE} status={c.status} />
                </div>
                <p className="mt-1 text-sm text-ink2">{c.reason} · abierto el {formatDate(c.created_at)}</p>
                {c.resolution && <p className="mt-2 rounded-xl bg-paper px-3 py-2 text-sm"><strong className="font-medium">Resolución:</strong> {c.resolution}</p>}
                <div className="mt-3 flex flex-wrap gap-2">
                  {c.conversation_id && <Link href={`/mensajes/${c.conversation_id}`} className="btn-primary btn-sm"><MessagesSquare className="h-4 w-4" aria-hidden />{['open', 'in_review'].includes(c.status) ? 'Abrir sala de mediación' : 'Ver conversación del caso'}</Link>}
                  <Link href={`/cliente/ordenes/${c.order_id}`} className="btn-ghost btn-sm">Ver orden {c.order_number}</Link>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section title={`Garantías vigentes (${live.length})`}>
        {live.length === 0 ? (
          <EmptyState icon={ShieldCheck} title="Aún no tienes garantías" description="Se emiten automáticamente cuando apruebas un trabajo terminado." />
        ) : (
          <div className="space-y-4">
            {live.map((w) => (
              <WarrantyCard key={w.id} w={w} orderNumber={w.order_number} title={w.title} proName={w.pro_name}>
                <div className="flex flex-wrap gap-2">
                  <Link href={`/cliente/ordenes/${w.order_id}`} className="btn-secondary btn-sm">Ver orden</Link>
                  <ActionForm action={openSupportChatAction} resetOnSuccess={false}>
                    <input type="hidden" name="order_id" value={w.order_id} />
                    <input type="hidden" name="subject" value={`Duda sobre la garantía · ${w.order_number}`} />
                    <SubmitButton className="btn-ghost btn-sm"><Headphones className="h-4 w-4" aria-hidden />Necesito ayuda</SubmitButton>
                  </ActionForm>
                </div>
                {w.status === 'active' && (
                  <details className="mt-3 rounded-2xl border border-line">
                    <summary className="flex cursor-pointer list-none items-center gap-2 px-4 py-3 font-display text-sm font-medium text-bad [&::-webkit-details-marker]:hidden">
                      <TriangleAlert className="h-4 w-4" aria-hidden />Reportar un problema cubierto por la garantía
                    </summary>
                    <ActionForm action={warrantyClaimAction} className="space-y-4 border-t border-line p-4" confirm="¿Enviar el reporte de garantía? Se abrirá un caso con un agente de Handyman asignado.">
                      <input type="hidden" name="warranty_id" value={w.id} />
                      <div>
                        <label className="label" htmlFor={`r-${w.id}`}>Motivo</label>
                        <select id={`r-${w.id}`} name="reason" required defaultValue="" className="input">
                          <option value="" disabled>Selecciona un motivo</option>
                          {WARRANTY_REASONS.map((r) => <option key={r} value={r}>{r}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="label" htmlFor={`d-${w.id}`}>Describe el problema</label>
                        <textarea id={`d-${w.id}`} name="description" required minLength={15} maxLength={1200} className="input" />
                      </div>
                      <PhotoInput name="photos" label="Fotos del problema (recomendado)" />
                      <SubmitButton className="btn-danger w-full" pendingText="Enviando…"><LifeBuoy className="h-4 w-4" aria-hidden />Enviar reporte de garantía</SubmitButton>
                    </ActionForm>
                  </details>
                )}
              </WarrantyCard>
            ))}
          </div>
        )}
      </Section>

      {expired.length > 0 && (
        <Section title={`Garantías expiradas (${expired.length})`}>
          <ul className="card divide-y divide-line">
            {expired.map((w) => (
              <li key={w.id} className="flex flex-wrap items-center justify-between gap-2 px-5 py-3.5 text-sm">
                <span><span className="font-display font-medium">{w.title}</span> <span className="text-ink3">· {w.order_number}</span></span>
                <span className="text-ink3">Venció el {formatDate(w.expires_at)}</span>
              </li>
            ))}
          </ul>
        </Section>
      )}
    </>
  )
}
