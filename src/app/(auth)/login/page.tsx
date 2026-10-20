import Link from 'next/link'
import { DEMO_ACCOUNTS, DEMO_PASSWORD } from '@/lib/demo'
import { DEMO_ACCOUNT_BY_AREA } from '@/lib/demo-pros'
import { LoginForm } from './login-form'

export const metadata = { title: 'Acceder' }

export default function LoginPage() {
  return (
    <>
      <h1 className="text-3xl font-semibold">Bienvenido de nuevo</h1>
      <p className="mb-7 mt-2 text-ink2">
        ¿Aún no tienes cuenta? <Link href="/registro" className="font-medium text-brand hover:underline">Regístrate</Link>
      </p>
      <LoginForm demo={DEMO_ACCOUNTS.map((d) => ({ ...d, password: DEMO_PASSWORD }))} areas={DEMO_ACCOUNT_BY_AREA} />
    </>
  )
}
