import Link from 'next/link'
import { notFound } from 'next/navigation'
import { CheckCircle2, Clock, Headphones, LoaderCircle, Phone, Siren } from 'lucide-react'
import { requireUser } from '@/lib/auth/session'
import { uuidSchema } from '@/lib/validation/schemas'
import { emergencyByKey } from '@/lib/domain/emergency'
import { getEmergencyStatus } from '@/lib/services/urgent'
import { SUPPORT_PHONE } from '@/lib/services/messaging'
import { requestEvaluationAction } from '@/app/actions/urgent'
import { ActionForm, SubmitButton } from '@/components/ui/action-form'
import { AutoRefresh } from '@/components/domain/auto-refresh'

export const metadata = { title: 'Tu emergencia' }

const TZ = 'America/Guatemala'
const hour = (d: Date) => new Intl.DateTimeFormat('es-GT', { hour: 'numeric', minute: '2-digit', timeZone: TZ }).format(new Date(d))

export default async function EmergencyStatus({ params }: { params: { id: string } }) {
  const user = await requireUser('customer')
  if (!uuidSchema.safeParse(params.id).success) notFound()
  const e = await getEmergencyStatus(user, params.id)
  if (!e) notFound()
  const kind = e.urgent_kind ? emergencyByKey(e.urgent_kind) : undefined
  const assigned = !!e.order_id
  const waitingMin = Math.max(0, Math.round((Date.now() - new Date(e.created_at).getTime()) / 60000))

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      {!assigned && e.status === 'open' && <AutoRefresh seconds={5} />}
      {assigned ? (
        <section className="card overflow-hidden">
          <div className="bg-ok px-5 py-6 text-white">
            <CheckCircle2 className="h-10 w-10" aria-hidden />
            <h1 className="mt-3 text-2xl font-bold">{e.pro_name?.split(' · ')[0]} va en camino</h1>
            {e.eta_at && <p className="mt-1 flex items-center gap-2 text-lg"><Clock className="h-5 w-5" aria-hidden />Llega cerca de las {hour(e.eta_at)} (unos {e.eta_minutes} min)</p>}
          </div>
          <div className="space-y-3 p-5">
            <p className="text-ink2">Al llegar, escanea su código QR para confirmar su identidad. Luego te enviará el presupuesto del trabajo desde la orden: solo se hace si lo apruebas.</p>
            <Link href={`/cliente/ordenes/${e.order_id}`} className="btn-primary w-full">Ver mi orden y chatear</Link>
          </div>
        </section>
      ) : e.status === 'open' ? (
        <section className="card overflow-hidden">
          <div className="bg-bad px-5 py-6 text-white">
            <Siren className="h-10 w-10 animate-pulse" aria-hidden />
            <h1 className="mt-3 text-2xl font-bold">Buscando un profesional…</h1>
            <p className="mt-1 text-white/90">{kind?.label ?? e.title} · {e.location_label}</p>
          </div>
          <div className="p-5">
            <p className="flex items-center gap-2 text-ink2"><LoaderCircle className="h-5 w-5 animate-spin text-bad" aria-hidden />
              Avisamos a {e.notified} profesional(es) {e.available ? 'disponibles ahora' : 'verificados'} de tu zona. Esta pantalla se actualiza sola.
            </p>
            <p className="mt-2 text-sm text-ink3">Esperando hace {waitingMin} min · Visita de diagnóstico Q {e.visit_fee}</p>
            {waitingMin >= 10 && (
              <p className="mt-3 rounded-xl bg-warn-bg px-3 py-2 text-sm">¿Está tardando? Llama a nuestra línea y un agente te ayuda a conseguir a alguien.</p>
            )}
          </div>
        </section>
      ) : (
        <section className="card card-pad"><h1 className="text-xl font-semibold">Esta emergencia ya no está activa.</h1></section>
      )}

      {kind && !assigned && (
        <section className="card card-pad">
          <h2 className="font-display text-lg font-semibold">Mientras tanto</h2>
          <ul className="mt-2 list-disc space-y-1.5 pl-5 text-[15px] text-ink2">{kind.tips.map((t) => <li key={t}>{t}</li>)}</ul>
        </section>
      )}

      <section className="card card-pad">
        <h2 className="flex items-center gap-2 font-display text-lg font-semibold"><Headphones className="h-5 w-5 text-brand" aria-hidden />¿Necesitas hablar con alguien?</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          <a href={`tel:${SUPPORT_PHONE.replace(/[^\d+]/g, '')}`} className="btn-secondary"><Phone className="h-4 w-4" aria-hidden />Llamar a Handyman</a>
          <ActionForm action={requestEvaluationAction} resetOnSuccess={false}>
            <input type="hidden" name="request_id" value={e.id} />
            <SubmitButton className="btn-ghost">Hablar con un técnico evaluador</SubmitButton>
          </ActionForm>
        </div>
      </section>
    </div>
  )
}
