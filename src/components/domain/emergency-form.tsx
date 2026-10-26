'use client'

import { useState } from 'react'
import { Droplets, Flame, KeyRound, PanelsTopLeft, Phone, Siren, Zap, type LucideIcon } from 'lucide-react'
import { cn } from '@/lib/cn'
import { EMERGENCIES, URGENT_VISIT_FEE } from '@/lib/domain/emergency'
import { ZONES } from '@/lib/domain/states'
import { createEmergencyAction } from '@/app/actions/urgent'
import { ActionForm, SubmitButton } from '@/components/ui/action-form'
import { PhotoInput } from './photo-input'

const ICONS: Record<string, LucideIcon> = { droplets: Droplets, zap: Zap, 'key-round': KeyRound, 'panels-top-left': PanelsTopLeft, flame: Flame }

/** Pedido de emergencia en un solo paso: un toque para elegir qué pasó, dirección precargada y enviar. */
export function EmergencyForm({ addresses }: { addresses: { id: string; label: string; zone: string; address_private: string }[] }) {
  const [kind, setKind] = useState('')
  const [addr, setAddr] = useState<(typeof addresses)[number] | null>(addresses[0] ?? null)
  const selected = EMERGENCIES.find((e) => e.key === kind)
  const isGas = selected && !selected.categorySlug

  return (
    <ActionForm action={createEmergencyAction} className="space-y-6">
      <fieldset>
        <legend className="font-display text-lg font-semibold">1. ¿Qué pasó?</legend>
        <div className="mt-3 grid grid-cols-2 gap-2.5 sm:grid-cols-3">
          {EMERGENCIES.map((e) => {
            const Icon = ICONS[e.icon] ?? Siren
            const on = kind === e.key
            return (
              <label key={e.key} className={cn('card flex cursor-pointer flex-col items-start gap-2 p-4 transition-all', on ? 'ring-2 ring-bad' : 'hover:shadow-lift', !e.categorySlug && 'border-bad/30')}>
                <input type="radio" name="kind" value={e.key} className="sr-only" checked={on} onChange={() => setKind(e.key)} required />
                <span className={cn('flex h-11 w-11 items-center justify-center rounded-xl', on ? 'bg-bad text-white' : 'bg-bad-bg text-bad')}><Icon className="h-6 w-6" aria-hidden /></span>
                <span className="font-display text-[15px] font-semibold leading-tight">{e.label}</span>
                <span className="text-xs text-ink3">{e.hint}</span>
              </label>
            )
          })}
        </div>
      </fieldset>

      {selected && (
        <div className={cn('rounded-2xl p-4', isGas ? 'bg-bad text-white' : 'bg-bad-bg')} role="status">
          <p className="font-display font-semibold">{isGas ? '⚠️ Esto lo atienden los bomberos' : 'Mientras llega el profesional:'}</p>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-[15px]">
            {selected.tips.map((t) => <li key={t}>{t}</li>)}
          </ul>
          {isGas && (
            <div className="mt-3 flex flex-wrap gap-2">
              <a href="tel:122" className="btn-secondary"><Phone className="h-4 w-4" aria-hidden />Bomberos Voluntarios 122</a>
              <a href="tel:123" className="btn-secondary"><Phone className="h-4 w-4" aria-hidden />Bomberos Municipales 123</a>
            </div>
          )}
        </div>
      )}

      {selected && !isGas && (
        <>
          <fieldset>
            <legend className="font-display text-lg font-semibold">2. ¿Dónde?</legend>
            {addresses.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {addresses.map((a) => (
                  <button key={a.id} type="button" onClick={() => setAddr(a)} className={cn('rounded-xl border px-3.5 py-2 text-sm', addr?.id === a.id ? 'border-navy bg-navy text-white' : 'border-line bg-white')}>
                    {a.label} · {a.zone}
                  </button>
                ))}
                <button type="button" onClick={() => setAddr(null)} className={cn('rounded-xl border px-3.5 py-2 text-sm', !addr ? 'border-navy bg-navy text-white' : 'border-line bg-white')}>Otra dirección</button>
              </div>
            )}
            <div className="mt-3 grid gap-3 sm:grid-cols-[200px_1fr]">
              <div>
                <label className="label" htmlFor="location_label">Zona</label>
                <select id="location_label" name="location_label" required key={`z-${addr?.id ?? 'otra'}`} defaultValue={addr?.zone ?? ''} className="input">
                  <option value="" disabled>Elige tu zona</option>
                  {ZONES.map((z) => <option key={z} value={z}>{z}</option>)}
                </select>
              </div>
              <div>
                <label className="label" htmlFor="address_private">Dirección exacta</label>
                <input id="address_private" name="address_private" required minLength={8} maxLength={300} key={`a-${addr?.id ?? 'otra'}`} defaultValue={addr?.address_private ?? ''} className="input" placeholder="Calle, número, edificio, apartamento" />
              </div>
            </div>
            <p className="mt-1.5 text-xs text-ink3">Solo la verá el profesional que tome tu emergencia.</p>
          </fieldset>

          <details className="rounded-2xl border border-line bg-white">
            <summary className="cursor-pointer list-none px-4 py-3 font-display text-sm font-medium [&::-webkit-details-marker]:hidden">+ Agregar detalle o foto (opcional)</summary>
            <div className="space-y-3 border-t border-line p-4">
              <div>
                <label className="label" htmlFor="details">Cuéntanos un poco más</label>
                <textarea id="details" name="details" maxLength={600} className="input" placeholder="Ej.: Se rompió el tubo debajo del lavamanos y sale bastante agua." />
              </div>
              <PhotoInput name="photos" label="Foto (ayuda a que lleguen con el repuesto correcto)" />
            </div>
          </details>

          <div className="rounded-2xl bg-paper p-4 text-sm">
            <p><strong className="font-medium">Visita de diagnóstico: Q {URGENT_VISIT_FEE} precio fijo.</strong> Si contratas la reparación, se descuenta del total.</p>
            <p className="mt-1 text-ink2">Avisamos primero a los profesionales disponibles ahora cerca de ti. El primero que acepta va en camino y ves su tiempo de llegada.</p>
          </div>

          <SubmitButton className="h-14 w-full rounded-2xl bg-bad font-display text-lg font-semibold text-white hover:bg-bad/90" pendingText="Avisando a profesionales…">
            <Siren className="h-6 w-6" aria-hidden />Pedir ayuda ahora
          </SubmitButton>
        </>
      )}
    </ActionForm>
  )
}
