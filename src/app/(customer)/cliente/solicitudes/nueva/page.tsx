import { Lock, Send } from 'lucide-react'
import { requireUser } from '@/lib/auth/session'
import { todayGT } from '@/lib/format'
import { PLACE_TYPES, TIME_WINDOWS, ZONES } from '@/lib/domain/states'
import { listCategories } from '@/lib/services/catalog'
import { listAddresses } from '@/lib/services/accounts'
import { createRequestAction } from '@/app/actions/customer'
import { ActionForm, SubmitButton } from '@/components/ui/action-form'
import { PageHeader } from '@/components/ui/primitives'
import { PhotoInput } from '@/components/domain/photo-input'
import { CategoryIcon } from '@/components/domain/visuals'
import { Stepper } from './stepper'
import { DictateButton } from '@/components/domain/dictate-button'
import { QuickDate } from '@/components/domain/quick-date'
import { HelpTip } from '@/components/ui/help-tip'

export const metadata = { title: 'Nueva solicitud' }

export default async function NewRequestPage({ searchParams }: { searchParams: { oficio?: string } }) {
  const user = await requireUser('customer')
  const [categories, addresses] = await Promise.all([listCategories(), listAddresses(user.id)])
  const preset = categories.find((c) => c.slug === searchParams.oficio)?.id
  const home = addresses[0]

  return (
    <>
      <PageHeader title="Solicitar un servicio" description="Cuéntanos qué necesitas. Profesionales verificados de tu zona te enviarán cotizaciones." back={{ href: '/cliente/solicitudes', label: 'Mis solicitudes' }} />
      <ActionForm action={createRequestAction} resetOnSuccess={false} className="max-w-3xl">
        <Stepper
          steps={['Oficio', 'Descripción y fotos', 'Lugar', 'Fecha']}
          submit={<SubmitButton pendingText="Publicando…"><Send className="h-4 w-4" aria-hidden />Publicar solicitud</SubmitButton>}
        >
          <fieldset>
            <legend className="flex items-center gap-2 text-lg font-semibold">¿Qué tipo de trabajo necesitas? <HelpTip title="¿No sabes cuál elegir?">Elige el más parecido. Si te equivocas, un técnico de Handyman puede revisarlo y orientarte desde tu solicitud. Si es urgente (fuga, corto, puerta), usa mejor el botón rojo <strong>Emergencia</strong>.</HelpTip></legend>
            <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
              {categories.map((c, i) => (
                <label key={c.id} className="flex cursor-pointer items-center gap-2.5 rounded-xl border-2 border-line bg-white p-3 transition-colors hover:border-line2 has-[:checked]:border-brand has-[:checked]:bg-brand-bg/60">
                  <input type="radio" name="category_id" value={c.id} required defaultChecked={preset ? preset === c.id : false} className="sr-only" aria-describedby={i === 0 ? undefined : undefined} />
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-bg text-brand"><CategoryIcon iconKey={c.icon_key} className="h-[18px] w-[18px]" /></span>
                  <span className="font-display text-[13px] font-medium leading-tight">{c.name}</span>
                </label>
              ))}
            </div>
          </fieldset>

          <>
            <div>
              <label className="label" htmlFor="title">Título breve</label>
              <input id="title" name="title" required minLength={6} maxLength={90} className="input" placeholder="Ej.: Fuga de agua bajo el lavamanos" />
            </div>
            <div>
              <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2">
                <label className="label !mb-0" htmlFor="description">Describe el problema</label>
                <DictateButton target="description" />
              </div>
              <textarea id="description" name="description" required minLength={20} maxLength={1500} className="input" placeholder="Qué pasa, desde cuándo, medidas aproximadas, materiales que ya tienes…" aria-describedby="desc-hint" />
              <p id="desc-hint" className="hint">Mínimo 20 caracteres. Entre más detalle, más precisa será la cotización.</p>
            </div>
            <PhotoInput name="photos" label="Fotos del problema" required />
          </>

          <>
            <fieldset>
              <legend className="label">Tipo de lugar</legend>
              <div className="grid grid-cols-3 gap-2">
                {PLACE_TYPES.map((p, i) => (
                  <label key={p.value} className="flex cursor-pointer items-center justify-center rounded-xl border-2 border-line bg-white px-3 py-3 font-display text-sm font-medium has-[:checked]:border-brand has-[:checked]:bg-brand-bg/60">
                    <input type="radio" name="place_type" value={p.value} defaultChecked={i === 0} className="sr-only" />{p.label}
                  </label>
                ))}
              </div>
            </fieldset>
            <div>
              <label className="label" htmlFor="location_label">Zona o municipio</label>
              <select id="location_label" name="location_label" required defaultValue={home?.zone ?? ''} className="input">
                <option value="" disabled>Selecciona la zona</option>
                {ZONES.map((z) => <option key={z} value={z}>{z}</option>)}
              </select>
              <p className="hint">Es lo único que verán los profesionales antes de que contrates.</p>
            </div>
            <div>
              <label className="label flex items-center gap-1.5" htmlFor="address_private">Dirección exacta <HelpTip title="¿Quién ve mi dirección?">Antes de contratar, los profesionales solo ven tu zona. La dirección exacta la ve únicamente el profesional que tú elijas.</HelpTip></label>
              <input id="address_private" name="address_private" required minLength={8} maxLength={200} defaultValue={home?.address_private ?? ''} className="input" placeholder="Calle, número, edificio, apartamento, referencias" />
              <p className="hint flex items-start gap-1.5"><Lock className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />Privada: solo la verá el profesional que contrates.</p>
              {addresses.length > 1 && <p className="hint">Tienes {addresses.length} direcciones guardadas en tu perfil; se precargó “{home.label}”.</p>}
            </div>
          </>

          <>
            <div>
              <label className="label" htmlFor="preferred_date">¿Cuándo te queda bien?</label>
              <QuickDate target="preferred_date" today={todayGT()} />
              <input id="preferred_date" name="preferred_date" type="date" required min={todayGT()} className="input" />
            </div>
            <fieldset>
              <legend className="label">Ventana horaria</legend>
              <div className="grid gap-2 sm:grid-cols-2">
                {TIME_WINDOWS.map((w, i) => (
                  <label key={w} className="flex cursor-pointer items-center gap-2 rounded-xl border-2 border-line bg-white px-3.5 py-3 text-sm has-[:checked]:border-brand has-[:checked]:bg-brand-bg/60">
                    <input type="radio" name="preferred_time_window" value={w} defaultChecked={i === 0} className="accent-[#3154c8]" />{w}
                  </label>
                ))}
              </div>
            </fieldset>
            <p className="rounded-xl bg-paper px-4 py-3 text-sm text-ink2">Al publicar, avisaremos a los profesionales verificados que cubren este oficio y zona. Podrás comparar sus cotizaciones antes de aceptar alguna.</p>
          </>
        </Stepper>
      </ActionForm>
    </>
  )
}
