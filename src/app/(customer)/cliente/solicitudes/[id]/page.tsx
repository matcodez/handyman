import Link from 'next/link'
import { notFound } from 'next/navigation'
import { MessageCircle, BadgeCheck, CalendarDays, CircleCheck, Clock, FileText, Images, Lock, MapPin, Package, PackageX, ShieldCheck, X } from 'lucide-react'
import { requireUser } from '@/lib/auth/session'
import { formatDate, formatQ, timeAgo } from '@/lib/format'
import { QUOTE, REQUEST } from '@/lib/domain/states'
import { uuidSchema } from '@/lib/validation/schemas'
import { getRequestForOwner } from '@/lib/services/requests'
import { openQuoteChatAction } from '@/app/actions/messaging'
import { listQuotesForRequest } from '@/lib/services/quotes'
import { getCategory } from '@/lib/services/catalog'
import { acceptQuoteAction, cancelRequestAction } from '@/app/actions/customer'
import { ActionForm, SubmitButton } from '@/components/ui/action-form'
import { Badge, DemoBadge, EmptyState, Notice, PageHeader } from '@/components/ui/primitives'
import { Avatar, PhotoGrid, Stars, StatusBadge, VerificationBadge } from '@/components/domain/visuals'
import { cn } from '@/lib/cn'

export const metadata = { title: 'Detalle de solicitud' }

