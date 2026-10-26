import Link from 'next/link'
import {
  BadgeCheck, CalendarDays, Camera, CircleCheck, Clock, FilePen, Hourglass, Lock, MapPin, Package, PackageX, Phone, Play, ScanLine,
  ShieldCheck, Star, TriangleAlert, Truck, MessageCircle, LifeBuoy,
} from 'lucide-react'
import { formatDate, formatDateTime, formatQ } from '@/lib/format'
import { CASE, DISPUTE_REASONS, ORDER } from '@/lib/domain/states'
import type { OrderRow, getOrderExtras } from '@/lib/services/orders'
import { approveOrderAction, disputeAction, resolveChangeAction, reviewAction } from '@/app/actions/customer'
import { completeOrderAction, orderStepAction, requestChangeAction } from '@/app/actions/pro'
import { openSupportChatAction } from '@/app/actions/messaging'
import { ActionForm, SubmitButton } from '@/components/ui/action-form'
import { Badge, DefList, Notice, PageHeader } from '@/components/ui/primitives'
import { OrderTimeline, PaymentBadge, QrBadge, WarrantyCard } from './cards'
import { PhotoInput } from './photo-input'
import { Avatar, PhotoGrid, StatusBadge, VerificationBadge } from './visuals'

type Extras = Awaited<ReturnType<typeof getOrderExtras>>
type Viewer = 'customer' | 'professional' | 'admin'

function StepButton({ orderId, step, children, className = 'btn-primary w-full', confirm }: { orderId: string; step: string; children: React.ReactNode; className?: string; confirm?: string }) {
  return (
    <ActionForm action={orderStepAction} confirm={confirm}>
      <input type="hidden" name="order_id" value={orderId} />
      <input type="hidden" name="step" value={step} />
      <SubmitButton className={className}>{children}</SubmitButton>
    </ActionForm>
  )
}

function ScoreSelect({ name, label }: { name: string; label: string }) {
  return (
    <fieldset>
      <legend className="label">{label}</legend>
      <div className="flex gap-1.5">
        {[1, 2, 3, 4, 5].map((n) => (
          <label key={n} className="flex h-11 w-11 cursor-pointer items-center justify-center rounded-xl border-2 border-line bg-white font-num font-semibold has-[:checked]:border-accent has-[:checked]:bg-accent-bg">
            <input type="radio" name={name} value={n} required defaultChecked={n === 5} className="sr-only" />{n}
          </label>
        ))}
      </div>
    </fieldset>
  )
}

