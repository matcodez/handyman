import Link from 'next/link'
import { BadgeCheck, CircleAlert, Lock, ScanLine, ShieldAlert } from 'lucide-react'
import { db } from '@/lib/db/client'
import { getSession } from '@/lib/auth/session'
import { formatDate } from '@/lib/format'
import { getProByQrToken, listProCategories } from '@/lib/services/professionals'
import { confirmArrivalAction } from '@/app/actions/customer'
import { ActionForm, SubmitButton } from '@/components/ui/action-form'
import { Notice } from '@/components/ui/primitives'
import { Avatar, Stars, VerificationBadge } from '@/components/domain/visuals'

export const metadata = { title: 'Verificación de identidad', robots: 'noindex' }

/**
 * Página pública a la que apunta el QR del carné.
 * Muestra solo foto, nombre y estado de verificación. Abrirla no cambia nada:
 * la confirmación exige sesión del cliente dueño de una orden activa con este profesional.
 */
export default async function VerifyPage({ params }: { params: { token: string } }) {
  const pro = /^[A-Za-z0-9_-]{16,40}$/.test(params.token) ? await getProByQrToken(params.token) : undefined

  if (!pro) {
    return (
      <div className="container-page flex min-h-[60vh] max-w-md flex-col items-center justify-center py-12 text-center">
        <span className="flex h-16 w-16 items-center justify-center rounded-full bg-bad-bg text-bad"><ShieldAlert className="h-8 w-8" aria-hidden /></span>
        <h1 className="mt-5 text-2xl font-semibold">Código no reconocido</h1>
        <p className="mt-2 text-ink2">Este código QR no corresponde a ningún profesional de Handyman. No permitas el ingreso y repórtalo a soporte.</p>
        <Link href="/" className="btn-secondary mt-6">Ir al inicio</Link>
      </div>
    )
  }

  const [user, categories] = await Promise.all([getSession(), listProCategories(pro.user_id)])
  const approved = pro.verification_status === 'approved'
  const orders = user?.role === 'customer'
    ? await db.q<{ id: string; order_number: string; title: string; status: string; arrival_confirmed_at: Date | null }>(
        `select o.id, o.order_number, r.title, o.status, o.arrival_confirmed_at
         from orders o join service_requests r on r.id = o.request_id
         where o.customer_id = $1 and o.professional_id = $2 and o.status in ('scheduled','en_route','arrived','in_progress')
         order by o.scheduled_at`,
        [user.id, pro.user_id],
      )
    : []
  const pending = orders.filter((o) => ['scheduled', 'en_route'].includes(o.status))

  return (
    <div className="container-page max-w-md py-8">
      <p className="flex items-center justify-center gap-2 font-display text-xs font-medium uppercase tracking-[0.16em] text-ink3"><ScanLine className="h-4 w-4" aria-hidden />Verificación de identidad</p>

      <div className={`mt-4 overflow-hidden rounded-3xl shadow-lift ${approved ? 'bg-white' : 'bg-white ring-2 ring-bad'}`}>
        <div className={`px-5 py-4 text-center font-display text-sm font-semibold text-white ${approved ? 'bg-ok' : 'bg-bad'}`}>
          <span className="inline-flex items-center gap-2">
            {approved ? <BadgeCheck className="h-5 w-5" aria-hidden /> : <CircleAlert className="h-5 w-5" aria-hidden />}
            {approved ? 'Profesional verificado por Handyman' : 'Este profesional NO está verificado actualmente'}
          </span>
        </div>
        <div className="flex flex-col items-center px-6 py-7 text-center">
          <Avatar name={pro.public_name} src={pro.avatar_url} size="xl" />
          <h1 className="mt-4 text-2xl font-semibold">{pro.full_name}</h1>
          <p className="text-sm text-ink2">{pro.public_name}</p>
          <div className="mt-3"><VerificationBadge status={pro.verification_status} /></div>
          <div className="mt-4 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-sm text-ink2">
            <Stars value={pro.rating_average} count={pro.reviews_count} />
            <span><strong className="font-num font-semibold text-ink">{pro.completed_jobs_count}</strong> trabajos completados</span>
          </div>
          <p className="mt-2 text-sm text-ink2">{categories.map((c) => c.name).join(' · ')}</p>
          {approved && pro.verified_at && <p className="mt-2 text-xs text-ink3">Verificado desde el {formatDate(pro.verified_at)}</p>}
        </div>
      </div>

      <div className="mt-5 space-y-3">
        {!approved && (
          <Notice tone="bad" icon={ShieldAlert} title="No permitas el ingreso">Su perfil no tiene una verificación vigente. Si tienes una orden con esta persona, contacta a soporte.</Notice>
        )}

        {approved && pending.map((o) => (
          <ActionForm key={o.id} action={confirmArrivalAction} className="card card-pad" confirm="¿Confirmas que la persona presente es la de la foto?">
            <input type="hidden" name="order_id" value={o.id} />
            <input type="hidden" name="token" value={params.token} />
            <p className="text-xs uppercase tracking-wide text-ink3">Tu orden {o.order_number}</p>
            <p className="font-display font-semibold">{o.title}</p>
            <p className="mt-2 text-sm text-ink2">Compara la foto y el nombre con la persona que tienes enfrente. Si coincide, confirma para registrar su llegada.</p>
            <SubmitButton className="btn-primary mt-4 w-full" pendingText="Registrando…"><BadgeCheck className="h-4 w-4" aria-hidden />Sí, es esta persona. Confirmar identidad</SubmitButton>
          </ActionForm>
        ))}

        {approved && orders.filter((o) => o.arrival_confirmed_at).map((o) => (
          <Notice key={o.id} tone="ok" icon={BadgeCheck} title={`Identidad ya confirmada · ${o.order_number}`}>
            <Link href={`/cliente/ordenes/${o.id}`} className="underline">Volver a la orden</Link>
          </Notice>
        ))}

        {approved && !user && (
          <Notice tone="info" icon={Lock} title="¿Es tu orden?">
            <Link href="/login" className="font-medium underline">Inicia sesión como cliente</Link> para registrar la confirmación de identidad en tu orden.
          </Notice>
        )}
        {approved && user?.role === 'customer' && orders.length === 0 && (
          <Notice tone="neutral" icon={CircleAlert}>No tienes una orden activa con este profesional, por lo que no hay nada que confirmar.</Notice>
        )}
        <p className="flex items-start gap-2 px-1 text-xs text-ink3"><Lock className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />Esta página no muestra documentos, teléfono ni dirección. Escanear el código no aprueba trabajos ni cambia permisos.</p>
      </div>
    </div>
  )
}