export default async function RequestDetail({ params, searchParams }: { params: { id: string }; searchParams: { creada?: string } }) {
  const user = await requireUser('customer')
  if (!uuidSchema.safeParse(params.id).success) notFound()
  const r = await getRequestForOwner(user, params.id)
  if (!r) notFound()
  const [quotes, category] = await Promise.all([listQuotesForRequest(r.id), getCategory(r.category_id)])
  const open = ['open', 'quoting'].includes(r.status)
  const prices = quotes.filter((q) => q.status === 'sent').map((q) => Number(q.price_amount))
  const minPrice = prices.length ? Math.min(...prices) : null

  return (
    <>
      <PageHeader
        title={r.title}
        back={{ href: '/cliente/solicitudes', label: 'Mis solicitudes' }}
        description={<span className="flex flex-wrap items-center gap-2"><StatusBadge map={REQUEST} status={r.status} /><span>{r.category_name} · publicada {timeAgo(r.created_at)}</span></span>}
        action={r.order_id ? <Link href={`/cliente/ordenes/${r.order_id}`} className="btn-primary">Ver orden</Link> : undefined}
      />
      {searchParams.creada && (
        <div className="mb-6"><Notice tone="ok" icon={CircleCheck} title="Solicitud publicada">Avisamos a los profesionales verificados de {r.category_name} que cubren {r.location_label}. Te notificaremos cuando lleguen cotizaciones.</Notice></div>
      )}

      <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
        <div className="min-w-0 space-y-6">
          {/* COTIZACIONES */}
          <section aria-labelledby="cot">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <h2 id="cot" className="text-lg font-semibold">Cotizaciones recibidas <span className="font-num text-ink3">({quotes.length})</span></h2>
              {quotes.length > 1 && open && <p className="text-sm text-ink3">Ordenadas de menor a mayor precio</p>}
            </div>
            {quotes.length === 0 ? (
              <EmptyState icon={FileText} title="Esperando cotizaciones" description="Los profesionales verificados de tu zona ya fueron notificados. Normalmente responden en pocas horas." />
            ) : (
              <div className="grid gap-4 xl:grid-cols-2">
                {quotes.map((q) => (
                  <article key={q.id} className={cn('card flex flex-col overflow-hidden', q.status === 'accepted' && 'ring-2 ring-ok', q.status === 'rejected' && 'opacity-60')}>
                    <div className="flex items-start gap-3 p-5 pb-4">
                      <Avatar name={q.public_name} src={q.avatar_url} />
                      <div className="min-w-0 flex-1">
                        <Link href={`/profesionales/${q.professional_id}`} className="font-display font-semibold hover:text-brand">{q.public_name}</Link>
                        <div className="mt-1 flex flex-wrap items-center gap-2"><VerificationBadge status={q.verification_status} /></div>
                      </div>
                      {q.status !== 'sent' && <StatusBadge map={QUOTE} status={q.status} />}
                    </div>
                    <div className="grid grid-cols-3 border-y border-line bg-paper/60 text-center">
                      <div className="py-2.5"><Stars value={q.rating_average} /><p className="text-[11px] text-ink3">{q.reviews_count} reseñas</p></div>
                      <div className="border-x border-line py-2.5"><p className="font-num text-sm font-semibold">{q.years_experience} años</p><p className="text-[11px] text-ink3">experiencia</p></div>
                      <div className="py-2.5"><p className="font-num text-sm font-semibold">{q.completed_jobs_count}</p><p className="text-[11px] text-ink3">trabajos · {q.portfolio_count} fotos</p></div>
                    </div>
                    <div className="flex-1 space-y-3 p-5">
                      <div className="flex items-end justify-between gap-2">
                        <p className="font-num text-3xl font-semibold text-ink">{formatQ(q.price_amount)}</p>
                        {minPrice !== null && Number(q.price_amount) === minPrice && q.status === 'sent' && prices.length > 1 && <Badge tone="info">Menor precio</Badge>}
                      </div>
                      <p className="text-sm leading-relaxed text-ink2">{q.scope_description}</p>
                      <ul className="space-y-1.5 text-sm">
                        <li className="flex items-start gap-2">{q.materials_included ? <Package className="mt-0.5 h-4 w-4 shrink-0 text-ok" aria-hidden /> : <PackageX className="mt-0.5 h-4 w-4 shrink-0 text-warn" aria-hidden />}<span><strong className="font-medium">{q.materials_included ? 'Materiales incluidos' : 'Materiales no incluidos'}</strong>{q.materials_notes && <span className="text-ink2"> · {q.materials_notes}</span>}</span></li>
                        <li className="flex items-center gap-2"><Clock className="h-4 w-4 text-ink3" aria-hidden />Duración estimada: {q.estimated_duration}</li>
                        <li className="flex items-center gap-2"><CalendarDays className="h-4 w-4 text-ink3" aria-hidden />Disponible el {formatDate(q.proposed_date)}</li>
                      </ul>
                      {q.notes && <p className="rounded-xl bg-paper px-3 py-2 text-xs text-ink2">{q.notes}</p>}
                    </div>
                    {open && q.status === 'sent' && (
                      <ActionForm action={openQuoteChatAction} className="border-t border-line px-4 pt-4">
                        <input type="hidden" name="request_id" value={r.id} />
                        <input type="hidden" name="professional_id" value={q.professional_id} />
                        <SubmitButton className="btn-secondary w-full" pendingText="Abriendo chat…"><MessageCircle className="h-4 w-4" aria-hidden />Chatear con {q.public_name.split(' ·')[0]}</SubmitButton>
                      </ActionForm>
                    )}
                    {open && q.status === 'sent' && (
                      <ActionForm action={acceptQuoteAction} className="border-t border-line p-4"
                        confirm={`¿Aceptar la cotización de ${q.public_name} por ${formatQ(q.price_amount)}? Se creará la orden con este precio y alcance, y las demás cotizaciones se cerrarán.`}>
                        <input type="hidden" name="quote_id" value={q.id} />
                        <SubmitButton className="btn-primary w-full" pendingText="Creando orden…"><BadgeCheck className="h-4 w-4" aria-hidden />Aceptar esta cotización</SubmitButton>
                        <p className="mt-2 text-center text-xs text-ink3">Garantía de {category?.warranty_days ?? 30} días · pago <DemoBadge className="align-middle">simulado</DemoBadge></p>
                      </ActionForm>
                    )}
                  </article>
                ))}
              </div>
            )}
          </section>

        </div>

        <aside className="space-y-4">
          <div className="card card-pad space-y-4">
            <h2 className="font-display text-sm font-semibold">Detalle de tu solicitud</h2>
            <p className="text-sm leading-relaxed text-ink2">{r.description}</p>
            <ul className="space-y-2 text-sm text-ink2">
              <li className="flex items-start gap-2"><MapPin className="mt-0.5 h-4 w-4 shrink-0 text-ink3" aria-hidden /><span>{r.location_label} · {r.place_type === 'casa' ? 'Casa' : r.place_type === 'oficina' ? 'Oficina' : 'Otro espacio'}</span></li>
              <li className="flex items-start gap-2"><Lock className="mt-0.5 h-4 w-4 shrink-0 text-ink3" aria-hidden /><span>{r.address_private}<span className="block text-xs text-ink3">Privada hasta que contrates</span></span></li>
              <li className="flex items-start gap-2"><CalendarDays className="mt-0.5 h-4 w-4 shrink-0 text-ink3" aria-hidden />{formatDate(r.preferred_date)} · {r.preferred_time_window}</li>
            </ul>
            <div>
              <p className="mb-2 flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-ink3"><Images className="h-3.5 w-3.5" aria-hidden />Fotos</p>
              <PhotoGrid urls={r.photo_urls} alt="Foto de la solicitud" className="!grid-cols-2" />
            </div>
          </div>
          <div className="card card-pad">
            <p className="flex items-center gap-2 font-display text-sm font-semibold"><ShieldCheck className="h-4 w-4 text-ok" aria-hidden />Garantía de {category?.warranty_days ?? 30} días</p>
            <p className="mt-1.5 text-xs leading-relaxed text-ink2">Al aprobar el trabajo recibirás una garantía escrita según la política vigente de {r.category_name}.</p>
          </div>
          {open && (
            <ActionForm action={cancelRequestAction} confirm="¿Cancelar esta solicitud? Las cotizaciones recibidas se cerrarán.">
              <input type="hidden" name="request_id" value={r.id} />
              <SubmitButton className="btn-danger w-full" pendingText="Cancelando…"><X className="h-4 w-4" aria-hidden />Cancelar solicitud</SubmitButton>
            </ActionForm>
          )}
        </aside>
      </div>
    </>
  )
}
