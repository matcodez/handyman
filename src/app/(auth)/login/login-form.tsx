'use client'

import { useRef } from 'react'
import { ChevronDown, FlaskConical } from 'lucide-react'
import { loginAction } from '@/app/actions/auth'
import { ActionForm, SubmitButton } from '@/components/ui/action-form'

export function LoginForm({ demo, areas = [] }: {
  demo: { role: string; name: string; email: string; hint: string; password: string }[]
  areas?: { area: string; email: string; name: string }[]
}) {
  const email = useRef<HTMLInputElement>(null)
  const password = useRef<HTMLInputElement>(null)
  const fill = (e: string, p: string) => {
    if (email.current) email.current.value = e
    if (password.current) password.current.value = p
    email.current?.form?.querySelector<HTMLButtonElement>('button[type=submit]')?.focus()
  }

  return (
    <>
      <ActionForm action={loginAction} resetOnSuccess={false} className="space-y-4">
        <div>
          <label className="label" htmlFor="email">Correo electrónico</label>
          <input ref={email} id="email" name="email" type="email" autoComplete="email" required className="input" placeholder="tu@correo.com" />
        </div>
        <div>
          <label className="label" htmlFor="password">Contraseña</label>
          <input ref={password} id="password" name="password" type="password" autoComplete="current-password" required className="input" />
        </div>
        <SubmitButton className="btn-primary w-full" pendingText="Ingresando…">Ingresar</SubmitButton>
      </ActionForm>

      <section className="mt-8 rounded-2xl border border-dashed border-accent-dark/40 bg-accent-bg/60 p-4" aria-labelledby="demo-title">
        <h2 id="demo-title" className="flex items-center gap-2 font-display text-sm font-semibold text-accent-dark">
          <FlaskConical className="h-4 w-4" aria-hidden />Cuentas de demostración
        </h2>
        <p className="mt-1 text-xs text-ink2">Elige una para rellenar el formulario y luego presiona “Ingresar”.</p>
        <ul className="mt-3 space-y-2">
          {demo.map((d) => (
            <li key={d.email}>
              <button
                type="button"
                onClick={() => {
                  if (email.current) email.current.value = d.email
                  if (password.current) password.current.value = d.password
                  email.current?.form?.querySelector<HTMLButtonElement>('button[type=submit]')?.focus()
                }}
                className="flex w-full items-center justify-between gap-3 rounded-xl bg-white px-3.5 py-2.5 text-left shadow-card transition-shadow hover:shadow-lift"
              >
                <span className="min-w-0">
                  <span className="block truncate font-display text-sm font-medium text-ink">{d.name}</span>
                  <span className="block truncate text-xs text-ink3">{d.hint}</span>
                </span>
                <span className="shrink-0 rounded-full bg-brand-bg px-2.5 py-1 font-display text-[11px] font-medium text-brand-dark">{d.role}</span>
              </button>
            </li>
          ))}
        </ul>
        {areas.length > 0 && (
          <details className="group mt-3 rounded-xl bg-white shadow-card">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-3.5 py-2.5 font-display text-sm font-medium text-ink [&::-webkit-details-marker]:hidden">
              Ver un profesional de cada área ({areas.length})
              <ChevronDown className="h-4 w-4 text-ink3 transition-transform group-open:rotate-180" aria-hidden />
            </summary>
            <ul className="grid gap-1 border-t border-line p-2 sm:grid-cols-2">
              {areas.map((a) => (
                <li key={a.email}>
                  <button type="button" onClick={() => fill(a.email, demo[0]?.password ?? '')} className="w-full rounded-lg px-2.5 py-2 text-left hover:bg-paper">
                    <span className="block font-display text-[13px] font-medium text-ink">{a.area}</span>
                    <span className="block truncate text-xs text-ink3">{a.name}</span>
                  </button>
                </li>
              ))}
            </ul>
          </details>
        )}
      </section>
    </>
  )
}
