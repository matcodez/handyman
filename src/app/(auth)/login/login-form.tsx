'use client'

import { useRef } from 'react'
import { FlaskConical } from 'lucide-react'
import { loginAction } from '@/app/actions/auth'
import { ActionForm, SubmitButton } from '@/components/ui/action-form'

export function LoginForm({ demo }: { demo: { role: string; name: string; email: string; hint: string; password: string }[] }) {
  const email = useRef<HTMLInputElement>(null)
  const password = useRef<HTMLInputElement>(null)

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
      </section>
    </>
  )
}
