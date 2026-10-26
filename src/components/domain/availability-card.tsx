import Link from 'next/link'
import { Radio, Siren } from 'lucide-react'
import { setAvailabilityAction } from '@/app/actions/urgent'
import { ActionForm, SubmitButton } from '@/components/ui/action-form'

const TZ = 'America/Guatemala'
const hour = (d: Date) => new Intl.DateTimeFormat('es-GT', { hour: 'numeric', minute: '2-digit', timeZone: TZ }).format(new Date(d))

/** Interruptor "Disponible ahora": quien lo activa recibe primero las emergencias de su oficio y zona. */
export function AvailabilityCard({ on, until, urgent }: { on: boolean; until: Date | null; urgent: { id: string; title: string; location_label: string }[] }) {
  return (
    <section className={`card overflow-hidden ${on ? 'ring-2 ring-ok' : ''}`}>
      <div className="flex flex-wrap items-center gap-4 p-5">
        <span className={`flex h-12 w-12 items-center justify-center rounded-2xl ${on ? 'bg-ok text-white' : 'bg-paper2 text-ink3'}`}><Radio className="h-6 w-6" aria-hidden /></span>
        <div className="min-w-0 flex-1">
          <p className="font-display text-lg font-semibold">{on ? 'Disponible para emergencias' : 'No disponible para emergencias'}</p>
          <p className="text-sm text-ink2">{on ? (until ? `Recibes primero las emergencias cercanas hasta las ${hour(until)}.` : 'Recibes primero las emergencias cercanas.') : 'Actívalo cuando puedas salir de inmediato: te avisamos primero de emergencias cerca.'}</p>
        </div>
        <ActionForm action={setAvailabilityAction} className="flex items-center gap-2">
          <input type="hidden" name="on" value={on ? '0' : '1'} />
          {!on && (
            <>
              <label htmlFor="hours" className="sr-only">Durante cuántas horas</label>
              <select id="hours" name="hours" defaultValue="4" className="input w-auto">
                <option value="2">2 horas</option><option value="4">4 horas</option><option value="8">8 horas</option>
              </select>
            </>
          )}
          <SubmitButton className={on ? 'btn-secondary' : 'btn-primary'}>{on ? 'Desactivar' : 'Estoy disponible'}</SubmitButton>
        </ActionForm>
      </div>
      {urgent.length > 0 && (
        <ul className="divide-y divide-bad/10 border-t border-bad/20 bg-bad-bg">
          {urgent.map((u) => (
            <li key={u.id}>
              <Link href={`/pro/solicitudes/${u.id}`} className="flex items-center gap-3 px-5 py-3 hover:bg-bad/10">
                <Siren className="h-5 w-5 shrink-0 animate-pulse text-bad" aria-hidden />
                <span className="min-w-0 flex-1 truncate font-display text-sm font-semibold text-bad">{u.title} · {u.location_label}</span>
                <span className="btn-sm rounded-lg bg-bad px-3 py-1.5 font-display text-xs font-semibold text-white">Ver y aceptar</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
