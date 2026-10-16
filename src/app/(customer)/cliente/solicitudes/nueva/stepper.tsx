'use client'

import { Children, useRef, useState } from 'react'
import { ArrowLeft, ArrowRight, Check } from 'lucide-react'
import { cn } from '@/lib/cn'

/**
 * Formulario por pasos. Todos los campos permanecen en el DOM (ocultos los que no son
 * del paso actual) para que el envío final incluya todo; cada paso se valida antes de avanzar.
 */
export function Stepper({ steps, children, submit }: { steps: string[]; children: React.ReactNode; submit: React.ReactNode }) {
  const [step, setStep] = useState(0)
  const ref = useRef<HTMLDivElement>(null)
  const panels = Children.toArray(children)

  const next = () => {
    const panel = ref.current?.querySelector<HTMLElement>(`[data-step="${step}"]`)
    const fields = panel ? Array.from(panel.querySelectorAll<HTMLInputElement>('input, select, textarea')) : []
    for (const f of fields) {
      if (!f.checkValidity()) {
        f.reportValidity()
        return
      }
    }
    setStep((s) => Math.min(s + 1, steps.length - 1))
    ref.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <div ref={ref} className="scroll-mt-24">
      <ol className="mb-6 flex items-center gap-2" aria-label="Pasos">
        {steps.map((s, i) => (
          <li key={s} className="flex flex-1 flex-col gap-2" aria-current={i === step ? 'step' : undefined}>
            <span className={cn('h-1.5 rounded-full transition-colors', i <= step ? 'bg-brand' : 'bg-line2')} />
            <span className={cn('hidden items-center gap-1.5 font-display text-xs sm:flex', i === step ? 'font-semibold text-ink' : 'text-ink3')}>
              {i < step ? <Check className="h-3.5 w-3.5 text-brand" aria-hidden /> : <span className="font-num">{i + 1}.</span>}{s}
            </span>
          </li>
        ))}
      </ol>
      <p className="mb-4 font-display text-sm text-ink3 sm:hidden">Paso {step + 1} de {steps.length}: <span className="font-semibold text-ink">{steps[step]}</span></p>

      {panels.map((p, i) => (
        <div key={i} data-step={i} hidden={i !== step} className="card card-pad space-y-5">{p}</div>
      ))}

      <div className="mt-5 flex items-center justify-between gap-3">
        <button type="button" onClick={() => setStep((s) => Math.max(0, s - 1))} className={cn('btn-ghost', step === 0 && 'invisible')}>
          <ArrowLeft className="h-4 w-4" aria-hidden />Atrás
        </button>
        {step < steps.length - 1 ? (
          <button type="button" onClick={next} className="btn-primary">Continuar<ArrowRight className="h-4 w-4" aria-hidden /></button>
        ) : (
          submit
        )}
      </div>
    </div>
  )
}
