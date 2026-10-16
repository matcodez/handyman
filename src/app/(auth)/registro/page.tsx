import Link from 'next/link'
import { House, Wrench } from 'lucide-react'
import { registerAction } from '@/app/actions/auth'
import { ActionForm, SubmitButton } from '@/components/ui/action-form'

export const metadata = { title: 'Crear cuenta' }

export default function RegisterPage({ searchParams }: { searchParams: { tipo?: string } }) {
  const pro = searchParams.tipo === 'profesional'
  return (
    <>
      <h1 className="text-3xl font-semibold">Crea tu cuenta</h1>
      <p className="mb-7 mt-2 text-ink2">
        ¿Ya tienes cuenta? <Link href="/login" className="font-medium text-brand hover:underline">Inicia sesión</Link>
      </p>
      <ActionForm action={registerAction} resetOnSuccess={false} className="space-y-4">
        <fieldset>
          <legend className="label">¿Cómo vas a usar Handyman?</legend>
          <div className="grid grid-cols-2 gap-3">
            {[
              { value: 'customer', title: 'Necesito un servicio', text: 'Publico solicitudes y contrato', icon: House, checked: !pro },
              { value: 'professional', title: 'Soy profesional', text: 'Cotizo y realizo trabajos', icon: Wrench, checked: pro },
            ].map((o) => (
              <label key={o.value} className="relative flex cursor-pointer flex-col gap-2 rounded-2xl border-2 border-line2 bg-white p-4 transition-colors has-[:checked]:border-brand has-[:checked]:bg-brand-bg/60">
                <input type="radio" name="role" value={o.value} defaultChecked={o.checked} className="peer sr-only" required />
                <o.icon className="h-6 w-6 text-ink3 peer-checked:text-brand" aria-hidden />
                <span className="font-display text-sm font-semibold text-ink">{o.title}</span>
                <span className="text-xs text-ink2">{o.text}</span>
                <span className="absolute right-3 top-3 h-4 w-4 rounded-full border-2 border-line2 peer-checked:border-[5px] peer-checked:border-brand" aria-hidden />
              </label>
            ))}
          </div>
        </fieldset>
        <div>
          <label className="label" htmlFor="full_name">Nombre completo</label>
          <input id="full_name" name="full_name" autoComplete="name" required minLength={3} maxLength={80} className="input" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="email">Correo electrónico</label>
            <input id="email" name="email" type="email" autoComplete="email" required className="input" />
          </div>
          <div>
            <label className="label" htmlFor="phone">Teléfono</label>
            <input id="phone" name="phone" type="tel" autoComplete="tel" required placeholder="5555 5555" className="input" />
          </div>
        </div>
        <div>
          <label className="label" htmlFor="password">Contraseña</label>
          <input id="password" name="password" type="password" autoComplete="new-password" required minLength={8} className="input" aria-describedby="pw-hint" />
          <p id="pw-hint" className="hint">Mínimo 8 caracteres. Se guarda cifrada.</p>
        </div>
        <label className="flex items-start gap-3 text-sm text-ink2">
          <input type="checkbox" name="accept" required className="mt-0.5 h-5 w-5 rounded border-line2 text-brand accent-[#3154c8]" />
          <span>Entiendo que este es un entorno de demostración académica y acepto los <Link href="/legal/terminos" className="text-brand hover:underline">términos</Link> y la <Link href="/legal/privacidad" className="text-brand hover:underline">política de privacidad</Link>.</span>
        </label>
        <SubmitButton className="btn-primary w-full" pendingText="Creando cuenta…">Crear cuenta</SubmitButton>
      </ActionForm>
      <p className="mt-5 text-xs leading-relaxed text-ink3">
        Si te registras como profesional, tu perfil iniciará como “No verificado”. Solo podrás cotizar cuando administración apruebe tu expediente.
      </p>
    </>
  )
}