export async function OrderDetail({ o, x, viewer, back, banner }: { o: OrderRow; x: Extras; viewer: Viewer; back: { href: string; label: string }; banner?: React.ReactNode }) {
  const s = o.agreed_scope_snapshot
  const pendingChange = x.changes.find((c) => c.status === 'pending')
  const finalEvidence = x.evidence.filter((e) => e.stage === 'final')
  const claimEvidence = x.evidence.filter((e) => e.stage === 'claim')
  const preArrival = ['scheduled', 'en_route'].includes(o.status)
  const otherName = viewer === 'customer' ? o.pro_name : o.customer_name
  const otherPhone = viewer === 'customer' ? o.pro_phone : o.customer_phone

  return (
    <>
      <PageHeader
        title={s.title}
        back={back}
        description={<span className="flex flex-wrap items-center gap-2"><Badge tone={ORDER[o.status].tone}>{viewer === 'professional' && o.status === 'pending_approval' ? 'Esperando aprobación del cliente' : ORDER[o.status].label}</Badge><span className="font-num">Orden {o.order_number}</span><span>· {s.category}</span></span>}
      />
      {banner && <div className="mb-5">{banner}</div>}

      <div className="card card-pad mb-6"><OrderTimeline status={o.status} /></div>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="min-w-0 space-y-5">
          {/* ── Acciones del cliente ── */}
          {viewer === 'customer' && preArrival && (
            <section className="card overflow-hidden">
              <div className="flex items-center gap-3 bg-navy px-5 py-4 text-white">
                <ScanLine className="h-6 w-6 text-accent" aria-hidden />
                <div>
                  <h2 className="font-display text-base font-semibold text-white">Confirma la identidad al llegar</h2>
                  <p className="text-xs text-white/70">{o.arrival_marked_at ? `${o.pro_name} indicó que llegó · ${formatDateTime(o.arrival_marked_at)}` : o.status === 'en_route' ? `${o.pro_name} va en camino` : `Programado para el ${formatDate(o.scheduled_at)}`}</p>
                </div>
              </div>
              <div className="card-pad space-y-3 text-sm text-ink2">
                <p>Antes de dejarlo pasar, pide al profesional su carné digital y escanea el código QR con la cámara de tu teléfono. Verás su foto, nombre y estado de verificación para compararlos con la persona presente.</p>
                <Link href={`/verificar/${o.pro_qr_token}`} className="btn-primary w-full sm:w-auto"><ScanLine className="h-4 w-4" aria-hidden />Abrir verificación del profesional asignado</Link>
                <p className="text-xs text-ink3">Para la demo en un solo equipo puedes usar este botón: abre la misma página a la que apunta el QR.</p>
              </div>
            </section>
          )}

          {viewer === 'customer' && pendingChange && (
            <section className="card card-pad ring-2 ring-accent">
              <h2 className="flex items-center gap-2 text-base font-semibold"><FilePen className="h-5 w-5 text-accent-dark" aria-hidden />El profesional solicita modificar el precio</h2>
              <p className="mt-2 text-sm text-ink2">{pendingChange.description}</p>
              <p className="mt-3 font-num text-lg"><span className="text-ink3 line-through">{formatQ(o.agreed_price)}</span> → <strong className="font-semibold">{formatQ(pendingChange.new_price)}</strong></p>
              <div className="mt-4 flex flex-wrap gap-2">
                <ActionForm action={resolveChangeAction} confirm={`¿Aprobar el nuevo precio de ${formatQ(pendingChange.new_price)}?`}>
                  <input type="hidden" name="change_id" value={pendingChange.id} /><input type="hidden" name="decision" value="approve" />
                  <SubmitButton>Aprobar modificación</SubmitButton>
                </ActionForm>
                <ActionForm action={resolveChangeAction}>
                  <input type="hidden" name="change_id" value={pendingChange.id} /><input type="hidden" name="decision" value="reject" />
                  <SubmitButton className="btn-secondary">Rechazar</SubmitButton>
                </ActionForm>
              </div>
              <p className="mt-3 text-xs text-ink3">Si la rechazas, se mantiene el precio y alcance acordados originalmente.</p>
            </section>
          )}

          {viewer === 'customer' && o.status === 'pending_approval' && (
            <section className="card card-pad space-y-5">
              <div>
                <h2 className="flex items-center gap-2 text-lg font-semibold"><Camera className="h-5 w-5 text-brand" aria-hidden />Revisa la evidencia del trabajo terminado</h2>
                <p className="mt-1 text-sm text-ink2">{o.pro_name} marcó el trabajo como terminado el {formatDateTime(o.completed_at)}.</p>
              </div>
              <PhotoGrid urls={finalEvidence.map((e) => e.photo_url)} alt="Evidencia final" />
              {finalEvidence[0]?.caption && <p className="rounded-xl bg-paper px-4 py-3 text-sm text-ink2">“{finalEvidence[0].caption}”</p>}
              <ActionForm action={approveOrderAction} confirm="¿Apruebas el trabajo? La orden se completará, el pago demo se liberará y se emitirá tu garantía escrita.">
                <input type="hidden" name="order_id" value={o.id} />
                <SubmitButton className="btn-primary w-full" pendingText="Aprobando…"><CircleCheck className="h-4 w-4" aria-hidden />Aprobar trabajo y emitir garantía</SubmitButton>
              </ActionForm>
              <details className="group rounded-2xl border border-line">
                <summary className="flex cursor-pointer list-none items-center gap-2 px-4 py-3 font-display text-sm font-medium text-bad [&::-webkit-details-marker]:hidden">
                  <TriangleAlert className="h-4 w-4" aria-hidden />Algo no quedó bien: abrir una incidencia
                </summary>
                <ActionForm action={disputeAction} className="space-y-4 border-t border-line p-4" confirm="¿Abrir una incidencia? La orden quedará en disputa y administración revisará el caso.">
                  <input type="hidden" name="order_id" value={o.id} />
                  <div>
                    <label className="label" htmlFor="reason">Motivo</label>
                    <select id="reason" name="reason" required className="input" defaultValue="">
                      <option value="" disabled>Selecciona un motivo</option>
                      {DISPUTE_REASONS.map((r) => <option key={r} value={r}>{r}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="label" htmlFor="description">Describe el problema</label>
                    <textarea id="description" name="description" required minLength={15} maxLength={1200} className="input" />
                  </div>
                  <PhotoInput name="photos" label="Fotos de evidencia (opcional)" />
                  <SubmitButton className="btn-danger w-full" pendingText="Enviando…">Abrir incidencia</SubmitButton>
                </ActionForm>
              </details>
            </section>
          )}

          {/* ── Acciones del profesional ── */}
          {viewer === 'professional' && preArrival && (
            <section className="card card-pad space-y-4">
              <h2 className="text-lg font-semibold">Llegada al servicio</h2>
              <div className="grid gap-5 sm:grid-cols-[1fr_220px] sm:items-start">
                <div className="space-y-3 text-sm text-ink2">
                  <p>Al llegar, muestra este carné al cliente. Él escaneará el QR para confirmar tu identidad; después podrás iniciar el trabajo.</p>
                  {o.status === 'scheduled' && <StepButton orderId={o.id} step="en_route" className="btn-secondary w-full"><Truck className="h-4 w-4" aria-hidden />Avisar que voy en camino</StepButton>}
                  {!o.arrival_marked_at ? (
                    <StepButton orderId={o.id} step="arrival"><MapPin className="h-4 w-4" aria-hidden />Marcar que llegué</StepButton>
                  ) : (
                    <Notice tone="info" icon={Hourglass}>Llegada marcada {formatDateTime(o.arrival_marked_at)}. Esperando que el cliente confirme tu identidad con el QR.</Notice>
                  )}
                </div>
                <QrBadge token={o.pro_qr_token} name={o.pro_name} />
              </div>
            </section>
          )}

          {viewer === 'professional' && o.status === 'arrived' && (
            <section className="card card-pad space-y-3">
              <Notice tone="ok" icon={BadgeCheck} title="Identidad confirmada por el cliente">{formatDateTime(o.arrival_confirmed_at)}</Notice>
              <StepButton orderId={o.id} step="start"><Play className="h-4 w-4" aria-hidden />Iniciar trabajo</StepButton>
            </section>
          )}

          {viewer === 'professional' && o.status === 'in_progress' && (
            <section className="card card-pad">
              <h2 className="flex items-center gap-2 text-lg font-semibold"><Camera className="h-5 w-5 text-brand" aria-hidden />Entregar trabajo terminado</h2>
              <p className="mt-1 text-sm text-ink2">Sube fotos claras del resultado. El cliente las revisará para aprobar o abrir una incidencia.</p>
              <ActionForm action={completeOrderAction} className="mt-4 space-y-4" confirm="¿Marcar el trabajo como terminado y enviar la evidencia al cliente?">
                <input type="hidden" name="order_id" value={o.id} />
                <PhotoInput name="photos" label="Fotos del trabajo terminado" required />
                <div>
                  <label className="label" htmlFor="caption">Nota para el cliente (opcional)</label>
                  <input id="caption" name="caption" maxLength={200} className="input" placeholder="Ej.: Se cambió el sifón y se probó por 20 minutos sin fugas." />
                </div>
                <SubmitButton className="btn-primary w-full" pendingText="Enviando evidencia…">Marcar como terminado</SubmitButton>
              </ActionForm>
            </section>
          )}

          {viewer === 'professional' && ['scheduled', 'en_route', 'arrived', 'in_progress'].includes(o.status) && (
            <details className="card group">
              <summary className="flex cursor-pointer list-none items-center gap-2 px-5 py-4 font-display text-sm font-medium [&::-webkit-details-marker]:hidden">
                <FilePen className="h-4 w-4 text-brand" aria-hidden />Solicitar modificación de precio o alcance
              </summary>
              {pendingChange ? (
                <p className="border-t border-line px-5 py-4 text-sm text-ink2">Ya enviaste una modificación a {formatQ(pendingChange.new_price)}. Esperando respuesta del cliente.</p>
              ) : (
                <ActionForm action={requestChangeAction} className="space-y-4 border-t border-line p-5">
                  <input type="hidden" name="order_id" value={o.id} />
                  <p className="text-sm text-ink2">El precio acordado está congelado. Cualquier cambio debe aprobarlo el cliente y queda en la auditoría.</p>
                  <div>
                    <label className="label" htmlFor="ch-desc">Motivo del cambio</label>
                    <textarea id="ch-desc" name="description" required minLength={10} maxLength={600} className="input" placeholder="Ej.: Al abrir la pared se encontró tubería galvanizada que también debe cambiarse." />
                  </div>
                  <div>
                    <label className="label" htmlFor="ch-price">Nuevo precio total (Q)</label>
                    <input id="ch-price" name="new_price" required inputMode="decimal" pattern="^\d{1,7}(\.\d{1,2})?$" className="input" placeholder={o.agreed_price} />
                  </div>
                  <SubmitButton className="btn-secondary w-full">Enviar al cliente</SubmitButton>
                </ActionForm>
              )}
            </details>
          )}

          {viewer === 'professional' && o.status === 'pending_approval' && (
            <Notice tone="info" icon={Hourglass} title="Esperando aprobación del cliente">Enviaste la evidencia el {formatDateTime(o.completed_at)}. Te avisaremos cuando el cliente apruebe o si abre una incidencia.</Notice>
          )}

          {/* ── Estados compartidos ── */}
          {x.cases.length > 0 && (
            <section className="card card-pad">
              <h2 className="flex items-center gap-2 text-base font-semibold"><TriangleAlert className="h-5 w-5 text-bad" aria-hidden />Casos de soporte</h2>
              <ul className="mt-3 space-y-3">
                {x.cases.map((c) => (
                  <li key={c.id} className="rounded-xl bg-paper p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="font-display text-sm font-semibold">{c.case_number} · {c.kind === 'dispute' ? 'Incidencia' : 'Garantía'}</p>
                      <StatusBadge map={CASE} status={c.status} />
                    </div>
                    <p className="mt-1 text-sm font-medium">{c.reason}</p>
                    <p className="mt-1 text-sm text-ink2">{c.description}</p>
                    {c.resolution && <p className="mt-2 rounded-lg bg-white px-3 py-2 text-sm"><strong className="font-medium">Resolución:</strong> {c.resolution}</p>}
                    {viewer === 'admin' && <Link href={`/admin/casos/${c.id}`} className="mt-2 inline-block text-sm font-medium text-brand hover:underline">Gestionar caso</Link>}
                  </li>
                ))}
              </ul>
              {claimEvidence.length > 0 && <PhotoGrid urls={claimEvidence.map((e) => e.photo_url)} alt="Evidencia del reclamo" className="mt-3" />}
            </section>
          )}

          {x.warranty && (
            <WarrantyCard w={x.warranty} orderNumber={o.order_number} title={s.title} proName={o.pro_name}>
              {viewer === 'customer' && <Link href="/cliente/garantias" className="btn-secondary btn-sm">Reportar un problema con la garantía</Link>}
            </WarrantyCard>
          )}

          {viewer === 'customer' && o.status === 'completed' && !x.review && (
            <section className="card card-pad">
              <h2 className="flex items-center gap-2 text-lg font-semibold"><Star className="h-5 w-5 fill-accent text-accent" aria-hidden />Califica a {o.pro_name}</h2>
              <ActionForm action={reviewAction} className="mt-4 space-y-4">
                <input type="hidden" name="order_id" value={o.id} />
                <div className="grid gap-4 sm:grid-cols-3">
                  <ScoreSelect name="punctuality_score" label="Puntualidad" />
                  <ScoreSelect name="communication_score" label="Comunicación" />
                  <ScoreSelect name="cleanliness_score" label="Limpieza" />
                </div>
                <div>
                  <label className="label" htmlFor="comment">Comentario (opcional)</label>
                  <textarea id="comment" name="comment" maxLength={600} className="input" />
                </div>
                <SubmitButton>Publicar calificación</SubmitButton>
              </ActionForm>
            </section>
          )}
          {x.review && (
            <section className="card card-pad">
              <h2 className="text-base font-semibold">Calificación del cliente</h2>
              <p className="mt-2 text-sm text-ink2">Puntualidad {x.review.punctuality_score}/5 · Comunicación {x.review.communication_score}/5 · Limpieza {x.review.cleanliness_score}/5</p>
              {x.review.comment && <p className="mt-1.5 text-[15px]">“{x.review.comment}”</p>}
            </section>
          )}

          {o.status !== 'pending_approval' && finalEvidence.length > 0 && (
            <section className="card card-pad">
              <h2 className="flex items-center gap-2 text-base font-semibold"><Camera className="h-5 w-5 text-brand" aria-hidden />Evidencia de finalización</h2>
              <PhotoGrid urls={finalEvidence.map((e) => e.photo_url)} alt="Evidencia final" className="mt-3" />
            </section>
          )}

          <section className="card card-pad">
            <h2 className="text-base font-semibold">Alcance acordado</h2>
            <p className="mt-1 text-xs text-ink3">Copia congelada de la cotización aceptada el {formatDateTime(s.accepted_at)}</p>
            <p className="mt-3 text-[15px] leading-relaxed text-ink2">{s.scope_description}</p>
            <ul className="mt-3 space-y-1.5 text-sm">
              <li className="flex items-start gap-2">{s.materials_included ? <Package className="mt-0.5 h-4 w-4 text-ok" aria-hidden /> : <PackageX className="mt-0.5 h-4 w-4 text-warn" aria-hidden />}{s.materials_included ? 'Materiales incluidos' : 'Materiales no incluidos'}{s.materials_notes && ` · ${s.materials_notes}`}</li>
              <li className="flex items-center gap-2"><Clock className="h-4 w-4 text-ink3" aria-hidden />Duración estimada: {s.estimated_duration}</li>
            </ul>
            {x.changes.length > 0 && (
              <div className="mt-4 border-t border-line pt-4">
                <p className="text-xs font-medium uppercase tracking-wide text-ink3">Modificaciones</p>
                <ul className="mt-2 space-y-2 text-sm">
                  {x.changes.map((c) => (
                    <li key={c.id} className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-ink2">{c.description} → <strong className="font-num font-medium text-ink">{formatQ(c.new_price)}</strong></span>
                      <Badge tone={c.status === 'approved' ? 'ok' : c.status === 'rejected' ? 'neutral' : 'warn'}>{c.status === 'approved' ? 'Aprobada' : c.status === 'rejected' ? 'Rechazada' : 'Pendiente'}</Badge>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </section>
        </div>

        <aside className="space-y-4">
          <div className="card card-pad space-y-2.5">
            <Link href={`/mensajes/orden/${o.id}`} className="btn-primary w-full"><MessageCircle className="h-4 w-4" aria-hidden />{viewer === 'admin' ? 'Ver chat de la orden' : `Chatear con ${viewer === 'customer' ? o.pro_name.split(' ·')[0] : o.customer_name.split(' ')[0]}`}</Link>
            {viewer !== 'admin' && (
              <ActionForm action={openSupportChatAction} resetOnSuccess={false}>
                <input type="hidden" name="order_id" value={o.id} />
                <input type="hidden" name="subject" value={`Ayuda con la orden ${o.order_number}`} />
                <SubmitButton className="btn-secondary w-full" pendingText="Abriendo…"><LifeBuoy className="h-4 w-4" aria-hidden />Necesito ayuda con esta orden</SubmitButton>
              </ActionForm>
            )}
          </div>
          <div className="card card-pad">
            <p className="text-xs uppercase tracking-wide text-ink3">Precio acordado</p>
            <p className="mt-1 font-num text-3xl font-semibold">{formatQ(o.agreed_price)}</p>
            {o.agreed_price !== s.quoted_price && <p className="text-xs text-ink3">Cotizado originalmente: {formatQ(s.quoted_price)}</p>}
            <div className="mt-3"><PaymentBadge status={o.payment_status} /></div>
            <p className="mt-2 text-xs leading-relaxed text-ink3">Estado de pago simulado (referencia {o.payment_reference}). No se cobró ni se retuvo dinero real.</p>
          </div>

          <div className="card card-pad">
            <div className="flex items-center gap-3">
              <Avatar name={otherName} src={viewer === 'customer' ? o.pro_avatar : null} />
              <div className="min-w-0">
                <p className="text-xs uppercase tracking-wide text-ink3">{viewer === 'customer' ? 'Profesional' : viewer === 'professional' ? 'Cliente' : `${o.customer_name} → profesional`}</p>
                <p className="truncate font-display font-semibold">{viewer === 'admin' ? o.pro_name : otherName}</p>
              </div>
            </div>
            {viewer !== 'professional' && <div className="mt-3"><VerificationBadge status={o.pro_verification} /></div>}
            {viewer !== 'admin' && otherPhone && <p className="mt-3 flex items-center gap-2 text-sm text-ink2"><Phone className="h-4 w-4 text-ink3" aria-hidden />{otherPhone}</p>}
          </div>

          <div className="card card-pad">
            <DefList items={[
              ['Fecha', <span key="d" className="inline-flex items-center gap-1.5"><CalendarDays className="h-4 w-4 text-ink3" aria-hidden />{formatDate(o.scheduled_at)}</span>],
              ['Horario', o.preferred_time_window],
            ]} />
            <div className="mt-4 border-t border-line pt-4">
              <p className="text-xs uppercase tracking-wide text-ink3">Dirección del servicio</p>
              <p className="mt-1 flex items-start gap-2 text-sm"><MapPin className="mt-0.5 h-4 w-4 shrink-0 text-ink3" aria-hidden />{o.address_private}</p>
              <p className="mt-1.5 flex items-center gap-1.5 text-xs text-ink3"><Lock className="h-3 w-3" aria-hidden />Visible solo para los participantes de esta orden.</p>
            </div>
          </div>

          <div className="card card-pad">
            <p className="text-xs font-medium uppercase tracking-wide text-ink3">Registro</p>
            <ul className="mt-2 space-y-1.5 text-xs text-ink2">
              <li>Orden creada · {formatDateTime(o.created_at)}</li>
              {o.en_route_at && <li>En camino · {formatDateTime(o.en_route_at)}</li>}
              {o.arrival_confirmed_at && <li className="flex items-center gap-1"><ShieldCheck className="h-3.5 w-3.5 text-ok" aria-hidden />Identidad confirmada con QR · {formatDateTime(o.arrival_confirmed_at)}</li>}
              {o.started_at && <li>Trabajo iniciado · {formatDateTime(o.started_at)}</li>}
              {o.completed_at && <li>Trabajo entregado · {formatDateTime(o.completed_at)}</li>}
              {o.approved_at && <li>Aprobado · {formatDateTime(o.approved_at)}</li>}
            </ul>
          </div>
        </aside>
      </div>
    </>
  )
}
