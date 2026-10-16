import Link from 'next/link'
import { notFound } from 'next/navigation'
import { CalendarDays, CircleCheck, Lock, MapPin, Send, Undo2 } from 'lucide-react'
import { requireUser } from '@/lib/auth/session'
import { formatDate, formatQ, timeAgo, todayGT } from '@/lib/format'
import { QUOTE } from '@/lib/domain/states'
import { uuidSchema } from '@/lib/validation/schemas'
import { getProProfile } from '@/lib/services/professionals'
import { getRequestForPro, listMessages } from '@/lib/services/requests'
import { getMyQuote } from '@/lib/services/quotes'
import { createQuoteAction, withdrawQuoteAction } from '@/app/actions/pro'
import { ActionForm, SubmitButton } from '@/components/ui/action-form'
import { Notice, PageHeader } from '@/components/ui/primitives'
import { PhotoGrid, StatusBadge } from '@/components/domain/visuals'
import { QaThread } from '@/components/domain/qa-thread'
import { VerificationGate } from '../../verification-gate'

export const metadata = { title: 'Solicitud' }

export default async function ProRequestDetail({ params, searchParams }: { params: { id: string }; searchParams: { enviada?: string } }) {
  const user = await requireUser('professional')
  if (!uuidSchema.safeParse(params.id).success) notFound()
  const pro = await getProProfile(user.id)
  if (!pro) notFound()
  if (pro.verification_status !== 'approved') return (<><PageHeader title="Solicitud" /><VerificationGate status={pro.verification_status} note={pro.verification_note} /></>)
  const r = await getRequestForPro(user.id, params.id)
  if (!r) notFound()
  const [messages, quote] = await Promise.all([listMessages(r.id), getMyQuote(user.id, r.id)])
  const open = ['open', 'quoting'].includes(r.status)

  return (
    <>
      <PageHeader title={r.title} back={{ href: '/pro/solicitudes', label: 'Solicitudes' }} description={`${r.category_name} · publicada ${timeAgo(r.created_at)} por ${r.customer_first_name}`} />
      {searchParams.enviada && <div className="mb-5"><Notice tone="ok" icon={CircleCheck} title="Cotización enviada">El cliente fue notificado. Te avisaremos si la acepta.</Notice></div>}

      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        <div className="min-w-0 space-y-5">
          <section className="card card-pad space-y-4">
            <p className="text-[15px] leading-relaxed text-ink2">{r.description}</p>
            <ul className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-ink2">
              <li className="flex items-center gap-1.5"><MapPin className="h-4 w-4 text-ink3" aria-hidden />{r.location_label} · {r.place_type === 'casa' ? 'Casa' : r.place_type === 'oficina' ? 'Oficina' : 'Otro espacio'}</li>
              <li className="flex items-center gap-1.5"><CalendarDays className="h-4 w-4 text-ink3" aria-hidden />{formatDate(r.preferred_date)} · {r.preferred_time_window}</li>
            </ul>
            <p className="flex items-center gap-1.5 text-xs text-ink3"><Lock className="h-3.5 w-3.5" aria-hidden />La dirección exacta se comparte solo si el cliente acepta tu cotización.</p>
            <PhotoGrid urls={r.photo_urls} alt="Foto del problema" />
          </section>
          <QaThread requestId={r.id} messages={messages} viewerId={user.id} canPost={open} />
        </div>

        <aside>
          {quote ? (
            <section className="card card-pad space-y-3">
              <div className="flex items-center justify-between gap-2"><h2 className="text-base font-semibold">Tu cotización</h2><StatusBadge map={QUOTE} status={quote.status} /></div>
              <p className="font-num text-3xl font-semibold">{formatQ(quote.price_amount)}</p>
              <p className="text-sm text-ink2">{quote.scope_description}</p>
              <p className="text-sm text-ink2">{quote.materials_included ? 'Materiales incluidos' : 'Materiales no incluidos'} · {quote.estimated_duration} · {formatDate(quote.proposed_date)}</p>
              {quote.status === 'sent' && <p className="text-xs text-ink3">Vence el {formatDate(quote.expires_at)}</p>}
              {r.order_id && quote.status === 'accepted' && <Link href={`/pro/ordenes/${r.order_id}`} className="btn-primary w-full">Ir a la orden</Link>}
              {quote.status === 'sent' && (
                <ActionForm action={withdrawQuoteAction} confirm="¿Retirar tu cotización? El cliente ya no podrá aceptarla.">
                  <input type="hidden" name="quote_id" value={quote.id} />
                  <SubmitButton className="btn-danger w-full"><Undo2 className="h-4 w-4" aria-hidden />Retirar cotización</SubmitButton>
                </ActionForm>
              )}
            </section>
          ) : open ? (
            <section className="card card-pad">
              <h2 className="text-lg font-semibold">Enviar cotización</h2>
              <p className="mt-1 text-sm text-ink2">Sé claro con el alcance: si el cliente acepta, el precio y lo descrito quedarán congelados en la orden.</p>
              <ActionForm action={createQuoteAction} resetOnSuccess={false} className="mt-4 space-y-4">
                <input type="hidden" name="request_id" value={r.id} />
                <div>
                  <label className="label" htmlFor="price_amount">Monto total (Q)</label>
                  <div className="relative">
                    <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 font-num text-ink3">Q</span>
                    <input id="price_amount" name="price_amount" required inputMode="decimal" pattern="^\d{1,7}(\.\d{1,2})?$" placeholder="450.00" className="input pl-8 font-num text-lg" />
                  </div>
                </div>
                <div>
                  <label className="label" htmlFor="scope_description">Alcance del trabajo</label>
                  <textarea id="scope_description" name="scope_description" required minLength={20} maxLength={1200} className="input" placeholder="Qué incluye exactamente tu trabajo…" />
                </div>
                <fieldset>
                  <legend className="label">¿Incluye materiales?</legend>
                  <div className="grid grid-cols-2 gap-2">
                    {[['si', 'Sí, incluidos'], ['no', 'No incluidos']].map(([v, l]) => (
                      <label key={v} className="flex cursor-pointer items-center justify-center rounded-xl border-2 border-line px-3 py-2.5 font-display text-sm has-[:checked]:border-brand has-[:checked]:bg-brand-bg/60">
                        <input type="radio" name="materials_included" value={v} required defaultChecked={v === 'si'} className="sr-only" />{l}
                      </label>
                    ))}
                  </div>
                </fieldset>
                <div>
                  <label className="label" htmlFor="materials_notes">Detalle de materiales</label>
                  <input id="materials_notes" name="materials_notes" maxLength={400} className="input" placeholder="Qué materiales incluye o cuáles debe comprar el cliente" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="label" htmlFor="estimated_duration">Duración</label><input id="estimated_duration" name="estimated_duration" required placeholder="3 horas" className="input" /></div>
                  <div><label className="label" htmlFor="proposed_date">Fecha propuesta</label><input id="proposed_date" name="proposed_date" type="date" required min={todayGT()} defaultValue={r.preferred_date >= todayGT() ? r.preferred_date : todayGT()} className="input" /></div>
                </div>
                <div><label className="label" htmlFor="notes">Condiciones (opcional)</label><textarea id="notes" name="notes" maxLength={600} className="input min-h-[80px]" placeholder="Ej.: El precio puede cambiar si al revisar se encuentra un daño mayor." /></div>
                <SubmitButton className="btn-primary w-full" pendingText="Enviando…"><Send className="h-4 w-4" aria-hidden />Enviar cotización</SubmitButton>
                <p className="text-xs text-ink3">La cotización vence en 7 días.</p>
              </ActionForm>
            </section>
          ) : (
            <Notice tone="neutral">Esta solicitud ya no recibe cotizaciones.</Notice>
          )}
        </aside>
      </div>
    </>
  )
}
